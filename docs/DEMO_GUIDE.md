# Demo Guide: Tray Packer Digital Twin

This guide provides a step-by-step script for presenting the Tray Packer Digital Twin platform to recruiters, engineering managers, or team members.

---

## 🛠️ Preparation

Before starting the demo, ensure both the backend and frontend are running.

1.  **Set your Gemini API Key** (Required for AI features):
    ```bash
    export GEMINI_API_KEY="your_api_key_here"
    ```
2.  **Start the Backend**:
    ```bash
    python -m uvicorn app.api.server:app --reload
    ```
3.  **Start the Frontend**:
    ```bash
    cd app/dashboard
    npm run dev
    ```
4.  **Open the Dashboard**: Navigate to `http://localhost:5173` in your browser.

---

## 🎬 The Demo Flow

### Step 1: Introduction & Normal Production
*   **Action**: Point out the clean, industrial UI. Mention that the frontend is "thin" and relies entirely on the backend PLC-style controller for logic.
*   **Action**: Toggle **"Dev: Auto-Tick"** ON in the top Developer Tools bar.
*   **Action**: Click the **Start** button.
*   **Talking Points**:
    *   Watch the state transition from `STOPPED` -> `STARTING` -> `RUNNING`.
    *   Observe the **Current Phase** cycling through `IDLE`, `GROUPING`, `BLANK_FEED`, `PACKING`, and `DISCHARGE`.
    *   Point out the **Grouping Progress** bar filling up to the recipe target (e.g., 24).
    *   Show the **Production Counters** incrementing (Good Packs vs. Rejects).

### Step 2: Fault Injection & AI Explanation
*   **Action**: Wait for a random jam, or force one by opening a new terminal and running:
    ```bash
    curl -X POST http://localhost:8000/dev/inject-fault -H "Content-Type: application/json" -d '{"code": "GAP_CONTROL_JAM"}'
    ```
*   **Action**: Observe the red **Fault Banner** appear on the dashboard. Note that the **Start** button is now disabled by the PLC logic.
*   **Action**: Click the **AI Assistant** button in the header.
*   **Action**: Click **"Explain Last Fault"**.
*   **Talking Points**:
    *   The AI reads the structured event logs and machine state (not just the UI).
    *   It explains *what* the fault is, *why* it likely happened based on the timeline, and *how* the operator should recover.

### Step 3: Recovery & Training Scenarios
*   **Action**: Click the **Reset** button in the fault banner. The machine returns to `STOPPED`.
*   **Action**: In the "Training & Demos" card, select the **"Product Starvation"** scenario and click the Play icon.
*   **Action**: Click **Start** to resume production.
*   **Talking Points**:
    *   The scenario engine deterministically alters machine conditions over time.
    *   After a few seconds, the scenario will cut the product supply.
    *   Watch the machine state change to `STARVED` (yellow). Explain that this is a production interruption, not a hard fault, so it auto-recovers when the scenario restores the product.

### Step 4: Session Reporting
*   **Action**: Click the **Stop** button. Watch the machine enter `RUN_EMPTY` to clear internal products before stopping.
*   **Action**: Click the **Report** button in the header.
*   **Talking Points**:
    *   The system aggregates the in-memory event logs to generate a structured Markdown report.
    *   It shows total cycles, downtime, and a summary of the faults encountered during the session.
*   **Action**: (Optional) Click **Download .md** to show how easily this data can be exported to a CMMS or maintenance system.
*   **Action**: Open the **AI Assistant** again and click **"Summarize Session"** to show how Gemini can turn that raw data into a readable shift handover report.

---

## 💡 Key Takeaways to Emphasize
*   **Separation of Concerns**: The simulator acts as the physical machine, the controller acts as the PLC, and the AI acts as an analyst outside the control loop.
*   **Behavioral Realism**: We didn't build a 3D physics engine; we built a state machine that *behaves* exactly how an operator expects an industrial machine to behave.
*   **AI Grounding**: The AI doesn't hallucinate mechanical issues because it is strictly grounded by the structured `TagStore` and `EventLogger` data.