#!/usr/bin/env python3
"""
PLM SFE Form Filling Bot (Python Selenium Script)
Automatically fills Student Feedback Evaluation (SFE) forms with smart presets:
- great (5/5 ⭐)
- neutral (3/5 😐)
- bad (1/5 👎)
- na (🔄 Not Applicable)

Supports PLM Pinnacle ERP, PLM CRS, Google Forms, and standard evaluation forms.
"""

import argparse
import logging
import os
import random
import re
import shutil
import sys
import time

from selenium import webdriver
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    ElementNotInteractableException,
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("Auto-SFE")


# =============================================================================
# PRESETS & TEMPLATES
# =============================================================================
PRESETS = {
    "great": {
        "id": "great",
        "name": "Great Professor ⭐",
        "score_target": 5,
        "radio_patterns": [
            re.compile(r"^(5(\.0)?(\s*[-–/:]|\s*$)|strongly\s*agree|outstanding|always|excellent|very\s*satisfactory|very\s*good)", re.IGNORECASE),
            re.compile(r"^(4(\.0)?(\s*[-–/:]|\s*$)|agree|often|good)", re.IGNORECASE),
        ],
        "dropdown_patterns": [
            re.compile(r"^(5(\.0)?(\s*[-–/:]|\s*$)|excellent|outstanding|strongly\s*agree|very\s*good|very\s*satisfactory)", re.IGNORECASE),
            re.compile(r"^(4(\.0)?(\s*[-–/:]|\s*$)|good|agree|satisfactory)", re.IGNORECASE),
        ],
        "frequency_patterns": [
            re.compile(r"^(1\s*week|weekly|every\s*class|frequently|always)", re.IGNORECASE),
        ],
        "comments": {
            "general": [
                "Outstanding professor! Concepts were explained clearly with engaging lectures and relevant real-world examples.",
                "Very effective teaching style. Lessons were well-structured, insightful, and easy to follow throughout the semester.",
                "Approachable, supportive, and passionate about the subject. Made complex topics interesting and understandable.",
                "Excellent instructor who ensures students truly understand the course material. Fair grading and inspiring mentorship.",
            ],
            "strengths": [
                "Clear explanations, deep mastery of the subject matter, and an engaging, interactive classroom presence.",
                "Punctual, well-organized syllabus, comprehensive learning materials, and very accommodating with student inquiries.",
                "Fosters an open and encouraging learning environment while maintaining high academic standards.",
            ],
            "improvements": [
                "None at all. Please keep up the inspiring teaching style and high standard of instruction!",
                "No improvements needed. Maintain the interactive discussions and practical exercises.",
            ],
        },
    },
    "neutral": {
        "id": "neutral",
        "name": "Neutral / Average 😐",
        "score_target": 3,
        "radio_patterns": [
            re.compile(r"^(3(\.0)?(\s*[-–/:]|\s*$)|neutral|satisfactory|moderate|sometimes|average|neither\s*agree|fair)", re.IGNORECASE),
        ],
        "dropdown_patterns": [
            re.compile(r"^(3(\.0)?(\s*[-–/:]|\s*$)|satisfactory|fair|moderate|neutral|average|good)", re.IGNORECASE),
        ],
        "frequency_patterns": [
            re.compile(r"^(2\s*weeks|bi-?weekly|sometimes|moderately)", re.IGNORECASE),
        ],
        "comments": {
            "general": [
                "Satisfactory performance overall. The professor covered the prescribed course syllabus adequately.",
                "Lectures were delivered as scheduled. The learning experience was fair and met the standard course requirements.",
                "Adequate course delivery, though lectures could benefit from more interactive discussions and active engagement.",
                "Standard teaching approach. Core topics were discussed, and expectations were met appropriately.",
            ],
            "strengths": [
                "Follows the syllabus steadily and covers the required curriculum on schedule.",
                "Punctual in holding class sessions and sharing the required lecture slides and modules.",
            ],
            "improvements": [
                "Could provide more timely feedback on quizzes and assignments to help students gauge their standing.",
                "Pacing could be improved by allocating more time to more difficult or technical topics.",
                "Incorporating more practical exercises and interactive discussions would enhance class engagement.",
            ],
        },
    },
    "bad": {
        "id": "bad",
        "name": "Needs Improvement 👎",
        "score_target": 1,
        "radio_patterns": [
            re.compile(r"^(1(\.0)?(\s*[-–/:]|\s*$)|strongly\s*disagree|poor|never|rarely|unsatisfactory|very\s*poor|needs\s*improvement)", re.IGNORECASE),
            re.compile(r"^(2(\.0)?(\s*[-–/:]|\s*$)|disagree|seldom|fair)", re.IGNORECASE),
        ],
        "dropdown_patterns": [
            re.compile(r"^(1(\.0)?(\s*[-–/:]|\s*$)|poor|unsatisfactory|needs\s*improvement|strongly\s*disagree)", re.IGNORECASE),
            re.compile(r"^(2(\.0)?(\s*[-–/:]|\s*$)|fair|disagree)", re.IGNORECASE),
        ],
        "frequency_patterns": [
            re.compile(r"^(never|rarely|1\s*month|monthly|hardly)", re.IGNORECASE),
        ],
        "comments": {
            "general": [
                "The course needs significant improvement in terms of lecture pacing, organization, and clarity of instruction.",
                "Lectures were often disorganized or rushed, making it difficult to follow and grasp complex subject matter.",
                "Communication regarding coursework, rubrics, and deadlines was unclear and caused unnecessary confusion.",
                "Guidance and feedback on student assessments were minimal throughout the semester.",
            ],
            "strengths": [
                "Has background knowledge in the subject area.",
                "Covers standard textbook material.",
            ],
            "improvements": [
                "Needs to improve lecture pacing and explain fundamental concepts with greater patience and clarity.",
                "Please provide clear grading rubrics and return graded assessments with constructive feedback promptly.",
                "Better communication with students, timely announcements, and dedicated consultation hours are strongly recommended.",
            ],
        },
    },
    "na": {
        "id": "na",
        "name": "Not Applicable 🔄",
        "score_target": None,
        "radio_patterns": [
            re.compile(r"^(not\s*applicable|n\/?a|none)", re.IGNORECASE),
        ],
        "dropdown_patterns": [
            re.compile(r"^(not\s*applicable|n\/?a|none)", re.IGNORECASE),
        ],
        "frequency_patterns": [
            re.compile(r"^(not\s*applicable|n\/?a)", re.IGNORECASE),
        ],
        "comments": {
            "general": ["Not applicable."],
            "strengths": ["Not applicable."],
            "improvements": ["Not applicable."],
        },
    },
}

IDENTITY_REGEX = re.compile(
    r"student.*id|id.*num|student.*num|student.*name|full.*name|your.*name|section|course.*code|subject.*code|subject.*title",
    re.IGNORECASE,
)


# =============================================================================
# CLI PARSER
# =============================================================================
def parse_arguments():
    parser = argparse.ArgumentParser(
        description="PLM SFE Form Filling Bot - Automatically fill faculty evaluations with presets."
    )
    parser.add_argument("form_url", help="URL or local path to the SFE form")
    parser.add_argument(
        "-p", "--preset",
        choices=["great", "neutral", "bad", "na"],
        default="great",
        help="Evaluation preset template to use (default: great)",
    )
    parser.add_argument(
        "--no-submit", "--dry-run",
        dest="submit",
        action="store_false",
        default=True,
        help="Fill the form without automatically submitting (allows review)",
    )
    parser.add_argument(
        "-b", "--browser",
        choices=["auto", "chrome", "chromium", "firefox", "edge", "helium"],
        default="auto",
        help="Browser to automate (default: auto)",
    )
    parser.add_argument(
        "--browser-binary",
        default=None,
        help="Custom path to browser executable",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browser in headless mode (no GUI window)",
    )
    parser.add_argument(
        "-c", "--comment",
        default="",
        help="Custom comment string to override template comments",
    )
    parser.add_argument(
        "--student-name",
        default="",
        help="Student name to fill into student name field if present",
    )
    parser.add_argument(
        "--student-id",
        default="",
        help="Student ID to fill into student ID field if present",
    )
    parser.add_argument(
        "--randomize",
        action="store_true",
        default=True,
        help="Add subtle human-like variation to ratings (e.g., occasional 4 instead of 5 for Great)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.2,
        help="Delay in seconds between form actions (default: 0.2)",
    )
    return parser.parse_args()


# =============================================================================
# BROWSER DRIVER SETUP
# =============================================================================
def find_available_browser():
    candidates = [
        ("google-chrome", "chrome"),
        ("google-chrome-stable", "chrome"),
        ("chromium", "chromium"),
        ("chromium-browser", "chromium"),
        ("helium-browser", "helium"),
        ("brave-browser", "chrome"),
        ("microsoft-edge", "edge"),
        ("microsoft-edge-stable", "edge"),
        ("firefox", "firefox"),
    ]
    for binary_name, browser_type in candidates:
        path = shutil.which(binary_name)
        if path:
            return browser_type, path
    return "chrome", None


def create_driver(browser="auto", binary_path=None, headless=False):
    detected_type, detected_path = find_available_browser()
    target_browser = browser.lower() if browser != "auto" else detected_type
    binary_location = binary_path or (detected_path if target_browser in (detected_type, "helium", "chromium") else None)

    logger.info(f"Setting up WebDriver for '{target_browser}' (binary: {binary_location or 'default'})")

    if target_browser in ("chrome", "chromium", "helium"):
        options = webdriver.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1280,900")
        if headless:
            options.add_argument("--headless=new")
        if binary_location:
            options.binary_location = binary_location
        return webdriver.Chrome(options=options)

    elif target_browser == "firefox":
        options = webdriver.FirefoxOptions()
        if headless:
            options.add_argument("-headless")
        if binary_location:
            options.binary_location = binary_location
        return webdriver.Firefox(options=options)

    elif target_browser == "edge":
        options = webdriver.EdgeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        if headless:
            options.add_argument("--headless=new")
        if binary_location:
            options.binary_location = binary_location
        return webdriver.Edge(options=options)

    else:
        raise ValueError(f"Unsupported browser type: {target_browser}")


# =============================================================================
# ELEMENT EXTRACTION & HELPERS
# =============================================================================
def get_element_label_text(driver, element):
    try:
        # Check aria-label
        aria_label = element.get_attribute("aria-label") or ""
        if aria_label:
            return aria_label.strip()

        # Check <label for="id">
        elem_id = element.get_attribute("id")
        if elem_id:
            labels = driver.find_elements(By.CSS_SELECTOR, f"label[for='{elem_id}']")
            if labels and labels[0].text:
                return labels[0].text.strip()

        # Check parent label or question container
        parent = element
        for _ in range(4):
            parent = parent.find_element(By.XPATH, "..")
            if parent.tag_name.lower() == "label":
                return parent.text.strip()
            # Google forms or Pinnacle headings
            headings = parent.find_elements(By.CSS_SELECTOR, "label, [role='heading'], .title, div[class*='Title']")
            if headings and headings[0].text:
                return headings[0].text.strip()
    except Exception:
        pass
    return ""


def get_preset_comment(preset_key, context_text="", custom_comment=""):
    if custom_comment and custom_comment.strip():
        return custom_comment.strip()

    preset = PRESETS.get(preset_key, PRESETS["great"])
    lower = context_text.lower() if context_text else ""

    if re.search(r"strength|good|like|positive|best|effective|commend", lower):
        return random.choice(preset["comments"]["strengths"])
    elif re.search(r"weakness|improve|suggest|recommend|better|lack|change|critic", lower):
        return random.choice(preset["comments"]["improvements"])
    return random.choice(preset["comments"]["general"])


def safe_click(driver, element, retries=3):
    for attempt in range(retries):
        try:
            element.click()
            return True
        except (ElementClickInterceptedException, ElementNotInteractableException):
            try:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
                driver.execute_script("arguments[0].click();", element)
                return True
            except Exception:
                time.sleep(0.3 * (attempt + 1))
        except StaleElementReferenceException:
            break
        except Exception:
            time.sleep(0.3)
    return False


def set_input_value(driver, element, value):
    try:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        element.clear()
        element.send_keys(value)
        driver.execute_script(
            "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));"
            "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
            element,
        )
        return True
    except Exception:
        try:
            driver.execute_script("arguments[0].value = arguments[1];", element, value)
            driver.execute_script(
                "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));"
                "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                element,
            )
            return True
        except Exception as e:
            logger.warning(f"Failed to fill input: {e}")
            return False


# =============================================================================
# FORM FILLING ENGINE
# =============================================================================
def find_form_elements(driver):
    elements = {
        "text_inputs": [],
        "textareas": [],
        "radio_groups": {},
        "checkboxes": [],
        "dropdowns": [],
    }

    # Text inputs (excluding buttons, submits, radios, checkboxes, files)
    all_inputs = driver.find_elements(
        By.CSS_SELECTOR,
        "input:not([type='button']):not([type='submit']):not([type='radio']):not([type='checkbox']):not([type='file']):not([type='hidden'])"
    )
    elements["text_inputs"] = all_inputs

    # Textareas + Google Forms role="textbox"
    textareas = driver.find_elements(By.CSS_SELECTOR, "textarea, div[role='textbox']")
    elements["textareas"] = textareas

    # Standard radio buttons
    radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
    for radio in radios:
        name = radio.get_attribute("name") or f"unnamed_{radio.id}"
        if name not in elements["radio_groups"]:
            elements["radio_groups"][name] = []
        elements["radio_groups"][name].append(radio)

    # Google Forms role="radiogroup"
    aria_groups = driver.find_elements(By.CSS_SELECTOR, "[role='radiogroup']")
    for idx, group in enumerate(aria_groups):
        group_name = f"aria_radiogroup_{idx}"
        group_radios = group.find_elements(By.CSS_SELECTOR, "[role='radio']")
        if group_radios:
            elements["radio_groups"][group_name] = group_radios

    # Checkboxes
    elements["checkboxes"] = driver.find_elements(By.CSS_SELECTOR, "input[type='checkbox'], [role='checkbox']")

    # Dropdowns
    elements["dropdowns"] = driver.find_elements(By.TAG_NAME, "select")

    return elements


def fill_text_fields(driver, text_inputs, textareas, preset_key, args):
    filled = 0

    # 1. Text Inputs
    for inp in text_inputs:
        try:
            name = inp.get_attribute("name") or ""
            elem_id = inp.get_attribute("id") or ""
            placeholder = inp.get_attribute("placeholder") or ""
            aria_label = inp.get_attribute("aria-label") or ""
            label_text = get_element_label_text(driver, inp)

            combined = f"{elem_id} {name} {placeholder} {aria_label} {label_text}".lower()

            if IDENTITY_REGEX.search(combined):
                if re.search(r"id|num", combined) and args.student_id:
                    set_input_value(driver, inp, args.student_id)
                    filled += 1
                elif re.search(r"name", combined) and args.student_name:
                    set_input_value(driver, inp, args.student_name)
                    filled += 1
                # Skip identity field to preserve student information
                continue

            current_val = inp.get_attribute("value") or ""
            if not current_val or current_val == "Not applicable.":
                val = get_preset_comment(preset_key, label_text, args.comment)
                set_input_value(driver, inp, val)
                filled += 1
        except Exception:
            pass

    # 2. Textareas
    for ta in textareas:
        try:
            context = get_element_label_text(driver, ta) or ta.get_attribute("placeholder") or ""
            val = get_preset_comment(preset_key, context, args.comment)
            if ta.tag_name.lower() == "textarea":
                set_input_value(driver, ta, val)
                filled += 1
            else:
                # ARIA textbox
                driver.execute_script("arguments[0].textContent = arguments[1];", ta, val)
                driver.execute_script(
                    "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));"
                    "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                    ta,
                )
                filled += 1
        except Exception:
            pass

    return filled


def get_radio_descriptor(driver, radio):
    val = radio.get_attribute("value") or radio.get_attribute("data-value") or ""
    label_text = get_element_label_text(driver, radio)
    return f"{val} {label_text}".strip()


def fill_single_radio_group(driver, group_name, radios, preset, randomize=True):
    if not radios:
        return False

    descriptors = [get_radio_descriptor(driver, r) for r in radios]

    # N/A preset
    if preset["id"] == "na":
        for i, desc in enumerate(descriptors):
            if preset["radio_patterns"][0].search(desc):
                safe_click(driver, radios[i])
                return True
        safe_click(driver, radios[-1])
        return True

    # Filter out "Not Applicable" for evaluation presets
    valid_indices = [
        i for i, desc in enumerate(descriptors)
        if not re.search(r"not\s*applicable|n\/?a|none", desc, re.IGNORECASE)
    ]
    candidate_indices = valid_indices if valid_indices else list(range(len(radios)))

    # 1. Pattern matching
    for pattern in preset["radio_patterns"]:
        for idx in candidate_indices:
            if pattern.search(descriptors[idx]):
                if preset["id"] == "great" and randomize and random.random() < 0.15 and len(candidate_indices) > 2:
                    second_idx = candidate_indices[max(0, candidate_indices.index(idx) - 1)]
                    safe_click(driver, radios[second_idx])
                    return True
                safe_click(driver, radios[idx])
                return True

    # 2. Frequency matching (e.g., Pinnacle frequency options)
    if preset.get("frequency_patterns"):
        for pattern in preset["frequency_patterns"]:
            for idx in candidate_indices:
                if pattern.search(descriptors[idx]):
                    safe_click(driver, radios[idx])
                    return True

    # 3. Positional Likert fallback
    total = len(candidate_indices)
    if total == 1:
        safe_click(driver, radios[candidate_indices[0]])
        return True

    first_text = descriptors[candidate_indices[0]]
    last_text = descriptors[candidate_indices[-1]]
    is_descending = bool(
        re.search(r"^(5|strongly\s*agree|excellent|outstanding)", first_text, re.IGNORECASE)
        or re.search(r"^(1|strongly\s*disagree|poor)", last_text, re.IGNORECASE)
    )

    if preset["id"] == "great":
        chosen_idx = candidate_indices[0] if is_descending else candidate_indices[-1]
        if randomize and total >= 4 and random.random() < 0.15:
            chosen_idx = candidate_indices[1] if is_descending else candidate_indices[-2]
    elif preset["id"] == "bad":
        chosen_idx = candidate_indices[-1] if is_descending else candidate_indices[0]
    else:
        # Neutral: middle option
        chosen_idx = candidate_indices[total // 2]

    safe_click(driver, radios[chosen_idx])
    return True


def fill_radio_groups(driver, radio_groups, preset, randomize=True):
    filled = 0
    for name, radios in radio_groups.items():
        if fill_single_radio_group(driver, name, radios, preset, randomize):
            filled += 1
    return filled


def fill_dropdowns(driver, dropdowns, preset):
    filled = 0
    for dd in dropdowns:
        try:
            elem_id = dd.get_attribute("id") or ""
            name = dd.get_attribute("name") or ""
            desc = f"{elem_id} {name}".lower()

            # Skip faculty selector dropdowns unless empty
            if re.search(r"faculty|instructor|professor|prof|teacher", desc):
                select = Select(dd)
                if not select.first_selected_option.get_attribute("value") and len(select.options) > 1:
                    select.select_by_index(1)
                    filled += 1
                continue

            select = Select(dd)
            options = select.options
            if len(options) <= 1:
                continue

            if preset["id"] == "na":
                for i, opt in enumerate(options):
                    if preset["dropdown_patterns"][0].search(opt.text.strip()):
                        select.select_by_index(i)
                        filled += 1
                        break
                else:
                    select.select_by_index(len(options) - 1)
                    filled += 1
                continue

            # Filter valid options
            valid = []
            for i, opt in enumerate(options):
                txt = opt.text.strip()
                val = opt.get_attribute("value") or ""
                if not val and re.search(r"select|choose", txt, re.IGNORECASE):
                    continue
                if re.search(r"not\s*applicable|n\/?a", txt, re.IGNORECASE):
                    continue
                valid.append((i, txt, val))

            if not valid:
                continue

            matched = False
            for pattern in preset["dropdown_patterns"]:
                for idx, txt, val in valid:
                    if pattern.search(txt) or pattern.search(val):
                        select.select_by_index(idx)
                        filled += 1
                        matched = True
                        break
                if matched:
                    break

            if not matched:
                if preset["id"] == "great":
                    select.select_by_index(valid[0][0])
                elif preset["id"] == "bad":
                    select.select_by_index(valid[-1][0])
                else:
                    select.select_by_index(valid[len(valid) // 2][0])
                filled += 1
        except Exception:
            pass
    return filled


def fill_checkboxes(driver, checkboxes):
    filled = 0
    for cb in checkboxes:
        try:
            desc = f"{cb.get_attribute('id') or ''} {cb.get_attribute('name') or ''}".lower()
            if re.search(r"certify|confirm|agree|declare|honest|understood|ack", desc):
                if not cb.is_selected():
                    safe_click(driver, cb)
                    filled += 1
        except Exception:
            pass
    return filled


def submit_form(driver, retries=3):
    submit_selectors = [
        (By.CSS_SELECTOR, "button[type='submit']"),
        (By.CSS_SELECTOR, "input[type='submit']"),
        (By.XPATH, "//button[contains(translate(text(), 'SUBMIT', 'submit'), 'submit')]"),
        (By.XPATH, "//input[contains(translate(@value, 'SUBMIT', 'submit'), 'submit')]"),
        (By.CSS_SELECTOR, "div[role='button'][aria-label*='Submit' i]"),
        (By.CSS_SELECTOR, "div[role='button'][aria-label*='Next' i]"),
    ]

    for by, selector in submit_selectors:
        try:
            buttons = driver.find_elements(by, selector)
            for btn in buttons:
                if btn.is_displayed():
                    for attempt in range(retries):
                        if safe_click(driver, btn):
                            logger.info("Form submitted successfully!")
                            return True
        except Exception:
            continue

    logger.warning("Could not automatically locate submit button.")
    return False


# =============================================================================
# MAIN ORCHESTRATOR
# =============================================================================
def main():
    args = parse_arguments()
    preset = PRESETS.get(args.preset.lower(), PRESETS["great"])
    driver = None

    url = args.form_url
    if not url.startswith("http://") and not url.startswith("https://") and not url.startswith("file://"):
        if os.path.exists(url):
            url = f"file://{os.path.abspath(url)}"

    logger.info("==================================================")
    logger.info("🎓 PLM SFE Form Filling Bot")
    logger.info(f"Target Form: {url}")
    logger.info(f"Active Preset: {preset['name']} ({args.preset})")
    logger.info(f"Auto-Submit: {'Enabled' if args.submit else 'Disabled (--dry-run)'}")
    logger.info("==================================================")

    try:
        driver = create_driver(
            browser=args.browser,
            binary_path=args.browser_binary,
            headless=args.headless,
        )

        driver.get(url)
        time.sleep(2)  # Initial load wait

        # Handle potential iframes (e.g., test_form_iframe.html)
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        main_elements = find_form_elements(driver)

        # If top-level has almost no fields, check if form is embedded in an iframe
        if len(main_elements["text_inputs"]) == 0 and len(main_elements["radio_groups"]) == 0 and iframes:
            logger.info("Form elements not found on top document. Checking iframes...")
            for iframe in iframes:
                try:
                    driver.switch_to.frame(iframe)
                    sub_elements = find_form_elements(driver)
                    if sub_elements["text_inputs"] or sub_elements["radio_groups"]:
                        logger.info("Switched to iframe containing form.")
                        main_elements = sub_elements
                        break
                    driver.switch_to.default_content()
                except Exception:
                    driver.switch_to.default_content()

        # Fill all sections
        text_count = fill_text_fields(driver, main_elements["text_inputs"], main_elements["textareas"], args.preset, args)
        time.sleep(args.delay)

        radio_count = fill_radio_groups(driver, main_elements["radio_groups"], preset, randomize=args.randomize)
        time.sleep(args.delay)

        dropdown_count = fill_dropdowns(driver, main_elements["dropdowns"], preset)
        time.sleep(args.delay)

        checkbox_count = fill_checkboxes(driver, main_elements["checkboxes"])

        logger.info("--------------------------------------------------")
        logger.info(f"✅ Text fields filled:   {text_count}")
        logger.info(f"✅ Radio groups filled: {radio_count}")
        logger.info(f"✅ Dropdowns selected:  {dropdown_count}")
        logger.info(f"✅ Checkboxes checked:  {checkbox_count}")
        logger.info("--------------------------------------------------")

        if args.submit:
            logger.info("Auto-submitting evaluation...")
            time.sleep(1)
            submitted = submit_form(driver)
            if submitted:
                logger.info("Evaluation completed and submitted successfully! 🎉")
            else:
                logger.warning("Could not submit automatically. Please review and submit manually.")
        else:
            logger.info("Form filled in review mode (--no-submit / --dry-run). Reviewing...")
            time.sleep(3)

        return 0

    except Exception as e:
        logger.error(f"Execution error: {e}", exc_info=True)
        return 1

    finally:
        if driver:
            time.sleep(1)
            driver.quit()


if __name__ == "__main__":
    sys.exit(main())
