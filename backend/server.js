const express = require("express");
const axios = require("axios");
const cors = require("cors");
const qs = require("qs");
const crypto = require("crypto");
const path = require("path");
const NodeCache = require("node-cache");
const https = require("https");

const config = require("./config");

const app = express();
app.use(cors());

// State storage with TTL (10 minutes)
const stateCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Token cache for multiple reports
const tokenCache = new Map();

const PORT = process.env.PORT || 3000;

// Axios instance with keep-alive
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true }),
});

// Helper function to format timestamp to IST
function formatToIST(timestamp) {
  return new Date(timestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getISTTime() {
  const date = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return date.toLocaleTimeString("en-IN", options);
}

// Token cache utilities
function isTokenExpired(reportId) {
  const tokenData = tokenCache.get(reportId);
  if (!tokenData) return true;
  return Date.now() >= tokenData.expirationTime - 5 * 60 * 1000; // 5-minute buffer
}

function setToken(reportId, tokenData) {
  if (!tokenData || !tokenData.token || !tokenData.expiration) {
    console.log(`[${getISTTime()}] Token Cache - Invalid token data for report ${reportId}`);
    return;
  }
  const expirationTime = new Date(tokenData.expiration).getTime();
  tokenCache.set(reportId, {
    embedToken: tokenData.token,
    expirationTime,
  });
  const expiryIST = formatToIST(expirationTime);
  console.log(`[${getISTTime()}] Token Cache - Token cached for report ${reportId}, expires at ${expiryIST} IST`);

  // Schedule refresh 5 minutes before expiration
  const timeToRefresh = expirationTime - Date.now() - 5 * 60 * 1000;
  if (timeToRefresh > 0) {
    setTimeout(() => {
      console.log(`[${getISTTime()}] Token Refresher - Refreshing token for report ${reportId}`);
      getEmbedToken(reportId, true).catch((err) =>
        console.error(`[${getISTTime()}] Token Refresh Error: ${err.message}`)
      );
    }, timeToRefresh);
  }
}

// OAuth login
app.get("/auth/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  stateCache.set(state, true);
  const authUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_mode=query&scope=openid%20profile%20email&state=${state}`;
  res.redirect(authUrl);
});

// OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }
  if (stateCache.get(state) === undefined) {
    console.log(`[${getISTTime()}] GET /auth/callback - Invalid or expired state: ${state}`);
    return res.status(400).send("Invalid or expired state parameter");
  }
  stateCache.del(state);

  try {
    const tokenResponse = await axiosInstance.post(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      qs.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const userToken = tokenResponse.data;
    const redirectUrl = `${config.frontendRedirectUri}?token=${userToken.id_token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error(`[${getISTTime()}] GET /auth/callback - Error: ${error.message}`);
    res.status(500).send("Authentication failed");
  }
});

// Embed token generation
async function getEmbedToken(reportId, forceRefresh = false) {
  if (!forceRefresh && !isTokenExpired(reportId)) {
    const tokenData = tokenCache.get(reportId);
    return {
      token: tokenData.embedToken,
      expiration: new Date(tokenData.expirationTime).toISOString(),
    };
  }

  try {
    const tokenResponse = await axiosInstance.post(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      qs.stringify({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: "https://analysis.windows.net/powerbi/api/.default",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const accessToken = tokenResponse.data.access_token;

    await axiosInstance.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${config.workspaceId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const embedResponse = await axiosInstance.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${config.workspaceId}/reports/${reportId}/GenerateToken`,
      { accessLevel: "View", allowSaveAs: false },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );

    setToken(reportId, embedResponse.data);
    return embedResponse.data;
  } catch (error) {
    console.error(`[${getISTTime()}] getEmbedToken - Error: ${error.message}`);
    throw error; // Let the caller handle the error
  }
}

app.get("/getEmbedToken", async (req, res) => {
  const reportId = config.reportId; // Fixed for now, can be made dynamic later
  const forceRefresh = req.query.forceRefresh === "true";
  try {
    const result = await getEmbedToken(reportId, forceRefresh);
    const embedUrl = `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${config.workspaceId}`;
    const tokenData = tokenCache.get(reportId);
    const expirationIST = formatToIST(tokenData.expirationTime);
    res.json({
      token: result.token,
      embedUrl,
      expiration: `${expirationIST} IST`,
      reportId,
      cacheStatus: !isTokenExpired(reportId)
        ? `Cached token valid until ${new Date(tokenData.expirationTime).toISOString()}`
        : "No valid token in cache",
    });
  } catch (error) {
    res.status(500).json({ error: true, errorMessage: "Failed to generate embed token", details: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  const reportId = config.reportId;
  const tokenData = tokenCache.get(reportId);
  const cacheStatus = tokenData && !isTokenExpired(reportId)
    ? `Token cached, valid until ${new Date(tokenData.expirationTime).toISOString()}`
    : "No valid token in cache";
  res.json({
    status: "healthy",
    serverTime: getISTTime(),
    tokenCacheStatus: cacheStatus,
    stateCacheSize: stateCache.keys().length,
  });
});

app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"), (err) => {
    if (err) res.status(500).send(err);
  });
});

app.listen(PORT, () => {
  console.log(`[${getISTTime()}] Server running on port ${PORT}`);
});