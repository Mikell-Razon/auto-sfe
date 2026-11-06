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

    function getQuestionText(element) {
        if (!element) return '';
        // 1. Table row ancestor (PLM Pinnacle uses <tr> for each evaluation question)
        const row = element.closest('tr');
        if (row) {
            const tds = Array.from(row.querySelectorAll('td'));
            for (const td of tds) {
                const txt = td.textContent.trim();
                if (/\b(I|II|III)-\d+/i.test(txt) || /^\s*\d+\.\s+/i.test(txt)) {
                    return txt;
                }
            }
            return row.textContent.trim();
        }

        // 2. Form group / container
        const container = element.closest('.form-group, .question-row, [role="listitem"], .Qr7Oae, .freebirdFormviewerComponentsQuestionBaseRoot');
        if (container) {
            const titleEl = container.querySelector('label, [role="heading"], .title, .questionTitle');
            if (titleEl && titleEl.textContent) return titleEl.textContent.trim();
            return container.textContent.trim();
        }

        return getAssociatedLabelText(element);
    }

    function isNegativeQuestion(questionText) {
        if (!questionText) return false;
        // In PLM Pinnacle, reverse-coded negative questions contain an asterisk after the item code:
        // e.g. "I-2 *", "I-7 *", "I-10 *", "I-17 *", "I-19 *", "I-23 *", "I-25 *", "I-37 *"
        if (/\bI-\d+\s*\*/i.test(questionText) || /^\s*\d+\.\s*I-\d+\s*\*/i.test(questionText)) {
            return true;
        }
        if (/\d+\.\s*[^a-zA-Z0-9]*\*/i.test(questionText) || /\*\s*(Attends|Does not|Is not|Give unreasonable)/i.test(questionText)) {
            return true;
        }
        if (/attends class unprepared|does not encourage|does not respect|does not invite|not available for consultation|unreasonable course|does not upload/i.test(questionText)) {
            return true;
        }
        return false;
    }

    function getPresetComment(presetId, contextText) {
        if (state.customComment && state.customComment.trim()) {
            return state.customComment.trim();
        }

        const lower = (contextText || '').toLowerCase();
        const preset = PRESETS[presetId] || PRESETS.great;

        // Specific PLM Pinnacle Question Textareas / Text Inputs:
        // I-41.8: What are the OTHER bases used by the teacher for grading?
        if (/other bases.*grading|bases used.*grading/i.test(lower)) {
            return "Class participation, problem sets, and hands-on laboratory exercises.";
        }

        // I-44: Explain your answer in I-43 (Is the teacher fair in giving grades?)
        if (/explain.*fair in giving grades|fair in giving grades/i.test(lower)) {
            if (presetId === 'great') {
                return "Yes, grading rubrics and criteria are clear, transparent, and strictly followed. Scores are based objectively on performance.";
            } else if (presetId === 'neutral') {
                return "Grades are generally fair and based on submitted outputs, though more detailed feedback on scores would be helpful.";
            } else if (presetId === 'bad') {
                return "Grading criteria and computation were inconsistent, and rubrics were not clearly communicated.";
            }
        }

        // I-46: What are the faculty's strong points? Areas for improvement?
        if (/strong points|areas for improvement/i.test(lower)) {
            if (presetId === 'great') {
                return "Strong points: Clear mastery of topics, engaging lecture delivery, approachable demeanor, and punctual feedback. Areas for improvement: None, keep up the excellent work!";
            } else if (presetId === 'neutral') {
                return "Strong points: Covers syllabus topics steadily. Areas for improvement: Provide more interactive activities and faster return of graded quizzes.";
            } else if (presetId === 'bad') {
                return "Strong points: Has background knowledge in the subject. Areas for improvement: Lecture pacing, clearer instructions, and better communication with students.";
            }
        }

        // I-47: Zoom or MS Teams only
        if (/zoom or ms teams only|other platforms were used/i.test(lower)) {
            return "MS Teams only.";
        }

        // I-48: MS Teams in uploading learning materials
        if (/ms teams in uploading|8 to 10-minute/i.test(lower)) {
            return "MS Teams only.";
        }

        // I-49: Contingency plans for technical problems
        if (/contingency plan/i.test(lower)) {
            if (presetId === 'great') {
                return "Yes, recorded lecture sessions and shared materials asynchronously on MS Teams.";
            } else if (presetId === 'neutral') {
                return "Yes, recorded lecture sessions were provided.";
            } else {
                return "No specific contingency plan was observed.";
            }
        }

        // II-10: Describe the nature of departure(s) from syllabus
        if (/nature of the departure/i.test(lower)) {
            if (presetId === 'bad') {
                return "Several scheduled topics were skipped or rushed near the end of the term.";
            }
            return "None. The syllabus was followed strictly and topics were covered on schedule.";
        }

        // II-11: Do you think departure(s) was/were necessary and benefited class?
        if (/departure.*necessary.*benefit/i.test(lower)) {
            return "N/A - Followed the syllabus.";
        }

        // II-15: What other objectives would you recommend for inclusion?
        if (/other objectives.*recommend/i.test(lower)) {
            if (presetId === 'great') {
                return "None, the current course objectives are comprehensive and relevant.";
            } else if (presetId === 'neutral') {
                return "More practical and hands-on laboratory exercises.";
            } else {
                return "More realistic course expectations and clear milestone objectives.";
            }
        }

        // II-16: In your opinion, how can this course be further improved?
        if (/course be further improved/i.test(lower)) {
            if (presetId === 'great') {
                return "The course is well-designed. Maintain the interactive discussions and practical exercises.";
            } else if (presetId === 'neutral') {
                return "Allocate more time for complex topics and provide more sample problems.";
            } else {
                return "Provide better lecture pacing, clearer assignment rubrics, and timely feedback.";
            }
        }

        // III-10: How would you explain your experience using virtual learning?
        if (/virtual learning/i.test(lower)) {
            if (presetId === 'great') {
                return "Virtual learning was smooth, well-organized, and effective through MS Teams.";
            } else if (presetId === 'neutral') {
                return "Virtual learning was adequate and manageable.";
            } else {
                return "Challenging due to heavy coursework and pacing difficulties.";
            }
        }

        // General fallback
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
                // Do not overwrite existing user identity
                return;
            }

            // Normal text input
            if (!input.value || input.value === 'Not applicable.') {
                const labelText = getQuestionText(input);
                input.value = getPresetComment(presetId, labelText);
                triggerEvents(input);
                filledCount++;
            }
        });

        // 2. Textareas
        textareas.forEach(textarea => {
            const contextText = getQuestionText(textarea) || textarea.placeholder || textarea.name || '';
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
        let value = (radio.value || radio.getAttribute('data-value') || '').trim();
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

        const ariaLabel = (radio.getAttribute('aria-label') || '').trim();
        return `${labelText} ${value} ${ariaLabel}`.trim();
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

        const sampleRadio = radios[0];
        const qText = getQuestionText(sampleRadio);
        const qLower = qText.toLowerCase();
        const isReverse = isNegativeQuestion(qText);
        const descriptors = radios.map(r => getRadioDescriptor(r));

        // 1. N/A Preset
        if (preset.id === 'na') {
            for (let i = 0; i < radios.length; i++) {
                if (/not\s*applicable|n\/?a|none/i.test(descriptors[i])) {
                    selectRadio(radios[i]);
                    return true;
                }
            }
            selectRadio(radios[radios.length - 1]);
            return true;
        }

        // Filter out "Not Applicable" for evaluation presets
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

        function trySelect(regex) {
            for (let i = 0; i < candidateRadios.length; i++) {
                if (regex.test(candidateDescriptors[i])) {
                    selectRadio(candidateRadios[i]);
                    return true;
                }
            }
            return false;
        }

        // --- SPECIAL PLM PINNACLE QUESTIONS ---

        // A. How many times has the teacher been late or missed meetings (I-38, I-39, III-7, III-8)
        if (/how many times.*(late|missed)|class meetings.*missed|late in synchronous/i.test(qLower)) {
            if (/III-[78]|you have been late|class meetings have you missed/i.test(qLower)) {
                if (trySelect(/\b0\s*time\b/i)) return true;
            } else if (preset.id === 'great' || preset.id === 'neutral') {
                if (trySelect(/\b0\s*time\b/i)) return true;
            } else if (preset.id === 'bad') {
                if (trySelect(/\b(4-5|6)\s*times\b/i)) return true;
                if (trySelect(/\b(2-3)\s*times\b/i)) return true;
            }
        }

        // B. Teacher generally dismisses the class (I-40)
        if (/dismisses the class/i.test(qLower)) {
            if (preset.id === 'great' || preset.id === 'neutral') {
                if (trySelect(/\bon\s*time\b/i)) return true;
            } else if (preset.id === 'bad') {
                if (trySelect(/\btoo\s*early\b/i) || trySelect(/\bvery\s*late\b/i) || trySelect(/\blate\b/i)) return true;
            }
        }

        // C. Yes/No grading bases (I-41.1 to I-41.6, II-8)
        if (/(recitation|quizzes|midterm|final examination|reports|papers).*bases used|syllabus.*expanded outline/i.test(qLower)) {
            if (trySelect(/\byes\b/i)) return true;
        }

        // D. Uploaded detailed syllabus in MS Teams (I-41.7)
        if (/uploaded detailed syllabus/i.test(qLower)) {
            if (preset.id === 'great' || preset.id === 'neutral') {
                if (trySelect(/\byes\b/i)) return true;
            } else {
                if (trySelect(/\bno\b/i)) return true;
            }
        }

        // E. Departures from the syllabus (II-9)
        if (/departures from the syllabus/i.test(qLower)) {
            if (preset.id === 'great' || preset.id === 'neutral') {
                if (trySelect(/\bno\b/i)) return true;
            } else {
                if (trySelect(/\byes\b/i)) return true;
            }
        }

        // F. Return speed for assignments/quizzes / feedback frequency (I-42)
        if (/how soon does the teacher post results|return corrected|feedback|frequency/i.test(qLower)) {
            if (preset.id === 'great') {
                if (trySelect(/\b1\s*week\b/i) || trySelect(/\bweekly\b/i)) return true;
            } else if (preset.id === 'neutral') {
                if (trySelect(/\b2\s*weeks\b/i) || trySelect(/\bbi-?weekly\b/i)) return true;
            } else {
                if (trySelect(/\b(more than 1 month|never|1 month)\b/i)) return true;
            }
        }

        // G. Fair in giving grades (I-43)
        if (/fair in giving grades/i.test(qLower)) {
            if (preset.id === 'great') {
                if (trySelect(/\balways\b/i)) return true;
            } else if (preset.id === 'neutral') {
                if (trySelect(/\b(usually|sometimes)\b/i)) return true;
            } else {
                if (trySelect(/\b(rarely|never)\b/i)) return true;
            }
        }

        // H. Rate this teacher among PLM teachers (I-45)
        if (/rate this teacher/i.test(qLower)) {
            if (preset.id === 'great') {
                if (trySelect(/\bthe\s*best\b/i) || trySelect(/\bamong\s*the\s*best\b/i)) return true;
            } else if (preset.id === 'neutral') {
                if (trySelect(/\baverage\b/i)) return true;
            } else {
                if (trySelect(/\bthe\s*worst\b/i) || trySelect(/\bamong\s*the\s*worst\b/i)) return true;
            }
        }

        // I. Overall pace of the course (II-12)
        if (/overall pace of the course/i.test(qLower)) {
            if (preset.id === 'great' || preset.id === 'neutral') {
                if (trySelect(/\bjust\s*right\b/i)) return true;
            } else {
                if (trySelect(/\btoo\s*fast\b/i) || trySelect(/\btoo\s*slow\b/i)) return true;
            }
        }

        // J. Learned / Objectives attained / Student self-assessment (II-13, II-14, III-1 to III-6)
        if (/learned from this course|objectives.*attained|participate in class|learn new ideas|receptive.*new ideas|effort did you give|performed well|expectations.*met/i.test(qLower)) {
            if (preset.id === 'great') {
                if (trySelect(/\bvery\s*much\b/i)) return true;
            } else if (preset.id === 'neutral') {
                if (trySelect(/\bmuch\b/i) || trySelect(/\bmoderately\b/i)) return true;
            } else {
                if (/expectations.*met/i.test(qLower)) {
                    if (trySelect(/\bvery\s*little\b/i) || trySelect(/\bnothing\b/i)) return true;
                } else {
                    if (trySelect(/\bvery\s*much\b/i) || trySelect(/\bmuch\b/i)) return true;
                }
            }
        }

        // K. Final grade for yourself (III-9)
        if (/final grade would you give yourself/i.test(qLower)) {
            if (preset.id === 'great') {
                if (trySelect(/\b(1\.25|1\.00|1\.50)\b/i)) return true;
            } else if (preset.id === 'neutral') {
                if (trySelect(/\b(1\.75|2\.00)\b/i)) return true;
            } else {
                if (trySelect(/\b(2\.25|2\.50|2\.75)\b/i)) return true;
            }
        }

        // --- LIKERT SCALE (AGREE ... DISAGREE) WITH REVERSE ASTERISK HANDLING ---
        function findOptionIndex(type) {
            // PASS 1: Check explicit words first (never confuse internal value="1" with strongly disagree)
            for (let i = 0; i < candidateRadios.length; i++) {
                const desc = candidateDescriptors[i].toLowerCase();
                if (type === 'strongly_agree') {
                    if (desc.includes('strongly agree') || desc.includes('outstanding') || desc.includes('lubos na sumasang-ayon')) return i;
                } else if (type === 'agree') {
                    if (desc.includes('agree') && !desc.includes('strongly') && !desc.includes('disagree')) return i;
                } else if (type === 'neutral') {
                    if (/neutral|neither|satisfactory|average|moderate/.test(desc) && !desc.includes('very')) return i;
                } else if (type === 'disagree') {
                    if (desc.includes('disagree') && !desc.includes('strongly')) return i;
                } else if (type === 'strongly_disagree') {
                    if (desc.includes('strongly disagree') || desc.includes('lubos na hindi sumasang-ayon')) return i;
                }
            }

            // PASS 2: Pure numeric scales (e.g. 5, 4, 3, 2, 1) when no text words are present
            for (let i = 0; i < candidateRadios.length; i++) {
                const desc = candidateDescriptors[i].toLowerCase();
                if (type === 'strongly_agree' && /(^|\s)5(\.0)?(\s*[-–/:]|\s*$)/.test(desc)) return i;
                if (type === 'agree' && /(^|\s)4(\.0)?(\s*[-–/:]|\s*$)/.test(desc)) return i;
                if (type === 'neutral' && /(^|\s)3(\.0)?(\s*[-–/:]|\s*$)/.test(desc)) return i;
                if (type === 'disagree' && /(^|\s)2(\.0)?(\s*[-–/:]|\s*$)/.test(desc)) return i;
                if (type === 'strongly_disagree' && /(^|\s)1(\.0)?(\s*[-–/:]|\s*$)/.test(desc)) return i;
            }
            return -1;
        }

        const idxSA = findOptionIndex('strongly_agree');
        const idxA  = findOptionIndex('agree');
        const idxN  = findOptionIndex('neutral');
        const idxD  = findOptionIndex('disagree');
        const idxSD = findOptionIndex('strongly_disagree');

        const isLikert = (idxSA !== -1 || idxA !== -1) && (idxSD !== -1 || idxD !== -1);

        if (isLikert) {
            if (isReverse) {
                // NEGATIVE TRAIT (e.g. "I-2 * Attends class unprepared")
                if (preset.id === 'great') {
                    // Great professor DOES NOT do this -> Strongly Disagree / Disagree
                    if (state.naturalVariation && Math.random() < 0.15 && idxD !== -1) {
                        selectRadio(candidateRadios[idxD]);
                        return true;
                    }
                    if (idxSD !== -1) { selectRadio(candidateRadios[idxSD]); return true; }
                    if (idxD !== -1) { selectRadio(candidateRadios[idxD]); return true; }
                } else if (preset.id === 'neutral') {
                    if (idxD !== -1) { selectRadio(candidateRadios[idxD]); return true; }
                    if (idxN !== -1) { selectRadio(candidateRadios[idxN]); return true; }
                } else if (preset.id === 'bad') {
                    // Bad professor DOES do this -> Strongly Agree / Agree
                    if (idxSA !== -1) { selectRadio(candidateRadios[idxSA]); return true; }
                    if (idxA !== -1) { selectRadio(candidateRadios[idxA]); return true; }
                }
            } else {
                // POSITIVE STATEMENT (e.g. "I-1 Explains course objectives")
                if (preset.id === 'great') {
                    if (state.naturalVariation && Math.random() < 0.15 && idxA !== -1) {
                        selectRadio(candidateRadios[idxA]);
                        return true;
                    }
                    if (idxSA !== -1) { selectRadio(candidateRadios[idxSA]); return true; }
                    if (idxA !== -1) { selectRadio(candidateRadios[idxA]); return true; }
                } else if (preset.id === 'neutral') {
                    if (idxN !== -1) { selectRadio(candidateRadios[idxN]); return true; }
                    if (idxA !== -1) { selectRadio(candidateRadios[idxA]); return true; }
                } else if (preset.id === 'bad') {
                    if (idxSD !== -1) { selectRadio(candidateRadios[idxSD]); return true; }
                    if (idxD !== -1) { selectRadio(candidateRadios[idxD]); return true; }
                }
            }
            return true;
        }

        // Fallback: standard preset patterns
        for (const pattern of preset.radioPatterns) {
            if (trySelect(pattern)) return true;
        }

        // Frequency fallback if any candidate matches
        if (preset.frequencyPatterns) {
            for (const pattern of preset.frequencyPatterns) {
                if (trySelect(pattern)) return true;
            }
        }

        // Positional fallback
        const total = candidateRadios.length;
        if (total === 1) {
            selectRadio(candidateRadios[0]);
            return true;
        }

        const firstText = candidateDescriptors[0].toLowerCase();
        const lastText = candidateDescriptors[total - 1].toLowerCase();
        const isDescending = firstText.includes('strongly agree') || firstText.includes('excellent') || firstText.includes('always') || firstText.includes('0 time') || firstText.includes('1 week') ||
                             lastText.includes('strongly disagree') || lastText.includes('poor') || lastText.includes('never') || lastText.includes('rarely') ||
                             /^(5|strongly)/i.test(firstText) || /^(1|poor|never)/i.test(lastText);

        let targetIndex = 0;
        if (preset.id === 'great') {
            targetIndex = isReverse ? (isDescending ? total - 1 : 0) : (isDescending ? 0 : total - 1);
        } else if (preset.id === 'bad') {
            targetIndex = isReverse ? (isDescending ? 0 : total - 1) : (isDescending ? total - 1 : 0);
        } else {
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
                if (/^(submit|submit evaluation|next|finish|isumite|send|save evaluation)/i.test(text) ||
                    (text.includes('submit') && !text.includes('cancel')) ||
                    text === 'finish') {
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
    // 5. INJECT HACKER / TERMINAL INTERACTIVE UI (SHADOW DOM)
    // =========================================================================

    function createFloatingWidget() {
        const host = document.createElement('div');
        host.id = 'auto-sfe-host';
        host.style.position = 'fixed';
        host.style.top = '16px';
        host.style.right = '16px';
        host.style.zIndex = '2147483647';
        host.style.fontFamily = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace";

        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            .card {
                width: 275px;
                background: rgba(8, 10, 14, 0.95);
                color: #e2e8f0;
                border: 1px solid rgba(34, 197, 94, 0.35);
                border-radius: 6px;
                box-shadow: 0 10px 28px rgba(0, 0, 0, 0.75), 0 0 12px rgba(34, 197, 94, 0.12);
                backdrop-filter: blur(14px);
                overflow: hidden;
                user-select: none;
                letter-spacing: -0.01em;
                transition: transform 0.15s ease, width 0.15s ease;
            }
            .card.minimized {
                width: 140px;
                cursor: pointer;
            }
            .card.minimized .body,
            .card.minimized #btnSettings { display: none; }
            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 9px;
                background: rgba(34, 197, 94, 0.05);
                border-bottom: 1px solid rgba(34, 197, 94, 0.2);
                cursor: grab;
            }
            .header:active { cursor: grabbing; }
            .title-group {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .prompt-symbol {
                color: #22c55e;
                font-weight: 700;
                font-size: 11px;
                text-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
            }
            .title {
                font-size: 11px;
                font-weight: 700;
                color: #f1f5f9;
                letter-spacing: 0.02em;
            }
            .active-badge {
                font-size: 9px;
                font-weight: 700;
                padding: 1px 4px;
                border-radius: 3px;
                background: rgba(34, 197, 94, 0.15);
                color: #4ade80;
                border: 1px solid rgba(34, 197, 94, 0.35);
            }
            .header-controls {
                display: flex;
                align-items: center;
                gap: 3px;
            }
            .icon-btn {
                background: transparent;
                border: 1px solid transparent;
                color: #64748b;
                cursor: pointer;
                font-size: 10px;
                padding: 2px 4px;
                border-radius: 3px;
                font-family: inherit;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.1s ease;
            }
            .icon-btn:hover {
                background: rgba(34, 197, 94, 0.12);
                border-color: rgba(34, 197, 94, 0.3);
                color: #4ade80;
            }
            .body {
                padding: 8px 9px;
                display: flex;
                flex-direction: column;
                gap: 7px;
            }

            /* Terminal Preset Buttons with Colored Text & Distinct Highlights */
            .presets-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
                background: rgba(0, 0, 0, 0.5);
                padding: 3px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.06);
            }
            .preset-pill {
                padding: 5px 2px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                transition: all 0.14s ease;
                border: 1px solid transparent;
            }

            /* Great: Phosphor Green */
            .preset-pill.great {
                color: #4ade80;
                background: rgba(34, 197, 94, 0.06);
                border-color: rgba(34, 197, 94, 0.22);
            }
            .preset-pill.great:hover {
                background: rgba(34, 197, 94, 0.14);
                border-color: rgba(34, 197, 94, 0.45);
                color: #86efac;
            }
            .preset-pill.great.active {
                background: rgba(34, 197, 94, 0.24);
                border-color: #22c55e;
                color: #ffffff;
                box-shadow: 0 0 10px rgba(34, 197, 94, 0.35);
            }

            /* Neutral: Cyber Amber */
            .preset-pill.neutral {
                color: #facc15;
                background: rgba(234, 179, 8, 0.06);
                border-color: rgba(234, 179, 8, 0.22);
            }
            .preset-pill.neutral:hover {
                background: rgba(234, 179, 8, 0.14);
                border-color: rgba(234, 179, 8, 0.45);
                color: #fde047;
            }
            .preset-pill.neutral.active {
                background: rgba(234, 179, 8, 0.24);
                border-color: #eab308;
                color: #ffffff;
                box-shadow: 0 0 10px rgba(234, 179, 8, 0.35);
            }

            /* Bad: Neon Red */
            .preset-pill.bad {
                color: #f87171;
                background: rgba(239, 68, 68, 0.06);
                border-color: rgba(239, 68, 68, 0.22);
            }
            .preset-pill.bad:hover {
                background: rgba(239, 68, 68, 0.14);
                border-color: rgba(239, 68, 68, 0.45);
                color: #fca5a5;
            }
            .preset-pill.bad.active {
                background: rgba(239, 68, 68, 0.24);
                border-color: #ef4444;
                color: #ffffff;
                box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
            }

            /* N/A: Cool Slate */
            .preset-pill.na {
                color: #94a3b8;
                background: rgba(148, 163, 184, 0.06);
                border-color: rgba(148, 163, 184, 0.22);
            }
            .preset-pill.na:hover {
                background: rgba(148, 163, 184, 0.14);
                border-color: rgba(148, 163, 184, 0.45);
                color: #cbd5e1;
            }
            .preset-pill.na.active {
                background: rgba(148, 163, 184, 0.24);
                border-color: #94a3b8;
                color: #ffffff;
                box-shadow: 0 0 10px rgba(148, 163, 184, 0.3);
            }

            /* Settings Drawer (CLI flags) */
            .settings-drawer {
                display: none;
                flex-direction: column;
                gap: 5px;
                padding: 6px 8px;
                background: rgba(0, 0, 0, 0.45);
                border-radius: 4px;
                border: 1px solid rgba(34, 197, 94, 0.18);
                font-size: 9.5px;
            }
            .settings-drawer.open { display: flex; }
            .toggle-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: #94a3b8;
                cursor: pointer;
            }
            .toggle-item:hover { color: #4ade80; }
            .toggle-item input { accent-color: #22c55e; cursor: pointer; }

            /* Footer / Status with Blinking Cursor */
            .footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                padding-top: 1px;
            }
            .status-wrapper {
                display: flex;
                align-items: center;
                gap: 3px;
                max-width: 175px;
                overflow: hidden;
            }
            .status-prompt {
                color: #22c55e;
                font-size: 10px;
                font-weight: 700;
            }
            .status-text {
                font-size: 9.5px;
                color: #64748b;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .status-text.success { color: #4ade80; font-weight: 600; }
            .status-text.error { color: #f87171; }
            .cursor {
                display: inline-block;
                width: 5px;
                color: #22c55e;
                animation: blink 1s step-start infinite;
                font-weight: 700;
            }
            @keyframes blink { 50% { opacity: 0; } }

            .submit-btn {
                padding: 3px 7px;
                border-radius: 3px;
                border: 1px solid rgba(34, 197, 94, 0.35);
                background: rgba(34, 197, 94, 0.08);
                color: #4ade80;
                font-size: 9.5px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 3px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                transition: all 0.12s ease;
                white-space: nowrap;
            }
            .submit-btn:hover {
                background: rgba(34, 197, 94, 0.2);
                border-color: #22c55e;
                color: #ffffff;
                box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
            }
        `;

        const card = document.createElement('div');
        card.className = 'card';

        card.innerHTML = `
            <div class="header" id="dragHeader">
                <div class="title-group">
                    <span class="prompt-symbol">&gt;_</span>
                    <span class="title">auto_sfe</span>
                    <span class="active-badge" id="activeBadge">[5/5]</span>
                </div>
                <div class="header-controls">
                    <button class="icon-btn" id="btnSettings" title="Options">⚙</button>
                    <button class="icon-btn" id="btnMin" title="Minimize">—</button>
                    <button class="icon-btn" id="btnClose" title="Close">✕</button>
                </div>
            </div>
            <div class="body">
                <!-- Direct 1-Click Preset Action with Colored Text / Highlights -->
                <div class="presets-row">
                    <button class="preset-pill great active" data-preset="great" title="1-click: 5/5 (Strongly Agree)">Great</button>
                    <button class="preset-pill neutral" data-preset="neutral" title="1-click: 3/5 (Neutral)">Neutral</button>
                    <button class="preset-pill bad" data-preset="bad" title="1-click: 1/5 (Disagree)">Bad</button>
                    <button class="preset-pill na" data-preset="na" title="1-click: Not Applicable">N/A</button>
                </div>

                <!-- Collapsible Settings (CLI Style) -->
                <div class="settings-drawer" id="settingsDrawer">
                    <label class="toggle-item">
                        <span>--auto-submit</span>
                        <input type="checkbox" id="chkAutoSubmit" ${state.autoSubmit ? 'checked' : ''}>
                    </label>
                    <label class="toggle-item">
                        <span>--organic-variance</span>
                        <input type="checkbox" id="chkNatural" ${state.naturalVariation ? 'checked' : ''}>
                    </label>
                </div>

                <!-- Terminal Footer Status & Submit -->
                <div class="footer">
                    <div class="status-wrapper">
                        <span class="status-prompt">&gt;</span>
                        <span class="status-text" id="statusText">ready</span>
                        <span class="cursor">_</span>
                    </div>
                    <button class="submit-btn" id="btnSubmit" title="Execute form submit">EXEC ↵</button>
                </div>
            </div>
        `;

        shadow.appendChild(style);
        shadow.appendChild(card);
        document.body.appendChild(host);

        // UI Elements
        const presetButtons = card.querySelectorAll('.preset-pill');
        const activeBadge = card.querySelector('#activeBadge');
        const statusText = card.querySelector('#statusText');
        const btnSettings = card.querySelector('#btnSettings');
        const settingsDrawer = card.querySelector('#settingsDrawer');
        const chkAutoSubmit = card.querySelector('#chkAutoSubmit');
        const chkNatural = card.querySelector('#chkNatural');
        const btnSubmit = card.querySelector('#btnSubmit');
        const btnMin = card.querySelector('#btnMin');
        const btnClose = card.querySelector('#btnClose');
        const dragHeader = card.querySelector('#dragHeader');

        const badgeLabels = {
            great: { text: '[5/5]', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
            neutral: { text: '[3/5]', bg: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: 'rgba(234, 179, 8, 0.35)' },
            bad: { text: '[1/5]', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
            na: { text: '[N/A]', bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)' }
        };

        function updateBadge(presetKey) {
            const b = badgeLabels[presetKey] || badgeLabels.great;
            activeBadge.textContent = b.text;
            activeBadge.style.background = b.bg;
            activeBadge.style.color = b.color;
            activeBadge.style.borderColor = b.border;
        }

        // Direct 1-Click Action: Clicking preset selects AND fills the form instantly
        presetButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const presetKey = btn.getAttribute('data-preset');
                state.currentPreset = presetKey;
                updateBadge(presetKey);

                statusText.textContent = `exec(${presetKey})...`;
                statusText.className = 'status-text';
                const startTime = performance.now();

                try {
                    const res = await runAutoSFE(presetKey);
                    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
                    statusText.textContent = `done: ${res.totalElements} nodes [${duration}s]`;
                    statusText.className = 'status-text success';
                } catch (err) {
                    statusText.textContent = `err: ${err.message}`;
                    statusText.className = 'status-text error';
                }
            });
        });

        btnSettings.addEventListener('click', () => {
            settingsDrawer.classList.toggle('open');
            btnSettings.style.color = settingsDrawer.classList.contains('open') ? '#4ade80' : '#64748b';
        });

        chkAutoSubmit.addEventListener('change', () => {
            state.autoSubmit = chkAutoSubmit.checked;
        });

        chkNatural.addEventListener('change', () => {
            state.naturalVariation = chkNatural.checked;
        });

        btnSubmit.addEventListener('click', async () => {
            statusText.textContent = 'exec(submit)...';
            const submitted = await submitEvaluation();
            if (submitted) {
                statusText.textContent = 'submitted ok';
                statusText.className = 'status-text success';
            } else {
                statusText.textContent = 'submit: not found';
                statusText.className = 'status-text error';
            }
        });

        function setMinimized(minimized) {
            card.classList.toggle('minimized', minimized);
            btnMin.textContent = minimized ? '+' : '—';
            btnMin.title = minimized ? 'Maximize' : 'Minimize';
        }

        btnMin.addEventListener('click', (e) => {
            e.stopPropagation();
            setMinimized(!card.classList.contains('minimized'));
        });

        dragHeader.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            if (card.classList.contains('minimized')) {
                setMinimized(false);
            }
        });

        btnClose.addEventListener('click', () => {
            host.remove();
            console.log('[Auto-SFE] Widget closed. Re-run or use console: autoSFE.fill("great")');
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

    // Auto-fill upon tab switching (e.g. Next -> or tab header buttons in PLM Pinnacle)
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target) return;
        const text = (target.value || target.textContent || '').trim().toLowerCase();
        if (text.includes('next') || text.includes('assessment')) {
            setTimeout(() => {
                console.log('[Auto-SFE] Tab change detected. Auto-applying active preset...');
                runAutoSFE(state.currentPreset);
            }, 350);
        }
    });

    // Create interactive UI
    createFloatingWidget();

    console.log(
        `%c>_ auto_sfe :: evaluation tool loaded\n` +
        `%c• Terminal floating overlay active.\n` +
        `• CLI functions available:\n` +
        `    autoSFE.great()   - Execute Great (5/5) preset\n` +
        `    autoSFE.neutral() - Execute Neutral (3/5) preset\n` +
        `    autoSFE.bad()     - Execute Bad (1/5) preset\n` +
        `    autoSFE.na()      - Execute N/A preset\n` +
        `    autoSFE.submit()  - Execute form submit\n` +
        `• Hotkey: Ctrl+Shift+S (or Cmd+Shift+S)`,
        'color: #22c55e; font-family: monospace; font-size: 13px; font-weight: bold;',
        'color: #94a3b8; font-family: monospace; font-size: 11px;'
    );
})();
