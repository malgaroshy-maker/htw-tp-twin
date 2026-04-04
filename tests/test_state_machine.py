from app.shared.tag_store import TagStore
from app.simulator.engine import SimulatorEngine


def test_start_transitions_to_running():
    tags = TagStore()
    engine = SimulatorEngine(tags)
    tags.state.cmd["start"] = True
    engine.update(0.1)
    assert tags.state.sts["machine_state"] in {"STARTING", "RUNNING"}

    for _ in range(20):
        engine.update(0.1)

    assert tags.state.sts["machine_state"] == "RUNNING"
