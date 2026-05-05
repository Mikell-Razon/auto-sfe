# SFE Form Filling Bot
*Automatically fill Student Feedback Evaluation forms with one command or a browser paste!*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🚀 Quick Start (Pick One Method)
Choose the method that works best for you:
- **Method 1: Python Script** - Run from your terminal (automated, no browser setup)
- **Method 2: Browser Console** - Paste a script into your browser (no installations needed)

---

## 📋 Method 1: Python Selenium Script
*Best if you're comfortable with basic terminal commands*

### Step 1: Install Prerequisites
1. Make sure you have **Python 3.10+** installed:
   - Windows: Download from [python.org](https://www.python.org/downloads/)
   - Mac: `brew install python` (or download from python.org)
   - Linux: `sudo apt install python3 python3-pip`
2. Install Selenium:
   ```bash
   pip install selenium
   ```
3. Make sure you have **Chrome, Firefox, or Edge** installed (the script will use Chrome by default)

### Step 2: Download the Script
1. Download `sfe_bot.py` from this repo
2. Save it to a folder you can access from terminal (e.g., `Downloads` or `Desktop`)

### Step 3: Run the Bot
1. Open your terminal/command prompt
2. Navigate to the folder with `sfe_bot.py`:
   ```bash
   cd path/to/your/folder
   ```
3. Run the script with your form URL:
   ```bash
   python sfe_bot.py "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform"
   ```
   (Replace the URL with your actual SFE form link)

### What Happens Next:
1. Chrome will open automatically
2. The bot fills all text fields with "Not applicable."
3. Selects "Not Applicable" for radio buttons/dropdowns (or first option if not available)
4. Leaves checkboxes unchecked
5. Submits the form automatically
6. Closes the browser when done

---

## 🌐 Method 2: Browser Console Script
*Best if you don't want to install anything*

### Step 1: Open Your SFE Form
1. Open the SFE form in **Chrome, Firefox, Edge, or Safari**
2. Make sure the form is fully loaded

### Step 2: Open Browser Console
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac) → Click "Console" tab
- **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows/Linux) / `Cmd+Option+K` (Mac) → Click "Console" tab
- **Safari**: Enable Developer Menu first (Preferences → Advanced → Show Develop menu), then `Cmd+Option+C`

### Step 3: Run the Script
1. Download `sfe_console.js` from this repo
2. Open the file in a text editor (Notepad, TextEdit, VS Code, etc.)
3. Copy the **entire contents** of the file
4. Paste it into the browser console
5. Press `Enter`

### What Happens Next:
- The console will show progress messages:
  ```
  SFE Bot: Starting form fill...
  SFE Bot: Found 5 text inputs
  SFE Bot: Found 2 radio groups
  SFE Bot: Form submitted successfully
  ```
- The form will fill automatically and submit

---

## 🧪 Test Forms (Try Before Using Real Forms)
This repo includes test forms to practice with:
- `test_form.html` - Basic form
- `test_form_iframe.html` - Form inside an iframe
- `test_form_pinnacle.html` - Pinnacle-style form
- `test_form_slow.html` - Slow-loading form

Open these files in your browser to test the bot before using real SFE forms.

---

## ⚠️ Important Notes
1. **Fixed Answers Only**: The bot uses the same answers for all questions:
   - Text fields: "Not applicable."
   - Radio buttons/Dropdowns: "Not Applicable" (or first option if unavailable)
   - Checkboxes: Left unchecked
2. **No File Uploads**: File upload fields are skipped
3. **Same-Origin Only**: Browser console script can't access cross-origin iframes (browser security)
4. **No Question Reading**: The bot doesn't read question text - it fills all fields with the same logic

---

## 🔧 Troubleshooting
### Python Script Issues
- **"No module named selenium"**: Run `pip install selenium` again
- **"Form URL not provided"**: Make sure you included the URL in quotes: `python sfe_bot.py "FORM_URL"`
- **Browser doesn't open**: Make sure Chrome/Firefox/Edge is installed

### Browser Console Issues
- **"SFE Bot is not defined"**: Make sure you pasted the **entire** `sfe_console.js` content
- **Fields not filling**: Refresh the form page first, then run the script again
- **CORS errors**: The form uses cross-origin iframes (browser security blocks access)

---

## 📜 License
MIT License - Feel free to modify and share with classmates!

## 💡 Contributing
Found a bug? Open an issue or submit a pull request.
