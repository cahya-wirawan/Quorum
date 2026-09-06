"""Unit tests for Quorum versioning system."""
import unittest
from pathlib import Path
from quorum_core import __version__, get_version, VERSION_INFO
from scripts.version import validate_all_versions, parse_semver, get_current_version


class TestVersioning(unittest.TestCase):
    def test_version_string_and_tuple(self):
        self.assertEqual(__version__, "0.1.0")
        self.assertEqual(get_version(), "0.1.0")
        self.assertEqual(VERSION_INFO, (0, 1, 0))

    def test_semver_parsing(self):
        major, minor, patch = parse_semver("0.1.0")
        self.assertEqual((major, minor, patch), (0, 1, 0))

        major, minor, patch = parse_semver("1.2.3")
        self.assertEqual((major, minor, patch), (1, 2, 3))

        with self.assertRaises(ValueError):
            parse_semver("invalid-semver")

    def test_consistency_across_monorepo_files(self):
        versions = validate_all_versions()
        self.assertEqual(versions["VERSION"], "0.1.0")
        self.assertEqual(versions["pyproject.toml"], "0.1.0")
        self.assertEqual(versions["quorum_core/version.py"], "0.1.0")
        self.assertEqual(versions["apps/web/package.json"], "0.1.0")

    def test_root_version_file(self):
        version_file = Path("VERSION")
        self.assertTrue(version_file.exists())
        self.assertEqual(version_file.read_text(encoding="utf-8").strip(), "0.1.0")


if __name__ == "__main__":
    unittest.main()
