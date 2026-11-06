# 🎓 Auto-SFE: Automated Faculty Evaluation Bot

*Effortlessly evaluate professors on PLM Pinnacle ERP, PLM CRS, Google Forms, and other university evaluation portals with smart rating presets!*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-green.svg)](https://www.python.org/)
[![JavaScript](https://img.shields.io/badge/Browser-Console%20Widget-yellow.svg)](sfe_console.js)

---

## 🌟 What's New: Evaluation Presets / Templates

Tired of filling out endless Student Feedback Evaluation (SFE) forms for every course? Auto-SFE now comes with **intelligent rating presets** that adapt Likert radio scales, frequency options, dropdowns, and comment fields automatically:

| Preset | Likert Score | Dropdown Rating | Generated Comments |
| :--- | :---: | :---: | :--- |
| **⭐ Great** | **5 / 5** (Strongly Agree / Always) | Excellent / Outstanding | Authentic praise praising mastery, clear explanations, punctuality, and approachable mentorship. |
| **😐 Neutral** | **3 / 5** (Neutral / Sometimes) | Satisfactory / Good | Balanced feedback noting adequate syllabus coverage with suggestions for interactive pacing. |
| **👎 Bad** | **1 / 5** (Strongly Disagree / Never) | Needs Improvement / Poor | Respectful, constructive criticism highlighting issues with communication, pacing, rubrics, and feedback. |
| **🔄 N/A** | **N/A** | Not Applicable | Original minimal bypass; selects "Not Applicable" and fills "Not applicable.". |

### 🛡️ Smart Protections & Features
- **Student Identity Protection**: Never overwrites your Student ID, Student Number, or Name with dummy text.
- **Context-Aware Feedback**: Distinguishes between text boxes for *Strengths*, *Areas for Improvement / Suggestions*, and *General Comments*.
- **Natural Rating Variation**: Optionally mixes in occasional 4s (in Great mode) or 2s (in Bad mode) so evaluations look natural and human.
- **Multi-Platform Support**: Built for PLM Pinnacle ERP tables, CRS portals, modern Google Forms, and embedded iframes.

---

## 🚀 Choose Your Method

Pick the method that suits your workflow:
- **[Method 1: Browser Console (Recommended)](#-method-1-browser-console-script-quickest--interactive)** — Zero install! Instant floating interactive panel directly on your page.
- **[Method 2: Python Selenium CLI](#-method-2-python-selenium-script-terminal-automation)** — Automated terminal execution with CLI flags and headless support.

---

## 🌐 Method 1: Browser Console Script (Quickest & Interactive)
*Best if you don't want to install Python or drivers. Works in Chrome, Helium, Edge, Brave, Firefox, and Safari.*

### Step 1: Open Your SFE Form
Navigate to your evaluation page on **PLM Pinnacle ERP**, **PLM CRS**, or **Google Forms**.

### Step 2: Open Browser Console
- **Windows / Linux**: Press `F12` or `Ctrl + Shift + I` → Click **Console**
- **Mac**: Press `Cmd + Option + I` → Click **Console**

### Step 3: Run the Script
1. Open [`sfe_console.js`](sfe_console.js) and copy the entire code.
2. Paste it into the browser console and hit **Enter**.

### Step 4: Use the Interactive Floating Panel
An elegant floating control panel will appear in the top-right corner of your screen:
- **1-Click Presets**: Click `⭐ Great`, `😐 Neutral`, `👎 Bad`, or `🔄 N/A`.
- **⚡ Fill Form Now**: Fills all form questions instantly in under 0.2 seconds.
- **Toggles**: Enable or disable *Auto-submit* and *Natural rating variation*.
- **🚀 Submit Evaluation**: Safely submits the form when you are ready.
- **Hotkey**: Press `Ctrl + Shift + S` (or `Cmd + Shift + S`) anytime to quick-fill!

> [!TIP]
> **Prefer typing in the console?** You can also call the API directly:
> ```javascript
> autoSFE.great()    // Fill with 5-star Great preset
> autoSFE.neutral()  // Fill with 3-star Neutral preset
> autoSFE.bad()      // Fill with 1-star Bad preset
> autoSFE.na()       // Fill with Not Applicable preset
> autoSFE.submit()   // Submit the form
> ```

---

## 📋 Method 2: Python Selenium Script (Terminal Automation)
*Best for running batch automations or terminal users.*

### Step 1: Install Requirements
Ensure you have Python 3.10+ installed:
```bash
pip install -r requirements.txt
```

### Step 2: Run with Your Form URL and Preset

```bash
# Evaluate professor as Great (5/5 default)
python sfe_bot.py "https://portal.plm.edu.ph/sfe/form" --preset great

# Evaluate professor as Neutral (3/5)
python sfe_bot.py "https://portal.plm.edu.ph/sfe/form" --preset neutral

# Evaluate professor as Bad / Needs Improvement (1/5)
python sfe_bot.py "https://portal.plm.edu.ph/sfe/form" --preset bad
```

### Advanced CLI Options

| Argument | Description | Default |
| :--- | :--- | :--- |
| `form_url` | URL or local file path to the SFE form | *Required* |
| `-p`, `--preset` | Preset template (`great`, `neutral`, `bad`, `na`) | `great` |
| `--dry-run`, `--no-submit` | Fill the form without auto-submitting (allows review) | `True` (auto-submits) |
| `-b`, `--browser` | Browser engine (`auto`, `chrome`, `chromium`, `firefox`, `edge`, `helium`) | `auto` |
| `--browser-binary` | Custom path to your browser executable | `None` |
| `--headless` | Run in background without opening a browser window | `False` |
| `-c`, `--comment` | Custom comment to override generated templates | `""` |
| `--student-id` | Student ID to fill into ID field (if required) | `""` |
| `--student-name` | Student name to fill into Name field (if required) | `""` |
| `--delay` | Delay in seconds between form actions | `0.2` |

**Example with dry-run and custom browser:**
```bash
python sfe_bot.py "https://docs.google.com/forms/d/e/.../viewform" --preset great --dry-run
```

---

## 🧪 Test Forms

Practice with the included offline test forms before using on live university forms:
- `test_form_pinnacle.html` — PLM Pinnacle-style form with Likert radios, frequencies, and faculty selectors.
- `test_form.html` — Standard evaluation form.
- `test_form_iframe.html` — Evaluation form embedded inside an iframe.
- `test_form_slow.html` — Form that loads dynamically with network delay.

To test the browser console script:
1. Open `test_form_pinnacle.html` in your browser.
2. Open DevTools Console (`F12`).
3. Paste [`sfe_console.js`](sfe_console.js) and test each preset button!

To run automated tests:
```bash
# Test JavaScript DOM engine against test forms
node tests/test_console.js

# Test Python CLI engine and matching patterns
python3 -m unittest tests/test_sfe_bot.py
```

---

## 📜 License
MIT License - Created for students to save time and give honest, structured feedback without the manual fatigue.
