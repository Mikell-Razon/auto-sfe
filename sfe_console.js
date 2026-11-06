/**
 * PLM SFE Form Filling Bot (Browser Console Script)
 * Automatically fills Student Feedback Evaluation (SFE) forms with smart presets:
 * - Great (5/5 ⭐)
 * - Neutral (3/5 😐)
 * - Bad (1/5 👎)
 * - Not Applicable (🔄)
 *
 * Supports PLM Pinnacle ERP, PLM CRS, Google Forms, and standard evaluation forms.
 * Provides an interactive floating UI widget + console API: window.autoSFE / window.sfe
 */

(function () {
    'use strict';

    // Prevent duplicate injection of the floating widget
    const EXISTING_PANEL = document.getElementById('auto-sfe-host');
    if (EXISTING_PANEL) {
        EXISTING_PANEL.remove();
    }

    // =========================================================================
    // 1. PRESETS & TEMPLATES DEFINITION
    // =========================================================================
    const PRESETS = {
        great: {
            id: 'great',
            name: 'Great Professor ⭐',
            badge: '⭐ Great (5/5)',
            themeColor: '#10b981',
            scoreTarget: 5,
            radioPatterns: [
                /^(5(\.0)?(\s*[-–/:]|\s*$)|strongly\s*agree|outstanding|always|excellent|very\s*satisfactory|very\s*good)/i,
                /^(4(\.0)?(\s*[-–/:]|\s*$)|agree|often|good)/i
            ],
            dropdownPatterns: [
                /^(5(\.0)?(\s*[-–/:]|\s*$)|excellent|outstanding|strongly\s*agree|very\s*good|very\s*satisfactory)/i,
                /^(4(\.0)?(\s*[-–/:]|\s*$)|good|agree|satisfactory)/i
            ],
            frequencyPatterns: [
                /^(1\s*week|weekly|every\s*class|frequently|always)/i
            ],
            comments: {
                general: [
                    "Outstanding professor! Concepts were explained clearly with engaging lectures and relevant real-world examples.",
                    "Very effective teaching style. Lessons were well-structured, insightful, and easy to follow throughout the semester.",
                    "Approachable, supportive, and passionate about the subject. Made complex topics interesting and understandable.",
                    "Excellent instructor who ensures students truly understand the course material. Fair grading and inspiring mentorship."
                ],
                strengths: [
                    "Clear explanations, deep mastery of the subject matter, and an engaging, interactive classroom presence.",
                    "Punctual, well-organized syllabus, comprehensive learning materials, and very accommodating with student inquiries.",
                    "Fosters an open and encouraging learning environment while maintaining high academic standards."
                ],
                improvements: [
                    "None at all. Please keep up the inspiring teaching style and high standard of instruction!",
                    "No improvements needed. Maintain the interactive discussions and practical exercises."
                ]
            }
        },
        neutral: {
            id: 'neutral',
            name: 'Neutral / Average 😐',
            badge: '😐 Neutral (3/5)',
            themeColor: '#f59e0b',
            scoreTarget: 3,
            radioPatterns: [
                /^(3(\.0)?(\s*[-–/:]|\s*$)|neutral|satisfactory|moderate|sometimes|average|neither\s*agree|fair)/i
            ],
            dropdownPatterns: [
                /^(3(\.0)?(\s*[-–/:]|\s*$)|satisfactory|fair|moderate|neutral|average|good)/i
            ],
            frequencyPatterns: [
                /^(2\s*weeks|bi-?weekly|sometimes|moderately)/i
            ],
            comments: {
                general: [
                    "Satisfactory performance overall. The professor covered the prescribed course syllabus adequately.",
                    "Lectures were delivered as scheduled. The learning experience was fair and met the standard course requirements.",
                    "Adequate course delivery, though lectures could benefit from more interactive discussions and active engagement.",
                    "Standard teaching approach. Core topics were discussed, and expectations were met appropriately."
                ],
                strengths: [
                    "Follows the syllabus steadily and covers the required curriculum on schedule.",
                    "Punctual in holding class sessions and sharing the required lecture slides and modules."
                ],
                improvements: [
                    "Could provide more timely feedback on quizzes and assignments to help students gauge their standing.",
                    "Pacing could be improved by allocating more time to more difficult or technical topics.",
                    "Incorporating more practical exercises and interactive discussions would enhance class engagement."
                ]
            }
        },
        bad: {
            id: 'bad',
            name: 'Needs Improvement 👎',
            badge: '👎 Bad (1/5)',
            themeColor: '#ef4444',
            scoreTarget: 1,
            radioPatterns: [
                /^(1(\.0)?(\s*[-–/:]|\s*$)|strongly\s*disagree|poor|never|rarely|unsatisfactory|very\s*poor|needs\s*improvement)/i,
                /^(2(\.0)?(\s*[-–/:]|\s*$)|disagree|seldom|fair)/i
            ],
            dropdownPatterns: [
                /^(1(\.0)?(\s*[-–/:]|\s*$)|poor|unsatisfactory|needs\s*improvement|strongly\s*disagree)/i,
                /^(2(\.0)?(\s*[-–/:]|\s*$)|fair|disagree)/i
            ],
            frequencyPatterns: [
                /^(never|rarely|1\s*month|monthly|hardly)/i
            ],
            comments: {
                general: [
                    "The course needs significant improvement in terms of lecture pacing, organization, and clarity of instruction.",
                    "Lectures were often disorganized or rushed, making it difficult to follow and grasp complex subject matter.",
                    "Communication regarding coursework, rubrics, and deadlines was unclear and caused unnecessary confusion.",
                    "Guidance and feedback on student assessments were minimal throughout the semester."
                ],
                strengths: [
                    "Has background knowledge in the subject area.",
                    "Covers standard textbook material."
                ],
                improvements: [
                    "Needs to improve lecture pacing and explain fundamental concepts with greater patience and clarity.",
                    "Please provide clear grading rubrics and return graded assessments with constructive feedback promptly.",
                    "Better communication with students, timely announcements, and dedicated consultation hours are strongly recommended."
                ]
            }
        },
        na: {
            id: 'na',
            name: 'Not Applicable 🔄',
            badge: '🔄 N/A',
            themeColor: '#6b7280',
            scoreTarget: null,
            radioPatterns: [
                /^(not\s*applicable|n\/?a|none)/i
            ],
            dropdownPatterns: [
                /^(not\s*applicable|n\/?a|none)/i
            ],
            frequencyPatterns: [
                /^(not\s*applicable|n\/?a)/i
            ],
            comments: {
                general: ["Not applicable."],
                strengths: ["Not applicable."],
                improvements: ["Not applicable."]
            }
        }
    };

    // Configuration state
    const state = {
        currentPreset: 'great',
        autoSubmit: false,
        naturalVariation: true, // Occasional 4 instead of 5 for Great (makes ratings look organic)
        customComment: '',
        studentName: '',
        studentId: ''
    };

    // Helper: random item from array
    function sample(arr) {
        if (!arr || arr.length === 0) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Helper: wait ms
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Dispatch synthetic events so React, Angular, Vue, and vanilla handlers capture changes
    function triggerEvents(element) {
        try {
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        } catch (e) {
            // Ignore if event dispatch fails in restricted contexts
        }
    }

    // =========================================================================
    // 2. ELEMENT CLASSIFICATION & TEXT GENERATION
    // =========================================================================

    // Identity / metadata fields should NEVER be blindly filled with "Not applicable."
    const IDENTITY_REGEX = /student.*id|id.*num|student.*num|student.*name|full.*name|your.*name|section|course.*code|subject.*code|subject.*title/i;

    function isIdentityField(input) {
        const id = input.id || '';
        const name = input.name || '';
        const placeholder = input.placeholder || '';
        const ariaLabel = input.getAttribute('aria-label') || '';
        const labelText = getAssociatedLabelText(input);

        const combined = `${id} ${name} ${placeholder} ${ariaLabel} ${labelText}`.toLowerCase();
        return IDENTITY_REGEX.test(combined);
    }

    function getAssociatedLabelText(element) {
        if (!element) return '';
        // 1. label for="..."
        if (element.id && element.ownerDocument) {
            const labelEl = element.ownerDocument.querySelector(`label[for="${element.id}"]`);
            if (labelEl && labelEl.textContent) {
                return labelEl.textContent.trim();
            }
        }
        // 2. Parent / ancestor label or question container
        let parent = element.parentElement;
        for (let i = 0; i < 4 && parent; i++) {
            if (parent.tagName === 'LABEL') {
                return parent.textContent.trim();
            }
            const labelEl = parent.querySelector('label, [role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle, .title');
            if (labelEl && labelEl.textContent) {
                return labelEl.textContent.trim();
            }
            parent = parent.parentElement;
        }
        return '';
    }

    function getPresetComment(presetId, contextText) {
        const preset = PRESETS[presetId] || PRESETS.great;
        if (state.customComment && state.customComment.trim()) {
            return state.customComment.trim();
        }

        const lower = (contextText || '').toLowerCase();
        if (/strength|good|like|positive|best|effective|commend/i.test(lower)) {
            return sample(preset.comments.strengths);
        }
        if (/weakness|improve|suggest|recommend|better|lack|change|critic/i.test(lower)) {
            return sample(preset.comments.improvements);
        }
        return sample(preset.comments.general);
    }

    // =========================================================================
    // 3. DOCUMENT INSPECTION & EXTRACTION
    // =========================================================================

    function extractElementsFromDoc(doc) {
        const result = {
            textInputs: [],
            textareas: [],
            radioGroups: {},
            checkboxes: [],
            dropdowns: []
        };

        if (!doc) return result;

        // Text inputs (excluding buttons, submits, radios, checkboxes, files)
        const inputs = Array.from(doc.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="radio"]):not([type="checkbox"]):not([type="file"]):not([type="hidden"])'));
        result.textInputs = inputs;

        // Textareas
        result.textareas = Array.from(doc.querySelectorAll('textarea, div[role="textbox"]'));

        // Standard Radio buttons
        const radios = Array.from(doc.querySelectorAll('input[type="radio"]'));
        radios.forEach(radio => {
            const name = radio.getAttribute('name') || `unnamed_group_${Math.random()}`;
            if (!result.radioGroups[name]) {
                result.radioGroups[name] = [];
            }
            result.radioGroups[name].push(radio);
        });

        // Google Forms role="radiogroup" or standalone role="radio"
        const ariaRadioGroups = Array.from(doc.querySelectorAll('[role="radiogroup"]'));
        ariaRadioGroups.forEach((group, idx) => {
            const groupName = `aria_radiogroup_${idx}_${group.getAttribute('aria-label') || ''}`;
            const groupRadios = Array.from(group.querySelectorAll('[role="radio"]'));
            if (groupRadios.length > 0) {
                result.radioGroups[groupName] = groupRadios;
            }
        });

        // Standalone Google Forms role="radio" not inside role="radiogroup"
        const standaloneAriaRadios = Array.from(doc.querySelectorAll('[role="radio"]')).filter(r => !r.closest('[role="radiogroup"]'));
        if (standaloneAriaRadios.length > 0) {
            // Group by common parent container
            standaloneAriaRadios.forEach((r, idx) => {
                const parent = r.closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerComponentsQuestionBaseRoot') || r.parentElement;
                const name = parent ? `aria_container_${parent.id || idx}` : `aria_standalone_${idx}`;
                if (!result.radioGroups[name]) result.radioGroups[name] = [];
                result.radioGroups[name].push(r);
            });
        }

        // Checkboxes
        result.checkboxes = Array.from(doc.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));

        // Dropdowns
        result.dropdowns = Array.from(doc.querySelectorAll('select'));

        return result;
    }

    function findAllFormElements() {
        const rootElements = extractElementsFromDoc(document);

        // Check accessible iframes (same-origin)
        const iframes = Array.from(document.querySelectorAll('iframe'));
        iframes.forEach((iframe, i) => {
            try {
                const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                if (iframeDoc) {
                    const iframeElements = extractElementsFromDoc(iframeDoc);
                    rootElements.textInputs.push(...iframeElements.textInputs);
                    rootElements.textareas.push(...iframeElements.textareas);
                    rootElements.checkboxes.push(...iframeElements.checkboxes);
                    rootElements.dropdowns.push(...iframeElements.dropdowns);
                    Object.assign(rootElements.radioGroups, iframeElements.radioGroups);
                }
            } catch (err) {
                console.warn(`[Auto-SFE] Cannot inspect iframe ${i} (cross-origin):`, err.message);
            }
        });

        return rootElements;
    }

    // =========================================================================
    // 4. FORM FILLING LOGIC
    // =========================================================================

    function fillTextFields(inputs, textareas, presetId) {
        let filledCount = 0;

        // 1. Text Inputs
        inputs.forEach(input => {
            const isId = isIdentityField(input);
            if (isId) {
                // If user provided student info, fill it; otherwise DO NOT touch it
                if (/id|num/i.test(input.name || input.id || '') && state.studentId) {
                    input.value = state.studentId;
                    triggerEvents(input);
                    filledCount++;
                } else if (/name/i.test(input.name || input.id || '') && state.studentName) {
                    input.value = state.studentName;
                    triggerEvents(input);
                    filledCount++;
                }
                // Do not overwrite existing user identity with "Not applicable."
                return;
            }

            // Normal text input
            if (!input.value || input.value === 'Not applicable.') {
                const labelText = getAssociatedLabelText(input);
                input.value = getPresetComment(presetId, labelText);
                triggerEvents(input);
                filledCount++;
            }
        });

        // 2. Textareas
        textareas.forEach(textarea => {
            const contextText = getAssociatedLabelText(textarea) || textarea.placeholder || textarea.name || '';
            const comment = getPresetComment(presetId, contextText);

            if (textarea.tagName === 'TEXTAREA') {
                textarea.value = comment;
                triggerEvents(textarea);
                filledCount++;
            } else if (textarea.getAttribute('role') === 'textbox') {
                // Google Forms custom role="textbox"
                textarea.textContent = comment;
                triggerEvents(textarea);
                filledCount++;
            }
        });

        return filledCount;
    }

    function getRadioDescriptor(radio) {
        let value = radio.value || radio.getAttribute('data-value') || radio.getAttribute('value') || '';
        let labelText = '';

        if (radio.id) {
            const doc = radio.ownerDocument || document;
            const labelEl = doc.querySelector(`label[for="${radio.id}"]`);
            if (labelEl && labelEl.textContent) {
                labelText = labelEl.textContent.trim();
            }
        }

        if (!labelText && radio.parentElement) {
            labelText = radio.parentElement.textContent.trim();
        }

        const ariaLabel = radio.getAttribute('aria-label') || '';
        return `${value} ${labelText} ${ariaLabel}`.trim();
    }

    function selectRadio(radio) {
        if (!radio) return false;
        try {
            if (radio.tagName === 'INPUT') {
                radio.checked = true;
            }
            if (radio.click) {
                radio.click();
            }
            if (radio.setAttribute) {
                radio.setAttribute('aria-checked', 'true');
            }
            triggerEvents(radio);
            return true;
        } catch (e) {
            return false;
        }
    }

    function fillSingleRadioGroup(groupName, radios, preset) {
        if (!radios || radios.length === 0) return false;

        const descriptors = radios.map(r => getRadioDescriptor(r));

        // 1. If preset is 'na', pick "Not Applicable"
        if (preset.id === 'na') {
            for (let i = 0; i < radios.length; i++) {
                if (preset.radioPatterns[0].test(descriptors[i])) {
                    selectRadio(radios[i]);
                    return true;
                }
            }
            // Fallback: select last option
            selectRadio(radios[radios.length - 1]);
            return true;
        }

        // Filter out "Not Applicable" options when evaluating Great / Neutral / Bad
        const validRadios = [];
        const validDescriptors = [];
        for (let i = 0; i < radios.length; i++) {
            if (!/not\s*applicable|n\/?a|none/i.test(descriptors[i])) {
                validRadios.push(radios[i]);
                validDescriptors.push(descriptors[i]);
            }
        }

        const candidateRadios = validRadios.length > 0 ? validRadios : radios;
        const candidateDescriptors = validRadios.length > 0 ? validDescriptors : descriptors;

        // 2. Try explicit pattern matching for Great / Neutral / Bad
        for (const pattern of preset.radioPatterns) {
            for (let i = 0; i < candidateRadios.length; i++) {
                if (pattern.test(candidateDescriptors[i])) {
                    // If natural variation is on for 'great', 15% chance to pick second highest if available
                    if (preset.id === 'great' && state.naturalVariation && Math.random() < 0.15 && candidateRadios.length > 2) {
                        const secondIdx = Math.max(0, i - 1);
                        selectRadio(candidateRadios[secondIdx]);
                        return true;
                    }
                    selectRadio(candidateRadios[i]);
                    return true;
                }
            }
        }

        // 3. Try frequency patterns (e.g. Pinnacle "1 week", "2 weeks", "Never")
        if (preset.frequencyPatterns) {
            for (const pattern of preset.frequencyPatterns) {
                for (let i = 0; i < candidateRadios.length; i++) {
                    if (pattern.test(candidateDescriptors[i])) {
                        selectRadio(candidateRadios[i]);
                        return true;
                    }
                }
            }
        }

        // 4. Positional Likert fallback based on target score (1..5)
        const total = candidateRadios.length;
        if (total === 1) {
            selectRadio(candidateRadios[0]);
            return true;
        }

        // Determine if scale is 1->5 (ascending) or 5->1 (descending)
        const firstText = candidateDescriptors[0];
        const lastText = candidateDescriptors[total - 1];
        const isDescending = /^(5|strongly\s*agree|excellent|outstanding)/i.test(firstText) ||
                             /^(1|strongly\s*disagree|poor)/i.test(lastText);

        let targetIndex = 0;
        if (preset.id === 'great') {
            targetIndex = isDescending ? 0 : total - 1;
            // Slight natural variation
            if (state.naturalVariation && total >= 4 && Math.random() < 0.15) {
                targetIndex = isDescending ? 1 : total - 2;
            }
        } else if (preset.id === 'bad') {
            targetIndex = isDescending ? total - 1 : 0;
        } else {
            // Neutral: middle option
            targetIndex = Math.floor(total / 2);
        }

        selectRadio(candidateRadios[targetIndex]);
        return true;
    }

    function fillRadioGroups(radioGroups, preset) {
        let filledCount = 0;
        Object.entries(radioGroups).forEach(([name, radios]) => {
            if (fillSingleRadioGroup(name, radios, preset)) {
                filledCount++;
            }
        });
        return filledCount;
    }

    function fillDropdowns(dropdowns, preset) {
        let filledCount = 0;

        dropdowns.forEach(dropdown => {
            // Check if this dropdown is a faculty selector; if so, skip or leave untouched
            const desc = `${dropdown.id} ${dropdown.name} ${getAssociatedLabelText(dropdown)}`.toLowerCase();
            if (/faculty|instructor|professor|prof|teacher/i.test(desc)) {
                // If not selected, select first valid faculty
                if (!dropdown.value && dropdown.options.length > 1) {
                    dropdown.selectedIndex = 1;
                    triggerEvents(dropdown);
                    filledCount++;
                }
                return;
            }

            const options = Array.from(dropdown.options);
            if (options.length <= 1) return;

            // N/A preset
            if (preset.id === 'na') {
                for (let i = 0; i < options.length; i++) {
                    if (preset.dropdownPatterns[0].test(options[i].text.trim())) {
                        dropdown.selectedIndex = i;
                        triggerEvents(dropdown);
                        filledCount++;
                        return;
                    }
                }
                dropdown.selectedIndex = options.length - 1;
                triggerEvents(dropdown);
                return;
            }

            // Filter out placeholder options & N/A
            const validOptions = [];
            for (let i = 0; i < options.length; i++) {
                const optText = options[i].text.trim();
                const optVal = options[i].value.trim();
                if (!optVal && /select|choose/i.test(optText)) continue;
                if (/not\s*applicable|n\/?a/i.test(optText)) continue;
                validOptions.push({ index: i, text: optText, value: optVal });
            }

            if (validOptions.length === 0) return;

            // Pattern match
            let matched = false;
            for (const pattern of preset.dropdownPatterns) {
                for (const opt of validOptions) {
                    if (pattern.test(opt.text) || pattern.test(opt.value)) {
                        dropdown.selectedIndex = opt.index;
                        triggerEvents(dropdown);
                        filledCount++;
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }

            if (!matched) {
                // Positional fallback
                let chosen = validOptions[0];
                if (preset.id === 'great') {
                    chosen = validOptions[0]; // Most dropdowns list Excellent first, or check reverse
                    if (/poor|1/i.test(validOptions[0].text)) {
                        chosen = validOptions[validOptions.length - 1];
                    }
                } else if (preset.id === 'bad') {
                    chosen = validOptions[validOptions.length - 1];
                    if (/poor|1/i.test(validOptions[0].text)) {
                        chosen = validOptions[0];
                    }
                } else {
                    const mid = Math.floor(validOptions.length / 2);
                    chosen = validOptions[mid];
                }
                dropdown.selectedIndex = chosen.index;
                triggerEvents(dropdown);
                filledCount++;
            }
        });

        return filledCount;
    }

    function fillCheckboxes(checkboxes) {
        let filledCount = 0;
        checkboxes.forEach(cb => {
            const desc = `${cb.id} ${cb.name} ${getAssociatedLabelText(cb)}`.toLowerCase();
            // Automatically check mandatory consent/certification checkboxes
            if (/certify|confirm|agree|declare|honest|understood|ack/i.test(desc)) {
                if (cb.tagName === 'INPUT') cb.checked = true;
                if (cb.click) cb.click();
                if (cb.setAttribute) cb.setAttribute('aria-checked', 'true');
                triggerEvents(cb);
                filledCount++;
            }
        });
        return filledCount;
    }

    function findSubmitButton(doc = document) {
        const selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'div[role="button"][aria-label*="Submit" i]',
            'div[role="button"][aria-label*="Next" i]',
            'button',
            'input[type="button"]',
            '[role="button"]'
        ];

        for (const selector of selectors) {
            const elements = Array.from(doc.querySelectorAll(selector));
            for (const el of elements) {
                const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().toLowerCase();
                if (/^(submit|submit evaluation|next|isumite|send|save evaluation)/i.test(text) ||
                    (text.includes('submit') && !text.includes('cancel'))) {
                    return el;
                }
            }
        }

        // Check iframes
        const iframes = Array.from(doc.querySelectorAll('iframe'));
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc) {
                    const btn = findSubmitButton(iframeDoc);
                    if (btn) return btn;
                }
            } catch (e) {}
        }

        return null;
    }

    async function submitEvaluation() {
        const btn = findSubmitButton();
        if (btn) {
            console.log('[Auto-SFE] Clicking submit button:', btn);
            btn.click();
            return true;
        }
        console.warn('[Auto-SFE] Submit button not found.');
        return false;
    }

    // Main execute function
    async function runAutoSFE(presetName = state.currentPreset, options = {}) {
        const presetKey = (presetName || 'great').toLowerCase();
        const preset = PRESETS[presetKey] || PRESETS.great;
        state.currentPreset = preset.id;

        if (typeof options.autoSubmit === 'boolean') state.autoSubmit = options.autoSubmit;
        if (typeof options.naturalVariation === 'boolean') state.naturalVariation = options.naturalVariation;

        const elements = findAllFormElements();

        console.log(`%c[Auto-SFE] Applying Preset: ${preset.name}`, `color: ${preset.themeColor}; font-weight: bold; font-size: 14px;`);

        const textCount = fillTextFields(elements.textInputs, elements.textareas, preset.id);
        const radioCount = fillRadioGroups(elements.radioGroups, preset);
        const dropdownCount = fillDropdowns(elements.dropdowns, preset);
        const checkboxCount = fillCheckboxes(elements.checkboxes);

        const summary = {
            preset: preset.name,
            textFieldsFilled: textCount,
            radioGroupsFilled: radioCount,
            dropdownsFilled: dropdownCount,
            checkboxesChecked: checkboxCount,
            totalElements: textCount + radioCount + dropdownCount + checkboxCount
        };

        console.table(summary);

        if (state.autoSubmit) {
            console.log('[Auto-SFE] Auto-submit enabled. Submitting evaluation in 1 second...');
            await wait(1000);
            await submitEvaluation();
        }

        return summary;
    }

    // =========================================================================
    // 5. INJECT FLOATING INTERACTIVE UI (SHADOW DOM)
    // =========================================================================

    function createFloatingWidget() {
        const host = document.createElement('div');
        host.id = 'auto-sfe-host';
        host.style.position = 'fixed';
        host.style.top = '20px';
        host.style.right = '20px';
        host.style.zIndex = '2147483647'; // Highest possible z-index
        host.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            .card {
                width: 320px;
                background: #111827;
                color: #f3f4f6;
                border: 1px solid #374151;
                border-radius: 14px;
                box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(12px);
                overflow: hidden;
                transition: transform 0.2s ease, opacity 0.2s ease;
            }
            .card.minimized .body { display: none; }
            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background: #1f2937;
                border-bottom: 1px solid #374151;
                cursor: grab;
                user-select: none;
            }
            .header:active { cursor: grabbing; }
            .title {
                font-size: 13px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 6px;
                color: #f9fafb;
            }
            .header-controls {
                display: flex;
                gap: 6px;
            }
            .icon-btn {
                background: transparent;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                font-size: 14px;
                padding: 2px 6px;
                border-radius: 4px;
            }
            .icon-btn:hover { background: #374151; color: #fff; }
            .body { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 600; margin-bottom: 6px; }
            .presets-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .preset-btn {
                padding: 10px 8px;
                border-radius: 8px;
                border: 1px solid #374151;
                background: #1f2937;
                color: #e5e7eb;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                transition: all 0.15s ease;
            }
            .preset-btn:hover {
                border-color: #4b5563;
                background: #283548;
                transform: translateY(-1px);
            }
            .preset-btn.active {
                border-color: var(--accent);
                background: rgba(var(--accent-rgb), 0.18);
                color: #fff;
                box-shadow: 0 0 0 1px var(--accent);
            }
            .preset-btn.great { --accent: #10b981; --accent-rgb: 16, 185, 129; }
            .preset-btn.neutral { --accent: #f59e0b; --accent-rgb: 245, 158, 11; }
            .preset-btn.bad { --accent: #ef4444; --accent-rgb: 239, 68, 68; }
            .preset-btn.na { --accent: #9ca3af; --accent-rgb: 156, 163, 175; }

            .options-row {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 8px 10px;
                background: #1a2230;
                border-radius: 8px;
                border: 1px solid #2d3748;
            }
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11.5px;
                color: #d1d5db;
                cursor: pointer;
            }
            .checkbox-label input { accent-color: #3b82f6; cursor: pointer; }

            .action-buttons {
                display: grid;
                grid-template-columns: 1fr;
                gap: 8px;
                margin-top: 2px;
            }
            .primary-btn {
                padding: 10px;
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                border: none;
                border-radius: 8px;
                color: #fff;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.15s ease;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
            }
            .primary-btn:hover {
                background: linear-gradient(135deg, #1d4ed8, #1e40af);
                transform: translateY(-1px);
            }
            .secondary-btn {
                padding: 8px;
                background: #374151;
                border: 1px solid #4b5563;
                border-radius: 8px;
                color: #e5e7eb;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.15s ease;
            }
            .secondary-btn:hover { background: #4b5563; }

            .status-bar {
                padding: 8px 10px;
                border-radius: 6px;
                font-size: 11px;
                line-height: 1.4;
                background: #111827;
                border: 1px solid #263040;
                color: #9ca3af;
                text-align: center;
            }
            .status-bar.success {
                background: rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.3);
                color: #34d399;
            }
        `;

        const card = document.createElement('div');
        card.className = 'card';

        card.innerHTML = `
            <div class="header" id="dragHeader">
                <span class="title">🎓 Auto-SFE • PLM</span>
                <div class="header-controls">
                    <button class="icon-btn" id="btnMin" title="Minimize">_</button>
                    <button class="icon-btn" id="btnClose" title="Close">✕</button>
                </div>
            </div>
            <div class="body">
                <div>
                    <div class="label">Choose Rating Preset:</div>
                    <div class="presets-grid">
                        <button class="preset-btn great active" data-preset="great">
                            <span>⭐ Great</span>
                            <small style="font-weight:400; font-size:10px; opacity:0.8;">Strongly Agree (5/5)</small>
                        </button>
                        <button class="preset-btn neutral" data-preset="neutral">
                            <span>😐 Neutral</span>
                            <small style="font-weight:400; font-size:10px; opacity:0.8;">Satisfactory (3/5)</small>
                        </button>
                        <button class="preset-btn bad" data-preset="bad">
                            <span>👎 Bad</span>
                            <small style="font-weight:400; font-size:10px; opacity:0.8;">Disagree (1/5)</small>
                        </button>
                        <button class="preset-btn na" data-preset="na">
                            <span>🔄 N/A</span>
                            <small style="font-weight:400; font-size:10px; opacity:0.8;">Not Applicable</small>
                        </button>
                    </div>
                </div>

                <div class="options-row">
                    <label class="checkbox-label">
                        <input type="checkbox" id="chkAutoSubmit" ${state.autoSubmit ? 'checked' : ''}>
                        <span>Auto-submit after filling</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="chkNatural" ${state.naturalVariation ? 'checked' : ''}>
                        <span>Natural rating variance (organic)</span>
                    </label>
                </div>

                <div class="action-buttons">
                    <button class="primary-btn" id="btnFill">
                        <span>⚡ Fill Form Now</span>
                    </button>
                    <button class="secondary-btn" id="btnSubmit">
                        <span>🚀 Submit Evaluation</span>
                    </button>
                </div>

                <div class="status-bar" id="statusBar">
                    Ready. Select preset and click Fill.
                </div>
            </div>
        `;

        shadow.appendChild(style);
        shadow.appendChild(card);
        document.body.appendChild(host);

        // UI Event Handlers
        const presetButtons = card.querySelectorAll('.preset-btn');
        const statusBar = card.querySelector('#statusBar');
        const chkAutoSubmit = card.querySelector('#chkAutoSubmit');
        const chkNatural = card.querySelector('#chkNatural');
        const btnFill = card.querySelector('#btnFill');
        const btnSubmit = card.querySelector('#btnSubmit');
        const btnMin = card.querySelector('#btnMin');
        const btnClose = card.querySelector('#btnClose');
        const dragHeader = card.querySelector('#dragHeader');

        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentPreset = btn.getAttribute('data-preset');
                statusBar.textContent = `Selected: ${PRESETS[state.currentPreset].name}`;
                statusBar.className = 'status-bar';
            });
        });

        chkAutoSubmit.addEventListener('change', () => {
            state.autoSubmit = chkAutoSubmit.checked;
        });

        chkNatural.addEventListener('change', () => {
            state.naturalVariation = chkNatural.checked;
        });

        btnFill.addEventListener('click', async () => {
            statusBar.textContent = 'Filling form...';
            const startTime = performance.now();
            try {
                const res = await runAutoSFE(state.currentPreset);
                const duration = ((performance.now() - startTime) / 1000).toFixed(2);
                statusBar.textContent = `✅ Filled ${res.totalElements} fields (${res.preset}) in ${duration}s!`;
                statusBar.className = 'status-bar success';
            } catch (err) {
                statusBar.textContent = `❌ Error: ${err.message}`;
                statusBar.className = 'status-bar';
            }
        });

        btnSubmit.addEventListener('click', async () => {
            statusBar.textContent = 'Submitting form...';
            const submitted = await submitEvaluation();
            if (submitted) {
                statusBar.textContent = '🚀 Submit clicked successfully!';
                statusBar.className = 'status-bar success';
            } else {
                statusBar.textContent = '⚠️ Submit button not detected.';
                statusBar.className = 'status-bar';
            }
        });

        btnMin.addEventListener('click', () => {
            card.classList.toggle('minimized');
            btnMin.textContent = card.classList.contains('minimized') ? '□' : '_';
        });

        btnClose.addEventListener('click', () => {
            host.remove();
            console.log('[Auto-SFE] Widget closed. You can reopen or run via console: autoSFE.fill("great")');
        });

        // Draggable Widget
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        dragHeader.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = host.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            host.style.right = 'auto';
            host.style.left = `${initialLeft}px`;
            host.style.top = `${initialTop}px`;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            host.style.left = `${Math.max(10, initialLeft + dx)}px`;
            host.style.top = `${Math.max(10, initialTop + dy)}px`;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // =========================================================================
    // 6. INITIALIZATION & EXPOSING GLOBAL API
    // =========================================================================

    const publicAPI = {
        fill: runAutoSFE,
        great: (opts) => runAutoSFE('great', opts),
        neutral: (opts) => runAutoSFE('neutral', opts),
        bad: (opts) => runAutoSFE('bad', opts),
        na: (opts) => runAutoSFE('na', opts),
        submit: submitEvaluation,
        state,
        presets: PRESETS,
        showUI: createFloatingWidget
    };

    window.autoSFE = publicAPI;
    window.sfe = publicAPI;

    // Hotkey: Ctrl+Shift+S (or Cmd+Shift+S) to fill with active preset
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyS') {
            e.preventDefault();
            console.log('[Auto-SFE] Hotkey triggered! Filling form...');
            runAutoSFE(state.currentPreset);
        }
    });

    // Create interactive UI
    createFloatingWidget();

    console.log(
        `%c🎓 Auto-SFE (PLM Faculty Evaluation Assistant) Loaded!\n` +
        `%c• Interactive Floating Panel opened on page.\n` +
        `• Console Commands:\n` +
        `    autoSFE.great()   - Fill with Great (5/5 ⭐) preset\n` +
        `    autoSFE.neutral() - Fill with Neutral (3/5 😐) preset\n` +
        `    autoSFE.bad()     - Fill with Bad (1/5 👎) preset\n` +
        `    autoSFE.na()      - Fill with Not Applicable (🔄) preset\n` +
        `    autoSFE.submit()  - Submit the form\n` +
        `• Hotkey: Ctrl+Shift+S (or Cmd+Shift+S) to quick-fill!`,
        'color: #3b82f6; font-size: 14px; font-weight: bold;',
        'color: #9ca3af; font-size: 12px;'
    );
})();
