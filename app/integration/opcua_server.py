"""OPC UA bridge for the tray packer digital twin.

Exposes the machine to OPC UA clients (PLCs, SCADA, test harnesses) by
mirroring the integer-coded PLC snapshot behind a real OPC UA address space,
and translating client command writes into the formal scan-cycle contract
(`POST /plc/scan`).

Design notes:
- The bridge never touches the tag store directly. Every machine write flows
  through the /plc/scan transactional exchange, exactly like a future Siemens
  PLC would.
- Command nodes are pulse-style: a client writes True, the bridge fires the
  corresponding command code on the next scan and resets the node to False.
  If multiple pulses are set simultaneously, the highest-priority one fires
  per scan and the rest stay latched (queue behavior).
- Node layout follows docs/specs/PLC_Tag_List.md section 19.

Run:
    python -m app.integration.opcua_server

Environment:
    TRAYPACKER_API_URL       default http://localhost:8000
    OPCUA_ENDPOINT           default opc.tcp://localhost:4840/traypacker/
    OPCUA_SCAN_INTERVAL_SEC  default 0.1 (matches the fixed dt=0.1 in /plc/scan)
    OPCUA_ALLOW_SAFETY_WRITES  default unset. Set to 1 to make the safety
                             input nodes (safety_ok, estop_ok, guards_closed,
                             utilities_ok) writable by OPC UA clients.

Security:
    No OPC UA security policy is configured: the server accepts anonymous,
    unencrypted sessions and any client may write the writable nodes. At
    startup a WARNING is logged if the endpoint host is not loopback
    (127.0.0.1 / localhost / ::1). Do not expose this bridge to an
    untrusted network. Safety inputs are read-only unless
    OPCUA_ALLOW_SAFETY_WRITES=1.

Input forwarding:
    Only `Inputs/*` values a client has *changed* since the last successful
    scan are forwarded to /plc/scan, so simulator/scenario-owned inputs are
    never overwritten by stale node defaults. The first scan forwards nothing.

Failure handling:
    Command pulses are reset only after a successful POST (otherwise they
    stay True and are retried). On scan failure the mirrored status nodes are
    given a Bad status (BadCommunicationError) so clients do not read stale
    data as good, and the scan interval backs off exponentially up to 2 s.
    Limitation: asyncua offers no compare-and-set, so a client re-writing
    True to a pulse between the bridge's read and reset is coalesced with
    the pulse being consumed.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any
from urllib.parse import urlparse

import httpx
from asyncua import Server, ua

log = logging.getLogger(__name__)

NAMESPACE_URI = "urn:traypacker:opcua"

# Canonical command codes (see PLCStyleController._execute_command_code)
COMMAND_PRIORITY: list[tuple[str, int]] = [
    ("start", 1),
    ("stop", 2),
    ("reset", 3),
    ("run_empty", 4),
    ("mode_auto", 5),
    ("mode_manual", 6),
    ("ack_alarm", 7),
    ("clear_counts", 8),
    ("refill_blanks", 9),
    ("clear_rejects", 10),
]

INPUT_NAMES = [
    "product_available",
    "blank_available",
    "downstream_available",
    "safety_ok",
    "estop_ok",
    "guards_closed",
    "utilities_ok",
]

# Inputs that represent safety state; read-only for clients by default.
SAFETY_INPUT_NAMES = frozenset({"safety_ok", "estop_ok", "guards_closed", "utilities_ok"})

LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})
MAX_BACKOFF_SEC = 2.0

# Declarative snapshot -> node mapping: node_name -> (snapshot_group, field, default)
STATUS_NODES: dict[str, tuple[str, str, Any]] = {
    "MachineState": ("sts", "machine_state", 0),
    "MachineMode": ("sts", "machine_mode", 0),
    "CyclePhase": ("sts", "cycle_phase", 0),
    "CyclePhaseProgress": ("sts", "cycle_phase_progress", 0.0),
    "ReadyToStart": ("sts", "ready_to_start", True),
    "CycleActive": ("sts", "cycle_active", False),
    "RunEmptyActive": ("sts", "run_empty_active", False),
    "FaultActive": ("sts", "fault_active", False),
    "WarningActive": ("sts", "warning_active", False),
    "StartPermissiveOk": ("sts", "start_permissive_ok", True),
}

OUTPUT_NODES: dict[str, tuple[str, str, Any]] = {
    "GroupedCount": ("out", "grouped_count", 0),
    "TargetGroupCount": ("out", "target_group_count", 24),
    "CycleCount": ("out", "cycle_count", 0),
    "GoodPackCount": ("out", "good_pack_count", 0),
    "RejectPackCount": ("out", "reject_pack_count", 0),
    "RejectAccumulationCount": ("out", "reject_accumulation_count", 0),
    "BlanksRemaining": ("out", "blanks_remaining", 100),
    "TotalProductIn": ("out", "total_product_in", 0),
    "TotalProductUsed": ("out", "total_product_used", 0),
    "RuntimeSec": ("out", "runtime_sec", 0.0),
    "DowntimeSec": ("out", "downtime_sec", 0.0),
    "LastCycleTimeSec": ("out", "last_cycle_time_sec", 0.0),
    "AvgCycleTimeSec": ("out", "avg_cycle_time_sec", 0.0),
    "LastPackResult": ("out", "last_pack_result", 0),
    "LastRejectReason": ("out", "last_reject_reason", 0),
}

FAULT_NODES: dict[str, tuple[str, str, Any]] = {
    "ActiveCode": ("fault", "active_code", 0),
    "ActiveSeverity": ("fault", "active_severity", 0),
    "Latched": ("fault", "latched", False),
    "ActiveCount": ("fault", "active_count", 0),
    "LastAcknowledged": ("fault", "last_acknowledged", 0),
}

WARNING_NODES: dict[str, tuple[str, str, Any]] = {
    "ActiveCode": ("warn", "active_code", 0),
    "ActiveCount": ("warn", "active_count", 0),
}

SENSOR_NODES: dict[str, tuple[str, str, Any]] = {
    "DividerGapClear": ("sns", "divider_gap_clear", True),
    "DividerMinJamOk": ("sns", "divider_min_jam_ok", True),
    "LaneFillOk": ("sns", "lane_fill_ok", False),
    "LaneFillMismatch": ("sns", "lane_fill_mismatch", False),
    "StopperClosed": ("sns", "stopper_closed", True),
    "TerminalClosed": ("sns", "terminal_closed", False),
    "TransferGapClear": ("sns", "transfer_gap_clear", True),
    "TrayStackPresent": ("sns", "tray_stack_present", True),
    "TrayVacuumOk": ("sns", "tray_vacuum_ok", False),
    "TrayPositioned": ("sns", "tray_positioned", False),
    "TrayInTransport": ("sns", "tray_in_transport", False),
    "ChainClear": ("sns", "chain_clear", True),
    "OutletSensorOk": ("sns", "outlet_sensor_ok", True),
    "TrayPlateSensorOk": ("sns", "tray_plate_sensor_ok", True),
    "OpenFlapDetected": ("sns", "open_flap_detected", False),
}

DIAGNOSTICS_NODES: dict[str, tuple[str, str, Any]] = {
    "ScanCounter": ("plc", "scan_counter", 0),
    "HeartbeatCounter": ("plc", "heartbeat_counter", 0),
    "CommsHealthy": ("plc", "comms_healthy", True),
    "CommandAckCode": ("plc", "command_ack_code", 0),
    "LastCommandCode": ("plc", "last_command_code", 0),
    "CurrentMode": ("plc", "current_mode", 0),
    "ModeAck": ("plc", "mode_ack", False),
    "ScanDurationMs": ("plc", "scan_duration_ms", 0.0),
}


MIRROR_FOLDERS: tuple[tuple[str, dict[str, tuple[str, str, Any]]], ...] = (
    ("Status", STATUS_NODES),
    ("Outputs", OUTPUT_NODES),
    ("Faults", FAULT_NODES),
    ("Warnings", WARNING_NODES),
    ("Sensors", SENSOR_NODES),
    ("Diagnostics", DIAGNOSTICS_NODES),
)


def build_scan_request(
    pulses: dict[str, bool],
    recipe_select: str | None,
    inputs: dict[str, bool] | None = None,
) -> tuple[dict, list[str]]:
    """Translate client-written command nodes into a /plc/scan payload.

    Args:
        pulses: command name -> current node value (True means fire).
        recipe_select: requested recipe id string, or None/empty.
        inputs: only the inputs a client has changed since the last scan.
            The `inputs` key is omitted from the payload when empty.

    Returns:
        (request_payload, consumed_pulse_names). Only the fired command is
        consumed; remaining set pulses stay latched for subsequent scans.
    """
    consumed: list[str] = []
    request: dict[str, Any] = {"command_code": 0}

    for name, code in COMMAND_PRIORITY:
        if pulses.get(name):
            request["command_code"] = code
            consumed.append(name)
            break

    if recipe_select:
        request["recipe_select"] = recipe_select

    mirrored_inputs = {k: bool(v) for k, v in (inputs or {}).items() if k in INPUT_NAMES}
    if mirrored_inputs:
        request["inputs"] = mirrored_inputs

    return request, consumed


class OpcUaBridge:
    """Bridges an asyncua server to the /plc/scan contract."""

    def __init__(
        self,
        api_base_url: str = "http://localhost:8000",
        endpoint: str = "opc.tcp://localhost:4840/traypacker/",
        scan_interval_sec: float = 0.1,
        allow_safety_writes: bool | None = None,
    ) -> None:
        self.api_base_url = api_base_url.rstrip("/")
        self.endpoint = endpoint
        self.scan_interval_sec = scan_interval_sec
        self.server = Server()
        self._nodes: dict[str, Any] = {}
        self._comms_healthy = False
        if allow_safety_writes is None:
            allow_safety_writes = os.environ.get("OPCUA_ALLOW_SAFETY_WRITES") == "1"
        self.allow_safety_writes = allow_safety_writes
        self._client: httpx.AsyncClient | None = None
        self._last_inputs: dict[str, bool] | None = None  # last-forwarded/seen
        self._consecutive_failures = 0
        self._status_marked_bad = False

    def _warn_if_insecure(self) -> None:
        host = urlparse(self.endpoint).hostname or ""
        if host.lower() not in LOOPBACK_HOSTS:
            log.warning(
                "OPC UA endpoint %s is not loopback: no security policy is "
                "configured, so the server allows anonymous unencrypted writes "
                "from any reachable client.",
                self.endpoint,
            )
        if self.allow_safety_writes:
            log.warning("OPCUA_ALLOW_SAFETY_WRITES=1: safety inputs are writable.")

    # ------------------------------------------------------------------ #
    #  Address space setup                                               #
    # ------------------------------------------------------------------ #

    async def setup(self) -> None:
        """Initialize the server and populate the address space."""
        await self.server.init()
        self.server.set_endpoint(self.endpoint)
        self._warn_if_insecure()
        idx = await self.server.register_namespace(NAMESPACE_URI)

        root = await self.server.nodes.objects.add_object(idx, "TrayPacker")

        async def _folder(name: str) -> Any:
            return await root.add_object(idx, name)

        commands = await _folder("Commands")
        for name, _code in COMMAND_PRIORITY:
            self._nodes[f"cmd.{name}"] = await commands.add_variable(
                idx, _snake_to_pascal(name), False
            )
            await self._nodes[f"cmd.{name}"].set_writable()
        self._nodes["cmd.recipe_select"] = await commands.add_variable(
            idx, "RecipeSelect", ""
        )
        await self._nodes["cmd.recipe_select"].set_writable()

        inputs = await _folder("Inputs")
        for name in INPUT_NAMES:
            self._nodes[f"in.{name}"] = await inputs.add_variable(
                idx, _snake_to_pascal(name), True
            )
            if name in SAFETY_INPUT_NAMES and not self.allow_safety_writes:
                continue  # safety inputs are read-only unless explicitly enabled
            await self._nodes[f"in.{name}"].set_writable()

        for folder_name, mapping in (
            ("Status", STATUS_NODES),
            ("Outputs", OUTPUT_NODES),
            ("Faults", FAULT_NODES),
            ("Warnings", WARNING_NODES),
            ("Sensors", SENSOR_NODES),
            ("Diagnostics", DIAGNOSTICS_NODES),
        ):
            folder = await _folder(folder_name)
            for node_name, (_group, _field, default) in mapping.items():
                self._nodes[f"{folder_name}.{node_name}"] = await folder.add_variable(
                    idx, node_name, default
                )

        log.info("OPC UA address space populated at %s", self.endpoint)

    # ------------------------------------------------------------------ #
    #  Scan cycle                                                        #
    # ------------------------------------------------------------------ #

    async def poll_once(self) -> None:
        """Execute one bridge scan: read clients, call /plc/scan, write back."""
        t0 = time.monotonic()

        pulses = {
            name: bool(await self._nodes[f"cmd.{name}"].read_value())
            for name, _code in COMMAND_PRIORITY
        }
        recipe_select = str(await self._nodes["cmd.recipe_select"].read_value()).strip()
        current_inputs = {
            name: bool(await self._nodes[f"in.{name}"].read_value())
            for name in INPUT_NAMES
        }
        if self._last_inputs is None:
            # First scan: adopt node values as the baseline, forward nothing.
            self._last_inputs = dict(current_inputs)
        changed = {
            k: v for k, v in current_inputs.items() if self._last_inputs.get(k) != v
        }

        request, consumed = build_scan_request(pulses, recipe_select or None, changed)

        ok = False
        try:
            snapshot = await self._post_scan(request)
            await self._write_snapshot(snapshot)
            ok = True
        except Exception as exc:  # noqa: BLE001 - bridge must survive API outages
            log.warning("Scan failed (%s); will retry next cycle", exc)

        self._comms_healthy = ok
        if ok:
            self._consecutive_failures = 0
            self._status_marked_bad = False
            self._last_inputs.update(changed)
            # Reset only pulses that were read True and consumed, and only
            # after a successful POST. (No CAS in asyncua: a client re-write
            # of True between read and reset is coalesced; see module doc.)
            for name in consumed:
                await self._nodes[f"cmd.{name}"].write_value(False)
        else:
            self._consecutive_failures += 1
            # Pulses and changed inputs are kept so they are retried.
            if not self._status_marked_bad:
                await self._mark_mirror_bad()
                self._status_marked_bad = True

        await self._nodes["Diagnostics.CommsHealthy"].write_value(self._comms_healthy)

        elapsed = time.monotonic() - t0
        delay = self.scan_interval_sec
        if self._consecutive_failures:
            delay = min(
                MAX_BACKOFF_SEC,
                self.scan_interval_sec * (2 ** self._consecutive_failures),
            )
        await asyncio.sleep(max(0.0, delay - elapsed))

    async def _mark_mirror_bad(self) -> None:
        """Flag every mirrored node Bad so clients don't read stale values as good.

        The next successful snapshot write restores a Good status.
        """
        bad = ua.StatusCode(ua.StatusCodes.BadCommunicationError)
        for folder_name, mapping in MIRROR_FOLDERS:
            for node_name, (group, field, _default) in mapping.items():
                if group == "plc" and field == "comms_healthy":
                    continue  # reflects transport state; always written good
                node = self._nodes[f"{folder_name}.{node_name}"]
                try:
                    dv = await node.read_data_value()
                    await node.write_value(ua.DataValue(Value=dv.Value, StatusCode=bad))
                except Exception as exc:  # noqa: BLE001
                    log.debug("Could not mark %s.%s bad: %s", folder_name, node_name, exc)

    async def run(self) -> None:
        """Serve until cancelled."""
        await self.setup()
        log.info(
            "Starting OPC UA bridge: endpoint=%s api=%s interval=%.3fs",
            self.endpoint,
            self.api_base_url,
            self.scan_interval_sec,
        )
        self._client = httpx.AsyncClient(timeout=2.0)
        try:
            async with self.server:
                while True:
                    await self.poll_once()
        finally:
            await self._client.aclose()
            self._client = None

    # ------------------------------------------------------------------ #
    #  Transport                                                         #
    # ------------------------------------------------------------------ #

    async def _post_scan(self, request: dict) -> dict:
        """POST one scan cycle to the API and return the snapshot dict."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=2.0)
        response = await self._client.post(f"{self.api_base_url}/plc/scan", json=request)
        response.raise_for_status()
        return response.json()

    async def _write_snapshot(self, snapshot: dict) -> None:
        """Write all read-only mirror nodes from a PlcSnapshot dict."""
        for folder_name, mapping in (
            ("Status", STATUS_NODES),
            ("Outputs", OUTPUT_NODES),
            ("Faults", FAULT_NODES),
            ("Warnings", WARNING_NODES),
            ("Sensors", SENSOR_NODES),
            ("Diagnostics", DIAGNOSTICS_NODES),
        ):
            for node_name, (group, field, _default) in mapping.items():
                if group == "plc" and field == "comms_healthy":
                    continue  # written separately from live transport state
                value = snapshot[group][field]
                await self._nodes[f"{folder_name}.{node_name}"].write_value(value)


def _snake_to_pascal(name: str) -> str:
    return "".join(part.capitalize() for part in name.split("_"))


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    bridge = OpcUaBridge(
        api_base_url=os.environ.get("TRAYPACKER_API_URL", "http://localhost:8000"),
        endpoint=os.environ.get("OPCUA_ENDPOINT", "opc.tcp://localhost:4840/traypacker/"),
        scan_interval_sec=float(os.environ.get("OPCUA_SCAN_INTERVAL_SEC", "0.1")),
    )
    await bridge.run()


if __name__ == "__main__":
    asyncio.run(main())
