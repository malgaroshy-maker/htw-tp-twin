# Repo Structure

```text
tray_packer_repo_scaffold/
├─ README.md
├─ pyproject.toml
├─ configs/
│  ├─ recipes.json
│  ├─ faults.json
│  └─ scenarios.json
├─ docs/
│  ├─ agents/
│  │  ├─ AGENT_WORKFLOW.md
│  │  └─ PROMPTS_FOR_AGENTS.md
│  └─ specs/
│     └─ ...project specification files...
├─ app/
│  ├─ shared/
│  │  ├─ __init__.py
│  │  ├─ enums.py
│  │  ├─ models.py
│  │  └─ tag_store.py
│  ├─ simulator/
│  │  ├─ __init__.py
│  │  ├─ config_loader.py
│  │  ├─ engine.py
│  │  ├─ runtime.py
│  │  └─ cli.py
│  ├─ control/
│  │  ├─ __init__.py
│  │  └─ controller.py
│  ├─ api/
│  │  ├─ __init__.py
│  │  └─ server.py
│  └─ ai/
│     ├─ __init__.py
│     └─ context_builder.py
└─ tests/
   ├─ test_state_machine.py
   └─ test_controller.py
```
