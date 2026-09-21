```javascript
// ======================================================
// CALCULATOR STUDIO
// Normal Calculator + Trigonometry + Polynomial
// + Gemini AI Word Problem Solver
// ======================================================


// ======================================================
// ELEMENTS
// ======================================================

const firstValue = document.getElementById("firstValue");
const secondValue = document.getElementById("secondValue");
const operation = document.getElementById("operation");

const resultValue = document.getElementById("resultValue");
const equationText = document.getElementById("equationText");
const stepsText = document.getElementById("stepsText");

const firstGroup =
    document.getElementById("firstInputGroup");

const secondGroup =
    document.getElementById("secondInputGroup");

const trigGroup =
    document.getElementById("trigonometryInputGroup");

const polynomialGroup =
    document.getElementById("polynomialInputGroup");

const wordGroup =
    document.getElementById("wordProblemInputGroup");

const trigExpression =
    document.getElementById("trigExpression");

const polynomialInput =
    document.getElementById("polynomialInput");

const wordProblemInput =
    document.getElementById("wordProblemInput");


// ======================================================
// CHANGE OPERATION
// ======================================================

operation.addEventListener("change", updateInterface);


function updateInterface() {

    const op = operation.value;

    // Hide all groups
    firstGroup.classList.add("hidden");
    secondGroup.classList.add("hidden");
    trigGroup.classList.add("hidden");
    polynomialGroup.classList.add("hidden");
    wordGroup.classList.add("hidden");


    // ==================================================
    // NORMAL TWO-VALUE OPERATIONS
    // ==================================================

    if (
        op === "add" ||
        op === "subtract" ||
        op === "multiply" ||
        op === "divide" ||
        op === "power" ||
        op === "modulus" ||
        op === "percent"
    ) {

        firstGroup.classList.remove("hidden");
        secondGroup.classList.remove("hidden");
    }


    // ==================================================
    // SQUARE ROOT
    // ==================================================

    if (op === "sqrt") {

        firstGroup.classList.remove("hidden");
    }


    // ==================================================
    // TRIGONOMETRY
    // ==================================================

    if (op === "trigonometry") {

        trigGroup.classList.remove("hidden");
    }


    // ==================================================
    // POLYNOMIAL
    // ==================================================

    if (op === "polynomial") {

        polynomialGroup.classList.remove("hidden");
    }


    // ==================================================
    // WORD PROBLEM
    // ==================================================

    if (op === "wordProblem") {

        wordGroup.classList.remove("hidden");

        resultValue.textContent = "—";

        equationText.textContent =
            "Enter a problem and press Ctrl + Enter.";

        stepsText.innerHTML =
            "Ready for your problem.";

        const status =
            statusElement();

        if (status) {
            status.textContent = "Ready";
        }
    }


    // ==================================================
    // RESET NORMAL RESULT
    // ==================================================

    if (op !== "wordProblem") {

        resultValue.textContent = "—";

        equationText.textContent =
            "Enter values to calculate";

        stepsText.innerHTML =
            "No steps yet.";

        const status =
            statusElement();

        if (status) {
            status.textContent = "Ready";
        }
    }
}


// ======================================================
// MAIN CALCULATOR
// ======================================================

function calculate() {

    const op = operation.value;


    // Word problem
    if (op === "wordProblem") {

        solveWordProblem();
        return;
    }


    // Polynomial
    if (op === "polynomial") {

        solvePolynomial();
        return;
    }


    // Trigonometry
    if (op === "trigonometry") {

        solveTrigonometry();
        return;
    }


    // Square root
    if (op === "sqrt") {

        solveSquareRoot();
        return;
    }


    // Read numbers
    const a = Number(firstValue.value);
    const b = Number(secondValue.value);


    if (!Number.isFinite(a) ||
        !Number.isFinite(b)) {

        showError("Enter both numbers.");
        return;
    }


    let result;
    let equation;
    let steps;


    switch (op) {


        // ==============================================
        // ADDITION
        // ==============================================

        case "add":

            result = a + b;

            equation =
                `${a} + ${b} = ${result}`;

            steps = [
                `First value = ${a}`,
                `Second value = ${b}`,
                `Add ${a} + ${b}`,
                `Answer = ${result}`
            ];

            break;


        // ==============================================
        // SUBTRACTION
        // ==============================================

        case "subtract":

            result = a - b;

            equation =
                `${a} − ${b} = ${result}`;

            steps = [
                `First value = ${a}`,
                `Second value = ${b}`,
                `Subtract ${a} − ${b}`,
                `Answer = ${result}`
            ];

            break;


        // ==============================================
        // MULTIPLICATION
        // ==============================================

        case "multiply":

            result = a * b;

            equation =
                `${a} × ${b} = ${result}`;

            steps = [
                `First value = ${a}`,
                `Second value = ${b}`,
                `Multiply ${a} × ${b}`,
                `Answer = ${result}`
            ];

            break;


        // ==============================================
        // DIVISION
        // ==============================================

        case "divide":

            if (b === 0) {

                showError(
                    "Cannot divide by zero."
                );

                return;
            }

            result = a / b;

            equation =
                `${a} ÷ ${b} = ${result}`;

            steps = [
                `Dividend = ${a}`,
                `Divisor = ${b}`,
                `Divide ${a} ÷ ${b}`,
                `Answer = ${result}`
            ];

            break;


        // ==============================================
        // POWER
        // ==============================================

        case "power":

            result = Math.pow(a, b);

            equation =
                `${a} ^ ${b} = ${result}`;

            steps = [
                `Base = ${a}`,
                `Exponent = ${b}`,
                `Calculate ${a} raised to ${b}`,
                `Answer = ${result}`
            ];

            break;


        // ==============================================
        // MODULUS
        // ==============================================

        case "modulus":

            if (b === 0) {

                showError(
                    "Cannot calculate modulus by zero."
                );

                return;
            }

            result = a % b;

            equation =
                `${a} mod ${b} = ${result}`;

            steps = [
                `${a} ÷ ${b}`,
                `Find the remainder`,
                `Answer = ${result}`
            ];

            break;


        // ==============================================
        // PERCENTAGE
        // ==============================================

        case "percent":

            result = (a / 100) * b;

            equation =
                `${a}% of ${b} = ${result}`;

            steps = [
                `${a}% = ${a} ÷ 100`,
                `(${a} ÷ 100) × ${b}`,
                `Answer = ${result}`
            ];

            break;


        default:

            showError(
                "Select an operation."
            );

            return;
    }


    showResult(
        result,
        equation,
        steps
    );
}


// ======================================================
// SQUARE ROOT
// ======================================================

function solveSquareRoot() {

    const value =
        Number(firstValue.value);


    if (!Number.isFinite(value)) {

        showError(
            "Enter a valid number."
        );

        return;
    }


    if (value < 0) {

        showError(
            "Cannot calculate a real square root of a negative number."
        );

        return;
    }


    const result =
        Math.sqrt(value);


    showResult(

        result,

        `√${value} = ${format(result)}`,

        [
            `Number = ${value}`,
            `Take the square root of ${value}`,
            `√${value} = ${format(result)}`,
            `Answer = ${format(result)}`
        ]
    );
}


// ======================================================
// GEMINI AI WORD PROBLEM SOLVER
// ======================================================

async function solveWordProblem() {

    const question =
        wordProblemInput.value.trim();


    // ==================================================
    // EMPTY INPUT
    // ==================================================

    if (!question) {

        resultValue.textContent = "—";

        equationText.textContent =
            "Enter a problem to solve.";

        stepsText.innerHTML =
            "No problem entered.";

        const status =
            statusElement();

        if (status) {
            status.textContent = "Ready";
        }

        return;
    }


    // ==================================================
    // LOADING STATE
    // ==================================================

    const status =
        statusElement();

    if (status) {
        status.textContent = "Thinking...";
    }


    resultValue.textContent =
        "Solving...";

    equationText.textContent =
        "Gemini is analyzing your problem...";

    stepsText.innerHTML = `
        <div class="step-item">

            <span class="step-number">
                ⏳
            </span>

            <span class="step-text">
                Identifying subject, values,
                formula and required answer...
            </span>

        </div>
    `;


    // ==================================================
    // SEND TO SERVER
    // ==================================================

    try {

        const response =
            await fetch("/api/solve", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                // IMPORTANT:
                // server.js expects "problem"
                body: JSON.stringify({
                    problem: question
                })
            });


        let data;


        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Server returned an invalid response."
            );
        }


        // ==================================================
        // SERVER ERROR
        // ==================================================

        if (!response.ok ||
            data.error) {

            throw new Error(
                data.error ||
                "Gemini could not solve the problem."
            );
        }


        // ==================================================
        // DISPLAY RESULT
        // ==================================================

        displayGeminiResult(data);


    } catch (error) {

        console.error(
            "Gemini error:",
            error
        );


        showError(
            error.message ||
            "Unable to connect to Gemini."
        );
    }
}


// ======================================================
// DISPLAY GEMINI RESULT
// ======================================================

function displayGeminiResult(data) {

    const subject =
        data.subject || "General";


    const topic =
        data.topic || "";


    const answer =
        data.answer ||
        "No final answer returned.";


    const formula =
        data.formula || "";


    const equation =
        data.equation || "";


    const given =
        Array.isArray(data.given)
            ? data.given
            : [];


    const required =
        Array.isArray(data.required)
            ? data.required
            : [];


    const assumptions =
        Array.isArray(data.assumptions)
            ? data.assumptions
            : [];


    const steps =
        Array.isArray(data.steps)
            ? data.steps
            : [];


    const calculation =
        data.calculation || "";


    const checks =
        Array.isArray(data.checks)
            ? data.checks
            : [];


    const warning =
        data.warning || "";


    // ==================================================
    // FINAL ANSWER
    // ==================================================

    resultValue.textContent =
        answer;


    // ==================================================
    // EQUATION AREA
    // ==================================================

    let equationHTML = "";


    if (subject) {

        equationHTML += `
            <strong>Subject:</strong>
            ${escapeHTML(subject)}
        `;
    }


    if (topic) {

        equationHTML += `
            <br>
            <strong>Topic:</strong>
            ${escapeHTML(topic)}
        `;
    }


    if (equation) {

        equationHTML += `
            <br>
            <strong>Equation:</strong>
            ${formatAIText(equation)}
        `;
    }


    if (formula) {

        equationHTML += `
            <br>
            <strong>Formula:</strong>
            ${formatAIText(formula)}
        `;
    }


    equationText.innerHTML =
        equationHTML ||
        "Gemini solved the problem.";


    // ==================================================
    // BUILD SOLUTION
    // ==================================================

    const allSteps = [];


    // GIVEN
    if (given.length > 0) {

        allSteps.push(`
            <strong>Given:</strong>

            <br>

            ${given
                .map(item =>
                    `• ${escapeHTML(item)}`
                )
                .join("<br>")}
        `);
    }


    // REQUIRED
    if (required.length > 0) {

        allSteps.push(`
            <strong>Required:</strong>

            <br>

            ${required
                .map(item =>
                    `• ${escapeHTML(item)}`
                )
                .join("<br>")}
        `);
    }


    // ASSUMPTIONS
    if (assumptions.length > 0) {

        allSteps.push(`
            <strong>Assumptions:</strong>

            <br>

            ${assumptions
                .map(item =>
                    `• ${escapeHTML(item)}`
                )
                .join("<br>")}
        `);
    }


    // FORMULA
    if (formula) {

        allSteps.push(`
            <strong>Formula / Principle:</strong>

            <br>

            ${formatAIText(formula)}
        `);
    }


    // CALCULATION
    if (calculation) {

        allSteps.push(`
            <strong>Calculation:</strong>

            <br>

            ${formatAIText(calculation)}
        `);
    }


    // SOLUTION STEPS
    steps.forEach(step => {

        allSteps.push(
            formatAIText(step)
        );
    });


    // CHECKS
    if (checks.length > 0) {

        allSteps.push(`
            <strong>Check:</strong>

            <br>

            ${checks
                .map(item =>
                    `✓ ${escapeHTML(item)}`
                )
                .join("<br>")}
        `);
    }


    // WARNING
    if (warning) {

        allSteps.push(`
            <strong>Note:</strong>

            <br>

            ${escapeHTML(warning)}
        `);
    }


    // ==================================================
    // DISPLAY STEPS
    // ==================================================

    if (allSteps.length === 0) {

        stepsText.innerHTML =
            "No detailed steps returned.";

    } else {

        stepsText.innerHTML =
            allSteps
                .map((step, index) => `

                    <div class="step-item">

                        <span class="step-number">
                            ${index + 1}
                        </span>

                        <span class="step-text">
                            ${step}
                        </span>

                    </div>

                `)
                .join("");
    }


    // ==================================================
    // STATUS
    // ==================================================

    const status =
        statusElement();

    if (status) {

        status.textContent =
            "Solved";
    }
}


// ======================================================
// TRIGONOMETRY
// ======================================================

function solveTrigonometry() {

    let expression =
        trigExpression.value.trim();


    if (!expression) {

        showError(
            "Enter a trigonometry expression."
        );

        return;
    }


    try {

        let jsExpression =
            expression
                .replace(/π/g, "Math.PI")
                .replace(
                    /sin\s*\(/gi,
                    "Math.sin(Math.PI/180*("
                )
                .replace(
                    /cos\s*\(/gi,
                    "Math.cos(Math.PI/180*("
                )
                .replace(
                    /tan\s*\(/gi,
                    "Math.tan(Math.PI/180*("
                );


        jsExpression =
            fixTrigParentheses(
                jsExpression
            );


        const result =
            Function(
                `"use strict"; return ${jsExpression}`
            )();


        if (!Number.isFinite(result)) {

            throw new Error();
        }


        showResult(

            result,

            `${expression} = ${format(result)}`,

            [
                "Angles are interpreted in degrees.",
                `Evaluate ${expression}.`,
                `Answer = ${format(result)}`
            ]
        );


    } catch {

        showError(
            "Invalid trigonometry expression."
        );
    }
}


// ======================================================
// TRIGONOMETRY PARENTHESIS HELPER
// ======================================================

function fixTrigParentheses(expression) {

    expression =
        expression.replace(
            /Math\.sin\(Math\.PI\/180\*\(([^()]*)\)/g,
            "Math.sin(Math.PI/180*($1))"
        );


    expression =
        expression.replace(
            /Math\.cos\(Math\.PI\/180\*\(([^()]*)\)/g,
            "Math.cos(Math.PI/180*($1))"
        );


    expression =
        expression.replace(
            /Math\.tan\(Math\.PI\/180\*\(([^()]*)\)/g,
            "Math.tan(Math.PI/180*($1))"
        );


    return expression;
}


// ======================================================
// POLYNOMIAL SOLVER
// ======================================================

function solvePolynomial() {

    let equation =
        polynomialInput.value
            .trim()
            .replace(/\s/g, "")
            .replace(/−/g, "-");


    if (!equation) {

        showError(
            "Enter a polynomial."
        );

        return;
    }


    // Remove = 0 if present
    if (equation.includes("=")) {

        equation =
            equation.split("=")[0];
    }


    /*
       Supported:

       x^2-5x+6
       2x^2+3x-5
       x^2+x-2
    */

    const match =
        equation.match(
            /^([+-]?\d*\.?\d*)x\^2([+-]?\d*\.?\d*)x([+-]?\d*\.?\d*)$/
        );


    if (!match) {

        showError(
            "Use quadratic format like: x^2-5x+6"
        );

        return;
    }


    const a =
        coefficient(match[1], 1);


    const b =
        coefficient(match[2], 1);


    const c =
        coefficient(match[3], 0);


    if (a === 0) {

        showError(
            "The coefficient of x² cannot be zero."
        );

        return;
    }


    // ==================================================
    // DISCRIMINANT
    // ==================================================

    const discriminant =
        b * b - 4 * a * c;


    // ==================================================
    // COMPLEX ROOTS
    // ==================================================

    if (discriminant < 0) {

        const realPart =
            -b / (2 * a);


        const imaginaryPart =
            Math.sqrt(-discriminant) /
            Math.abs(2 * a);


        const result =
            `${format(realPart)} ± ${format(imaginaryPart)}i`;


        showResult(

            result,

            `${equation} = 0`,

            [
                `a = ${a}`,
                `b = ${b}`,
                `c = ${c}`,
                `Discriminant = ${format(discriminant)}`,
                "The discriminant is negative, so the roots are complex.",
                `Roots = ${result}`
            ]
        );

        return;
    }


    // ==================================================
    // REAL ROOTS
    // ==================================================

    const x1 =
        (-b + Math.sqrt(discriminant)) /
        (2 * a);


    const x2 =
        (-b - Math.sqrt(discriminant)) /
        (2 * a);


    const result =
        x1 === x2
            ? format(x1)
            : `${format(x1)}, ${format(x2)}`;


    showResult(

        result,

        `${equation} = 0`,

        [
            `a = ${a}`,
            `b = ${b}`,
            `c = ${c}`,
            `Discriminant = ${format(discriminant)}`,
            "Use x = (−b ± √D) / 2a",
            `x₁ = ${format(x1)}`,
            `x₂ = ${format(x2)}`,
            `Roots = ${result}`
        ]
    );
}


// ======================================================
// POLYNOMIAL COEFFICIENT
// ======================================================

function coefficient(value, defaultValue) {

    if (
        value === "" ||
        value === "+"
    ) {

        return defaultValue;
    }


    if (value === "-") {

        return -defaultValue;
    }


    return Number(value);
}


// ======================================================
// NORMAL RESULT DISPLAY
// ======================================================

function showResult(
    result,
    equation,
    steps
) {

    resultValue.textContent =
        format(result);


    equationText.textContent =
        equation;


    if (!Array.isArray(steps)) {

        steps = [String(steps)];
    }


    stepsText.innerHTML =
        steps
            .map((step, index) => `

                <div class="step-item">

                    <span class="step-number">
                        ${index + 1}
                    </span>

                    <span class="step-text">
                        ${escapeHTML(step)}
                    </span>

                </div>

            `)
            .join("");


    const status =
        statusElement();


    if (status) {

        status.textContent =
            "Calculated";
    }
}


// ======================================================
// ERROR DISPLAY
// ======================================================

function showError(message) {

    resultValue.textContent =
        "Error";


    equationText.textContent =
        message;


    stepsText.innerHTML = `

        <div class="step-item">

            <span class="step-number">
                !
            </span>

            <span class="step-text">
                ${escapeHTML(message)}
            </span>

        </div>

    `;


    const status =
        statusElement();


    if (status) {

        status.textContent =
            "Check Input";
    }
}


// ======================================================
// STATUS ELEMENT
// ======================================================

function statusElement() {

    return document.querySelector(
        ".status-badge"
    );
}


// ======================================================
// NUMBER FORMATTER
// ======================================================

function format(value) {

    if (
        typeof value !== "number"
    ) {

        return value;
    }


    if (
        !Number.isFinite(value)
    ) {

        return value;
    }


    return Number(
        value.toFixed(10)
    );
}


// ======================================================
// HTML SECURITY
// ======================================================

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ======================================================
// FORMAT GEMINI TEXT
// ======================================================

function formatAIText(value) {

    return escapeHTML(value)
        .replace(
            /\n/g,
            "<br>"
        );
}


// ======================================================
// NORMAL INPUT EVENTS
// ======================================================

firstValue.addEventListener(
    "input",
    () => {

        if (
            operation.value !==
            "wordProblem"
        ) {

            calculate();
        }
    }
);


secondValue.addEventListener(
    "input",
    () => {

        if (
            operation.value !==
            "wordProblem"
        ) {

            calculate();
        }
    }
);


// ======================================================
// ENTER KEY - NORMAL CALCULATOR
// ======================================================

firstValue.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            calculate();
        }
    }
);


secondValue.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            calculate();
        }
    }
);


// ======================================================
// TRIGONOMETRY INPUT
// ======================================================

trigExpression.addEventListener(
    "input",
    () => {

        if (
            operation.value ===
            "trigonometry"
        ) {

            calculate();
        }
    }
);


// ======================================================
// POLYNOMIAL INPUT
// ======================================================

polynomialInput.addEventListener(
    "input",
    () => {

        if (
            operation.value ===
            "polynomial"
        ) {

            calculate();
        }
    }
);


// ======================================================
// WORD PROBLEM INPUT
// ======================================================

wordProblemInput.addEventListener(
    "input",
    () => {

        const question =
            wordProblemInput.value.trim();


        if (!question) {

            resultValue.textContent =
                "—";

            equationText.textContent =
                "Enter a problem to solve.";

            stepsText.innerHTML =
                "No problem entered.";

            const status =
                statusElement();

            if (status) {
                status.textContent =
                    "Ready";
            }

            return;
        }


        const status =
            statusElement();

        if (status) {

            s
```
