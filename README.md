# Elastic RUM Local Demo

This is a complete local setup for testing Elastic RUM (Real User Monitoring) with a frontend application and a backend Node.js service to demonstrate **Distributed Tracing** and **Service Maps**.

## Prerequisites

- Docker / Docker Desktop
- Node.js & npm

## Services Overview

1.  **Elastic Stack (Docker)**:
    - Elasticsearch: Database
    - Kibana: UI Dashboard (http://localhost:5601)
    - APM Server: Receives traces (http://localhost:8200)
2.  **Frontend App (`client/`)**:
    - Vite + Vanilla JS
    - Running on http://localhost:5173
3.  **Backend App (`server/`)**:
    - Express + Node.js
    - Running on http://localhost:3000

## Getting Started

### 1. Start Elastic Stack

```bash
docker-compose up -d
```

> Wait a few minutes for Kibana to be ready at http://localhost:5601.

### 2. Start Backend Service

Open a new terminal tab:

```bash
cd server
npm install # First time only
npm start
```

### 3. Start Frontend App

Open another terminal tab:

```bash
cd client
npm install # First time only
npm run dev
```

### 4. Verify Service Map

1.  Open Frontend: http://localhost:5173
2.  Click **"Call Backend API (Success)"**.
    - This sends a request from `local-test-app` (Frontend) -> `local-backend-api` (Backend).
    - The RUM Agent automatically adds tracing headers.
3.  Click **"Call Backend API (Error)"** to see error propagation.
4.  Open Kibana: [http://localhost:5601/app/apm/services](http://localhost:5601/app/apm/services).
5.  Click on the **"Service Map"** tab at the top.
    - You should see a graph connecting `local-test-app` -> `local-backend-api`.
    - _Note: It might take a minute or two for the map to update._

## Troubleshooting

- **No Data?**: Check APM Server logs for errors. Ensure backend is running.
- **Service Map Empty?**: Ensure `distributedTracingOrigins` in `client/src/main.js` correctly matches the backend URL (`http://localhost:3000`).
