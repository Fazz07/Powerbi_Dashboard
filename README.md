# Power BI Dashboard

A full-stack web application that visualizes and interacts with embedded Power BI reports. It delivers critical business insights through financial metrics such as Net Sales and Return Rates, enhanced with user customization and chatbot support.

---

## 🚀 Key Features

- **Secure User Authentication** via Microsoft Identity Platform (Azure AD)
- **Embedded Power BI Reports** with support for dynamic report switching
- **Modular Dashboard Views** for Net Sales, Return Rate, and Returns
- **Drag-and-Drop UI** for customizing report layout
- **Chatbot Assistant** using Azure OpenAI for contextual insights
- **Persistent User Preferences** stored in Azure Cosmos DB

---

## 📦 Prerequisites

Ensure you have the following installed:

- **Node.js** (v18.x or later)
- **npm** (comes bundled with Node.js)
- [Power BI Pro or Premium Workspace Access](https://powerbi.microsoft.com/)
- Azure resources set up (Cosmos DB, Azure OpenAI, App Registration)

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd power-bi-dashboard
````

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Prepare Backend

```bash
npm run build:backend
```

This navigates into the `backend` directory, installs dependencies, then returns to the root.

---

## 🧪 Development Setup

### Start the Backend Server

In a new terminal:

```bash
cd backend
npm start
```

By default, the backend runs on port `3001` (or as configured in `backend/server.js`).

### Start the Frontend (Vite Dev Server)

In another terminal:

```bash
vite dev
```

If Vite isn’t globally installed, use:

```bash
npx vite
```

The frontend is accessible at `http://localhost:5173`. Ensure your `vite.config.ts` includes a proxy to the backend API.

---

## 📦 Production-like Setup

To run the app as it would be deployed:

```bash
npm run deploy
```

This command:

* Builds the frontend
* Installs backend dependencies
* Starts the backend, which serves the built frontend

The app will be available at `http://localhost:<PORT>` as defined in `backend/server.js`.

---

## 🔨 Build Commands

| Task           | Command                  | Description                                     |
| -------------- | ------------------------ | ----------------------------------------------- |
| Build Frontend | `npm run build:frontend` | Runs `vite build` and outputs to `dist/` folder |
| Build Backend  | `npm run build:backend`  | Installs backend dependencies                   |
| Build Both     | `npm run build`          | Builds frontend and prepares backend            |

---

## 🧰 Technologies Used

### Frontend

* **React** – UI rendering
* **TypeScript** – Type safety
* **Vite** – Lightning-fast dev/build tool
* **Tailwind CSS** – Utility-first styling
* **Zustand** – Minimal global state management
* **React Router** – Client-side routing
* **DnD Kit** – Drag-and-drop components
* **Lucide Icons** – SVG icon library
* **PapaParse** – CSV file parsing
* **Power BI Client SDK** (`powerbi-client-react`, `powerbi-client`) – Report embedding and interactivity

### Backend

* **Node.js + Express.js** – API server
* **Axios** – HTTP client with keep-alive agent
* **Azure Cosmos DB SDK** – Persistent data store
* **jsonwebtoken + jwks-rsa** – JWT validation with Microsoft Identity
* **Dotenv** – Secure environment configuration
* **Node Cache** – In-memory caching
* **CORS** – Cross-origin support
* **qs** – Query string utilities

---

## 🛡️ Security & Auth

* OAuth2 authentication via Microsoft Identity Platform
* JWT-based user verification using `jwks-rsa`
* Role-based token validation
* Azure AD redirect flows implemented in `/auth/login` and `/auth/callback`

---

## ☁️ Cloud Integration

* **Azure Cosmos DB** for session and configuration persistence
* **Azure OpenAI** for chatbot functionality
* **Power BI REST API** for report access and token generation

---

## 📝 Environment Variables

Set the following in a `.env` file (details redacted here):

```
TENANT_ID=
CLIENT_ID=
CLIENT_SECRET=
REDIRECT_URI=
FRONTEND_REDIRECT_URI=
COSMOS_DB_ENDPOINT=
COSMOS_DB_KEY=
COSMOS_DB_DATABASE_ID=
COSMOS_DB_CONTAINER_ID=
COSMOS_DB_SESSION_CONTAINER_ID=
COSMOS_DB_LLM_CONFIG_CONTAINER_ID=
POWERBI_WORKSPACE_ID=
AZURE_OPENAI_API_INSTANCE_NAME=
AZURE_OPENAI_API_DEPLOYMENT_NAME=
AZURE_OPENAI_API_VERSION=
```

---

## 📄 License

This project is licensed under [MIT](./LICENSE).