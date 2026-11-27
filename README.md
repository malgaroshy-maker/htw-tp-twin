# Tray Packer Digital Twin Platform

![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-8E75B2?style=flat-square&logo=google)

A simplified industrial tray packer digital twin platform. This project combines a behavioral machine simulator, PLC-style control logic, a modern React dashboard, and an integrated AI assistant to create a realistic, interactive industrial software environment.

> **Note:** This repository is intentionally **behavioral**, not a full motion-accurate OEM twin. It simulates what operators and engineers observe (states, cycles, faults, rejects) rather than exact mechanical physics.

---

## 🌟 Key Features

*   **Behavioral Simulator**: A discrete-event Python engine modeling machine states, cycle phases, product grouping, and probabilistic faults/rejects based on configurable recipes.
*   **PLC-Style Control**: Strict separation of concerns. A controller layer manages start permissives, reset gating, and HMI helper flags, ensuring the simulator acts only as the execution layer.
*   **Modern HMI Dashboard**: A dark-themed, industrial React/Tailwind interface providing live telemetry, production counters, fault banners, machine control, and animated 2D top-down and 3D machine visualizations.
*   **AI Assistant (Gemini)**: An integrated AI panel that reads structured machine tags and event logs to explain current states, analyze faults, and generate session summaries.
*   **Training Scenarios**: A deterministic scenario engine that can inject faults or alter machine conditions (e.g., starvation, blockages) over time for operator training.
*   **Session Persistence**: Events and session records are written through to a local SQLite store (`data/events.db`) for history browsing and reporting.

---

## 🏗️ Architecture & Module Responsibilities

The platform is divided into distinct layers to mimic a real industrial software stack:

1.  **Simulator (`app/simulator`)**: The physical machine. It executes cycles, groups products, and triggers faults. It *only* reacts to command pulses.
2.  **Controller (`app/control`)**: The PLC. It evaluates permissives (e.g., safety OK, blank available), enforces state transition rules, and calculates which HMI buttons should be enabled.
3.  **API (`app/api`)**: The Orchestrator. A FastAPI service that bridges the backend state to the frontend via REST endpoints.
4.  **Dashboard (`app/dashboard`)**: The HMI. A thin React client that displays the machine state and sends operator commands.
5.  **AI & Reports (`app/ai`, `app/reports`)**: The Analyst. Read-only services that aggregate event logs to generate Markdown reports and prompt the Gemini LLM for insights.

---

## 🚀 One-Click Development Runner

After completing the initial setup, you can use the one-click runner to start both the backend and frontend servers simultaneously.

*   **On Windows**:
    ```bash
    run_dev.bat
    ```
    *(This will open two new terminal windows for the API and the dashboard).*

*   **On Linux/macOS**:
    ```bash
    chmod +x run_dev.sh
    ./run_dev.sh
    ```
    *(This will start the servers in the background. See the script's output for log locations and how to stop them).*

---

## 🛠️ Manual Setup & Run Instructions

If you prefer to run the services manually:

### 1. Backend Setup (Python)
Create and activate a virtual environment, then install dependencies:
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -e .
pip install fastapi uvicorn pydantic google-genai
```

### 2. Configure AI (Optional but Recommended)
To enable the AI Assistant features, set your Google Gemini API key as an environment variable:
```bash
# Windows (Command Prompt):
set GEMINI_API_KEY=your_api_key_here
# Linux/macOS:
export GEMINI_API_KEY="your_api_key_here"
```
*(If the key is missing, the AI panel will gracefully display a configuration error).*

### 3. Start the API Server
```bash
python -m uvicorn app.api.server:app --reload
```
The API will run at `http://localhost:8000`.

### 4. Start the Dashboard (React)
Open a **new terminal window**, navigate to the dashboard folder, and start the Vite dev server:
```bash
cd app/dashboard
npm install
npm run dev
```
Open your browser to `http://localhost:5173` to view the HMI.

### 5. Run the OPC UA Bridge (Optional)
With the API running, start the OPC UA bridge in another terminal to expose the machine to PLC/SCADA-style clients:
```bash
python -m app.integration.opcua_server
```
This serves the address space at `opc.tcp://localhost:4840/traypacker/` (folders: `TrayPacker/Commands`, `/Inputs`, `/Status`, `/Outputs`, `/Faults`, `/Warnings`, `/Sensors`, `/Diagnostics`). Write `True` to a command node (e.g., `Commands/Start`) to fire it on the next scan. Configure via environment variables: `TRAYPACKER_API_URL`, `OPCUA_ENDPOINT`, `OPCUA_SCAN_INTERVAL_SEC`.

---

### API Environment Variables

- `TRAYPACKER_CORS_ORIGINS`: comma-separated browser origins allowed by CORS (default: Vite dev/preview origins on `localhost`/`127.0.0.1`, ports 5173 and 4173).
- `TRAYPACKER_DISABLE_DEV_ROUTES=1`: makes all `/dev/*` routes return 403 (enabled by default for the Diagnostics page).

## ⚠️ Current Limitations

As a V1 portfolio project, this platform has a few intentional limitations:
*   **In-Process State**: Live tags, counters, and the event buffer live in the API process; only events/sessions are persisted to SQLite (`data/events.db`), so restarting resets counters and spawns a new session.
*   **No Real-Time Physics**: Cycle times and grouping are based on timers and probabilities, not 3D collision or servo kinematics.
*   **Live Streaming**: The dashboard receives state and event updates over a WebSocket stream (`/ws/state`, 5Hz push); commands remain HTTP request/response.
*   **No Physical Hardware**: There is no actual PLC (e.g., Siemens S7) connected yet.

---

## 🗺️ Roadmap

Future phases planned for this project:
1.  **Industrial Protocol Bridge**: Add an OPC UA server to expose the `TagStore` to real PLCs or SCADA systems.
2.  **Persistence Hardening**: Retention policies, richer session queries, optional PostgreSQL backend beyond the existing SQLite store.
3.  **Advanced Analytics**: Add trend charts (e.g., OEE, downtime by cause) to the dashboard.
4.  **Multi-Machine Line**: Expand the simulator to handle upstream/downstream machine interactions.
