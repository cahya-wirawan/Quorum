"""OpenTelemetry-compatible lightweight tracer and span context."""
from __future__ import annotations

import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, List, Optional
from quorum_telemetry.logger import get_logger

logger = get_logger("quorum.tracer")


@dataclass
class Span:
    name: str
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    attributes: Dict[str, Any] = field(default_factory=dict)
    events: List[Dict[str, Any]] = field(default_factory=list)
    status: str = "OK"

    def set_attribute(self, key: str, value: Any) -> None:
        self.attributes[key] = value

    def record_exception(self, exception: Exception) -> None:
        self.status = "ERROR"
        self.events.append({
            "name": "exception",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "exception.type": type(exception).__name__,
            "exception.message": str(exception),
        })

    def finish(self) -> None:
        self.end_time = time.time()
        duration_ms = round((self.end_time - self.start_time) * 1000, 2)
        logger.info(
            f"Span completed: {self.name}",
            extra={"props": {"span": self.name, "duration_ms": duration_ms, "status": self.status, **self.attributes}},
        )


@contextmanager
def trace_span(name: str, attributes: Optional[Dict[str, Any]] = None) -> Iterator[Span]:
    """Context manager executing block within a traced span."""
    span = Span(name=name, attributes=attributes or {})
    try:
        yield span
    except Exception as e:
        span.record_exception(e)
        raise
    finally:
        span.finish()
