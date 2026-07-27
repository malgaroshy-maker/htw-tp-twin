"""
persistence.py — SQLite-backed event store for session history.

Design Goals:
  - Zero-config: DB file is created automatically in `data/` directory.
  - Write-through: every event is immediately persisted (no buffering lag).
  - Session-aware: events are grouped by session_id for historical queries.
  - Read-friendly: flat row schema, no ORM dependencies.
"""

import sqlite3
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.shared.events import EventRecord

log = logging.getLogger(__name__)

DB_PATH = Path("data") / "events.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id      TEXT NOT NULL UNIQUE,
    ts            TEXT NOT NULL,
    session_id    TEXT NOT NULL,
    event_code    TEXT NOT NULL,
    category      TEXT NOT NULL,
    severity      TEXT NOT NULL,
    machine_state TEXT NOT NULL,
    machine_mode  TEXT NOT NULL,
    recipe_id     TEXT NOT NULL,
    message       TEXT NOT NULL,
    scenario_id   TEXT NOT NULL DEFAULT '',
    metadata      TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_session ON events (session_id);
CREATE INDEX IF NOT EXISTS idx_ts      ON events (ts);
CREATE INDEX IF NOT EXISTS idx_severity ON events (severity);
"""

_SESSIONS_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    session_id   TEXT PRIMARY KEY,
    started_at   TEXT NOT NULL,
    ended_at     TEXT,
    recipe_id    TEXT NOT NULL DEFAULT '',
    event_count  INTEGER NOT NULL DEFAULT 0,
    fault_count  INTEGER NOT NULL DEFAULT 0,
    warn_count   INTEGER NOT NULL DEFAULT 0
);
"""


class EventStore:
    """Thread-safe SQLite event persistence layer."""

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self._path = db_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._conn: Optional[sqlite3.Connection] = None
        self._ensure_connection()

    # ------------------------------------------------------------------
    # Connection Management
    # ------------------------------------------------------------------

    def _ensure_connection(self) -> sqlite3.Connection:
        """Open (or reuse) a connection and ensure schema exists."""
        if self._conn is None:
            self._conn = sqlite3.connect(str(self._path), check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
            self._conn.execute("PRAGMA journal_mode=WAL")  # concurrent reads & writes
            self._conn.execute("PRAGMA synchronous=NORMAL")
            self._conn.executescript(_SCHEMA)
            self._conn.executescript(_SESSIONS_SCHEMA)
            self._conn.commit()
            log.info("EventStore connected to %s", self._path)
        return self._conn

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    # ------------------------------------------------------------------
    # Write Operations
    # ------------------------------------------------------------------

    def write_event(self, event: EventRecord) -> None:
        """Persist a single event. Silently skips duplicates (idempotent)."""
        conn = self._ensure_connection()
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO events
                  (event_id, ts, session_id, event_code, category, severity,
                   machine_state, machine_mode, recipe_id, message, scenario_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.event_id,
                    event.ts,
                    event.session_id,
                    event.event_code,
                    event.category,
                    str(event.severity.value) if hasattr(event.severity, "value") else str(event.severity),
                    str(event.machine_state.value) if hasattr(event.machine_state, "value") else str(event.machine_state),
                    str(event.machine_mode.value) if hasattr(event.machine_mode, "value") else str(event.machine_mode),
                    event.recipe_id,
                    event.message,
                    event.scenario_id,
                    json.dumps(event.metadata),
                ),
            )
            conn.commit()
        except sqlite3.Error as exc:
            log.error("EventStore.write_event failed: %s", exc)

    def upsert_session(self, session_id: str, recipe_id: str = "", started_at: Optional[str] = None) -> None:
        """Create or update a session record."""
        conn = self._ensure_connection()
        ts = started_at or datetime.now(timezone.utc).isoformat()
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO sessions (session_id, started_at, recipe_id)
                VALUES (?, ?, ?)
                """,
                (session_id, ts, recipe_id),
            )
            conn.commit()
        except sqlite3.Error as exc:
            log.error("EventStore.upsert_session failed: %s", exc)

    def close_session(self, session_id: str) -> None:
        """Mark a session as ended and update counters."""
        conn = self._ensure_connection()
        ts = datetime.now(timezone.utc).isoformat()
        try:
            row = conn.execute(
                """
                SELECT
                  COUNT(*) AS total,
                  SUM(CASE WHEN severity='FAULT'   THEN 1 ELSE 0 END) AS faults,
                  SUM(CASE WHEN severity='WARNING' THEN 1 ELSE 0 END) AS warns
                FROM events WHERE session_id=?
                """,
                (session_id,),
            ).fetchone()

            conn.execute(
                """
                UPDATE sessions
                SET ended_at=?, event_count=?, fault_count=?, warn_count=?
                WHERE session_id=?
                """,
                (ts, row["total"] or 0, row["faults"] or 0, row["warns"] or 0, session_id),
            )
            conn.commit()
        except sqlite3.Error as exc:
            log.error("EventStore.close_session failed: %s", exc)

    # ------------------------------------------------------------------
    # Read Operations
    # ------------------------------------------------------------------

    def get_events(
        self,
        session_id: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """Return events, newest first, with optional filters."""
        conn = self._ensure_connection()
        clauses: list[str] = []
        params: list = []

        if session_id:
            clauses.append("session_id = ?")
            params.append(session_id)
        if severity:
            clauses.append("severity = ?")
            params.append(severity.upper())

        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        params.extend([limit, offset])

        rows = conn.execute(
            f"SELECT * FROM events {where} ORDER BY ts DESC LIMIT ? OFFSET ?",
            params,
        ).fetchall()

        return [self._row_to_dict(r) for r in rows]

    def get_sessions(self, limit: int = 20) -> list[dict]:
        """Return recent sessions, newest first."""
        conn = self._ensure_connection()
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_session_stats(self, session_id: str) -> Optional[dict]:
        """Return aggregated stats for a single session."""
        conn = self._ensure_connection()
        row = conn.execute(
            "SELECT * FROM sessions WHERE session_id=?", (session_id,)
        ).fetchone()
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> dict:
        d = dict(row)
        try:
            d["metadata"] = json.loads(d.get("metadata", "{}"))
        except (json.JSONDecodeError, TypeError):
            d["metadata"] = {}
        return d
