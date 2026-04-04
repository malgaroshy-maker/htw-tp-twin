from __future__ import annotations

import time

from app.shared.tag_store import TagStore
from app.simulator.engine import SimulatorEngine


def run_demo_loop(seconds: float = 5.0, scan_dt: float = 0.1) -> dict:
    """Run a tiny demo loop and return a final state snapshot."""
    tags = TagStore()
    engine = SimulatorEngine(tags)
    tags.state.cmd["start"] = True

    elapsed = 0.0
    while elapsed < seconds:
        engine.update(scan_dt)
        elapsed += scan_dt
        time.sleep(0.0)

    return tags.snapshot()
