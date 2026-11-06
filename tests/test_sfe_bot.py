#!/usr/bin/env python3
"""
Unit tests for sfe_bot.py
"""

import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure sfe_bot can be imported
sys.path.insert(0, "/home/kelldrei/Projects/auto-sfe")
import sfe_bot


class TestSFEBot(unittest.TestCase):
    def test_presets_exist(self):
        for preset_key in ["great", "neutral", "bad", "na"]:
            self.assertIn(preset_key, sfe_bot.PRESETS)
            preset = sfe_bot.PRESETS[preset_key]
            self.assertIn("comments", preset)
            self.assertIn("radio_patterns", preset)
            self.assertIn("dropdown_patterns", preset)
            self.assertTrue(len(preset["comments"]["general"]) > 0)
            self.assertTrue(len(preset["comments"]["strengths"]) > 0)
            self.assertTrue(len(preset["comments"]["improvements"]) > 0)

    def test_cli_parsing_defaults(self):
        with patch.object(sys, "argv", ["sfe_bot.py", "https://example.com/form"]):
            args = sfe_bot.parse_arguments()
            self.assertEqual(args.form_url, "https://example.com/form")
            self.assertEqual(args.preset, "great")
            self.assertTrue(args.submit)
            self.assertEqual(args.browser, "auto")

    def test_cli_parsing_custom_preset_and_dry_run(self):
        with patch.object(sys, "argv", ["sfe_bot.py", "https://example.com/form", "-p", "neutral", "--dry-run", "-c", "Custom Feedback"]):
            args = sfe_bot.parse_arguments()
            self.assertEqual(args.preset, "neutral")
            self.assertFalse(args.submit)
            self.assertEqual(args.comment, "Custom Feedback")

    def test_comment_generation(self):
        # General comment
        cmt_great = sfe_bot.get_preset_comment("great", "General Comments")
        self.assertIn(cmt_great, sfe_bot.PRESETS["great"]["comments"]["general"])

        # Strengths comment
        cmt_str = sfe_bot.get_preset_comment("great", "What are the professor's strengths?")
        self.assertIn(cmt_str, sfe_bot.PRESETS["great"]["comments"]["strengths"])

        # Improvements comment
        cmt_imp = sfe_bot.get_preset_comment("bad", "Areas for improvement / suggestions")
        self.assertIn(cmt_imp, sfe_bot.PRESETS["bad"]["comments"]["improvements"])

        # Custom comment override
        cmt_custom = sfe_bot.get_preset_comment("great", "General", custom_comment="My unique note")
        self.assertEqual(cmt_custom, "My unique note")

    def test_radio_matching_patterns(self):
        # Great patterns should match 5, Strongly Agree, 1 week, but NOT 1 week for '1'
        great_preset = sfe_bot.PRESETS["great"]
        self.assertTrue(great_preset["radio_patterns"][0].search("5 - Strongly Agree"))
        self.assertTrue(great_preset["radio_patterns"][0].search("Strongly Agree"))
        self.assertTrue(great_preset["frequency_patterns"][0].search("1 week"))

        bad_preset = sfe_bot.PRESETS["bad"]
        self.assertTrue(bad_preset["radio_patterns"][0].search("1 - Strongly Disagree"))
        self.assertTrue(bad_preset["radio_patterns"][0].search("Strongly Disagree"))
        # Verify "1 week" does NOT match bad rating pattern 1
        self.assertFalse(bad_preset["radio_patterns"][0].search("1 week"))
        # But matches frequency pattern for bad
        self.assertTrue(bad_preset["frequency_patterns"][0].search("Never"))

        neutral_preset = sfe_bot.PRESETS["neutral"]
        self.assertTrue(neutral_preset["radio_patterns"][0].search("3 - Neutral"))
        self.assertTrue(neutral_preset["radio_patterns"][0].search("Neutral"))
        self.assertTrue(neutral_preset["frequency_patterns"][0].search("2 weeks"))

    def test_identity_regex(self):
        self.assertTrue(bool(sfe_bot.IDENTITY_REGEX.search("studentId")))
        self.assertTrue(bool(sfe_bot.IDENTITY_REGEX.search("Student Name")))
        self.assertTrue(bool(sfe_bot.IDENTITY_REGEX.search("student_number")))
        self.assertFalse(bool(sfe_bot.IDENTITY_REGEX.search("general_feedback")))
        self.assertFalse(bool(sfe_bot.IDENTITY_REGEX.search("comments")))


if __name__ == "__main__":
    unittest.main()
