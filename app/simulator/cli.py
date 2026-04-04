from __future__ import annotations

import json

from app.simulator.runtime import run_demo_loop


def main() -> None:
    snapshot = run_demo_loop()
    print(json.dumps(snapshot, indent=2))


if __name__ == "__main__":
    main()
