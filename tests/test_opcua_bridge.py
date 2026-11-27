"""Tests for the OPC UA bridge logic (no sockets bound)."""

import asyncio

from app.integration.opcua_server import (
    COMMAND_PRIORITY,
    DIAGNOSTICS_NODES,
    FAULT_NODES,
    INPUT_NAMES,
    OUTPUT_NODES,
    SENSOR_NODES,
    STATUS_NODES,
    WARNING_NODES,
    OpcUaBridge,
    build_scan_request,
)


def test_pulse_maps_to_command_code():
    request, consumed = build_scan_request({"start": True}, None, {})
    assert request["command_code"] == 1
    assert consumed == ["start"]


def test_all_command_codes_map():
    expected = {
        "start": 1, "stop": 2, "reset": 3, "run_empty": 4,
        "mode_auto": 5, "mode_manual": 6, "ack_alarm": 7,
        "clear_counts": 8, "refill_blanks": 9, "clear_rejects": 10,
    }
    for name, code in expected.items():
        request, consumed = build_scan_request({name: True}, None, {})
        assert request["command_code"] == code
        assert consumed == [name]
    assert [n for n, _ in COMMAND_PRIORITY] == list(expected.keys())


def test_priority_queues_remaining_pulses():
    # start outranks reset: only start fires this scan; reset stays latched
    pulses = {name: False for name, _ in COMMAND_PRIORITY}
    pulses["start"] = True
    pulses["reset"] = True

    request, consumed = build_scan_request(pulses, None, {})
    assert request["command_code"] == 1
    assert consumed == ["start"]

    # Next scan after the bridge consumed/reset start:
    pulses["start"] = False
    request2, consumed2 = build_scan_request(pulses, None, {})
    assert request2["command_code"] == 3
    assert consumed2 == ["reset"]


def test_no_pulses_is_noop():
    pulses = {name: False for name, _ in COMMAND_PRIORITY}
    request, consumed = build_scan_request(pulses, None, {})
    assert request["command_code"] == 0
    assert consumed == []


def test_recipe_and_inputs_passthrough():
    pulses = {name: False for name, _ in COMMAND_PRIORITY}
    inputs = {name: True for name in INPUT_NAMES}
    inputs["product_available"] = False

    request, consumed = build_scan_request(pulses, "27-pack", inputs)
    assert request["recipe_select"] == "27-pack"
    assert request["inputs"]["product_available"] is False
    assert request["inputs"]["blank_available"] is True
    assert consumed == []
    assert set(request["inputs"].keys()) == set(INPUT_NAMES)


def test_unknown_input_ignored():
    pulses = {name: False for name, _ in COMMAND_PRIORITY}
    request, _consumed = build_scan_request(pulses, None, {"bogus_input": True})
    assert "inputs" not in request


class _FakeNode:
    """Records written values; returns a preset value on read."""

    def __init__(self, value: object = False) -> None:
        self.value = value
        self.written: list[object] = []

    async def read_value(self) -> object:
        return self.value

    async def write_value(self, value: object) -> None:
        self.written.append(value)


def _seed_mirror_nodes(bridge: OpcUaBridge) -> None:
    """Populate bridge._nodes with fakes for every mirror node."""
    for folder_name, mapping in (
        ("Status", STATUS_NODES),
        ("Outputs", OUTPUT_NODES),
        ("Faults", FAULT_NODES),
        ("Warnings", WARNING_NODES),
        ("Sensors", SENSOR_NODES),
        ("Diagnostics", DIAGNOSTICS_NODES),
    ):
        for node_name, (_group, _field, default) in mapping.items():
            key = f"{folder_name}.{node_name}"
            if key not in bridge._nodes:
                bridge._nodes[key] = _FakeNode(default)


def _full_fake_snapshot(**overrides) -> dict:
    """Build a complete PlcSnapshot-shaped dict from the declarative maps."""
    snapshot: dict[str, dict] = {}
    for mapping in (
        STATUS_NODES, OUTPUT_NODES, FAULT_NODES,
        WARNING_NODES, SENSOR_NODES, DIAGNOSTICS_NODES,
    ):
        for group, field, default in mapping.values():
            snapshot.setdefault(group, {})[field] = default
    for group, fields in overrides.items():
        snapshot[group].update(fields)
    return snapshot


def _seed_client_nodes(bridge: OpcUaBridge, pulses: dict[str, bool]) -> None:
    for name, value in pulses.items():
        bridge._nodes[f"cmd.{name}"] = _FakeNode(value)
    bridge._nodes["cmd.recipe_select"] = _FakeNode("")
    for name in INPUT_NAMES:
        bridge._nodes[f"in.{name}"] = _FakeNode(True)


def _patch_sleep(monkeypatch) -> None:
    async def fake_sleep(_s):
        return None

    monkeypatch.setattr("app.integration.opcua_server.asyncio.sleep", fake_sleep)


def test_write_snapshot_maps_groups():
    bridge = OpcUaBridge.__new__(OpcUaBridge)  # skip __init__/server setup
    bridge._nodes = {}

    snapshot = _full_fake_snapshot(
        sts={"machine_state": 2, "cycle_phase_progress": 0.5},
        out={"good_pack_count": 7},
        fault={"active_code": 3, "latched": True},
        warn={"active_code": 1},
        sns={"stopper_closed": False},
        plc={"scan_counter": 42},
    )

    # Guard against map drift: every node we assert on must be declared
    assert "MachineState" in STATUS_NODES and "CyclePhaseProgress" in STATUS_NODES
    assert "GoodPackCount" in OUTPUT_NODES
    assert {"ActiveCode", "Latched"} <= set(FAULT_NODES)
    assert "ActiveCode" in WARNING_NODES
    assert "StopperClosed" in SENSOR_NODES
    assert {"ScanCounter", "CommsHealthy"} <= set(DIAGNOSTICS_NODES)

    _seed_mirror_nodes(bridge)

    asyncio.run(bridge._write_snapshot(snapshot))

    assert bridge._nodes["Status.MachineState"].written == [2]
    assert bridge._nodes["Status.CyclePhaseProgress"].written == [0.5]
    assert bridge._nodes["Outputs.GoodPackCount"].written == [7]
    assert bridge._nodes["Faults.ActiveCode"].written == [3]
    assert bridge._nodes["Faults.Latched"].written == [True]
    assert bridge._nodes["Warnings.ActiveCode"].written == [1]
    assert bridge._nodes["Sensors.StopperClosed"].written == [False]
    assert bridge._nodes["Diagnostics.ScanCounter"].written == [42]


def test_poll_once_resets_consumed_pulse(monkeypatch):
    bridge = OpcUaBridge(api_base_url="http://test")
    bridge._nodes = {}
    pulses = {name: False for name, _ in COMMAND_PRIORITY}
    pulses["reset"] = True
    _seed_client_nodes(bridge, pulses)
    _seed_mirror_nodes(bridge)

    async def fake_post_scan(_request):
        return _full_fake_snapshot()

    monkeypatch.setattr(bridge, "_post_scan", fake_post_scan)
    _patch_sleep(monkeypatch)

    asyncio.run(bridge.poll_once())

    # Fired pulse was reset, comms healthy recorded
    assert bridge._nodes["cmd.reset"].written[-1] is False
    assert bridge._nodes["Diagnostics.CommsHealthy"].written[-1] is True


def test_poll_once_survives_api_outage(monkeypatch):
    bridge = OpcUaBridge(api_base_url="http://test")
    bridge._nodes = {}
    _seed_client_nodes(bridge, {name: False for name, _ in COMMAND_PRIORITY})
    _seed_mirror_nodes(bridge)

    async def failing_post_scan(_request):
        raise ConnectionError("api down")

    monkeypatch.setattr(bridge, "_post_scan", failing_post_scan)
    _patch_sleep(monkeypatch)

    asyncio.run(bridge.poll_once())  # must not raise

    assert bridge._comms_healthy is False
    assert bridge._nodes["Diagnostics.CommsHealthy"].written[-1] is False


# ---------------------------------------------------------------------- #
#  Input forwarding, retry semantics, outage marking, safety writability  #
# ---------------------------------------------------------------------- #


def _make_bridge(monkeypatch, pulses=None):
    bridge = OpcUaBridge(api_base_url="http://test")
    bridge._nodes = {}
    _seed_client_nodes(bridge, pulses or {name: False for name, _ in COMMAND_PRIORITY})
    _seed_mirror_nodes(bridge)
    _patch_sleep(monkeypatch)
    return bridge


def test_empty_inputs_omit_key():
    request, _ = build_scan_request({}, None, {})
    assert "inputs" not in request


def test_first_scan_forwards_no_inputs(monkeypatch):
    bridge = _make_bridge(monkeypatch)
    bridge._nodes["in.product_available"].value = False  # differs from default
    sent: list[dict] = []

    async def post(request):
        sent.append(request)
        return _full_fake_snapshot()

    monkeypatch.setattr(bridge, "_post_scan", post)
    asyncio.run(bridge.poll_once())

    assert "inputs" not in sent[0]


def test_changed_input_forwarded_once(monkeypatch):
    bridge = _make_bridge(monkeypatch)
    sent: list[dict] = []

    async def post(request):
        sent.append(request)
        return _full_fake_snapshot()

    monkeypatch.setattr(bridge, "_post_scan", post)
    asyncio.run(bridge.poll_once())  # baseline
    bridge._nodes["in.product_available"].value = False
    asyncio.run(bridge.poll_once())
    asyncio.run(bridge.poll_once())

    assert sent[1]["inputs"] == {"product_available": False}
    assert "inputs" not in sent[2]


def test_changed_input_retried_after_failed_post(monkeypatch):
    bridge = _make_bridge(monkeypatch)
    sent: list[dict] = []
    fail = {"on": False}

    async def post(request):
        sent.append(request)
        if fail["on"]:
            raise ConnectionError("down")
        return _full_fake_snapshot()

    monkeypatch.setattr(bridge, "_post_scan", post)
    asyncio.run(bridge.poll_once())
    bridge._nodes["in.blank_available"].value = False
    fail["on"] = True
    asyncio.run(bridge.poll_once())
    fail["on"] = False
    asyncio.run(bridge.poll_once())

    assert sent[1]["inputs"] == {"blank_available": False}
    assert sent[2]["inputs"] == {"blank_available": False}


def test_failed_post_keeps_pulse_for_retry(monkeypatch):
    pulses = {name: False for name, _ in COMMAND_PRIORITY}
    pulses["start"] = True
    bridge = _make_bridge(monkeypatch, pulses)
    sent: list[dict] = []
    fail = {"on": True}

    async def post(request):
        sent.append(request)
        if fail["on"]:
            raise ConnectionError("down")
        return _full_fake_snapshot()

    monkeypatch.setattr(bridge, "_post_scan", post)
    asyncio.run(bridge.poll_once())
    assert bridge._nodes["cmd.start"].written == []  # not reset
    assert bridge._consecutive_failures == 1

    fail["on"] = False
    asyncio.run(bridge.poll_once())
    assert [r["command_code"] for r in sent] == [1, 1]  # retried
    assert bridge._nodes["cmd.start"].written == [False]
    assert bridge._consecutive_failures == 0


def test_successful_post_resets_only_consumed_pulse(monkeypatch):
    pulses = {name: False for name, _ in COMMAND_PRIORITY}
    pulses["start"] = True
    pulses["reset"] = True
    bridge = _make_bridge(monkeypatch, pulses)

    async def post(_request):
        return _full_fake_snapshot()

    monkeypatch.setattr(bridge, "_post_scan", post)
    asyncio.run(bridge.poll_once())

    assert bridge._nodes["cmd.start"].written == [False]
    assert bridge._nodes["cmd.reset"].written == []


def test_outage_marks_mirror_nodes_bad_once(monkeypatch):
    from asyncua import ua

    bridge = _make_bridge(monkeypatch)
    for key, node in bridge._nodes.items():
        if key.startswith(("Status.", "Outputs.")):
            node.data_value = ua.DataValue(Value=ua.Variant(1, ua.VariantType.Int32))

            async def rdv(n=node):
                return n.data_value

            node.read_data_value = rdv

    async def post(_request):
        raise ConnectionError("down")

    monkeypatch.setattr(bridge, "_post_scan", post)
    asyncio.run(bridge.poll_once())
    asyncio.run(bridge.poll_once())

    node = bridge._nodes["Status.MachineState"]
    assert len(node.written) == 1  # marked once, not every failed scan
    assert node.written[0].StatusCode.is_bad()


def test_backoff_grows_and_caps(monkeypatch):
    bridge = _make_bridge(monkeypatch)
    delays: list[float] = []

    async def fake_sleep(s):
        delays.append(s)

    monkeypatch.setattr("app.integration.opcua_server.asyncio.sleep", fake_sleep)

    async def post(_request):
        raise ConnectionError("down")

    monkeypatch.setattr(bridge, "_post_scan", post)
    for _ in range(8):
        asyncio.run(bridge.poll_once())
    assert delays[0] < delays[1] < delays[2]
    assert max(delays) <= 2.0
    assert delays[-1] > 1.9


def test_safety_inputs_not_writable_by_default(monkeypatch):
    from asyncua import ua

    monkeypatch.delenv("OPCUA_ALLOW_SAFETY_WRITES", raising=False)

    async def levels(allow):
        bridge = OpcUaBridge(allow_safety_writes=allow)
        await bridge.setup()
        result = {}
        for name in INPUT_NAMES:
            node = bridge._nodes[f"in.{name}"]
            result[name] = ua.AccessLevel.CurrentWrite in await node.get_user_access_level()
        return result

    default = asyncio.run(levels(None))
    for name in ("safety_ok", "estop_ok", "guards_closed", "utilities_ok"):
        assert default[name] is False
    assert default["product_available"] is True

    allowed = asyncio.run(levels(True))
    assert all(allowed.values())
