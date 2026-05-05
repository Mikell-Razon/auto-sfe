#!/usr/bin/env python3

import argparse
import logging
import sys
import time

from selenium import webdriver
from selenium.common.exceptions import (
    ElementNotInteractableException,
    NoSuchElementException,
    TimeoutException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

FORM_TEXT = "Not applicable."
RETRY_ATTEMPTS = 3
WAIT_TIMEOUT = 10


def parse_arguments():
    parser = argparse.ArgumentParser(description="SFE Form Filling Bot")
    parser.add_argument("form_url", help="URL of the SFE form to fill out")
    return parser.parse_args()


def create_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=options)


def wait_and_find_elements(driver, by, value, timeout=WAIT_TIMEOUT):
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )
        return driver.find_elements(by, value)
    except TimeoutException:
        logger.warning(f"Timeout waiting for elements: {by}={value}")
        return []


def find_form_elements(driver):
    elements = {
        "text_inputs": [],
        "textareas": [],
        "radio_groups": {},
        "checkboxes": [],
        "dropdowns": [],
    }

    elements["text_inputs"] = wait_and_find_elements(driver, By.CSS_SELECTOR, "input[type='text']")
    logger.info(f"Found {len(elements['text_inputs'])} text inputs")

    elements["textareas"] = wait_and_find_elements(driver, By.TAG_NAME, "textarea")
    logger.info(f"Found {len(elements['textareas'])} textareas")

    radio_buttons = wait_and_find_elements(driver, By.CSS_SELECTOR, "input[type='radio']")
    radio_groups = {}
    for radio in radio_buttons:
        name = radio.get_attribute("name")
        if name:
            if name not in radio_groups:
                radio_groups[name] = []
            radio_groups[name].append(radio)
    elements["radio_groups"] = radio_groups
    logger.info(f"Found {len(radio_buttons)} radio buttons in {len(radio_groups)} groups")

    elements["checkboxes"] = wait_and_find_elements(driver, By.CSS_SELECTOR, "input[type='checkbox']")
    logger.info(f"Found {len(elements['checkboxes'])} checkboxes")

    elements["dropdowns"] = wait_and_find_elements(driver, By.TAG_NAME, "select")
    logger.info(f"Found {len(elements['dropdowns'])} dropdowns")

    return elements


def fill_text_field(element, value=FORM_TEXT, retry=RETRY_ATTEMPTS):
    for attempt in range(retry):
        try:
            element.clear()
            element.send_keys(value)
            return True
        except (ElementNotInteractableException, NoSuchElementException) as e:
            logger.warning(f"Attempt {attempt + 1}/{retry} failed: {e}")
            if attempt < retry - 1:
                time.sleep(2 ** attempt)
    return False


def fill_text_inputs(elements):
    filled = 0
    for inp in elements:
        if fill_text_field(inp):
            filled += 1
    logger.info(f"Filled {filled}/{len(elements)} text inputs")
    return filled


def fill_textareas(elements):
    filled = 0
    for textarea in elements:
        if fill_text_field(textarea):
            filled += 1
    logger.info(f"Filled {filled}/{len(elements)} textareas")
    return filled


def find_asterisk_radio_group_names(driver):
    asterisk_group_names = set()

    selectors = [
        '.freebirdFormviewerComponentsQuestionBaseRoot',
        '[class*="QuestionBase"]',
        '[aria-label*="*"]',
        'div[role="heading"]',
        '.freebirdFormviewerComponentsQuestionBaseTitle',
        '[class*="questionTitle"]'
    ]

    for selector in selectors:
        try:
            containers = driver.find_elements(By.CSS_SELECTOR, selector)
            for container in containers:
                text = (container.get_attribute('aria-label') or container.text or '').strip()
                if '*' in text:
                    logger.info(f"Found asterisk question container: {text[:50]}...")
                    radios = container.find_elements(By.CSS_SELECTOR, 'input[type="radio"]')
                    for radio in radios:
                        name = radio.get_attribute('name')
                        if name:
                            asterisk_group_names.add(name)
                            logger.info(f"Added asterisk group: {name}")
        except Exception:
            pass

    if len(asterisk_group_names) == 0:
        logger.warning("No asterisk questions found with standard selectors")
        try:
            all_elements = driver.find_elements(By.CSS_SELECTOR, '[aria-label]')
            for el in all_elements:
                aria_label = (el.get_attribute('aria-label') or '').strip()
                if '*' in aria_label:
                    logger.info(f"Found via broader aria-label search: {aria_label[:50]}...")
        except Exception:
            pass

    return asterisk_group_names


def find_radio_by_value(radios, target_value):
    for radio in radios:
        value = (radio.get_attribute('value') or '').strip()
        if value == target_value:
            return radio
    return None


def fill_radio_button(group_name, radios, asterisk_group_names):
    has_asterisk = group_name in asterisk_group_names

    radio = find_radio_by_value(radios, 'Not Applicable')
    if radio:
        for attempt in range(RETRY_ATTEMPTS):
            try:
                radio.click()
                logger.info(f"Selected 'Not Applicable' for radio group: {group_name}")
                return True
            except (ElementNotInteractableException, NoSuchElementException) as e:
                if attempt < RETRY_ATTEMPTS - 1:
                    time.sleep(2 ** attempt)
                else:
                    logger.warning(f"Failed to click Not Applicable: {e}")

    if has_asterisk:
        radio = find_radio_by_value(radios, 'Disagree')
        if radio:
            for attempt in range(RETRY_ATTEMPTS):
                try:
                    radio.click()
                    logger.info(f"Selected 'Disagree' for asterisk question: {group_name}")
                    return True
                except (ElementNotInteractableException, NoSuchElementException) as e:
                    if attempt < RETRY_ATTEMPTS - 1:
                        time.sleep(2 ** attempt)
                    else:
                        logger.warning(f"Failed to click Disagree: {e}")
    else:
        radio = find_radio_by_value(radios, 'Agree')
        if radio:
            for attempt in range(RETRY_ATTEMPTS):
                try:
                    radio.click()
                    logger.info(f"Selected 'Agree' for radio group: {group_name}")
                    return True
                except (ElementNotInteractableException, NoSuchElementException) as e:
                    if attempt < RETRY_ATTEMPTS - 1:
                        time.sleep(2 ** attempt)
                    else:
                        logger.warning(f"Failed to click Agree: {e}")

    if len(radios) > 1:
        for attempt in range(RETRY_ATTEMPTS):
            try:
                radios[1].click()
                logger.info(f"Selected second option (Agree) for radio group: {group_name}")
                return True
            except (ElementNotInteractableException, NoSuchElementException) as e:
                logger.warning(f"Attempt {attempt + 1}/{RETRY_ATTEMPTS} failed: {e}")
                if attempt < RETRY_ATTEMPTS - 1:
                    time.sleep(2 ** attempt)
    else:
        for attempt in range(RETRY_ATTEMPTS):
            try:
                radios[0].click()
                logger.info(f"Selected first option for radio group: {group_name}")
                return True
            except (ElementNotInteractableException, NoSuchElementException) as e:
                logger.warning(f"Attempt {attempt + 1}/{RETRY_ATTEMPTS} failed: {e}")
                if attempt < RETRY_ATTEMPTS - 1:
                    time.sleep(2 ** attempt)
    return False


def fill_radio_groups(radio_groups, driver):
    asterisk_group_names = find_asterisk_radio_group_names(driver)
    logger.info(f"SFE Bot: Found {len(asterisk_group_names)} asterisk questions")

    filled = 0
    for group_name, radios in radio_groups.items():
        if fill_radio_button(group_name, radios, asterisk_group_names):
            filled += 1
    logger.info(f"Filled {filled}/{len(radio_groups)} radio groups")
    return filled


def fill_checkboxes(checkboxes):
    logger.info(f"Skipping {len(checkboxes)} checkboxes (leaving unchecked)")
    return 0


def fill_dropdown(dropdown, retry=RETRY_ATTEMPTS):
    for attempt in range(retry):
        try:
            select = Select(dropdown)
            options = select.options

            for i, option in enumerate(options):
                if "not applicable" in option.text.lower():
                    select.select_by_index(i)
                    logger.info("Selected 'Not Applicable' from dropdown")
                    return True

            if options:
                select.select_by_index(0)
                logger.info("Selected first option from dropdown")
                return True
            return False
        except (ElementNotInteractableException, NoSuchElementException) as e:
            logger.warning(f"Attempt {attempt + 1}/{retry} failed: {e}")
            if attempt < retry - 1:
                time.sleep(2 ** attempt)
    return False


def fill_dropdowns(dropdowns):
    filled = 0
    for dropdown in dropdowns:
        if fill_dropdown(dropdown):
            filled += 1
    logger.info(f"Filled {filled}/{len(dropdowns)} dropdowns")
    return filled


def submit_form(driver, retry=RETRY_ATTEMPTS):
    submit_selectors = [
        (By.CSS_SELECTOR, "button[type='submit']"),
        (By.CSS_SELECTOR, "input[type='submit']"),
        (By.XPATH, "//button[contains(text(), 'Submit')]"),
        (By.XPATH, "//input[contains(@value, 'Submit')]"),
    ]

    for selector in submit_selectors:
        try:
            button = driver.find_element(selector[0], selector[1])
            for attempt in range(retry):
                try:
                    button.click()
                    logger.info("Form submitted successfully")
                    return True
                except (ElementNotInteractableException, NoSuchElementException) as e:
                    logger.warning(f"Submit attempt {attempt + 1}/{retry} failed: {e}")
                    if attempt < retry - 1:
                        time.sleep(2 ** attempt)
        except NoSuchElementException:
            continue

    logger.error("Could not find submit button")
    return False


def main():
    args = parse_arguments()
    driver = None

    try:
        logger.info(f"Starting SFE Bot - Filling form: {args.form_url}")
        driver = create_driver()
        driver.get(args.form_url)
        time.sleep(2)

        elements = find_form_elements(driver)

        fill_text_inputs(elements["text_inputs"])
        fill_textareas(elements["textareas"])
        fill_radio_groups(elements["radio_groups"])
        fill_checkboxes(elements["checkboxes"])
        fill_dropdowns(elements["dropdowns"])

        if submit_form(driver):
            logger.info("SFE Bot: Form filled and submitted successfully")
            return 0
        else:
            logger.error("SFE Bot: Failed to submit form")
            return 1

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1
    finally:
        if driver:
            time.sleep(2)
            driver.quit()

    return 0


if __name__ == "__main__":
    sys.exit(main())
