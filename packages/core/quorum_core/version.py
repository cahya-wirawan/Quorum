"""Quorum version information.

Single source of truth in Python domain layer (AC boundary Rule 1: pure domain, 0 I/O).
"""
from typing import Tuple

__version__ = "0.1.0"
VERSION_INFO: Tuple[int, int, int] = (0, 1, 0)


def get_version() -> str:
    """Return the current Quorum version string."""
    return __version__


def get_version_tuple() -> Tuple[int, int, int]:
    """Return version components as an integer tuple."""
    return VERSION_INFO
