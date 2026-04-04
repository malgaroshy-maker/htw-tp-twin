from enum import StrEnum


class MachineState(StrEnum):
    STOPPED = "STOPPED"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    RUN_EMPTY = "RUN_EMPTY"
    STARVED = "STARVED"
    BLOCKED = "BLOCKED"
    FAULTED = "FAULTED"


class MachineMode(StrEnum):
    AUTO = "AUTO"
    MANUAL = "MANUAL"


class CyclePhase(StrEnum):
    IDLE = "IDLE"
    GROUPING = "GROUPING"
    CAPTURED = "CAPTURED"
    BLANK_FEED = "BLANK_FEED"
    TRANSFER = "TRANSFER"
    PACKING = "PACKING"
    DISCHARGE = "DISCHARGE"


class Severity(StrEnum):
    INFO = "INFO"
    WARNING = "WARNING"
    FAULT = "FAULT"
    CRITICAL = "CRITICAL"


class PackResult(StrEnum):
    GOOD = "GOOD"
    REJECT = "REJECT"


class ScenarioStatus(StrEnum):
    IDLE = "IDLE"
    ARMED = "ARMED"
    ACTIVE = "ACTIVE"
    WAITING_FOR_RECOVERY = "WAITING_FOR_RECOVERY"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ABORTED = "ABORTED"
