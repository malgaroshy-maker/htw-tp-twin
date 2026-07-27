export interface SimulatorState {
  cmd: Record<string, unknown>;
  cfg: {
    active_recipe_id: string;
    active_recipe_name: string;
    target_pack_count: number;
    nominal_cycle_time_sec: number;
    reject_probability: number;
    jam_probability: number;
    auto_restart_on_recovery: boolean;
    session_id: string;
    active_scenario_id: string;
    active_scenario_status: string;
    grid_cols: number;
    grid_rows: number;
  };
  inputs: Record<string, unknown>;
  sts: {
    machine_state: string;
    machine_mode: string;
    cycle_phase: string;
    cycle_phase_progress: number;
    ready_to_start: boolean;
    cycle_active: boolean;
    run_empty_active: boolean;
    fault_active: boolean;
    warning_active: boolean;
    start_permissive_ok: boolean;
  };
  out: {
    grouped_count: number;
    target_group_count: number;
    cycle_count: number;
    good_pack_count: number;
    reject_pack_count: number;
    reject_accumulation_count: number;
    blanks_remaining: number;
    total_product_in: number;
    total_product_used: number;
    runtime_sec: number;
    downtime_sec: number;
    last_cycle_time_sec: number;
    avg_cycle_time_sec: number;
    last_pack_result: string;
    last_reject_reason: string;
  };
  fault: {
    active_code: string;
    active_text: string;
    active_severity: string;
    latched: boolean;
    timestamp: string;
    active_count: number;
    last_acknowledged: string;
  };
  warn: {
    active_code: string;
    active_text: string;
    active_severity: string;
    timestamp: string;
    active_count: number;
  };
  evt: {
    last_event_code: string;
    last_event_text: string;
    last_event_ts: string;
    last_state_change: string;
    last_pack_result: string;
    last_reject_reason: string;
  };
  hmi: {
    start_button_enabled: boolean;
    stop_button_enabled: boolean;
    reset_button_enabled: boolean;
    recipe_change_enabled: boolean;
    auto_mode_enabled: boolean;
    manual_mode_enabled: boolean;
    show_fault_banner: boolean;
    show_warning_banner: boolean;
    status_lamp_color: string;
    footer_message: string;
  };
  sns: {
    divider_gap_clear: boolean;
    divider_min_jam_ok: boolean;
    lane_fill_ok: boolean;
    lane_fill_mismatch: boolean;
    stopper_closed: boolean;
    terminal_closed: boolean;
    transfer_gap_clear: boolean;
    tray_stack_present: boolean;
    tray_vacuum_ok: boolean;
    tray_positioned: boolean;
    tray_in_transport: boolean;
    chain_clear: boolean;
    outlet_sensor_ok: boolean;
    tray_plate_sensor_ok: boolean;
    open_flap_detected: boolean;
  };
  plc: {
    scan_counter: number;
    last_scan_ts: number;
    scan_duration_ms: number;
    heartbeat_counter: number;
    comms_healthy: boolean;
    comms_timeout_sec: number;
    command_seq: number;
    command_ack_code: number;
    last_command_code: number;
    requested_mode: number;
    current_mode: number;
    mode_ack: boolean;
  };
}

export interface RecipeInfo {
  recipe_id: string;
  recipe_name: string;
  products_per_pack: number;
  grid_cols: number;
  grid_rows: number;
  nominal_cycle_time_sec: number;
  product_spawn_interval_sec: number;
  reject_probability: number;
  jam_probability: number;
  display_color: string;
  notes: string;
}

export interface ScenarioTrigger {
  type: string;
  value: unknown;
}

export interface ScenarioAction {
  type: string;
  name: string;
  value: unknown;
}

export interface ScenarioStep {
  trigger: ScenarioTrigger;
  action: ScenarioAction;
}

export interface ScenarioInfo {
  scenario_id: string;
  scenario_name: string;
  description: string;
  goals: string[];
  initial_recipe: string;
  steps: ScenarioStep[];
  success_criteria: string[];
  timeout_sec: number;
  abort_allowed: boolean;
  manual_complete_allowed: boolean;
}

// EventRecord moved to useSimulator.ts to resolve Vite cache issues

