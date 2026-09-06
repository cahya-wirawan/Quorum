"""Domain exceptions and RFC 9457 Problem Details error models.

Pure Python, no framework dependencies.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ProblemDetail:
    """RFC 9457 Problem Details for HTTP APIs."""
    type: str
    title: str
    status: int
    detail: str
    instance: Optional[str] = None
    invalid_params: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "type": self.type,
            "title": self.title,
            "status": self.status,
            "detail": self.detail,
        }
        if self.instance:
            d["instance"] = self.instance
        if self.invalid_params:
            d["invalid_params"] = self.invalid_params
        return d


class QuorumDomainError(Exception):
    """Base exception for all domain logic failures."""
    def __init__(self, message: str, status_code: int = 500, error_type: str = "about:blank"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type

    def to_problem_detail(self, instance: Optional[str] = None) -> ProblemDetail:
        return ProblemDetail(
            type=self.error_type,
            title=self.__class__.__name__,
            status=self.status_code,
            detail=self.message,
            instance=instance,
        )


class ConfigError(QuorumDomainError):
    def __init__(self, message: str):
        super().__init__(message, status_code=400, error_type="https://quorum.dev/errors/config")


class PolicyViolationError(QuorumDomainError):
    def __init__(self, message: str):
        super().__init__(message, status_code=403, error_type="https://quorum.dev/errors/policy")


class VerificationError(QuorumDomainError):
    def __init__(self, message: str):
        super().__init__(message, status_code=422, error_type="https://quorum.dev/errors/verification")


class AuthenticationError(QuorumDomainError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status_code=401, error_type="https://quorum.dev/errors/unauthorized")


class AuthorizationError(QuorumDomainError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=403, error_type="https://quorum.dev/errors/forbidden")


class NotFoundError(QuorumDomainError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404, error_type="https://quorum.dev/errors/not-found")
