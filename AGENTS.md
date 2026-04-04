# Repository Guidelines for Agents

Welcome to the Tray Packer Digital Twin Platform repository. This document provides essential guidelines, commands, and conventions for AI coding agents operating in this codebase.

## 1. Build, Lint, and Test Commands

### Backend (FastAPI / Python)
The backend is built with FastAPI and uses `pytest` for testing.

**Setup:**
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate
pip install -e .
```

**Running the API:**
```bash
python -m uvicorn app.api.server:app --reload
```

**Testing:**
- Run all tests: `pytest`
- Run a specific test file: `pytest tests/test_api.py`
- Run a single test function: `pytest tests/test_api.py::test_command_start`
- Run tests with verbose output: `pytest -v`
- Run tests matching a keyword: `pytest -k "recipe"`
- Run tests and stop on first failure: `pytest -x`

### Frontend (React 19 / TypeScript / Tailwind v4)
The frontend dashboard is located in `app/dashboard`.

**Setup:**
```bash
cd app/dashboard
npm install
```

**Development & Build:**
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Run linter: `npm run lint`
- Preview production build: `npm run preview`

**Full Stack Runner:**
Use `run_dev.bat` (Windows) or `./run_dev.sh` (Linux/macOS) from the root directory to start both the backend and frontend servers simultaneously.

## 2. Code Style Guidelines

### Python & FastAPI (Backend)
- **Formatting:** Use 4-space indentation. Keep edits small and consistent with surrounding code. No repo-wide autoformatter (like Black) is currently enforced, so match the existing style.
- **Naming Conventions:**
  - `snake_case` for functions, variables, and module names (e.g., `test_api.py`, `get_state`).
  - `PascalCase` for classes and Pydantic models (e.g., `MachineState`, `EventRecord`).
  - `UPPER_SNAKE_CASE` for constants and global variables (e.g., `TAGS`, `SIM`).
- **Types:** Use Python type hints extensively. Prefer `dataclasses` or Pydantic models for shared structures.
- **Imports:** Group imports logically. Standard library first, third-party packages second, local application imports third.
- **FastAPI Best Practices:**
  - Use `Annotated` for dependency injection (e.g., `x_token: Annotated[str, Header()]`).
  - Use `HTTPException` for client-facing errors to abort execution and return JSON responses.
  - Structure the app using subpackages (e.g., `app.routers`, `app.internal`) with `__init__.py` files.
- **Docstrings:** Add docstrings to public classes and functions explaining *why* and *what*, not just *how*.

### TypeScript, React 19 & Tailwind v4 (Frontend)
- **Formatting:** Follow standard TypeScript/React defaults. ESLint is configured (`npm run lint`), so ensure your code passes linting.
- **Naming Conventions:**
  - `PascalCase` for React components and interfaces (e.g., `MachineOverview`, `RecipeProps`).
  - `camelCase` for variables, functions, and hooks (e.g., `useMachineState`, `handleStart`).
- **React 19 Best Practices:**
  - Define components and custom hooks at the module level to optimize rendering and avoid unnecessary re-creations.
  - Use `useState` for managing component memory.
  - Leverage React 19's Actions and `useTransition` hook to automatically manage pending states for asynchronous data mutations.
- **Tailwind CSS v4 Best Practices:**
  - Use utility classes for styling directly in the markup.
  - Note that in Tailwind v4, the important modifier `!` is placed at the end of the class name (e.g., `flex!`, `bg-red-500!`).
- **Types:** Use strict TypeScript typing. Avoid `any` where possible. Define interfaces for API responses.

## 3. Architecture & Module Organization

- `app/api`: FastAPI endpoints exposing the backend state.
- `app/control`: PLC-style control logic (permissives, mode handling).
- `app/simulator`: The core machine model (state machine, cycle logic).
- `app/shared`: Shared enums, models, and the central tag store.
- `app/ai` & `app/reports`: Analysis, reporting, and AI context building (using Google Gemini).
- `app/dashboard`: React frontend application.
- `configs/`: JSON configuration files (recipes, faults, scenarios).
- `tests/`: Automated test suite.
- `docs/`: Reference material, specifications, and agent notes.

## 4. Testing Guidelines

- Keep each test focused on one API endpoint, controller logic, or simulator behavior.
- Name test files `test_*.py` and test functions `test_*`.
- Use fixtures to reset shared state before each test. Example:
  ```python
  @pytest.fixture(autouse=True)
  def reset_simulator():
      TAGS.__init__()
      SIM.__init__(TAGS)
      SIM.event_logger.clear()
      CTRL.update()
  ```
- Add or update tests whenever changing control flow, tag mappings, scenarios, or API responses.
- Use `TestClient` from `fastapi.testclient` for testing API endpoints.

## 5. Commit & Pull Request Guidelines

- Use clear, imperative commit messages (e.g., `Add PLC status regression tests`, `Refine dashboard fault banner`).
- Keep commits scoped to a single logical change.
- PRs should include a short description, test evidence (`pytest`, `npm run lint`, `npm run build`), and screenshots for UI changes.

## 6. Configuration & Security

- **Never commit secrets.** Set `GEMINI_API_KEY` via environment variables.
- Treat `configs/*.json` as versioned simulation inputs, not ad hoc runtime scratch files.
- Do not modify `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` unless explicitly requested.

## 7. Agent Workflow Rules

- **Read Specs First:** Always consult the relevant specification files in `docs/specs/` before implementing features.
- **Respect Boundaries:** Maintain the strict separation between simulator behavior (the machine) and controller decisions (the PLC).
- **AI Limitations:** AI features should act as an analyst/explainer, not a direct machine controller.
- **No Unnecessary Complexity:** Do not add full mechanical or servo-motion complexity unless explicitly requested. Focus on behavioral realism.
- **Tag Interface:** Treat structured tags and events as the source of truth. Do not invent alternative state names.