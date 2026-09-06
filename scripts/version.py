#!/usr/bin/env python3
"""Quorum Version Management Tool.

Manages SemVer versioning across the monorepo:
- VERSION (root file)
- pyproject.toml
- packages/core/quorum_core/version.py
- apps/web/package.json
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent

VERSION_FILE = ROOT_DIR / "VERSION"
PYPROJECT_FILE = ROOT_DIR / "pyproject.toml"
CORE_VERSION_FILE = ROOT_DIR / "packages" / "core" / "quorum_core" / "version.py"
WEB_PACKAGE_JSON = ROOT_DIR / "apps" / "web" / "package.json"

SEMVER_REGEX = re.compile(
    r"^(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)"
    r"(?:-(?P<prerelease>[0-9A-Za-z.-]+))?"
    r"(?:\+(?P<build>[0-9A-Za-z.-]+))?$"
)


def parse_semver(version_str: str) -> Tuple[int, int, int]:
    """Parse version string into (major, minor, patch) integer tuple."""
    match = SEMVER_REGEX.match(version_str.strip())
    if not match:
        raise ValueError(f"Invalid SemVer string: {version_str!r}. Expected format: MAJOR.MINOR.PATCH[-PRERELEASE]")
    return (
        int(match.group("major")),
        int(match.group("minor")),
        int(match.group("patch")),
    )


def get_current_version() -> str:
    """Read the current version from the primary VERSION file."""
    if not VERSION_FILE.exists():
        raise FileNotFoundError(f"VERSION file not found at {VERSION_FILE}")
    return VERSION_FILE.read_text(encoding="utf-8").strip()


def validate_all_versions() -> Dict[str, str]:
    """Check that all managed files agree on the exact same SemVer."""
    expected = get_current_version()
    parse_semver(expected)

    versions = {"VERSION": expected}

    # 1. pyproject.toml
    if PYPROJECT_FILE.exists():
        content = PYPROJECT_FILE.read_text(encoding="utf-8")
        match = re.search(r'version\s*=\s*"([^"]+)"', content)
        if match:
            versions["pyproject.toml"] = match.group(1)
        else:
            raise ValueError("Version key not found in pyproject.toml")

    # 2. quorum_core/version.py
    if CORE_VERSION_FILE.exists():
        content = CORE_VERSION_FILE.read_text(encoding="utf-8")
        match = re.search(r'__version__\s*=\s*"([^"]+)"', content)
        if match:
            versions["quorum_core/version.py"] = match.group(1)
        else:
            raise ValueError("__version__ not found in packages/core/quorum_core/version.py")

    # 3. apps/web/package.json
    if WEB_PACKAGE_JSON.exists():
        pkg = json.loads(WEB_PACKAGE_JSON.read_text(encoding="utf-8"))
        versions["apps/web/package.json"] = pkg.get("version", "")

    mismatches = {k: v for k, v in versions.items() if v != expected}
    if mismatches:
        raise ValueError(
            f"Version mismatch detected! Primary version is '{expected}', but found:\n"
            + "\n".join(f"  - {k}: '{v}'" for k, v in mismatches.items())
        )

    return versions


def write_version_to_files(new_version: str) -> None:
    """Update all files to the specified version."""
    major, minor, patch = parse_semver(new_version)

    # 1. VERSION
    VERSION_FILE.write_text(f"{new_version}\n", encoding="utf-8")

    # 2. pyproject.toml
    if PYPROJECT_FILE.exists():
        content = PYPROJECT_FILE.read_text(encoding="utf-8")
        new_content = re.sub(
            r'version\s*=\s*"[^"]+"',
            f'version = "{new_version}"',
            content,
            count=1,
        )
        PYPROJECT_FILE.write_text(new_content, encoding="utf-8")

    # 3. quorum_core/version.py
    if CORE_VERSION_FILE.exists():
        code = f'''"""Quorum version information.

Single source of truth in Python domain layer (AC boundary Rule 1: pure domain, 0 I/O).
"""
from typing import Tuple

__version__ = "{new_version}"
VERSION_INFO: Tuple[int, int, int] = ({major}, {minor}, {patch})


def get_version() -> str:
    """Return the current Quorum version string."""
    return __version__


def get_version_tuple() -> Tuple[int, int, int]:
    """Return version components as an integer tuple."""
    return VERSION_INFO
'''
        CORE_VERSION_FILE.write_text(code, encoding="utf-8")

    # 4. apps/web/package.json
    if WEB_PACKAGE_JSON.exists():
        pkg = json.loads(WEB_PACKAGE_JSON.read_text(encoding="utf-8"))
        pkg["version"] = new_version
        WEB_PACKAGE_JSON.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")


def bump_version(part: str) -> str:
    """Calculate and write bumped version."""
    current = get_current_version()
    major, minor, patch = parse_semver(current)

    if part == "major":
        next_ver = f"{major + 1}.0.0"
    elif part == "minor":
        next_ver = f"{major}.{minor + 1}.0"
    elif part == "patch":
        next_ver = f"{major}.{minor}.{patch + 1}"
    else:
        raise ValueError(f"Invalid bump part: {part}. Choose 'major', 'minor', or 'patch'.")

    write_version_to_files(next_ver)
    return next_ver


def main() -> None:
    parser = argparse.ArgumentParser(description="Quorum Version Manager")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # get
    subparsers.add_parser("get", help="Print current version")

    # validate
    subparsers.add_parser("validate", help="Validate version consistency across all project files")

    # bump
    bump_p = subparsers.add_parser("bump", help="Bump version component (patch, minor, major)")
    bump_p.add_argument("part", choices=["patch", "minor", "major"], help="Version part to increment")

    # set
    set_p = subparsers.add_parser("set", help="Set explicit version")
    set_p.add_argument("version", help="SemVer version to set (e.g. 0.1.0)")

    # tag
    subparsers.add_parser("tag", help="Create Git tag for current version")

    args = parser.parse_args()

    if args.command == "get":
        print(get_current_version())

    elif args.command == "validate":
        versions = validate_all_versions()
        print(f"✓ All versions consistent: {versions['VERSION']}")
        for file, ver in versions.items():
            print(f"  - {file}: {ver}")

    elif args.command == "bump":
        old_v = get_current_version()
        new_v = bump_version(args.part)
        print(f"✓ Version bumped from {old_v} -> {new_v}")

    elif args.command == "set":
        parse_semver(args.version)
        old_v = get_current_version()
        write_version_to_files(args.version)
        print(f"✓ Version updated from {old_v} -> {args.version}")

    elif args.command == "tag":
        current = get_current_version()
        tag_name = f"v{current}"
        try:
            subprocess.run(["git", "tag", "-a", tag_name, "-m", f"Release {tag_name}"], check=True)
            print(f"✓ Git tag '{tag_name}' created.")
        except subprocess.CalledProcessError as e:
            sys.stderr.write(f"Error creating git tag: {e}\n")
            sys.exit(1)


if __name__ == "__main__":
    main()
