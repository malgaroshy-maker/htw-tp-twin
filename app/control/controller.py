from __future__ import annotations

import time

from app.shared.enums import MachineMode, MachineState
from app.shared.tag_store import TagStore
from app.shared.plc_mapping import tag_store_to_plc_snapshot


class PLCStyleController:
    """Refined PLC-style command validator and HMI flag manager."""

    def __init__(self, tag_store: TagStore) -> None:
        self.tags = tag_store

    def update(self) -> None:
        """Simulate a PLC scan cycle: evaluate permissives and update HMI flags."""
        self._evaluate_permissives()
        self._update_hmi_flags()

    def scan_cycle(self, commands_in: dict | None = None) -> dict:
        """Transactional cyclic exchange for PLC integration.

        This is the primary entry point for a future Siemens PLC controller.
        It performs a deterministic scan cycle:
        1. Accept commands/inputs from PLC
        2. Evaluate permissives and update HMI flags
        3. Increment scan counter and heartbeat
        4. Return deterministic snapshot

        Args:
            commands_in: Optional dict with command fields to apply before scan.
                Expected keys: start, stop, reset, run_empty, requested_mode,
                recipe_select, ack_alarm, clear_counts, refill_blanks, clear_rejects

        Returns:
            Deterministic snapshot dict with sts, out, fault, warn, sns, plc, hmi groups.
        """
        scan_start = time.monotonic()
        plc = self.tags.state.plc

        # Reset command acknowledgement at start of each scan
        plc["command_ack_code"] = 0

        # Apply incoming commands if provided
        if commands_in:
            self._apply_plc_commands(commands_in)

        # Execute scan
        self._evaluate_permissives()
        self._update_hmi_flags()
        self._update_mode_handshake()

        # Re-apply commands after HMI flags are updated (for command validation)
        if commands_in:
            # Reset ack and re-evaluate
            plc["command_ack_code"] = 0
            cmd_code = commands_in.get("command_code", 0)
            if cmd_code:
                plc["last_command_code"] = cmd_code
                accepted = self._execute_command_code(cmd_code, commands_in)
                plc["command_ack_code"] = 1 if accepted else 2

        # Increment scan counter and heartbeat
        plc["scan_counter"] += 1
        plc["heartbeat_counter"] += 1
        plc["last_scan_ts"] = time.monotonic()

        scan_end = time.monotonic()
        plc["scan_duration_ms"] = (scan_end - scan_start) * 1000

        # Clear pulse commands after scan
        self.tags.pulse_clear()

        # Return deterministic PLC-facing snapshot
        return tag_store_to_plc_snapshot(self.tags)

    def check_comms_health(self, current_time: float | None = None) -> bool:
        """Check if communications are healthy based on heartbeat freshness.

        Args:
            current_time: Optional current time (defaults to time.monotonic()).

        Returns:
            True if heartbeat is recent, False if stale.
        """
        plc = self.tags.state.plc
        now = current_time or time.monotonic()
        timeout = plc["comms_timeout_sec"]

        if plc["last_scan_ts"] == 0.0:
            # First scan hasn't happened yet
            plc["comms_healthy"] = True
            return True

        elapsed = now - plc["last_scan_ts"]
        was_healthy = plc["comms_healthy"]
        plc["comms_healthy"] = elapsed < timeout

        if was_healthy and not plc["comms_healthy"]:
            # Log comms loss
            self.tags.state.evt["last_event_code"] = "COMMS_LOST"
            self.tags.state.evt["last_event_text"] = f"Communications lost (no scan for {elapsed:.1f}s)"

        return plc["comms_healthy"]

    def _apply_plc_commands(self, commands: dict) -> None:
        """Apply commands from PLC with validation and acknowledgement.

        Uses integer command codes for PLC-friendly interface:
        1=START, 2=STOP, 3=RESET, 4=RUN_EMPTY, 5=MODE_AUTO, 6=MODE_MANUAL,
        7=ACK_ALARM, 8=CLEAR_COUNTS, 9=REFILL_BLANKS, 10=CLEAR_REJECTS
        """
        plc = self.tags.state.plc
        cmd = self.tags.state.cmd

        # Reset acknowledgement from previous cycle
        plc["command_ack_code"] = 0

        # Process command code if provided
        cmd_code = commands.get("command_code", 0)
        if cmd_code:
            plc["last_command_code"] = cmd_code
            accepted = self._execute_command_code(cmd_code, commands)
            plc["command_ack_code"] = 1 if accepted else 2

        # Process mode request if provided
        if "requested_mode" in commands:
            requested = commands["requested_mode"]
            if requested in (0, 1):  # 0=AUTO, 1=MANUAL
                self.tags.write_plc("requested_mode", requested)

        # Process recipe selection if provided
        if "recipe_select" in commands:
            recipe_id = commands["recipe_select"]
            if self.tags.state.hmi["recipe_change_enabled"]:
                self.tags.write_cmd("recipe_select", recipe_id)
                plc["command_ack_code"] = 1

    def _execute_command_code(self, code: int, params: dict) -> bool:
        """Execute a command by integer code. Returns True if accepted."""
        hmi = self.tags.state.hmi

        command_map = {
            1: ("start", hmi["start_button_enabled"]),
            2: ("stop", hmi["stop_button_enabled"]),
            3: ("reset", hmi["reset_button_enabled"]),
            4: ("run_empty", hmi["stop_button_enabled"]),
            5: ("mode_auto", hmi["auto_mode_enabled"]),
            6: ("mode_manual", hmi["manual_mode_enabled"]),
            7: ("ack_alarm", True),
            8: ("clear_counts", True),
            9: ("refill_blanks", True),
            10: ("clear_rejects", True),
        }

        if code not in command_map:
            return False

        key, enabled = command_map[code]
        if enabled:
            self.tags.write_cmd(key, True)
            return True
        return False

    def _update_mode_handshake(self) -> None:
        """Update mode handshake between requested and current mode."""
        plc = self.tags.state.plc
        sts = self.tags.state.sts

        current_mode = 0 if sts["machine_mode"] == MachineMode.AUTO.value else 1
        plc["current_mode"] = current_mode

        # Acknowledge if current mode matches requested mode
        if plc["requested_mode"] == current_mode:
            plc["mode_ack"] = True
        else:
            plc["mode_ack"] = False

    def request_start(self) -> bool:
        """Request machine start if permissives are met."""
        sts = self.tags.state.sts
        if self.tags.state.hmi["start_button_enabled"]:
            self.tags.write_cmd("start", True)
            return True
        return False

    def request_stop(self) -> bool:
        """Request machine stop (Run Empty)."""
        if self.tags.state.hmi["stop_button_enabled"]:
            self.tags.write_cmd("stop", True)
            return True
        return False

    def request_run_empty(self) -> bool:
        """Explicit run empty request."""
        if self.tags.state.hmi["stop_button_enabled"]:
            self.tags.write_cmd("run_empty", True)
            return True
        return False

    def request_reset(self) -> bool:
        """Request fault reset."""
        if self.tags.state.hmi["reset_button_enabled"]:
            self.tags.write_cmd("reset", True)
            return True
        return False

    def select_recipe(self, recipe_id: str) -> bool:
        """Request recipe change."""
        if self.tags.state.hmi["recipe_change_enabled"]:
            self.tags.write_cmd("recipe_select", recipe_id)
            return True
        return False

    def request_mode_auto(self) -> bool:
        """Request switch to AUTO mode."""
        if self.tags.state.hmi["auto_mode_enabled"]:
            self.tags.write_sts("machine_mode", MachineMode.AUTO.value)
            self.tags.write_cmd("mode_auto", True)
            self.tags.write_cmd("mode_manual", False)
            return True
        return False

    def request_mode_manual(self) -> bool:
        """Request switch to MANUAL mode."""
        if self.tags.state.hmi["manual_mode_enabled"]:
            self.tags.write_sts("machine_mode", MachineMode.MANUAL.value)
            self.tags.write_cmd("mode_auto", False)
            self.tags.write_cmd("mode_manual", True)
            return True
        return False

    def refill_blanks(self) -> bool:
        """Refill the blank magazine to 100. Restores blank_available input.

        Per the operating manual: refilling blanks restores material availability
        but does NOT auto-clear a latched fault. The operator must still press Reset.
        """
        self.tags.write_cmd("refill_blanks", True)
        self.tags.write_inputs("blank_available", True)
        return True

    def request_clear_rejects(self) -> bool:
        """Request clearing the reject bin."""
        self.tags.write_cmd("clear_rejects", True)
        return True


    def _evaluate_permissives(self) -> None:
        """Consolidated start permissive logic including sensor checks."""
        inputs = self.tags.state.inputs
        sts = self.tags.state.sts
        fault = self.tags.state.fault
        sns = self.tags.state.sns

        # Start Permissive OK if:
        # - AUTO mode
        # - No latched fault
        # - Safety chain OK
        # - E-Stop OK
        # - Guards closed
        # - Utilities OK
        # - Blank available (tray stack present)
        # - Transfer zone clear (local interlock)
        start_ok = (
            sts["machine_mode"] == MachineMode.AUTO.value
            and not fault["latched"]
            and inputs["safety_ok"]
            and inputs["estop_ok"]
            and inputs["guards_closed"]
            and inputs["utilities_ok"]
            and inputs["blank_available"]
            and sns["transfer_gap_clear"]
            and sns["tray_stack_present"]
        )
        
        sts["start_permissive_ok"] = start_ok
        sts["ready_to_start"] = start_ok

    def _update_hmi_flags(self) -> None:
        """Update helper flags for HMI button enable/disable logic."""
        sts = self.tags.state.sts
        hmi = self.tags.state.hmi
        fault = self.tags.state.fault
        state = sts["machine_state"]
        mode = sts["machine_mode"]

        # Start Button: Enabled if permissives OK and machine is in a startable state
        hmi["start_button_enabled"] = (
            sts["start_permissive_ok"] 
            and state in {MachineState.STOPPED.value, MachineState.STARVED.value, MachineState.BLOCKED.value}
        )

        # Stop Button: Enabled if machine is doing something
        hmi["stop_button_enabled"] = state in {
            MachineState.STARTING.value,
            MachineState.RUNNING.value,
            MachineState.STARVED.value,
            MachineState.BLOCKED.value,
            MachineState.RUN_EMPTY.value,
        }

        # Reset Button: Only in FAULTED state
        hmi["reset_button_enabled"] = (state == MachineState.FAULTED.value)

        # Recipe Change: Only if STOPPED or MANUAL
        hmi["recipe_change_enabled"] = (
            state == MachineState.STOPPED.value 
            or mode == MachineMode.MANUAL.value
        )

        # Mode Switching: Only if not actively running/starting
        can_switch_mode = state in {
            MachineState.STOPPED.value,
            MachineState.FAULTED.value,
            MachineState.STARVED.value,
            MachineState.BLOCKED.value,
        }
        hmi["auto_mode_enabled"] = can_switch_mode and mode != MachineMode.AUTO.value
        hmi["manual_mode_enabled"] = can_switch_mode and mode != MachineMode.MANUAL.value

        # Banners
        hmi["show_fault_banner"] = sts["fault_active"]
        hmi["show_warning_banner"] = sts["warning_active"]

        # Status Lamp Color
        if state == MachineState.FAULTED.value:
            hmi["status_lamp_color"] = "red"
        elif state == MachineState.RUNNING.value:
            hmi["status_lamp_color"] = "green"
        elif state in {MachineState.STARVED.value, MachineState.BLOCKED.value}:
            hmi["status_lamp_color"] = "yellow"
        elif state == MachineState.STARTING.value:
            hmi["status_lamp_color"] = "blue"
        elif state == MachineState.RUN_EMPTY.value:
            hmi["status_lamp_color"] = "purple"
        else:
            hmi["status_lamp_color"] = "gray"

        # Footer Message
        warn = self.tags.state.warn
        if state == MachineState.FAULTED.value:
            hmi["footer_message"] = f"Fault: {fault['active_code']} - {fault['active_text']}"
        elif sts["warning_active"] and warn["active_code"]:
            hmi["footer_message"] = f"Warning: {warn['active_code']} - {warn['active_text']}"
        elif state == MachineState.STARVED.value:
            hmi["footer_message"] = "Waiting for product supply..."
        elif state == MachineState.BLOCKED.value:
            hmi["footer_message"] = "Outfeed blocked, waiting for clearance..."
        elif state == MachineState.RUN_EMPTY.value:
            hmi["footer_message"] = "Run Empty active - clearing machine..."
        elif state == MachineState.STARTING.value:
            hmi["footer_message"] = "Machine starting up..."
        elif state == MachineState.RUNNING.value:
            hmi["footer_message"] = "Production Running"
        else:
            hmi["footer_message"] = "System Ready - Press Start"
