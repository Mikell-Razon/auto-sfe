const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const scriptSource = fs.readFileSync(path.join(__dirname, '../sfe_console.js'), 'utf8');

function setupDOM(htmlFile) {
    const html = fs.readFileSync(path.join(__dirname, '../', htmlFile), 'utf8');
    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        resources: 'usable',
        url: 'http://localhost/'
    });

    // Provide performance.now if not present
    if (!dom.window.performance) {
        dom.window.performance = { now: () => Date.now() };
    }

    return dom;
}

function runScriptInDOM(dom) {
    dom.window.eval(scriptSource);
    return dom.window.autoSFE;
}

async function testPinnacleForm() {
    console.log('\n--- Testing Pinnacle Form ---');

    // 1. Test GREAT preset
    {
        const dom = setupDOM('test_form_pinnacle.html');
        const sfe = runScriptInDOM(dom);

        // Fill with Great preset
        await sfe.great({ naturalVariation: false });

        const doc = dom.window.document;
        const clarityChecked = doc.querySelector('input[name="clarity"]:checked');
        console.log('Clarity checked (Great):', clarityChecked ? clarityChecked.value : 'none');
        if (!clarityChecked || !clarityChecked.value.includes('5')) {
            throw new Error(`Expected clarity to be 5, got: ${clarityChecked ? clarityChecked.value : 'none'}`);
        }

        const feedbackFreq = doc.querySelector('input[name="feedbackFreq"]:checked');
        console.log('FeedbackFreq checked (Great):', feedbackFreq ? feedbackFreq.value : 'none');
        if (!feedbackFreq || !feedbackFreq.value.includes('1 week')) {
            throw new Error(`Expected feedbackFreq to be '1 week', got: ${feedbackFreq ? feedbackFreq.value : 'none'}`);
        }

        const rating = doc.getElementById('courseRating').value;
        console.log('Course Rating (Great):', rating);
        if (rating !== 'Excellent') {
            throw new Error(`Expected courseRating to be 'Excellent', got: ${rating}`);
        }

        const explain = doc.getElementById('explainRating').value;
        console.log('Explain rating text length (Great):', explain.length);
        if (!explain || explain === 'Not applicable.') {
            throw new Error(`Expected meaningful positive comment, got: ${explain}`);
        }

        const studentId = doc.getElementById('studentId').value;
        console.log('Student ID value (should be empty/preserved):', `"${studentId}"`);
        if (studentId === 'Not applicable.') {
            throw new Error('Student ID should not be set to "Not applicable."');
        }
    }

    // 2. Test NEUTRAL preset
    {
        const dom = setupDOM('test_form_pinnacle.html');
        const sfe = runScriptInDOM(dom);

        await sfe.neutral({ naturalVariation: false });

        const doc = dom.window.document;
        const clarityChecked = doc.querySelector('input[name="clarity"]:checked');
        console.log('Clarity checked (Neutral):', clarityChecked ? clarityChecked.value : 'none');
        if (!clarityChecked || !clarityChecked.value.includes('3')) {
            throw new Error(`Expected clarity to be 3, got: ${clarityChecked ? clarityChecked.value : 'none'}`);
        }

        const feedbackFreq = doc.querySelector('input[name="feedbackFreq"]:checked');
        console.log('FeedbackFreq checked (Neutral):', feedbackFreq ? feedbackFreq.value : 'none');
        if (!feedbackFreq || !feedbackFreq.value.includes('2 weeks')) {
            throw new Error(`Expected feedbackFreq to be '2 weeks', got: ${feedbackFreq ? feedbackFreq.value : 'none'}`);
        }

        const rating = doc.getElementById('courseRating').value;
        console.log('Course Rating (Neutral):', rating);
        if (rating !== 'Good' && rating !== 'Fair') {
            throw new Error(`Expected courseRating to be 'Good' or 'Fair', got: ${rating}`);
        }
    }

    // 3. Test BAD preset
    {
        const dom = setupDOM('test_form_pinnacle.html');
        const sfe = runScriptInDOM(dom);

        await sfe.bad({ naturalVariation: false });

        const doc = dom.window.document;
        const clarityChecked = doc.querySelector('input[name="clarity"]:checked');
        console.log('Clarity checked (Bad):', clarityChecked ? clarityChecked.value : 'none');
        if (!clarityChecked || !clarityChecked.value.includes('1')) {
            throw new Error(`Expected clarity to be 1, got: ${clarityChecked ? clarityChecked.value : 'none'}`);
        }

        const feedbackFreq = doc.querySelector('input[name="feedbackFreq"]:checked');
        console.log('FeedbackFreq checked (Bad):', feedbackFreq ? feedbackFreq.value : 'none');
        if (!feedbackFreq || (!feedbackFreq.value.includes('Never') && !feedbackFreq.value.includes('1 month'))) {
            throw new Error(`Expected feedbackFreq to be 'Never' or '1 month', got: ${feedbackFreq ? feedbackFreq.value : 'none'}`);
        }

        const rating = doc.getElementById('courseRating').value;
        console.log('Course Rating (Bad):', rating);
        if (rating !== 'Poor') {
            throw new Error(`Expected courseRating to be 'Poor', got: ${rating}`);
        }
    }

    // 4. Test NA preset
    {
        const dom = setupDOM('test_form_pinnacle.html');
        const sfe = runScriptInDOM(dom);

        await sfe.na();

        const doc = dom.window.document;
        const clarityChecked = doc.querySelector('input[name="clarity"]:checked');
        console.log('Clarity checked (NA):', clarityChecked ? clarityChecked.value : 'none');
        if (!clarityChecked || clarityChecked.value !== 'Not Applicable') {
            throw new Error(`Expected clarity to be 'Not Applicable', got: ${clarityChecked ? clarityChecked.value : 'none'}`);
        }

        const rating = doc.getElementById('courseRating').value;
        console.log('Course Rating (NA):', rating);
        if (rating !== 'Not Applicable') {
            throw new Error(`Expected courseRating to be 'Not Applicable', got: ${rating}`);
        }
    }

    console.log('✅ Pinnacle Form tests PASSED!');
}

async function testStandardForm() {
    console.log('\n--- Testing Standard Form ---');
    const dom = setupDOM('test_form.html');
    const sfe = runScriptInDOM(dom);

    await sfe.great();

    const doc = dom.window.document;
    const diffChecked = doc.querySelector('input[name="difficulty"]:checked');
    console.log('Difficulty checked (Great):', diffChecked ? diffChecked.value : 'none');

    const courseRating = doc.getElementById('courseRating').value;
    console.log('Course rating (Great):', courseRating);
    if (courseRating !== 'Excellent') {
        throw new Error(`Expected courseRating to be 'Excellent', got: ${courseRating}`);
    }

    const comments = doc.getElementById('comments').value;
    console.log('Comments (Great):', comments);
    if (!comments || comments === 'Not applicable.') {
        throw new Error('Expected positive comment');
    }

    console.log('✅ Standard Form tests PASSED!');
}

async function main() {
    try {
        await testPinnacleForm();
        await testStandardForm();
        console.log('\n🎉 ALL CONSOLE SCRIPT TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
        console.error('\n❌ TEST FAILED:', err);
        process.exit(1);
    }
}

main();
