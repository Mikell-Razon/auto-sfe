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

        # Improvements comment (generic)
        cmt_imp = sfe_bot.get_preset_comment("bad", "Suggestions for improvement / critique")
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

    def test_is_negative_question(self):
        # Reverse-coded questions with asterisk
        self.assertTrue(sfe_bot.is_negative_question("2. I-2 * Attends class unprepared for the lesson."))
        self.assertTrue(sfe_bot.is_negative_question("I-7 * Does not encourage students to do their best."))
        self.assertTrue(sfe_bot.is_negative_question("10. I-10 * Does not respect student's ideas and viewpoints."))
        self.assertTrue(sfe_bot.is_negative_question("I-23 * Is not available for consultation."))
        self.assertTrue(sfe_bot.is_negative_question("I-25 * Give unreasonable course requirements and assignments."))

        # Normal positive questions
        self.assertFalse(sfe_bot.is_negative_question("1. I-1 Explains the course objectives, expectations, and requirements."))
        self.assertFalse(sfe_bot.is_negative_question("3. I-3 Presents the subject matter clearly and systematically."))
        self.assertFalse(sfe_bot.is_negative_question("II-1 This course stimulates me to study beyond the lessons assigned."))

    def test_specific_plm_comments(self):
        # I-41.8 Other bases for grading
        cmt_other = sfe_bot.get_preset_comment("great", "What are the OTHER bases used by the teacher for grading?")
        self.assertIn("laboratory", cmt_other)

        # I-44 Fair in grading
        cmt_fair_great = sfe_bot.get_preset_comment("great", "Explain your answer in I-43 (Is the teacher fair in giving grades?)")
        self.assertIn("transparent", cmt_fair_great)
        cmt_fair_bad = sfe_bot.get_preset_comment("bad", "Explain your answer in I-43 (Is the teacher fair in giving grades?)")
        self.assertIn("inconsistent", cmt_fair_bad)

        # I-47 / I-48 MS Teams
        cmt_teams = sfe_bot.get_preset_comment("great", "has the faculty used either Zoom or MS Teams only?")
        self.assertEqual(cmt_teams, "MS Teams only.")

        # II-10 Departures from syllabus
        cmt_dep_great = sfe_bot.get_preset_comment("great", "Describe the nature of the departure(s) from the syllabus.")
        self.assertIn("None", cmt_dep_great)
        cmt_dep_bad = sfe_bot.get_preset_comment("bad", "Describe the nature of the departure(s) from the syllabus.")
        self.assertIn("skipped", cmt_dep_bad)

        # III-10 Virtual learning
        cmt_vl = sfe_bot.get_preset_comment("great", "How would you explain your experience using the virtual learning?")
        self.assertIn("MS Teams", cmt_vl)

    def test_reverse_radio_filling(self):
        class MockRadio:
            def __init__(self, value, text):
                self.value = value
                self.text = text
                self.clicked = False
                self.tag_name = "input"

            def get_attribute(self, attr):
                if attr == "value":
                    return self.value
                return ""

            def click(self):
                self.clicked = True

        mock_driver = MagicMock()

        # Test reverse-coded negative question: "I-2 * Attends class unprepared"
        # Options: Strongly Agree, Agree, Disagree, Strongly Disagree
        radios_neg = [
            MockRadio("Strongly Agree", "Strongly Agree"),
            MockRadio("Agree", "Agree"),
            MockRadio("Disagree", "Disagree"),
            MockRadio("Strongly Disagree", "Strongly Disagree"),
        ]

        with patch("sfe_bot.get_question_text", return_value="2. I-2 * Attends class unprepared for the lesson."):
            with patch("sfe_bot.get_radio_descriptor", side_effect=lambda d, r: r.value):
                # Great preset should choose Strongly Disagree (or Disagree if variation) for negative question!
                sfe_bot.fill_single_radio_group(mock_driver, "q2", radios_neg, sfe_bot.PRESETS["great"], randomize=False)
                self.assertTrue(radios_neg[3].clicked, "Great professor should get Strongly Disagree on negative statement")

                # Reset
                for r in radios_neg:
                    r.clicked = False

                # Bad preset should choose Strongly Agree for negative question!
                sfe_bot.fill_single_radio_group(mock_driver, "q2", radios_neg, sfe_bot.PRESETS["bad"], randomize=False)
                self.assertTrue(radios_neg[0].clicked, "Bad professor should get Strongly Agree on negative statement")

        # Test positive question: "I-1 Explains course objectives"
        radios_pos = [
            MockRadio("Strongly Agree", "Strongly Agree"),
            MockRadio("Agree", "Agree"),
            MockRadio("Disagree", "Disagree"),
            MockRadio("Strongly Disagree", "Strongly Disagree"),
        ]

        with patch("sfe_bot.get_question_text", return_value="1. I-1 Explains the course objectives"):
            with patch("sfe_bot.get_radio_descriptor", side_effect=lambda d, r: r.value):
                # Great preset should choose Strongly Agree
                sfe_bot.fill_single_radio_group(mock_driver, "q1", radios_pos, sfe_bot.PRESETS["great"], randomize=False)
                self.assertTrue(radios_pos[0].clicked, "Great professor should get Strongly Agree on positive statement")

                # Reset
                for r in radios_pos:
                    r.clicked = False

                # Bad preset should choose Strongly Disagree
                sfe_bot.fill_single_radio_group(mock_driver, "q1", radios_pos, sfe_bot.PRESETS["bad"], randomize=False)
                self.assertTrue(radios_pos[3].clicked, "Bad professor should get Strongly Disagree on positive statement")


if __name__ == "__main__":
    unittest.main()
