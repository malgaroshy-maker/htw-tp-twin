from __future__ import annotations

import logging
import time
from typing import Any, TYPE_CHECKING

from app.shared.enums import Severity, ScenarioStatus
from app.shared.models import Scenario, ScenarioCondition, ScenarioAction, ScenarioTrigger

if TYPE_CHECKING:
    from app.simulator.engine import SimulatorEngine

log = logging.getLogger(__name__)


class ScenarioRunner:
    """Handles the execution of training scenarios with reversible state and lifecycle logic."""

    def __init__(self, engine: SimulatorEngine) -> None:
        self.engine = engine
        self.active_scenario: Scenario | None = None
        self.status: ScenarioStatus = ScenarioStatus.IDLE
        
        self.current_step_index: int = 0
        self.step_start_ts: float = 0.0
        self.scenario_start_ts: float = 0.0
        
        # Track original values for reversibility: {(tag_type, tag_name): original_value}
        self.forced_tags: dict[tuple[str, str], Any] = {}
        
        # Performance tracking for recovery
        self.recovery_start_ts: float = 0.0
        self.stable_cycles: int = 0
        self.required_stable_cycles: int = 3

    def start_scenario(self, scenario: Scenario) -> None:
        """Start a new scenario, transitioning to ACTIVE."""
        if self.active_scenario:
            self.stop_scenario()

        self.active_scenario = scenario
        self.status = ScenarioStatus.ACTIVE
        self.current_step_index = 0
        self.scenario_start_ts = time.time()
        self.step_start_ts = self.scenario_start_ts
        self.forced_tags = {}
        self.stable_cycles = 0
        
        # Set initial recipe if specified
        if scenario.initial_recipe and scenario.initial_recipe not in self.engine.ctx.recipes:
            self._warn(f"Scenario '{scenario.scenario_id}' initial_recipe '{scenario.initial_recipe}' is unknown; ignored")
        elif scenario.initial_recipe:
            self._apply_action(ScenarioAction(type="SET_CFG", name="active_recipe_id", value=scenario.initial_recipe))
            
        self.engine.tags.state.cfg["active_scenario_id"] = scenario.scenario_id
        self.engine.tags.state.cfg["active_scenario_status"] = self.status
        
        self.engine._log_event(
            "SCENARIO_STARTED", 
            "SCENARIO", 
            Severity.INFO, 
            f"Scenario started: {scenario.scenario_name}"
        )

    def stop_scenario(self) -> None:
        """Abort the active scenario and restore machine state."""
        if not self.active_scenario:
            return
            
        self.engine._log_event(
            "SCENARIO_ABORTED", 
            "SCENARIO", 
            Severity.WARNING, 
            f"Scenario aborted: {self.active_scenario.scenario_name}"
        )
        
        self._cleanup()
        self.status = ScenarioStatus.ABORTED
        self._update_engine_tags()
        self.active_scenario = None

    def update(self, dt: float) -> None:
        """Core update loop for scenario logic and state transitions."""
        if not self.active_scenario:
            return

        if self.status == ScenarioStatus.ACTIVE:
            self._update_active_steps()
        elif self.status == ScenarioStatus.WAITING_FOR_RECOVERY:
            self._update_recovery_logic()

    def _update_active_steps(self) -> None:
        """Process scenario steps until all are completed."""
        if self.current_step_index >= len(self.active_scenario.steps):
            self._transition_to_recovery()
            return

        step = self.active_scenario.steps[self.current_step_index]
        
        if self._check_trigger(step.trigger):
            self._apply_action(step.action)
            
            self.engine._log_event(
                "SCENARIO_STEP_TRIGGERED",
                "SCENARIO",
                Severity.INFO,
                f"Step {self.current_step_index + 1} triggered",
                metadata={"step_index": self.current_step_index}
            )
            
            self.current_step_index += 1
            self.step_start_ts = time.time()
            
            # If that was the last step, transition immediately
            if self.current_step_index >= len(self.active_scenario.steps):
                self._transition_to_recovery()

    def _transition_to_recovery(self) -> None:
        """Move from ACTIVE to WAITING_FOR_RECOVERY."""
        self.status = ScenarioStatus.WAITING_FOR_RECOVERY
        self.recovery_start_ts = time.time()
        self._update_engine_tags()
        
        self.engine._log_event(
            "SCENARIO_AWAITING_RECOVERY",
            "SCENARIO",
            Severity.INFO,
            "All scenario actions applied. Awaiting operator recovery..."
        )

    def _update_recovery_logic(self) -> None:
        """Evaluate if the operator has satisfied the recovery conditions."""
        if not self.active_scenario or not self.active_scenario.recovery_condition:
            # If no recovery condition set, complete immediately
            self._complete_scenario()
            return

        # Check timeout
        if (time.time() - self.recovery_start_ts) > self.active_scenario.timeout_sec:
            self._fail_scenario("Recovery timeout exceeded.")
            return

        # Check structured condition
        if self._evaluate_condition(self.active_scenario.recovery_condition):
            # Verify "RUNNING for a short stable period"
            # We'll use cycle count or simple counter
            self.stable_cycles += 1
            if self.stable_cycles >= self.required_stable_cycles:
                self._complete_scenario()
        else:
            self.stable_cycles = 0

    def _check_trigger(self, trigger: ScenarioTrigger) -> bool:
        """Evaluate step triggers (time or cycle based)."""
        if trigger.type == "IMMEDIATE":
            return True
        if trigger.type == "ELAPSED_SEC":
            return (time.time() - self.step_start_ts) >= float(trigger.value)
        if trigger.type == "CYCLE_COUNT":
            return self.engine.tags.state.out["cycle_count"] >= int(trigger.value)
        return False

    def _apply_action(self, action: ScenarioAction) -> None:
        """Apply a scenario action while capturing original state for reversibility."""
        state = self.engine.tags.state
        
        if action.type == "SET_INPUT":
            if action.name in state.inputs:
                self._capture_original("inputs", action.name, state.inputs[action.name])
                state.inputs[action.name] = action.value
            else:
                self._warn(f"Scenario SET_INPUT skipped: unknown input '{action.name}'")
        
        elif action.type == "SET_CFG":
            if action.name == "active_recipe_id" and action.value not in self.engine.ctx.recipes:
                self._warn(f"Scenario SET_CFG skipped: unknown recipe '{action.value}'")
            elif action.name in state.cfg:
                self._capture_original("cfg", action.name, state.cfg[action.name])
                state.cfg[action.name] = action.value
            else:
                self._warn(f"Scenario SET_CFG skipped: unknown cfg '{action.name}'")

        elif action.type == "INJECT_FAULT":
            if action.name not in self.engine.ctx.faults:
                self._warn(f"Scenario INJECT_FAULT skipped: unknown fault '{action.name}'")
            else:
                self.engine.inject_fault(action.name, f"Scenario: {action.name}")

    def _warn(self, message: str) -> None:
        """Log a skipped scenario action to the logger and the event log."""
        log.warning(message)
        self.engine._log_event("SCENARIO_ACTION_SKIPPED", "SCENARIO", Severity.WARNING, message)

    def _capture_original(self, tag_type: str, name: str, current_value: Any) -> None:
        """Save the original value of a tag before it's modified by a scenario."""
        key = (tag_type, name)
        if key not in self.forced_tags:
            self.forced_tags[key] = current_value

    def _evaluate_condition(self, condition: ScenarioCondition) -> bool:
        """Recursively evaluate structured conditions."""
        state = self.engine.tags.state
        
        if condition.type == "tag_equals":
            # Check all tag maps
            for map_name in ["inputs", "cfg", "sts", "out"]:
                tag_map = getattr(state, map_name)
                if condition.tag in tag_map:
                    return tag_map[condition.tag] == condition.value
            return False

        if condition.type == "machine_state_in":
            allowed = condition.value if isinstance(condition.value, list) else [condition.value]
            return state.sts["machine_state"] in allowed

        if condition.type == "all_of":
            return all(self._evaluate_condition(c) for c in condition.conditions)

        if condition.type == "any_of":
            return any(self._evaluate_condition(c) for c in condition.conditions)

        if condition.type == "fault_cleared":
            active_faults = getattr(self.engine, "active_faults", [])
            active_ids = [f.fault_id for f in active_faults]
            if condition.value: # Specific fault
                return condition.value not in active_ids
            return len(active_ids) == 0

        return False

    def _cleanup(self) -> None:
        """Restore all forced values to the machine."""
        state = self.engine.tags.state
        for (tag_type, name), original_value in self.forced_tags.items():
            tag_map = getattr(state, tag_type)
            tag_map[name] = original_value
        
        self.forced_tags.clear()

    def _complete_scenario(self) -> None:
        """Success: Cleanup and log."""
        self.status = ScenarioStatus.COMPLETED
        self._cleanup()
        self.engine._log_event(
            "SCENARIO_COMPLETED",
            "SCENARIO",
            Severity.INFO,
            f"Successfully completed: {self.active_scenario.scenario_name}"
        )
        self._update_engine_tags()
        self.active_scenario = None

    def _fail_scenario(self, reason: str) -> None:
        """Failure: Cleanup and log."""
        self.status = ScenarioStatus.FAILED
        self._cleanup()
        self.engine._log_event(
            "SCENARIO_FAILED",
            "SCENARIO",
            Severity.CRITICAL,
            f"Failed: {self.active_scenario.scenario_name}. Reason: {reason}"
        )
        self._update_engine_tags()
        self.active_scenario = None

    def _update_engine_tags(self) -> None:
        """Sync internal status to shared tags for HMI visibility."""
        self.engine.tags.state.cfg["active_scenario_status"] = self.status
        if self.status in [ScenarioStatus.COMPLETED, ScenarioStatus.FAILED, ScenarioStatus.ABORTED]:
             self.engine.tags.state.cfg["active_scenario_id"] = ""
