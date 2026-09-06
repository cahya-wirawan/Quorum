"""Hierarchical configuration merger for repository review settings (AC-005).

Resolution hierarchy:
  default -> org_defaults -> ui_settings -> repo_file (.quorum.yaml)

Handles schema validation and graceful fallback to last-known-good configuration.
"""
from __future__ import annotations

import copy
from typing import Any, Dict, Optional, Tuple
from quorum_core.models import RepoConfig, Severity


def validate_config_dict(cfg_dict: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate raw config dictionary values."""
    if not isinstance(cfg_dict, dict):
        return False, "Config must be a dictionary"

    if "comment_budget" in cfg_dict:
        b = cfg_dict["comment_budget"]
        if not isinstance(b, int) or b < 0:
            return False, f"Invalid comment_budget: {b} (must be non-negative integer)"

    if "mode" in cfg_dict:
        m = cfg_dict["mode"]
        if m not in ("full", "observe", "light", "skip"):
            return False, f"Invalid mode: {m}"

    if "min_severity" in cfg_dict:
        s = cfg_dict["min_severity"]
        valid_sevs = {sev.value for sev in Severity}
        if s not in valid_sevs:
            return False, f"Invalid min_severity: {s}"

    return True, None


def merge_config(
    default_config: RepoConfig,
    org_config: Optional[Dict[str, Any]] = None,
    ui_config: Optional[Dict[str, Any]] = None,
    file_config: Optional[Dict[str, Any]] = None,
    last_known_good: Optional[RepoConfig] = None,
) -> Tuple[RepoConfig, Optional[str]]:
    """Merge configuration layers in order of precedence: default -> org -> ui -> file.
    
    Returns:
        (resolved_config, warning_message)
    """
    res = copy.deepcopy(default_config)
    res.source = "default"
    warning = None

    # 1. Apply org config
    if org_config:
        is_valid, err = validate_config_dict(org_config)
        if is_valid:
            if "comment_budget" in org_config:
                res.comment_budget = org_config["comment_budget"]
                res.source = "org"
            if "mode" in org_config:
                res.mode = org_config["mode"]
                res.source = "org"
            if "min_severity" in org_config:
                res.min_severity = Severity(org_config["min_severity"])
                res.source = "org"
            if "enabled_lanes" in org_config:
                res.enabled_lanes = list(org_config["enabled_lanes"])
                res.source = "org"
            if "persist_excerpts" in org_config:
                res.persist_excerpts = bool(org_config["persist_excerpts"])
                res.source = "org"

    # 2. Apply UI config
    if ui_config:
        is_valid, err = validate_config_dict(ui_config)
        if is_valid:
            if "comment_budget" in ui_config:
                res.comment_budget = ui_config["comment_budget"]
                res.source = "ui"
            if "mode" in ui_config:
                res.mode = ui_config["mode"]
                res.source = "ui"
            if "min_severity" in ui_config:
                res.min_severity = Severity(ui_config["min_severity"])
                res.source = "ui"
            if "enabled_lanes" in ui_config:
                res.enabled_lanes = list(ui_config["enabled_lanes"])
                res.source = "ui"
            if "persist_excerpts" in ui_config:
                res.persist_excerpts = bool(ui_config["persist_excerpts"])
                res.source = "ui"

    # 3. Apply file config (.quorum.yaml)
    if file_config is not None:
        is_valid, err = validate_config_dict(file_config)
        if is_valid:
            if "comment_budget" in file_config:
                res.comment_budget = file_config["comment_budget"]
                res.source = "file"
            if "mode" in file_config:
                res.mode = file_config["mode"]
                res.source = "file"
            if "min_severity" in file_config:
                res.min_severity = Severity(file_config["min_severity"])
                res.source = "file"
            if "enabled_lanes" in file_config:
                res.enabled_lanes = list(file_config["enabled_lanes"])
                res.source = "file"
            if "persist_excerpts" in file_config:
                res.persist_excerpts = bool(file_config["persist_excerpts"])
                res.source = "file"
        else:
            # Fallback to last known good (or keep UI/org resolution) and warn
            warning = f"Invalid .quorum.yaml configuration: {err}. Falling back to last known good."
            if last_known_good:
                res = copy.deepcopy(last_known_good)

    return res, warning
