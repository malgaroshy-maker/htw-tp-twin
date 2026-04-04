from __future__ import annotations

from typing import Any

SYSTEM_PROMPT = (
    "You are an AI assistant for an industrial tray packer digital twin. "
    "Your role is to explain machine behavior, summarize sessions, and assist operators. "
    "You must base your answers STRICTLY on the provided structured data. "
    "Do not invent mechanical causes not present in the data. "
    "Separate known facts from likely inferences. "
    "Keep your tone professional, concise, and industrial."
)

def build_explain_state_prompt(ctx: dict[str, Any]) -> str:
    return (
        f"The machine is currently in state: {ctx['machine_state']} ({ctx['machine_mode']} mode).\n"
        f"Current cycle phase: {ctx['cycle_phase']}.\n"
        f"Active recipe: {ctx['active_recipe']}.\n"
        f"Grouping progress: {ctx['grouped_count']} / {ctx['target_group_count']}.\n"
        f"Production counters: {ctx['good_pack_count']} good, {ctx['reject_pack_count']} rejected, {ctx['cycle_count']} total cycles.\n\n"
        "Explain what the machine is currently doing and if production is proceeding normally."
    )

def build_explain_fault_prompt(ctx: dict[str, Any]) -> str:
    timeline_str = "\n".join([f"- {e['ts']}: {e['code']} - {e['message']}" for e in ctx['recent_events']])
    return (
        f"The machine is currently in state: {ctx['machine_state']}.\n"
        f"Active Fault: {ctx['active_fault_code']} - {ctx['active_fault_text']}.\n"
        f"Severity: {ctx['active_severity']}. Latched: {ctx['is_latched']}.\n"
        f"Recent Events Timeline:\n{timeline_str}\n\n"
        "Explain what this fault means, what likely caused it based on the timeline, and what the operator should do to recover."
    )

def build_session_summary_prompt(ctx: dict[str, Any]) -> str:
    faults_str = "\n".join([f"- {code}: {count} occurrences" for code, count in ctx['fault_summary'].items()])
    return (
        f"Session Summary Data:\n"
        f"Active Recipe: {ctx['recipe_id']}\n"
        f"Total Cycles: {ctx['total_cycles']}\n"
        f"Good Packs: {ctx['good_packs']}\n"
        f"Rejected Packs: {ctx['reject_packs']}\n"
        f"Runtime: {ctx['runtime_sec']:.1f}s\n"
        f"Downtime: {ctx['downtime_sec']:.1f}s\n"
        f"Faults Encountered:\n{faults_str}\n\n"
        "Provide a concise narrative summary of production performance, highlighting any major downtime causes or quality issues."
    )
