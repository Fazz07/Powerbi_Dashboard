require("dotenv").config();

const config = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  workspaceId: process.env.WORKSPACE_ID,
  reportId: process.env.REPORT_ID,
  redirectUri: process.env.REDIRECT_URI,
  frontendRedirectUri: process.env.FRONTEND_REDIRECT_URI,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_INSTANCE_NAME,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  cosmosDbEndpoint: process.env.COSMOS_DB_ENDPOINT,
  cosmosDbKey: process.env.COSMOS_DB_KEY,
  cosmosDbDatabaseId: process.env.COSMOS_DB_DATABASE_ID || "UserDashboards",
  cosmosDbContainerId: process.env.COSMOS_DB_CONTAINER_ID || "Customizations",
  chathistoryContainerId: process.env.COSMOS_DB_CHATHISTORY_CONTAINER_ID || "ConversationHistory",
  cosmosDbLlmConfigContainerId: process.env.COSMOS_DB_LLM_CONFIG_CONTAINER_ID || "LlmConfig",
  llmConfigDocId: process.env.COSMOS_DB_LLM_CONFIG_DOC_ID || "defaultConfig",
  llmConfigPartitionKey: process.env.COSMOS_DB_LLM_CONFIG_PARTITION_KEY || "global",
  cosmosDbSessionContainerId: process.env.COSMOS_SESSION_CONTAINER_ID || 'SessionHistory',
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
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_INSTANCE_NAME",
  "AZURE_OPENAI_DEPLOYMENT_NAME",
  "AZURE_OPENAI_API_VERSION",
  "COSMOS_DB_ENDPOINT",
  "COSMOS_DB_KEY",
];

requiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

module.exports = config;