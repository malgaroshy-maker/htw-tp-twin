from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.shared.enums import CyclePhase, MachineMode, MachineState, PackResult, Severity
from app.shared.events import EventLogger
from app.shared.models import FaultDefinition, Recipe
from app.shared.tag_store import TagStore, TagValidationError
from app.simulator.config_loader import load_faults, load_recipes
from app.simulator.scenario_runner import ScenarioRunner

# Configurable cycle phase time splits
PHASE_SPLITS = {
    "blank_feed": 0.20,
    "transfer": 0.10,
    "packing": 0.35,
    "discharge": 0.25,
    "overhead": 0.10,
}

# Blank shortage thresholds
BLANK_LOW_THRESHOLD = 20       # Warning when blanks drop below this
BLANK_EMPTY_ESCALATION_CYCLES = 3  # Escalate to fault after N cycles with no blanks


@dataclass
class SimulatorContext:
    recipes: dict[str, Recipe]
    faults: dict[str, FaultDefinition]


class SimulatorEngine:
    """Behavioral tray packer simulator engine with virtual sensor model."""

    def __init__(
        self,
        tag_store: TagStore,
        recipes_path: str | Path = "configs/recipes.json",
        faults_path: str | Path = "configs/faults.json",
        rng: random.Random | None = None,
    ) -> None:
        self.tags = tag_store
        self.event_logger = EventLogger()
        self.rng = rng or random.Random()
        self.scenario_runner = ScenarioRunner(self)

        recipes = load_recipes(recipes_path)
        faults = load_faults(faults_path)

        self.ctx = SimulatorContext(
            recipes={r.recipe_id: r for r in recipes},
            faults={f.fault_id: f for f in faults},
        )

        self._startup_remaining = 0.0
        self._phase_timer = 0.0
        self._product_timer = 0.0
        self._capture_timer = 0.0
        self._transfer_timer = 0.0

        # BLANK_FEED internal sub-sequence state
        self._blank_feed_subphase = "magazine_check"  # magazine_check → suction → position → ready
        self._blank_feed_subtimer = 0.0

        # DISCHARGE internal sub-sequence state
        self._discharge_subphase = "outlet_check"  # outlet_check → quality_decision → good_travel/reject_divert → complete
        self._discharge_subtimer = 0.0
        self._discharge_quality_decided = False
        self._discharge_is_reject = False
        self._discharge_reason = ""

        # Warning escalation tracking
        self._blank_empty_cycles = 0  # Cycles attempted with no blanks available

    @property
    def active_faults(self) -> list[FaultDefinition]:
        """Provides easy access to the currently active fault definition."""
        if self.tags.state.sts["fault_active"]:
            fault_code = self.tags.state.fault["active_code"]
            if fault_code in self.ctx.faults:
                return [self.ctx.faults[fault_code]]
        return []

    # ------------------------------------------------------------------ #
    #  Controlled Write Helpers                                          #
    # ------------------------------------------------------------------ #

    def _w_sts(self, key: str, value: Any) -> None:
        """Write to status tag with validation."""
        try:
            self.tags.write_sts(key, value)
        except TagValidationError:
            pass  # Silently ignore invalid writes during simulation

    def _w_out(self, key: str, value: Any) -> None:
        """Write to output/counter tag with validation."""
        try:
            self.tags.write_out(key, value)
        except TagValidationError:
            pass

    def _w_sns(self, key: str, value: Any) -> None:
        """Write to sensor tag with validation."""
        try:
            self.tags.write_sns(key, value)
        except TagValidationError:
            pass

    def _w_fault(self, key: str, value: Any) -> None:
        """Write to fault tag with validation."""
        try:
            self.tags.write_fault(key, value)
        except TagValidationError:
            pass

    def _w_warn(self, key: str, value: Any) -> None:
        """Write to warning tag with validation."""
        try:
            self.tags.write_warn(key, value)
        except TagValidationError:
            pass

    def _w_inputs(self, key: str, value: Any) -> None:
        """Write to input tag with validation."""
        try:
            self.tags.write_inputs(key, value)
        except TagValidationError:
            pass

    def update(self, dt: float) -> None:
        """Main simulation update loop."""
        # Only sync recipe if ID changed to allow scenario overrides
        active_id = self.tags.state.cfg["active_recipe_id"]
        if getattr(self, "_last_synced_recipe", None) != active_id:
            self._apply_recipe()
            self._last_synced_recipe = active_id

        self.scenario_runner.update(dt)
        self._process_commands()
        self._update_virtual_sensors(dt)
        self._process_warning_escalation(dt)

        # Mode-based gating: AUTO vs MANUAL
        is_manual = self.tags.state.sts["machine_mode"] == MachineMode.MANUAL.value
        if is_manual:
            self._process_manual_jog_commands()
        else:
            self._process_state_transitions(dt)
            self._process_cycle_phases(dt)

        self._update_runtime_metrics(dt)
        self.tags.pulse_clear()

    # ------------------------------------------------------------------ #
    #  Virtual Sensor Updates                                            #
    # ------------------------------------------------------------------ #

    def _update_virtual_sensors(self, dt: float) -> None:
        """Update all virtual sensor states based on current machine behavior.

        Sensors are derived from simulator internals — they represent what
        physical sensors would read at this moment.
        """
        sns = self.tags.state.sns
        sts = self.tags.state.sts
        out = self.tags.state.out
        inputs = self.tags.state.inputs
        recipe_id = self.tags.state.cfg["active_recipe_id"]
        recipe = self.ctx.recipes.get(recipe_id)
        target = recipe.products_per_pack if recipe else 1

        # --- Divider sensors ---
        self._w_sns("divider_gap_clear", inputs["product_available"] or out["grouped_count"] > 0)
        self._w_sns("divider_min_jam_ok", inputs["product_available"] or sts["machine_state"] in {
            MachineState.STOPPED.value,
            MachineState.STARVED.value,
        })

        # --- Lane fill sensors ---
        self._w_sns("lane_fill_ok", out["grouped_count"] >= target)
        self._w_sns("lane_fill_mismatch", out["grouped_count"] > target)

        # --- Stopper / terminal sensors ---
        phase = sts["cycle_phase"]
        if phase in {CyclePhase.GROUPING.value, CyclePhase.IDLE.value}:
            self._w_sns("stopper_closed", True)
            self._w_sns("terminal_closed", False)
        elif phase == CyclePhase.CAPTURED.value:
            self._w_sns("stopper_closed", True)
            self._w_sns("terminal_closed", True)
        elif phase in {CyclePhase.BLANK_FEED.value, CyclePhase.TRANSFER.value}:
            self._w_sns("stopper_closed", False)
            self._w_sns("terminal_closed", True)
        else:
            self._w_sns("stopper_closed", False)
            self._w_sns("terminal_closed", False)

        # --- Transfer interlock sensor ---
        self._w_sns("transfer_gap_clear", inputs["downstream_available"])

        # --- Tray / blank sensors ---
        self._w_sns("tray_stack_present", out["blanks_remaining"] > 0 and inputs["blank_available"])
        self._w_sns("tray_vacuum_ok", (
            self._blank_feed_subphase == "suction"
            and inputs["blank_available"]
            and out["blanks_remaining"] > 0
        ))
        self._w_sns("tray_positioned", (
            self._blank_feed_subphase in {"position", "ready"}
            and inputs["blank_available"]
        ))
        self._w_sns("tray_in_transport", (
            phase in {CyclePhase.TRANSFER.value, CyclePhase.PACKING.value, CyclePhase.DISCHARGE.value}
            and inputs["blank_available"]
            and self._blank_feed_subphase == "ready"
        ))

        # --- Forming / chain sensor ---
        self._w_sns("chain_clear", inputs["downstream_available"])

        # --- Discharge / outlet sensor ---
        if phase != CyclePhase.DISCHARGE.value:
            self._w_sns("open_flap_detected", False)

    # ------------------------------------------------------------------ #
    #  Warning Escalation                                                #
    # ------------------------------------------------------------------ #

    def _process_warning_escalation(self, dt: float) -> None:
        """Evaluate warning conditions and escalate to faults when appropriate.

        Warnings are based on active production conditions, not raw time.
        A warning auto-clears when the condition resolves.
        A warning escalates to a fault only when the machine is running or
        trying to produce and the shortage remains unresolved.
        """
        out = self.tags.state.out
        inputs = self.tags.state.inputs
        sts = self.tags.state.sts
        warn = self.tags.state.warn
        is_running = sts["machine_state"] in {
            MachineState.RUNNING.value,
            MachineState.STARTING.value,
        }

        # --- Blank shortage warnings ---
        blanks = out["blanks_remaining"]

        # If machine is faulted, clear warnings (fault supersedes)
        if sts["fault_active"]:
            if warn["active_code"]:
                self._clear_warning()
            return

        if blanks <= 0 or not inputs["blank_available"]:
            # No blanks available
            if is_running or sts["machine_state"] in {
                MachineState.STARVED.value,
                MachineState.BLOCKED.value,
            }:
                self._blank_empty_cycles += 1
            if self._blank_empty_cycles >= BLANK_EMPTY_ESCALATION_CYCLES:
                # Escalate to fault — machine has been trying to produce without blanks
                if not sts["fault_active"] or self.tags.state.fault["active_code"] != "BLANK_MISSING":
                    self._trigger_fault("BLANK_MISSING")
            else:
                # Warning: blank empty but not yet escalated
                if warn["active_code"] != "BLANK_EMPTY":
                    self._trigger_warning("BLANK_EMPTY", "Blank magazine empty — refill required")
        elif blanks <= BLANK_LOW_THRESHOLD:
            # Warning: blanks running low
            self._blank_empty_cycles = 0  # Reset escalation counter
            if warn["active_code"] != "BLANK_LOW":
                self._trigger_warning("BLANK_LOW", f"Blank magazine low ({blanks} remaining)")
        else:
            # Blanks healthy — clear any blank-related warnings
            self._blank_empty_cycles = 0
            if warn["active_code"] in ("BLANK_LOW", "BLANK_EMPTY"):
                self._clear_warning()

        # Update warning_active status flag
        self._w_sts("warning_active", self.tags.state.warn["active_code"] != "")

    def _trigger_warning(self, code: str, text: str) -> None:
        """Set an active warning. Warnings do not stop the machine."""
        warn = self.tags.state.warn
        self._w_warn("active_code", code)
        self._w_warn("active_text", text)
        self._w_warn("active_severity", Severity.WARNING.value)
        self._w_warn("timestamp", datetime.now(timezone.utc).isoformat())
        self._w_warn("active_count", warn["active_count"] + 1)
        self._w_sts("warning_active", True)
        self._log_event(f"WARNING_{code}", "WARNING", Severity.WARNING, text)

    def _clear_warning(self) -> None:
        """Clear the active warning. No reset required."""
        warn = self.tags.state.warn
        if warn["active_code"]:
            self._log_event(f"WARNING_CLEARED_{warn['active_code']}", "WARNING", Severity.INFO,
                           f"Warning cleared: {warn['active_code']}")
        self._w_warn("active_code", "")
        self._w_warn("active_text", "")
        self._w_warn("timestamp", "")
        self._w_sts("warning_active", False)

    # ------------------------------------------------------------------ #
    #  Recipe Application                                                #
    # ------------------------------------------------------------------ #

    def _apply_recipe(self) -> None:
        recipe_id = self.tags.state.cfg["active_recipe_id"]
        recipe = self.ctx.recipes[recipe_id]
        self.tags.state.cfg["active_recipe_name"] = recipe.recipe_name
        self.tags.state.cfg["target_pack_count"] = recipe.products_per_pack
        self.tags.state.cfg["grid_cols"] = recipe.grid_cols
        self.tags.state.cfg["nominal_cycle_time_sec"] = recipe.nominal_cycle_time_sec
        self.tags.state.cfg["reject_probability"] = recipe.reject_probability
        self.tags.state.cfg["jam_probability"] = recipe.jam_probability
        self.tags.state.out["target_group_count"] = recipe.products_per_pack

    # ------------------------------------------------------------------ #
    #  Command Processing                                                #
    # ------------------------------------------------------------------ #

    def _process_commands(self) -> None:
        cmd = self.tags.state.cmd
        sts = self.tags.state.sts
        out = self.tags.state.out
        inputs = self.tags.state.inputs
        fault_tags = self.tags.state.fault

        # Recipe selection
        if cmd["recipe_select"] and cmd["recipe_select"] in self.ctx.recipes:
            if sts["machine_state"] == MachineState.STOPPED.value or sts["machine_mode"] == MachineMode.MANUAL.value:
                if self.tags.state.cfg["active_recipe_id"] != cmd["recipe_select"]:
                    self.tags.state.cfg["active_recipe_id"] = cmd["recipe_select"]
                    self._log_event("RECIPE_CHANGED", "RECIPE", Severity.INFO, f"Recipe changed to {cmd['recipe_select']}")
            else:
                if self.tags.state.cfg["active_recipe_id"] != cmd["recipe_select"]:
                    self._log_event("RECIPE_CHANGE_DENIED", "RECIPE", Severity.WARNING, "Recipe change denied while running")

        # Start command
        if cmd["start"] and sts["machine_state"] in {
            MachineState.STOPPED.value,
            MachineState.STARVED.value,
            MachineState.BLOCKED.value,
        }:
            if sts["start_permissive_ok"]:
                self._w_sts("machine_state", MachineState.STARTING.value)
                self._startup_remaining = 1.0
                self._log_event("MACHINE_START_REQUESTED", "STATE", Severity.INFO, "Machine start requested")

        # Stop command
        if (cmd["stop"] or cmd["run_empty"]) and sts["machine_state"] in {
            MachineState.RUNNING.value,
            MachineState.STARTING.value,
            MachineState.STARVED.value,
            MachineState.BLOCKED.value,
        }:
            self._w_sts("machine_state", MachineState.RUN_EMPTY.value)
            self._w_sts("run_empty_active", True)
            self._log_event("MACHINE_STOP_REQUESTED", "STATE", Severity.INFO, "Machine stop requested (Run Empty)")

        # Reset command
        if cmd["reset"] and sts["machine_state"] == MachineState.FAULTED.value:
            if out["reject_accumulation_count"] >= 3:
                self._log_event("RESET_DENIED", "FAULT", Severity.WARNING, "Reset denied: Reject bin must be cleared first")
            else:
                self._w_fault("active_code", "")
                self._w_fault("active_text", "")
                self._w_fault("active_severity", Severity.INFO.value)
                self._w_fault("latched", False)
                self._w_fault("active_count", 0)
                self._w_sts("fault_active", False)
                self._w_sts("machine_state", MachineState.STOPPED.value)
                self._log_event("MACHINE_RESET", "STATE", Severity.INFO, "Machine reset completed")

        # Clear Reject Bin command
        if cmd["clear_rejects"]:
            self._w_out("reject_accumulation_count", 0)
            self._log_event("REJECT_BIN_CLEARED", "PRODUCTION", Severity.INFO, "Reject bin cleared by operator")
            if fault_tags["active_code"] in ("REJECT_BIN_FULL", "REJECT_BIN_NEAR_FULL"):
                if fault_tags["active_severity"] == Severity.WARNING.value:
                    self._w_sts("fault_active", False)
                    self._w_fault("active_code", "")
                    self._w_fault("active_text", "")

        # Ack Alarm
        if cmd["ack_alarm"]:
            self._w_fault("last_acknowledged", fault_tags["active_code"])
            self._log_event("ALARM_ACKNOWLEDGED", "FAULT", Severity.INFO, f"Alarm acknowledged: {fault_tags['active_code']}")

        # Clear Counts
        if cmd["clear_counts"]:
            self._w_out("cycle_count", 0)
            self._w_out("good_pack_count", 0)
            self._w_out("reject_pack_count", 0)
            self._w_out("total_product_in", 0)
            self._w_out("total_product_used", 0)
            self._w_out("runtime_sec", 0.0)
            self._w_out("downtime_sec", 0.0)
            self._log_event("COUNTERS_CLEARED", "PRODUCTION", Severity.INFO, "Production counters cleared")

        # Refill Blanks command
        # Per the manual: refilling restores material but does NOT auto-clear a latched fault.
        if cmd["refill_blanks"]:
            self._w_out("blanks_remaining", 100)
            self._w_inputs("blank_available", True)
            self._blank_empty_cycles = 0
            self._log_event("BLANKS_REFILLED", "PRODUCTION", Severity.INFO, "Blank magazine refilled to 100")

    def _process_manual_jog_commands(self) -> None:
        """Process maintenance/setup commands specifically for MANUAL mode."""
        cmd = self.tags.state.cmd
        out = self.tags.state.out
        sts = self.tags.state.sts

        # 1. Jog Infeed: Add one product to the gathering buffer manually.
        if cmd.get("jog_infeed"):
            if out["grouped_count"] < out["target_group_count"]:
                out["grouped_count"] += 1
                self._log_event(
                    "MANUAL_JOG_INFEED",
                    "MANUAL",
                    Severity.INFO,
                    "Manual Infeed Jog: Product added to grouping buffer",
                )

        # 2. Jog Blank Feed: Force internal state into BLANK_FEED phase.
        if cmd.get("jog_blank_feed"):
            sts["cycle_phase"] = CyclePhase.BLANK_FEED.value
            sts["cycle_phase_progress"] = 0.0  # Reset progress to start animation
            self._log_event(
                "MANUAL_JOG_BLANK",
                "MANUAL",
                Severity.INFO,
                "Manual Blank Feed Jog: Blank cycle triggered",
            )

        # 3. Jog Pack Advance: Step to the next phase in the packing cycle.
        if cmd.get("jog_pack_advance"):
            current_phase = CyclePhase(sts["cycle_phase"])
            phases = list(CyclePhase)
            try:
                curr_idx = phases.index(current_phase)
                next_idx = (curr_idx + 1) % len(phases)
                new_phase = phases[next_idx]
                sts["cycle_phase"] = new_phase.value
                sts["cycle_phase_progress"] = 0.0
                self._log_event(
                    "MANUAL_JOG_ADVANCE",
                    "MANUAL",
                    Severity.INFO,
                    f"Manual Cycle Advance: Phase jumped to {new_phase.value}",
                )
            except (ValueError, IndexError):
                sts["cycle_phase"] = CyclePhase.IDLE.value

    # ------------------------------------------------------------------ #
    #  State & Cycle Processing                                          #
    # ------------------------------------------------------------------ #

    def _process_state_transitions(self, dt: float) -> None:
        """Central logic for machine state evolution based on inputs/commands."""
        sts = self.tags.state.sts
        inputs = self.tags.state.inputs
        evt = self.tags.state.evt

        # If in MANUAL mode, skip automatic state transitions and cycle logic
        if sts["machine_mode"] == MachineMode.MANUAL.value:
            self._process_manual_jog_commands()
            return

        prev_state = sts["machine_state"]

        # STARTING -> RUNNING
        if sts["machine_state"] == MachineState.STARTING.value:
            self._startup_remaining -= dt
            if self._startup_remaining <= 0:
                self._w_sts("machine_state", MachineState.RUNNING.value)
                self._w_sts("cycle_phase", CyclePhase.IDLE.value)
                self._log_event("MACHINE_STARTED", "STATE", Severity.INFO, "Machine entered RUNNING state")

        # RUNNING -> STARVED
        if sts["machine_state"] == MachineState.RUNNING.value:
            if not inputs["product_available"] and sts["cycle_phase"] in {CyclePhase.IDLE.value, CyclePhase.GROUPING.value}:
                self._w_sts("machine_state", MachineState.STARVED.value)
                self._log_event("MACHINE_STARVED", "STATE", Severity.WARNING, "Machine starved (no product)")

        # STARVED -> RUNNING (Auto-recovery)
        if sts["machine_state"] == MachineState.STARVED.value and inputs["product_available"]:
            self._w_sts("machine_state", MachineState.RUNNING.value)
            self._log_event("MACHINE_RECOVERED", "STATE", Severity.INFO, "Machine recovered from starvation")

        # BLOCKED -> RUNNING (Auto-recovery)
        if sts["machine_state"] == MachineState.BLOCKED.value and inputs["downstream_available"]:
            self._w_sts("machine_state", MachineState.RUNNING.value)
            self._log_event("MACHINE_RECOVERED", "STATE", Severity.INFO, "Machine recovered from blockage")

        # RUN_EMPTY -> STOPPED
        if sts["machine_state"] == MachineState.RUN_EMPTY.value:
            if sts["cycle_phase"] == CyclePhase.GROUPING.value and self.tags.state.out["grouped_count"] > 0:
                self._w_out("grouped_count", 0)
                self._w_sts("cycle_phase", CyclePhase.IDLE.value)
                self._w_sts("cycle_active", False)
                sts["cycle_phase_progress"] = 0.0
                self._log_event("RUN_EMPTY_PARTIAL_GROUP_CLEARED", "PRODUCTION", Severity.INFO, "Partial group cleared during Run Empty")
            elif sts["cycle_phase"] == CyclePhase.IDLE.value:
                self._w_sts("machine_state", MachineState.STOPPED.value)
                self._w_sts("cycle_phase", CyclePhase.IDLE.value)
                self._w_sts("run_empty_active", False)
                self._w_sts("cycle_active", False)
                sts["cycle_phase_progress"] = 0.0
                self._log_event("MACHINE_STOPPED", "STATE", Severity.INFO, "Machine stopped")

        if sts["machine_state"] != prev_state:
            evt["last_state_change"] = f"{prev_state} -> {sts['machine_state']}"

    # ------------------------------------------------------------------ #
    #  Cycle Phases (Sensor-Informed)                                    #
    # ------------------------------------------------------------------ #

    def _process_cycle_phases(self, dt: float) -> None:
        sts = self.tags.state.sts
        out = self.tags.state.out
        inputs = self.tags.state.inputs
        evt = self.tags.state.evt
        sns = self.tags.state.sns

        if sts["machine_state"] not in {MachineState.RUNNING.value, MachineState.RUN_EMPTY.value}:
            self._w_sts("cycle_active", False)
            sts["cycle_phase_progress"] = 0.0
            return

        recipe_id = self.tags.state.cfg["active_recipe_id"]
        recipe = self.ctx.recipes[recipe_id]

        # --- IDLE ---
        if sts["cycle_phase"] == CyclePhase.IDLE.value:
            self._w_sts("cycle_active", False)
            if sts["machine_state"] == MachineState.RUN_EMPTY.value and out["grouped_count"] <= 0:
                sts["cycle_phase_progress"] = 0.0
                return
            if out["grouped_count"] >= recipe.products_per_pack:
                if not inputs["downstream_available"]:
                    if sts["machine_state"] != MachineState.BLOCKED.value:
                        self._w_sts("machine_state", MachineState.BLOCKED.value)
                        self._log_event("MACHINE_BLOCKED", "STATE", Severity.WARNING, "Machine blocked (downstream full)")
                else:
                    self._w_sts("cycle_phase", CyclePhase.CAPTURED.value)
                    self._w_sts("cycle_active", True)
                    self._capture_timer = 0.3
                    self._log_event("FORMATION_CAPTURED", "PRODUCTION", Severity.INFO, "Formation captured by terminal")
            else:
                self._w_sts("cycle_phase", CyclePhase.GROUPING.value)
                self._product_timer = recipe.product_spawn_interval_sec

            sts["cycle_phase_progress"] = 0.0

        # --- GROUPING ---
        elif sts["cycle_phase"] == CyclePhase.GROUPING.value:
            self._w_sts("cycle_active", False)
            if inputs["product_available"]:
                self._product_timer -= dt
                while self._product_timer <= 0:
                    self._w_out("grouped_count", out["grouped_count"] + 1)
                    self._w_out("total_product_in", out["total_product_in"] + 1)
                    self._product_timer += recipe.product_spawn_interval_sec

                    if out["grouped_count"] >= recipe.products_per_pack:
                        self._log_event("PRODUCT_GROUP_COMPLETE", "PRODUCTION", Severity.INFO, "Recipe target count reached")
                        self._w_sts("cycle_phase", CyclePhase.IDLE.value)
                        break
            else:
                pass

            sts["cycle_phase_progress"] = out["grouped_count"] / recipe.products_per_pack

        # --- CAPTURED ---
        elif sts["cycle_phase"] == CyclePhase.CAPTURED.value:
            self._w_sts("cycle_active", True)

            # Check blank availability immediately
            if not inputs["blank_available"]:
                self._trigger_fault("BLANK_MISSING")
                return

            if not sns["transfer_gap_clear"]:
                self._capture_timer = 0.3
                sts["cycle_phase_progress"] = 0.0
                return

            self._capture_timer -= dt
            total_capture_time = 0.3
            sts["cycle_phase_progress"] = 1.0 - (max(0, self._capture_timer) / total_capture_time)

            if self._capture_timer <= 0:
                self._w_sts("cycle_phase", CyclePhase.BLANK_FEED.value)
                self._phase_timer = recipe.nominal_cycle_time_sec * PHASE_SPLITS["blank_feed"]
                # Reset BLANK_FEED sub-sequence
                self._blank_feed_subphase = "magazine_check"
                self._blank_feed_subtimer = 0.0

        # --- BLANK_FEED ---
        # Internal sub-sequence: magazine_check → suction → position → ready
        # Models: tray magazine check → suction arm picks blank → positions in transport path
        elif sts["cycle_phase"] == CyclePhase.BLANK_FEED.value:
            self._w_sts("cycle_active", True)

            # Sub-phase: magazine_check — verify blank stack is present
            if self._blank_feed_subphase == "magazine_check":
                if not inputs["blank_available"] or out["blanks_remaining"] <= 0:
                    self._trigger_fault("BLANK_MISSING")
                    return
                self._blank_feed_subtimer += dt
                if self._blank_feed_subtimer >= 0.05:  # Quick check
                    self._blank_feed_subphase = "suction"
                    self._blank_feed_subtimer = 0.0

            # Sub-phase: suction — vacuum cups engage and pick one blank
            elif self._blank_feed_subphase == "suction":
                if not inputs["blank_available"]:
                    self._trigger_fault("BLANK_MISSING")
                    return
                self._blank_feed_subtimer += dt
                # Suction takes a portion of the blank_feed time
                suction_time = recipe.nominal_cycle_time_sec * PHASE_SPLITS["blank_feed"] * 0.4
                if self._blank_feed_subtimer >= suction_time:
                    self._blank_feed_subphase = "position"
                    self._blank_feed_subtimer = 0.0

            # Sub-phase: position — suction arm swings blank to transport path
            elif self._blank_feed_subphase == "position":
                if not inputs["blank_available"]:
                    self._trigger_fault("BLANK_MISSING")
                    return
                self._blank_feed_subtimer += dt
                position_time = recipe.nominal_cycle_time_sec * PHASE_SPLITS["blank_feed"] * 0.4
                if self._blank_feed_subtimer >= position_time:
                    self._blank_feed_subphase = "ready"
                    self._blank_feed_subtimer = 0.0
                    # Consume one blank
                    if out["blanks_remaining"] > 0:
                        self._w_out("blanks_remaining", out["blanks_remaining"] - 1)

            # Sub-phase: ready — blank is positioned, proceed to TRANSFER
            elif self._blank_feed_subphase == "ready":
                # Check if blanks just ran out
                if out["blanks_remaining"] <= 0:
                    self._w_inputs("blank_available", False)
                    # Don't fault here — the blank was already consumed and positioned.
                    # The warning system will handle escalation on the NEXT cycle.

                self._w_sts("cycle_phase", CyclePhase.TRANSFER.value)
                self._transfer_timer = recipe.nominal_cycle_time_sec * PHASE_SPLITS["transfer"]

            # Overall phase progress
            total_phase_time = recipe.nominal_cycle_time_sec * PHASE_SPLITS["blank_feed"]
            elapsed = self._blank_feed_subtimer
            if self._blank_feed_subphase == "suction":
                elapsed += recipe.nominal_cycle_time_sec * PHASE_SPLITS["blank_feed"] * 0.05
            elif self._blank_feed_subphase == "position":
                elapsed += recipe.nominal_cycle_time_sec * PHASE_SPLITS["blank_feed"] * 0.45
            elif self._blank_feed_subphase == "ready":
                elapsed = total_phase_time
            sts["cycle_phase_progress"] = min(1.0, elapsed / total_phase_time)

        # --- TRANSFER ---
        elif sts["cycle_phase"] == CyclePhase.TRANSFER.value:
            self._w_sts("cycle_active", True)

            if not sns["transfer_gap_clear"]:
                return

            if not sns["tray_in_transport"]:
                return

            self._transfer_timer -= dt
            total_transfer_time = recipe.nominal_cycle_time_sec * PHASE_SPLITS["transfer"]
            sts["cycle_phase_progress"] = 1.0 - (max(0, self._transfer_timer) / total_transfer_time)

            if self._transfer_timer <= 0:
                self._w_sts("cycle_phase", CyclePhase.PACKING.value)
                self._phase_timer = recipe.nominal_cycle_time_sec * PHASE_SPLITS["packing"]

        # --- PACKING ---
        elif sts["cycle_phase"] == CyclePhase.PACKING.value:
            self._w_sts("cycle_active", True)

            if not sns["chain_clear"]:
                if sts["machine_state"] != MachineState.BLOCKED.value:
                    self._w_sts("machine_state", MachineState.BLOCKED.value)
                    self._log_event("MACHINE_BLOCKED", "STATE", Severity.WARNING, "Machine blocked (chain outlet full)")
                return

            self._phase_timer -= dt
            total_phase_time = recipe.nominal_cycle_time_sec * PHASE_SPLITS["packing"]
            sts["cycle_phase_progress"] = 1.0 - (max(0, self._phase_timer) / total_phase_time)

            if self._phase_timer <= 0:
                if self.rng.random() < recipe.jam_probability:
                    self._trigger_fault("GAP_CONTROL_JAM")
                    return

                self._w_sts("cycle_phase", CyclePhase.DISCHARGE.value)
                self._phase_timer = recipe.nominal_cycle_time_sec * PHASE_SPLITS["discharge"]

        # --- DISCHARGE ---
        # Internal sub-sequence: outlet_check → quality_decision → good_travel/reject_divert → complete
        # Models: transport chain clearance check → outlet/tray-plate quality sensing → pack exits or diverts
        elif sts["cycle_phase"] == CyclePhase.DISCHARGE.value:
            self._w_sts("cycle_active", True)
            total_phase_time = recipe.nominal_cycle_time_sec * PHASE_SPLITS["discharge"]

            # Sub-phase: outlet_check — verify transport chain clearance and outlet path
            if self._discharge_subphase == "outlet_check":
                # Transport chain gap check — hard fault if tray at forbidden position
                # This is distinct from downstream block: it's a local clearance violation
                if not sns["chain_clear"]:
                    self._trigger_fault("TRANSPORT_CHAIN_GAP")
                    return

                # Outlet sensor confirms discharge path is clear
                self._w_sns("outlet_sensor_ok", inputs["downstream_available"])
                if not sns["outlet_sensor_ok"]:
                    # Broader downstream flow unavailable → BLOCKED state (not fault)
                    if sts["machine_state"] != MachineState.BLOCKED.value:
                        self._w_sts("machine_state", MachineState.BLOCKED.value)
                        self._log_event("MACHINE_BLOCKED", "STATE", Severity.WARNING, "Machine blocked during discharge")
                    return

                self._discharge_subtimer += dt
                self._log_event("DISCHARGE_OUTLET_CHECK", "PRODUCTION", Severity.INFO, "Outlet path confirmed clear")

                # Outlet check takes 20% of discharge time
                if self._discharge_subtimer >= total_phase_time * 0.2:
                    self._discharge_subphase = "quality_decision"
                    self._discharge_subtimer = 0.0

            # Sub-phase: quality_decision — outlet/tray-plate sensors determine good vs reject
            elif self._discharge_subphase == "quality_decision":
                if not self._discharge_quality_decided:
                    # Quality decision based on outlet/tray-plate sensing
                    # Internally probabilistic, but behaves as if sensors determine outcome
                    if self.rng.random() < recipe.reject_probability:
                        self._discharge_is_reject = True
                        self._discharge_reason = self.rng.choice(["INCOMPLETE_PACK", "OPEN_FLAP"])
                        self._w_sns("open_flap_detected", (self._discharge_reason == "OPEN_FLAP"))
                        self._w_sns("tray_plate_sensor_ok", (self._discharge_reason != "OPEN_FLAP"))
                    else:
                        self._discharge_is_reject = False
                        self._discharge_reason = ""
                        self._w_sns("open_flap_detected", False)
                        self._w_sns("tray_plate_sensor_ok", True)

                    self._discharge_quality_decided = True
                    self._log_event("DISCHARGE_QUALITY_CHECK", "PRODUCTION", Severity.INFO,
                                   f"Quality check: {'REJECT' if self._discharge_is_reject else 'GOOD'}")

                self._discharge_subtimer += dt

                # Quality decision takes 30% of discharge time
                if self._discharge_subtimer >= total_phase_time * 0.3:
                    if self._discharge_is_reject:
                        self._discharge_subphase = "reject_divert"
                    else:
                        self._discharge_subphase = "good_travel"
                    self._discharge_subtimer = 0.0

            # Sub-phase: good_travel — pack travels full discharge path to conveyor end
            elif self._discharge_subphase == "good_travel":
                self._discharge_subtimer += dt

                # Good travel takes 50% of discharge time (full conveyor travel)
                if self._discharge_subtimer >= total_phase_time * 0.5:
                    self._w_out("cycle_count", out["cycle_count"] + 1)
                    self._w_out("total_product_used", out["total_product_used"] + recipe.products_per_pack)
                    self._w_out("grouped_count", 0)
                    self._w_out("last_cycle_time_sec", recipe.nominal_cycle_time_sec)

                    if out["avg_cycle_time_sec"] == 0:
                        self._w_out("avg_cycle_time_sec", out["last_cycle_time_sec"])
                    else:
                        new_avg = (out["avg_cycle_time_sec"] * (out["cycle_count"] - 1) + out["last_cycle_time_sec"]) / out["cycle_count"]
                        self._w_out("avg_cycle_time_sec", new_avg)

                    self._w_out("good_pack_count", out["good_pack_count"] + 1)
                    self._w_out("last_pack_result", PackResult.GOOD.value)
                    evt["last_pack_result"] = PackResult.GOOD.value
                    evt["last_reject_reason"] = ""
                    self._log_event("PACK_GOOD_DISCHARGED", "PRODUCTION", Severity.INFO, "Good pack discharged")

                    self._w_sts("cycle_phase", CyclePhase.IDLE.value)
                    self._w_sts("cycle_active", False)
                    self._reset_discharge_subphase()

            # Sub-phase: reject_divert — pack diverts at outlet diverter point
            elif self._discharge_subphase == "reject_divert":
                self._discharge_subtimer += dt

                # Reject divert takes 50% of discharge time
                if self._discharge_subtimer >= total_phase_time * 0.5:
                    self._w_out("cycle_count", out["cycle_count"] + 1)
                    self._w_out("total_product_used", out["total_product_used"] + recipe.products_per_pack)
                    self._w_out("grouped_count", 0)
                    self._w_out("last_cycle_time_sec", recipe.nominal_cycle_time_sec)

                    if out["avg_cycle_time_sec"] == 0:
                        self._w_out("avg_cycle_time_sec", out["last_cycle_time_sec"])
                    else:
                        new_avg = (out["avg_cycle_time_sec"] * (out["cycle_count"] - 1) + out["last_cycle_time_sec"]) / out["cycle_count"]
                        self._w_out("avg_cycle_time_sec", new_avg)

                    self._w_out("reject_pack_count", out["reject_pack_count"] + 1)
                    self._w_out("reject_accumulation_count", out["reject_accumulation_count"] + 1)
                    self._w_out("last_pack_result", PackResult.REJECT.value)
                    evt["last_pack_result"] = PackResult.REJECT.value
                    out["last_reject_reason"] = self._discharge_reason
                    evt["last_reject_reason"] = self._discharge_reason

                    self._log_event("PACK_REJECT_DIVERTED", "REJECT", Severity.WARNING,
                                   f"Rejected pack diverted at outlet: {self._discharge_reason}",
                                   {"reason": self._discharge_reason})

                    # Check accumulation thresholds
                    if out["reject_accumulation_count"] >= 3:
                        self._trigger_fault("REJECT_BIN_FULL")
                    elif out["reject_accumulation_count"] == 2:
                        self._trigger_fault("REJECT_BIN_NEAR_FULL")

                    self._w_sts("cycle_phase", CyclePhase.IDLE.value)
                    self._w_sts("cycle_active", False)
                    self._reset_discharge_subphase()

            # Overall phase progress
            elapsed = self._discharge_subtimer
            if self._discharge_subphase == "quality_decision":
                elapsed += total_phase_time * 0.2
            elif self._discharge_subphase in ("good_travel", "reject_divert"):
                elapsed += total_phase_time * 0.5
            sts["cycle_phase_progress"] = min(1.0, elapsed / total_phase_time)

    # ------------------------------------------------------------------ #
    #  Runtime Metrics                                                   #
    # ------------------------------------------------------------------ #

    def _reset_discharge_subphase(self) -> None:
        """Reset discharge sub-sequence state for the next cycle."""
        self._discharge_subphase = "outlet_check"
        self._discharge_subtimer = 0.0
        self._discharge_quality_decided = False
        self._discharge_is_reject = False
        self._discharge_reason = ""

    def _update_runtime_metrics(self, dt: float) -> None:
        sts = self.tags.state.sts
        out = self.tags.state.out

        if sts["machine_state"] in {MachineState.RUNNING.value, MachineState.STARTING.value, MachineState.RUN_EMPTY.value}:
            out["runtime_sec"] += dt
        else:
            out["downtime_sec"] += dt

    # ------------------------------------------------------------------ #
    #  Fault Triggering                                                  #
    # ------------------------------------------------------------------ #

    def _trigger_fault(self, fault_id: str) -> None:
        fault_def = self.ctx.faults[fault_id]
        sts = self.tags.state.sts
        fault_tags = self.tags.state.fault

        is_stopping = fault_def.severity == Severity.FAULT.value

        if is_stopping:
            self._w_sts("machine_state", MachineState.FAULTED.value)
            self._w_sts("cycle_active", False)

        self._w_sts("fault_active", True)
        self._w_fault("active_code", fault_def.fault_id)
        self._w_fault("active_text", f"{'Fault' if is_stopping else 'Warning'}: {fault_def.fault_id}")
        self._w_fault("active_severity", fault_def.severity)
        self._w_fault("latched", fault_def.requires_reset)
        self._w_fault("timestamp", datetime.now(timezone.utc).isoformat())
        self._w_fault("active_count", fault_tags["active_count"] + 1)

        log_severity = Severity.FAULT if is_stopping else Severity.WARNING
        self._log_event(f"FAULT_{fault_def.fault_id}", "FAULT", log_severity, fault_tags["active_text"])

    # ------------------------------------------------------------------ #
    #  Event Logging                                                     #
    # ------------------------------------------------------------------ #

    def _log_event(self, code: str, category: str, severity: Severity, message: str, metadata: dict[str, Any] | None = None) -> None:
        recipe_id = self.tags.state.cfg["active_recipe_id"]
        sts = self.tags.state.sts
        cfg = self.tags.state.cfg

        event = self.event_logger.log(
            event_code=code,
            category=category,
            severity=severity,
            machine_state=MachineState(sts["machine_state"]),
            machine_mode=MachineMode(sts["machine_mode"]),
            recipe_id=recipe_id,
            message=message,
            session_id=cfg.get("session_id", ""),
            scenario_id=cfg.get("active_scenario_id", ""),
            metadata=metadata,
        )

        self.tags.state.evt["last_event_code"] = event.event_code
        self.tags.state.evt["last_event_text"] = event.message
        self.tags.state.evt["last_event_ts"] = event.ts

    # ------------------------------------------------------------------ #
    #  Fault Injection                                                   #
    # ------------------------------------------------------------------ #

    def inject_fault(self, code: str, text: str) -> None:
        """Manual fault injection for testing/demo."""
        self._trigger_fault(code)
        if text:
            self.tags.state.fault["active_text"] = text
            self.tags.state.evt["last_event_text"] = text
