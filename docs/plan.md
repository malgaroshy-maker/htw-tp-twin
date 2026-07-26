# Tray Packer Digital Twin - Development Plan

This document outlines the prioritized phases and steps for improving the existing codebase and implementing missing features. The strategy focuses on **polishing and stabilizing what is already built first**, before moving on to new features and advanced integrations.

---

## Phase 1: Polish & Stabilize Existing Features (High Priority)
*Focus: Enhance the quality, performance, and reliability of the current MVP.*

### 1.1 3D Simulation Refinements
The 3D simulation (`SimulationView3D.tsx`) is a fantastic, portfolio-grade addition that perfectly captures the "behavioral realism" goal using `@react-three/fiber`. To make it even better:
- **Performance Optimization:** Ensure `useMachineSceneModel` is highly optimized. Consider using `InstancedMesh` for products if the `products_per_pack` count gets very high to reduce draw calls.
- **Visual Fault Indicators:** Add localized visual cues for faults (e.g., a flashing red point light over the blank magazine when `BLANK_MISSING` occurs, or over the transfer zone for `GAP_CONTROL_JAM`).
- **Material Polish:** Fine-tune lighting, shadows, and materials (metalness/roughness) to make the primitive shapes look more industrial.

### 1.2 Dashboard UX/UI Polish
- **Responsive Design:** Ensure the Overview, Faults, and Recipe screens render cleanly on smaller laptop screens or tablets.
- **AI Panel Ergonomics:** Refine the AI Assistant panel. Consider making it a persistent slide-out drawer or a floating chat interface rather than a modal, allowing operators to view the machine while asking questions.
- **Error Boundaries:** Add React Error Boundaries to prevent the entire dashboard from crashing if a 3D component or chart fails to render.

### 1.3 Simulator Engine Hardening
- **Memory Management:** The `EventLogger` currently stores events in memory. Implement a rolling buffer (e.g., keep only the last 10,000 events) or flush to a local SQLite/JSONL file to prevent memory leaks during long-running sessions.
- **Edge Case Testing:** Harden the PLC controller logic against rapid, conflicting command inputs (e.g., spamming Start/Stop/Reset).

---

## Phase 2: Complete Missing Core MVP Features (Medium Priority)
*Focus: Build out the empty or incomplete screens defined in the original specifications.*

### 2.1 Production & Analytics Screen
- **Implementation:** Build out `app/dashboard/src/features/production/Production.tsx`.
- **Data Visualization:** Integrate a charting library (like `Recharts` or `Chart.js`).
- **Required Charts:**
  - Downtime by Cause (Pie/Donut chart).
  - Rejects over Time (Line/Bar chart).
  - State Duration Breakdown (Gantt or Stacked Bar chart).
  - Basic OEE metrics (Availability, Performance, Quality).

### 2.2 Training & Scenario UI
- **Implementation:** Create a dedicated Training/Scenario screen.
- **Features:**
  - UI to select and start predefined scenarios (e.g., "Product Starvation", "Blank Supply Interruption").
  - Display scenario goals, current active step, and success criteria.
  - Show a post-scenario summary evaluating the operator's response time and actions.

### 2.3 Recipe Management (Editor)
- **Implementation:** Upgrade the existing Recipe screen.
- **Features:** Move from a read-only view to allowing users to edit existing recipes or create new ones (adjusting target counts, cycle times, and fault probabilities).

---

## Phase 3: Advanced AI & Analytics (Medium-Low Priority)
*Focus: Expand the AI Assistant's capabilities to provide deeper insights.*

### 3.1 Log Query Assistant
- **Feature:** Allow natural-language querying of historical logs.
- **Use Case:** "What were the main downtime causes today?" or "How many times did the machine starve?"
- **Implementation:** Enhance `context_builder.py` to aggregate and format historical event data for the LLM.

### 3.2 Recipe Comparison Assistant
- **Feature:** AI-driven comparison of recipe performance.
- **Use Case:** "Why did the 30-pack run slower than the 24-pack?"
- **Implementation:** Feed session statistics grouped by recipe into the LLM for analysis.

### 3.3 Session Persistence
- **Feature:** Save and load complete simulation sessions.
- **Implementation:** Replace in-memory logging with SQLite or structured JSONL files, allowing users to review past shifts or training runs after restarting the backend.

---

## Phase 4: Industrial Integration & Portfolio Packaging (Low Priority)
*Focus: Prepare the project for showcase and future hardware integration.*

### 4.1 Integration Specifications
- **OPC UA / MQTT:** Write design notes on how the `TagStore` maps to OPC UA nodes or MQTT topics.
- **Siemens Adaptation:** Write Structured Text (ST) pseudocode examples demonstrating how a real Siemens S7 PLC would interface with the simulator's tag contract.

### 4.2 Portfolio Assets
- **Architecture Diagrams:** Create visual diagrams of the system architecture (Simulator Core <-> PLC Layer <-> API <-> Dashboard <-> AI).
- **Demo Script:** Write a step-by-step walkthrough script for demonstrating the platform to recruiters or engineering managers.