// =====================================================
// ELEMENTS
// =====================================================

const firstValue =
    document.getElementById("firstValue");

const secondValue =
    document.getElementById("secondValue");

const operation =
    document.getElementById("operation");

const resultValue =
    document.getElementById("resultValue");

const equationText =
    document.getElementById("equationText");

const stepsText =
    document.getElementById("stepsText");

const firstGroup =
    document.getElementById(
        "firstInputGroup"
    );

const secondGroup =
    document.getElementById(
        "secondInputGroup"
    );

const trigGroup =
    document.getElementById(
        "trigonometryInputGroup"
    );

const polynomialGroup =
    document.getElementById(
        "polynomialInputGroup"
    );

const wordGroup =
    document.getElementById(
        "wordProblemInputGroup"
    );

const trigExpression =
    document.getElementById(
        "trigExpression"
    );

const polynomialInput =
    document.getElementById(
        "polynomialInput"
    );

const wordProblemInput =
    document.getElementById(
        "wordProblemInput"
    );


// =====================================================
// STATUS
// =====================================================

function setStatus(text) {

    const status =
        document.querySelector(
            ".status-badge"
        );

    if (status) {
        status.textContent = text;
    }
}


// =====================================================
// NUMBER PARSER
// =====================================================

function parseNumber(value) {

    const number =
        Number(
            String(value)
                .trim()
                .replace(/,/g, "")
        );

    return Number.isFinite(number)
        ? number
        : null;
}


// =====================================================
// FORMAT NUMBER
// =====================================================

function formatNumber(number) {

    if (
        !Number.isFinite(number)
    ) {
        return "Error";
    }

    return Number.isInteger(number)
        ? String(number)
        : Number(
            number.toFixed(10)
        ).toString();
}


// =====================================================
// SHOW STEPS
// =====================================================

function showSteps(steps) {

    if (
        !Array.isArray(steps) ||
        steps.length === 0
    ) {

        stepsText.innerHTML =
            "No steps yet.";

        return;
    }


    stepsText.innerHTML =
        steps
            .map(
                (step, index) => `

                <div class="step-item">

                    <span class="step-number">
                        ${index + 1}
                    </span>

                    <span class="step-text">
                        ${escapeHtml(
                            String(step)
                        )}
                    </span>

                </div>

            `
            )
            .join("");
}


// =====================================================
// BASIC CALCULATOR
// =====================================================

function calculate() {

    const type =
        operation.value;


    // Word problem
    if (
        type === "wordProblem"
    ) {

        solveWordProblem();

        return;
    }


    // Polynomial
    if (
        type === "polynomial"
    ) {

        solvePolynomial();

        return;
    }


    // Trigonometry
    if (
        type === "trigonometry"
    ) {

        solveTrigonometry();

        return;
    }


    const a =
        parseNumber(
            firstValue.value
        );


    const b =
        parseNumber(
            secondValue.value
        );


    if (
        a === null
    ) {

        resultValue.textContent =
            "—";

        equationText.textContent =
            "Enter a valid first value.";

        stepsText.textContent =
            "Waiting for input.";

        setStatus("Ready");

        return;
    }


    let result;
    let equation;
    let steps;


    // ==========================================
    // ADDITION
    // ==========================================

    if (
        type === "add"
    ) {

        if (b === null) {
            showSecondRequired();
            return;
        }

        result =
            a + b;

        equation =
            `${a} + ${b} = ${formatNumber(result)}`;

        steps = [

            `First value = ${a}`,

            `Second value = ${b}`,

            `Add the two values.`,

            `${a} + ${b} = ${formatNumber(result)}`
        ];
    }


    // ==========================================
    // SUBTRACTION
    // ==========================================

    else if (
        type === "subtract"
    ) {

        if (b === null) {
            showSecondRequired();
            return;
        }

        result =
            a - b;

        equation =
            `${a} − ${b} = ${formatNumber(result)}`;

        steps = [

            `First value = ${a}`,

            `Second value = ${b}`,

            `Subtract the second value from the first.`,

            `${a} − ${b} = ${formatNumber(result)}`
        ];
    }


    // ==========================================
    // MULTIPLICATION
    // ==========================================

    else if (
        type === "multiply"
    ) {

        if (b === null) {
            showSecondRequired();
            return;
        }

        result =
            a * b;

        equation =
            `${a} × ${b} = ${formatNumber(result)}`;

        steps = [

            `First value = ${a}`,

            `Second value = ${b}`,

            `Multiply the two values.`,

            `${a} × ${b} = ${formatNumber(result)}`
        ];
    }


    // ==========================================
    // DIVISION
    // ==========================================

    else if (
        type === "divide"
    ) {

        if (b === null) {
            showSecondRequired();
            return;
        }


        if (
            b === 0
        ) {

            resultValue.textContent =
                "Error";

            equationText.textContent =
                "Division by zero is not allowed.";

            stepsText.textContent =
                "The second value cannot be zero.";

            return;
        }


        result =
            a / b;

        equation =
            `${a} ÷ ${b} = ${formatNumber(result)}`;

        steps = [

            `First value = ${a}`,

            `Second value = ${b}`,

            `Divide the first value by the second.`,

            `${a} ÷ ${b} = ${formatNumber(result)}`
        ];
    }


    // ==========================================
    // POWER
    // ==========================================

    else if (
        type === "power"
    ) {

        if (b === null) {
            showSecondRequired();
            return;
        }

        result =
            Math.pow(a, b);

        equation =
            `${a}^${b} = ${formatNumber(result)}`;

        steps = [

            `Base = ${a}`,

            `Exponent = ${b}`,

            `Calculate ${a} raised to the power ${b}.`,

            `${a}^${b} = ${formatNumber(result)}`
        ];
    }


    // ==========================================
    // MODULUS
    // ==========================================

    else if (
        type === "modulus"
    ) {

        if (b === null) {
            showSecondRequired();
            return;
        }


        if (b === 0) {

            resultValue.textContent =
                "Error";

            equationText.textContent =
                "Modulus by zero is not allowed.";

            stepsText.textContent =
                "The second value cannot be zero.";

            return;
        }


        result =
            a % b;

        equation =
            `${a} mod ${b} = ${formatNumber(result)}`;

        steps = [

            `First value = ${a}`,

            `Second value = ${b}`,

            `Find the remainder after division.`,

            `${a} mod ${b} = ${formatNumber(result)}`
        ];
    }


    // ==========================================
    // SQUARE ROOT
    // ==========================================

    else if (
        type === "sqrt"
    ) {

        if (
            a < 0
        ) {

            resultValue.textContent =
                "Error";

            equationText.textContent =
                "Square root of a negative number is not real.";

            stepsText.textContent =
                "Enter a value greater than or equal to zero.";

            return;
        }


        result =
            Math.sqrt(a);

        equation =
            `√${a} = ${formatNumber(result)}`;

        steps = [

            `Number = ${a}`,

            `Take the square root.`,

            `√${a} = ${formatNumber(result)}`
        ];
    }


    // ==========================================
    // PERCENTAGE
    // ==========================================

    else if (
        type === "percent"
    ) {

        if (b === null) {
            showSecondRequired();
            return;
        }

        result =
            (a / 100) * b;

        equation =
            `${a}% of ${b} = ${formatNumber(result)}`;

        steps = [

            `${a}% = ${a} / 100`,

            `${a} / 100 = ${a / 100}`,

            `${a / 100} × ${b} = ${formatNumber(result)}`
        ];
    }


    else {

        return;
    }


    // ==========================================
    // DISPLAY RESULT
    // ==========================================

    resultValue.textContent =
        formatNumber(result);

    equationText.textContent =
        equation;

    showSteps(
        steps
    );

    setStatus(
        "Solved"
    );
}


// =====================================================
// SECOND VALUE REQUIRED
// =====================================================

function showSecondRequired() {

    resultValue.textContent =
        "—";

    equationText.textContent =
        "Enter the second value.";

    stepsText.textContent =
        "Waiting for second value.";

    setStatus("Ready");
}


// =====================================================
// TRIGONOMETRY
// =====================================================

function solveTrigonometry() {

    const expression =
        trigExpression.value.trim();


    if (!expression) {

        resultValue.textContent =
            "—";

        equationText.textContent =
            "Enter a trigonometry expression.";

        stepsText.textContent =
            "Example: sin(30) + cos(60)";

        return;
    }


    try {

        const result =
            evaluateTrigExpression(
                expression
            );


        resultValue.textContent =
            formatNumber(result);


        equationText.textContent =
            `${expression} = ${formatNumber(result)}`;


        showSteps([

            `Expression = ${expression}`,

            `Angles are interpreted in degrees.`,

            `Calculate the trigonometric values.`,

            `Answer = ${formatNumber(result)}`
        ]);


        setStatus("Solved");

    } catch (error) {

        resultValue.textContent =
            "Error";

        equationText.textContent =
            error.message;

        stepsText.textContent =
            "Check the trigonometry expression.";

        setStatus("Error");
    }
}


// =====================================================
// TRIG EXPRESSION EVALUATOR
// =====================================================

function evaluateTrigExpression(
    expression
) {

    let exp =
        expression
            .toLowerCase()
            .replace(/\s+/g, "");


    exp =
        exp.replace(
            /sin\(([-+]?\d*\.?\d+)\)/g,
            (_, value) =>
                `Math.sin(${Number(value)}*Math.PI/180)`
        );


    exp =
        exp.replace(
            /cos\(([-+]?\d*\.?\d+)\)/g,
            (_, value) =>
                `Math.cos(${Number(value)}*Math.PI/180)`
        );


    exp =
        exp.replace(
            /tan\(([-+]?\d*\.?\d+)\)/g,
            (_, value) =>
                `Math.tan(${Number(value)}*Math.PI/180)`
        );


    if (
        !/^[0-9+\-*/().\s*MathPI]+$/.test(
            exp
        )
    ) {

        throw new Error(
            "Invalid trigonometry expression."
        );
    }


    const result =
        Function(
            `"use strict"; return (${exp})`
        )();


    if (
        !Number.isFinite(result)
    ) {

        throw new Error(
            "Invalid trigonometry result."
        );
    }


    return result;
}


// =====================================================
// POLYNOMIAL SOLVER
// =====================================================

function solvePolynomial() {

    const expression =
        polynomialInput.value.trim();


    if (!expression) {

        resultValue.textContent =
            "—";

        equationText.textContent =
            "Enter a polynomial.";

        stepsText.textContent =
            "Example: x^2 - 5x + 6 = 0";

        return;
    }


    try {

        const normalized =
            expression
                .replace(/\s+/g, "")
                .replace(/\^/g, "**");


        // Quadratic:
        // ax² + bx + c = 0

        const match =
            normalized.match(
                /^([+-]?\d*\.?\d*)x\*\*2([+-]\d*\.?\d*)x([+-]\d*\.?\d*)=0$/
            );


        if (!match) {

            throw new Error(
                "Currently enter a quadratic like x^2-5x+6=0."
            );
        }


        let a =
            match[1];

        let b =
            match[2];

        let c =
            match[3];


        if (
            a === "" ||
            a === "+"
        ) {
            a = 1;
        }

        else if (
            a === "-"
        ) {
            a = -1;
        }

        else {
            a = Number(a);
        }


        b =
            b === "+" ||
            b === ""
                ? 1
                : b === "-"
                    ? -1
                    : Number(b);


        c =
            c === "+" ||
            c === ""
                ? 0
                : Number(c);


        const discriminant =
            b * b -
            4 * a * c;


        if (
            discriminant < 0
        ) {

            resultValue.textContent =
                "No real roots";

            equationText.textContent =
                `D = ${discriminant}`;

            showSteps([

                `a = ${a}`,

                `b = ${b}`,

                `c = ${c}`,

                `D = b² − 4ac`,

                `D = ${discriminant}`,

                `Since D < 0, there are no real roots.`
            ]);

            return;
        }


        const x1 =
            (
                -b +
                Math.sqrt(discriminant)
            ) /
            (2 * a);


        const x2 =
            (
                -b -
                Math.sqrt(discriminant)
            ) /
            (2 * a);


        resultValue.textContent =
            `x = ${formatNumber(x1)}, ${formatNumber(x2)}`;


        equationText.textContent =
            `${expression}`;


        showSteps([

            `a = ${a}`,

            `b = ${b}`,

            `c = ${c}`,

            `D = b² − 4ac`,

            `D = ${discriminant}`,

            `x = (−b ± √D) / 2a`,

            `x₁ = ${formatNumber(x1)}`,

            `x₂ = ${formatNumber(x2)}`
        ]);


        setStatus("Solved");

    } catch (error) {

        resultValue.textContent =
            "Error";

        equationText.textContent =
            error.message;

        stepsText.textContent =
            "Check your polynomial.";

        setStatus("Error");
    }
}


// =====================================================
// WORD PROBLEM SOLVER
// =====================================================

async function solveWordProblem() {

    const question =
        wordProblemInput.value.trim();


    if (!question) {

        resultValue.textContent =
            "—";

        equationText.textContent =
            "Enter a problem to solve.";

        stepsText.textContent =
            "No problem entered.";

        return;
    }


    setStatus("AI");


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
                Sending problem to Gemini...
            </span>

        </div>

    `;


    try {

        const response =
            await fetch(
                "/api/solve",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            problem:
                                question
                        })
                }
            );


        const data =
            await response.json();


        console.log(
            "SERVER RESPONSE:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Server could not solve the problem."
            );
        }


        // ==========================================
        // GET RESULT
        // ==========================================

        const result =
            data.result ||
            data;


        console.log(
            "PARSED RESULT:",
            result
        );


        // ==========================================
        // ANSWER
        // ==========================================

        const answer =
            result.answer ||
            result.finalAnswer ||
            result.final_answer ||
            result.solution ||
            "";


        if (!answer) {

            throw new Error(
                "No final answer returned."
            );
        }


        resultValue.textContent =
            answer;


        // ==========================================
        // EQUATION
        // ==========================================

        equationText.textContent =
            result.equation ||
            result.formula ||
            "AI solution";


        // ==========================================
        // STEPS
        // ==========================================

        let steps =
            result.steps ||
            [];


        if (
            !Array.isArray(steps)
        ) {

            steps = [
                String(steps)
            ];
        }


        // Use calculation if steps are missing
        if (
            steps.length === 0 &&
            result.calculation
        ) {

            steps =
                String(
                    result.calculation
                )
                .split(/\r?\n/)
                .filter(Boolean);
        }


        showSteps(
            steps
        );


        // ==========================================
        // STATUS
        // ==========================================

        setStatus(
            "Solved"
        );


    } catch (error) {

        console.error(
            "Solve error:",
            error
        );


        resultValue.textContent =
            "Error";


        equationText.textContent =
            error.message;


        stepsText.innerHTML = `

            <div class="step-item">

                <span class="step-number">
                    ⚠
                </span>

                <span class="step-text">
                    ${escapeHtml(
                        error.message
                    )}
                </span>

            </div>

        `;


        setStatus(
            "Error"
        );
    }
}


// =====================================================
// UPDATE INPUT VISIBILITY
// =====================================================

function updateFields() {

    const type =
        operation.value;


    // Hide everything first

    firstGroup.classList.add(
        "hidden"
    );

    secondGroup.classList.add(
        "hidden"
    );

    trigGroup.classList.add(
        "hidden"
    );

    polynomialGroup.classList.add(
        "hidden"
    );

    wordGroup.classList.add(
        "hidden"
    );


    // ==========================================
    // TRIGONOMETRY
    // ==========================================

    if (
        type === "trigonometry"
    ) {

        trigGroup.classList.remove(
            "hidden"
        );

        setStatus(
            "Ready"
        );

        return;
    }


    // ==========================================
    // POLYNOMIAL
    // ==========================================

    if (
        type === "polynomial"
    ) {

        polynomialGroup.classList.remove(
            "hidden"
        );

        setStatus(
            "Ready"
        );

        return;
    }


    // ==========================================
    // WORD PROBLEM
    // ==========================================

    if (
        type === "wordProblem"
    ) {

        wordGroup.classList.remove(
            "hidden"
        );

        setStatus(
            "AI"
        );

        return;
    }


    // ==========================================
    // NORMAL OPERATIONS
    // ==========================================

    firstGroup.classList.remove(
        "hidden"
    );


    if (
        type !== "sqrt"
    ) {

        secondGroup.classList.remove(
            "hidden"
        );
    }


    setStatus(
        "Ready"
    );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


// =====================================================
// EVENT LISTENERS
// =====================================================

operation.addEventListener(
    "change",
    () => {

        updateFields();

        calculate();
    }
);


firstValue.addEventListener(
    "input",
    () => {

        if (
            operation.value !==
            "wordProblem" &&
            operation.value !==
            "polynomial" &&
            operation.value !==
            "trigonometry"
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
            "wordProblem" &&
            operation.value !==
            "polynomial" &&
            operation.value !==
            "trigonometry"
        ) {

            calculate();
        }
    }
);


trigExpression.addEventListener(
    "input",
    () => {

        if (
            operation.value ===
            "trigonometry"
        ) {

            solveTrigonometry();
        }
    }
);


polynomialInput.addEventListener(
    "input",
    () => {

        if (
            operation.value ===
            "polynomial"
        ) {

            solvePolynomial();
        }
    }
);


// =====================================================
// WORD PROBLEM
// CTRL + ENTER = SOLVE
// =====================================================

wordProblemInput.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            solveWordProblem();
        }
    }
);


// =====================================================
// INITIALIZE
// =====================================================

updateFields();

setStatus(
    "Ready"
);
