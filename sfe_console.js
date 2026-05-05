(function() {
    'use strict';

    const FORM_TEXT = "Not applicable.";
    const RETRY_ATTEMPTS = 3;
    const RETRY_DELAY = 1000;

    console.log("SFE Bot: Starting form fill...");

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function retry(fn, attempts = RETRY_ATTEMPTS) {
        for (let i = 0; i < attempts; i++) {
            try {
                const result = await fn();
                if (result) return true;
            } catch (e) {
                console.warn(`SFE Bot: Attempt ${i + 1}/${attempts} failed: ${e.message}`);
                if (i < attempts - 1) await wait(RETRY_DELAY * Math.pow(2, i));
            }
        }
        return false;
    }

    function findFormElementsInDocument(doc) {
        const elements = {
            textInputs: [],
            textareas: [],
            radioGroups: {},
            checkboxes: [],
            dropdowns: []
        };

        elements.textInputs = Array.from(doc.querySelectorAll('input[type="text"]:not([type="file"])'));
        elements.textareas = Array.from(doc.querySelectorAll('textarea'));
        elements.checkboxes = Array.from(doc.querySelectorAll('input[type="checkbox"]'));

        const radioButtons = Array.from(doc.querySelectorAll('input[type="radio"]'));
        const radioGroups = {};
        radioButtons.forEach(radio => {
            const name = radio.getAttribute('name');
            if (name) {
                if (!radioGroups[name]) radioGroups[name] = [];
                radioGroups[name].push(radio);
            }
        });
        elements.radioGroups = radioGroups;

        elements.dropdowns = Array.from(doc.querySelectorAll('select'));

        return elements;
    }

    function findFormElements() {
        let allElements = findFormElementsInDocument(document);
        console.log(`SFE Bot: Main document - ${allElements.textInputs.length} text inputs, ${allElements.textareas.length} textareas, ${Object.keys(allElements.radioGroups).length} radio groups, ${allElements.checkboxes.length} checkboxes, ${allElements.dropdowns.length} dropdowns`);

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, idx) => {
            try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc) {
                    const iframeElements = findFormElementsInDocument(iframeDoc);
                        allElements.textInputs = allElements.textInputs.concat(iframeElements.textInputs);
                    allElements.textareas = allElements.textareas.concat(iframeElements.textareas);
                    Object.assign(allElements.radioGroups, iframeElements.radioGroups);
                    allElements.checkboxes = allElements.checkboxes.concat(iframeElements.checkboxes);
                    allElements.dropdowns = allElements.dropdowns.concat(iframeElements.dropdowns);
                    console.log(`SFE Bot: Iframe ${idx} - ${iframeElements.textInputs.length} text inputs, ${iframeElements.textareas.length} textareas, ${Object.keys(iframeElements.radioGroups).length} radio groups`);
                }
            } catch (e) {
                console.warn(`SFE Bot: Cannot access iframe ${idx} (may be cross-origin): ${e.message}`);
            }
        });

        return allElements;
    }

    function fillTextField(element, value = FORM_TEXT) {
        element.value = value;
        return true;
    }

    function fillTextInputs(elements) {
        let filled = 0;
        elements.forEach(el => {
            if (fillTextField(el)) filled++;
        });
        console.log(`SFE Bot: Filled ${filled}/${elements.length} text inputs`);
        return filled;
    }

    function fillTextareas(elements) {
        let filled = 0;
        elements.forEach(el => {
            if (fillTextField(el)) filled++;
        });
        console.log(`SFE Bot: Filled ${filled}/${elements.length} textareas`);
        return filled;
    }

    function findAsteriskRadioGroupNames(doc) {
        const asteriskGroupNames = new Set();
        let foundCount = 0;

        const allRadios = doc.querySelectorAll('input[type="radio"]');
        const radioNames = new Set();
        allRadios.forEach(r => {
            const name = r.getAttribute('name');
            if (name) radioNames.add(name);
        });

        console.log(`SFE Bot: Searching ${radioNames.size} radio groups for asterisk questions...`);

        radioNames.forEach(name => {
            const radios = doc.querySelectorAll(`input[type="radio"][name="${name}"]`);
            if (radios.length === 0) return;

            const firstRadio = radios[0];

            let currentElement = firstRadio.parentElement;
            for (let i = 0; i < 15; i++) {
                if (!currentElement) break;

                const text = (currentElement.textContent || '').trim();

                if (text.includes('*')) {
                    const allRadiosInEl = currentElement.querySelectorAll('input[type="radio"]');
                    let allSameName = true;
                    for (let j = 0; j < allRadiosInEl.length; j++) {
                        if (allRadiosInEl[j].getAttribute('name') !== name) {
                            allSameName = false;
                            break;
                        }
                    }
                    if (allSameName && allRadiosInEl.length > 0) {
                        asteriskGroupNames.add(name);
                        foundCount++;
                        console.log(`SFE Bot: Found asterisk question for group: ${name}`);
                        break;
                    }
                }

                try {
                    currentElement = currentElement.parentElement;
                } catch (e) {
                    break;
                }
            }
        });

        if (foundCount === 0) {
            console.log("SFE Bot: WARNING - No asterisk questions found! The form might not be fully loaded.");
            console.log("SFE Bot: Try scrolling down to load all questions, then run the script again.");
        } else {
            console.log(`SFE Bot: Found ${foundCount} asterisk questions`);
        }

        return asteriskGroupNames;
    }

    function fillRadioButton(name, radios, asteriskGroupNames) {
        const hasAsterisk = asteriskGroupNames.has(name);

        let selectedRadio = null;
        let found = false;

        for (const radio of radios) {
            const value = (radio.getAttribute('value') || '').trim();
            if (value === 'Not Applicable') {
                selectedRadio = radio;
                found = true;
                break;
            }
        }
        if (found) {
            selectedRadio.checked = true;
            console.log(`SFE Bot: Selected 'Not Applicable' for radio group: ${name}`);
            return true;
        }

        if (hasAsterisk) {
            if (radios.length > 2) {
                selectedRadio = radios[2]; 
                selectedRadio.checked = true;
                console.log(`SFE Bot: Selected 'Disagree' for asterisk question: ${name}`);
                return true;
            }
        } else {
            if (radios.length > 1) {
                selectedRadio = radios[1]; 
                selectedRadio.checked = true;
                console.log(`SFE Bot: Selected 'Agree' for radio group: ${name}`);
                return true;
            }
        }

        if (radios.length > 0) {
            radios[0].checked = true;
            console.log(`SFE Bot: Selected first option for radio group: ${name}`);
        }
        return true;
    }

    function fillRadioGroups(groups, asteriskGroupNames) {
        let filled = 0;
        Object.entries(groups).forEach(([name, radios]) => {
            if (fillRadioButton(name, radios, asteriskGroupNames)) filled++;
        });
        console.log(`SFE Bot: Filled ${filled}/${Object.keys(groups).length} radio groups`);
        return filled;
    }

    function fillDropdowns(dropdowns) {
        let filled = 0;
        dropdowns.forEach(dropdown => {
            const options = Array.from(dropdown.options);
            let found = false;

            for (let i = 0; i < options.length; i++) {
                if (options[i].text.toLowerCase().includes('not applicable')) {
                    dropdown.selectedIndex = i;
                    console.log("SFE Bot: Selected 'Not Applicable' from dropdown");
                    found = true;
                    break;
                }
            }

            if (!found && options.length > 0) {
                dropdown.selectedIndex = 0;
                console.log("SFE Bot: Selected first option from dropdown");
            }

            if (found) filled++;
        });
        console.log(`SFE Bot: Filled ${filled}/${dropdowns.length} dropdowns`);
        return filled;
    }

    async function findSubmitInDocument(doc) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '[role="button"]',
            'button[value*="Submit"]',
            'input[value*="Submit"]',
            'div[role="button"]'
        ];

        for (const selector of submitSelectors) {
            try {
                const button = doc.querySelector(selector);
                if (button) {
                    const text = (button.textContent || button.value || button.getAttribute('aria-label') || '').toLowerCase();
                    if (text.includes('submit') || text.includes('next')) {
                        console.log(`SFE Bot: Found submit button with selector: ${selector}`);
                        return button;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        const buttons = doc.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
        for (const btn of buttons) {
            const text = (btn.textContent || btn.value || btn.getAttribute('aria-label') || '').toLowerCase();
            if (text.includes('submit') || text.includes('next')) {
                console.log(`SFE Bot: Found submit button by text search`);
                return btn;
            }
        }

        return null;
    }

    async function clickElement(element) {
        if (!element) return false;

        try {
            if (element.click) {
                element.click();
                return true;
            }
        } catch (e) {
            console.warn(`SFE Bot: click() failed: ${e.message}`);
        }

        console.warn('SFE Bot: Cannot click element - no supported click method');
        return false;
    }

    async function autoSubmit() {
        let button = findSubmitInDocument(document);

        if (!button) {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument;
                    if (iframeDoc) {
                        button = findSubmitInDocument(iframeDoc);
                        if (button) break;
                    }
                } catch (e) {
                    console.warn(`SFE Bot: Cannot access iframe for submit: ${e.message}`);
                }
            }
        }

        if (button) {
            await retry(async () => {
                const success = await clickElement(button);
                if (success) {
                    console.log("SFE Bot: Form submitted successfully");
                    return true;
                }
                return false;
            });
            return true;
        }

        console.error("SFE Bot: Could not find submit button");
        return false;
    }

    async function main() {
        console.log("SFE Bot: Waiting for form to load...");
        await wait(2000);

        const elements = findFormElements();

        const asteriskGroupNames = findAsteriskRadioGroupNames(document);
        console.log(`SFE Bot: Found ${asteriskGroupNames.size} asterisk questions`);

        fillTextInputs(elements.textInputs);
        fillTextareas(elements.textareas);
        fillRadioGroups(elements.radioGroups, asteriskGroupNames);
        fillDropdowns(elements.dropdowns);

        await autoSubmit();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => main());
    } else {
        main();
    }
})();
