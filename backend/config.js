require("dotenv").config();

const config = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  workspaceId: process.env.WORKSPACE_ID,
  reportId: process.env.REPORT_ID,
  redirectUri: process.env.REDIRECT_URI,
  frontendRedirectUri: process.env.FRONTEND_REDIRECT_URI,
};

// Validate required environment variables
const requiredVars = [
  "CLIENT_ID",
  "CLIENT_SECRET",
  "TENANT_ID",
  "WORKSPACE_ID",
  "REPORT_ID",
  "REDIRECT_URI",
  "FRONTEND_REDIRECT_URI",
];

requiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

module.exports = config;
