const http = require("http");
const fs = require("fs");
const path = require("path");


// =====================================================
// CONFIGURATION
// =====================================================

const ROOT = __dirname;

const PORT =
    Number(process.env.PORT || 3000);

const GEMINI_MODEL =
    process.env.GEMINI_MODEL ||
    "gemini-3.6-flash";

const GEMINI_FALLBACK_MODEL =
    process.env.GEMINI_FALLBACK_MODEL ||
    "gemini-3.6-flash-lite";


// =====================================================
// LOAD .ENV FOR LOCAL DEVELOPMENT
// Render uses Environment Variables directly.
// =====================================================

function loadEnvFile() {

    const envPath =
        path.join(ROOT, ".env");

    if (!fs.existsSync(envPath)) {
        return;
    }

    const content =
        fs.readFileSync(
            envPath,
            "utf8"
        );

    for (const line of content.split(/\r?\n/)) {

        const trimmed =
            line.trim();

        if (
            !trimmed ||
            trimmed.startsWith("#")
        ) {
            continue;
        }

        const equalIndex =
            trimmed.indexOf("=");

        if (equalIndex === -1) {
            continue;
        }

        const key =
            trimmed
                .slice(0, equalIndex)
                .trim();

        let value =
            trimmed
                .slice(equalIndex + 1)
                .trim();

        if (
            value.startsWith('"') &&
            value.endsWith('"')
        ) {
            value =
                value.slice(1, -1);
        }

        if (
            value.startsWith("'") &&
            value.endsWith("'")
        ) {
            value =
                value.slice(1, -1);
        }

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}


loadEnvFile();


// =====================================================
// GEMINI API KEYS
// =====================================================

const GEMINI_KEYS = [

    process.env.GEMINI_API_KEY_1,

    process.env.GEMINI_API_KEY_2,

    process.env.GEMINI_API_KEY_3,

    process.env.GEMINI_API_KEY_4,

    process.env.GEMINI_API_KEY_5,

    process.env.GEMINI_API_KEY_6

].filter(Boolean);


let currentKeyIndex = 0;


// =====================================================
// GET NEXT API KEY
// =====================================================

function getNextApiKey() {

    if (
        GEMINI_KEYS.length === 0
    ) {

        throw new Error(
            "No Gemini API keys configured."
        );
    }

    const key =
        GEMINI_KEYS[
            currentKeyIndex
        ];

    currentKeyIndex =
        (
            currentKeyIndex + 1
        ) %
        GEMINI_KEYS.length;

    return key;
}


// =====================================================
// MIME TYPES
// =====================================================

const MIME_TYPES = {

    ".html":
        "text/html; charset=utf-8",

    ".css":
        "text/css; charset=utf-8",

    ".js":
        "application/javascript; charset=utf-8",

    ".json":
        "application/json; charset=utf-8",

    ".png":
        "image/png",

    ".jpg":
        "image/jpeg",

    ".jpeg":
        "image/jpeg",

    ".svg":
        "image/svg+xml",

    ".ico":
        "image/x-icon"
};


// =====================================================
// SEND JSON
// =====================================================

function sendJson(
    res,
    statusCode,
    data
) {

    const output =
        JSON.stringify(
            data
        );

    res.writeHead(
        statusCode,
        {
            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store"
        }
    );

    res.end(output);
}


// =====================================================
// READ REQUEST BODY
// =====================================================

function readBody(req) {

    return new Promise(
        (resolve, reject) => {

            let body = "";

            req.on(
                "data",
                chunk => {

                    body +=
                        chunk.toString();

                    // Prevent huge requests
                    if (
                        body.length >
                        1_000_000
                    ) {

                        reject(
                            new Error(
                                "Request body too large."
                            )
                        );

                        req.destroy();
                    }
                }
            );


            req.on(
                "end",
                () => {

                    if (!body) {

                        resolve({});

                        return;
                    }

                    try {

                        resolve(
                            JSON.parse(body)
                        );

                    } catch (error) {

                        reject(
                            new Error(
                                "Invalid JSON request."
                            )
                        );
                    }
                }
            );


            req.on(
                "error",
                reject
            );
        }
    );
}


// =====================================================
// GEMINI SOLVER
// =====================================================

async function solveWithGemini(problem) {

    if (
        GEMINI_KEYS.length === 0
    ) {

        throw new Error(
            "No Gemini API keys configured."
        );
    }


    const prompt = `

You are an expert educational problem solver.

Solve the following problem accurately.

The problem may be from:

1. Mathematics
2. Physics
3. Chemistry
4. Electronics
5. Computer Science

Give a clear educational solution.

Return the response using EXACTLY these sections:

FINAL ANSWER:
SUBJECT:
TOPIC:
GIVEN:
REQUIRED:
FORMULA:
EQUATION:
STEPS:
CALCULATION:
CHECK:
WARNING:

Important rules:

- Give the actual final numerical or textual answer.
- Do not leave FINAL ANSWER empty.
- Show the important formulas.
- Show the equation when applicable.
- Give clear numbered steps.
- Include units where appropriate.
- For mathematics, show calculations.
- For physics, include SI units.
- For chemistry, show balanced equations when relevant.
- For electronics, show relevant electrical formulas.
- For computer science, explain the logic clearly.
- If information is missing, state the assumption in WARNING.
- Do not refuse a normal educational question.

Problem:

${problem}

`;


    let lastError = null;


    // Try every configured API key
    for (
        let attempt = 0;
        attempt < GEMINI_KEYS.length;
        attempt++
    ) {

        const key =
            getNextApiKey();


        console.log(
            `Trying Gemini key ${attempt + 1}/${GEMINI_KEYS.length}`
        );


        try {

            const result =
                await callGeminiModel(
                    GEMINI_MODEL,
                    key,
                    prompt
                );


            if (
                result &&
                result.answer
            ) {

                return result;
            }


            console.log(
                "Primary model returned no usable answer."
            );


            // Try fallback model
            const fallback =
                await callGeminiModel(
                    GEMINI_FALLBACK_MODEL,
                    key,
                    prompt
                );


            if (
                fallback &&
                fallback.answer
            ) {

                return fallback;
            }


            lastError =
                new Error(
                    "Gemini returned no usable answer."
                );


        } catch (error) {

            console.error(
                "Gemini error:",
                error.message
            );

            lastError =
                error;
        }
    }


    throw (
        lastError ||
        new Error(
            "All Gemini API attempts failed."
        )
    );
}


// =====================================================
// CALL GEMINI MODEL
// =====================================================

async function callGeminiModel(
    model,
    key,
    prompt
) {

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            20000
        );


    try {

        const response =
            await fetch(
                url,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            contents: [

                                {
                                    role: "user",

                                    parts: [
                                        {
                                            text: prompt
                                        }
                                    ]
                                }

                            ],

                            generationConfig: {

                                temperature: 0.1,

                                maxOutputTokens:
                                    4096
                            }
                        }),

                    signal:
                        controller.signal
                }
            );


        console.log(
            "Gemini HTTP:",
            response.status
        );


        const data =
            await response.json();


        if (!response.ok) {

            const message =
                data?.error?.message ||
                `Gemini HTTP ${response.status}`;

            throw new Error(
                message
            );
        }


        const text =
            data
                ?.candidates?.[0]
                ?.content?.parts
                ?.map(
                    part =>
                        part.text || ""
                )
                .join("")
                .trim();


        console.log(
            "Gemini final text:",
            text
        );


        if (!text) {

            throw new Error(
                "Gemini returned an empty response."
            );
        }


        return parseGeminiResponse(
            text
        );

    } finally {

        clearTimeout(timeout);
    }
}


// =====================================================
// PARSE GEMINI RESPONSE
// =====================================================

function parseGeminiResponse(text) {

    const result = {

        subject:
            "General",

        topic:
            "",

        answer:
            "",

        formula:
            "",

        equation:
            "",

        given:
            [],

        required:
            "",

        assumptions:
            [],

        steps:
            [],

        calculation:
            "",

        checks:
            [],

        warning:
            ""
    };


    const sections = [

        "FINAL ANSWER",
        "SUBJECT",
        "TOPIC",
        "GIVEN",
        "REQUIRED",
        "FORMULA",
        "EQUATION",
        "STEPS",
        "CALCULATION",
        "CHECK",
        "WARNING"
    ];


    function getSection(
        sectionName
    ) {

        const start =
            text.search(
                new RegExp(
                    "^\\s*" +
                    escapeRegExp(
                        sectionName
                    ) +
                    "\\s*:\\s*",
                    "im"
                )
            );


        if (start === -1) {
            return "";
        }


        const afterStart =
            text.slice(start);


        const lines =
            afterStart.split(
                /\r?\n/
            );


        // Remove current heading
        lines.shift();


        const output = [];


        for (
            const line of lines
        ) {

            const trimmed =
                line.trim();


            let isNextSection =
                false;


            for (
                const section of sections
            ) {

                if (
                    section ===
                    sectionName
                ) {
                    continue;
                }


                const sectionRegex =
                    new RegExp(
                        "^" +
                        escapeRegExp(
                            section
                        ) +
                        "\\s*:",
                        "i"
                    );


                if (
                    sectionRegex.test(
                        trimmed
                    )
                ) {

                    isNextSection =
                        true;

                    break;
                }
            }


            if (
                isNextSection
            ) {
                break;
            }


            output.push(line);
        }


        return output
            .join("\n")
            .trim();
    }


    // ==========================================
    // MAIN FIELDS
    // ==========================================

    result.answer =
        getSection(
            "FINAL ANSWER"
        );


    result.subject =
        getSection(
            "SUBJECT"
        ) ||
        "General";


    result.topic =
        getSection(
            "TOPIC"
        );


    result.formula =
        getSection(
            "FORMULA"
        );


    result.equation =
        getSection(
            "EQUATION"
        );


    result.required =
        getSection(
            "REQUIRED"
        );


    result.calculation =
        getSection(
            "CALCULATION"
        );


    result.warning =
        getSection(
            "WARNING"
        );


    // ==========================================
    // GIVEN
    // ==========================================

    const given =
        getSection(
            "GIVEN"
        );


    if (given) {

        result.given =
            given
                .split(/\r?\n/)
                .map(
                    line =>
                        line
                            .replace(
                                /^\s*(?:[-*]|\d+[.)])\s*/,
                                ""
                            )
                            .trim()
                )
                .filter(Boolean);
    }


    // ==========================================
    // STEPS
    // ==========================================

    const steps =
        getSection(
            "STEPS"
        );


    if (steps) {

        result.steps =
            steps
                .split(/\r?\n/)
                .map(
                    line =>
                        line
                            .replace(
                                /^\s*\d+[.)]\s*/,
                                ""
                            )
                            .replace(
                                /^\s*[-*]\s*/,
                                ""
                            )
                            .trim()
                )
                .filter(Boolean);
    }


    // ==========================================
    // CHECK
    // ==========================================

    const check =
        getSection(
            "CHECK"
        );


    if (check) {

        result.checks =
            check
                .split(/\r?\n/)
                .map(
                    line =>
                        line
                            .replace(
                                /^\s*(?:[-*]|\d+[.)])\s*/,
                                ""
                            )
                            .trim()
                )
                .filter(Boolean);
    }


    // ==========================================
    // FALLBACK ANSWER
    // ==========================================

    if (
        !result.answer
    ) {

        const fallback =
            text.match(
                /(?:FINAL RESULT|ANSWER|FINAL)\s*:\s*(.+)/i
            );


        if (fallback) {

            result.answer =
                fallback[1].trim();
        }
    }


    // ==========================================
    // FINAL SAFETY FALLBACK
    // ==========================================

    if (
        !result.answer
    ) {

        result.answer =
            "Gemini returned a solution, but the final answer could not be extracted.";
    }


    return result;
}


// =====================================================
// ESCAPE REGULAR EXPRESSION
// =====================================================

function escapeRegExp(text) {

    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


// =====================================================
// HEALTH API
// =====================================================

function healthResponse() {

    return {

        status:
            "ok",

        gemini:
            GEMINI_KEYS.length > 0
                ? "configured"
                : "not configured",

        keys:
            GEMINI_KEYS.length,

        model:
            GEMINI_MODEL,

        fallbackModel:
            GEMINI_FALLBACK_MODEL
    };
}


// =====================================================
// STATIC FILE SERVER
// =====================================================

function serveStatic(
    req,
    res,
    pathname
) {

    let requestedPath =
        pathname;


    if (
        requestedPath === "/"
    ) {

        requestedPath =
            "/index.html";
    }


    let filePath =
        path.join(
            ROOT,
            requestedPath
        );


    // Prevent path traversal
    const normalizedRoot =
        path.resolve(ROOT) +
        path.sep;

    const normalizedFile =
        path.resolve(filePath);


    if (
        !normalizedFile.startsWith(
            normalizedRoot
        )
    ) {

        res.writeHead(
            403
        );

        res.end(
            "Forbidden"
        );

        return;
    }


    fs.stat(
        filePath,
        (error, stats) => {

            if (
                error ||
                !stats.isFile()
            ) {

                // SPA fallback
                filePath =
                    path.join(
                        ROOT,
                        "index.html"
                    );
            }


            fs.readFile(
                filePath,
                (readError, data) => {

                    if (readError) {

                        res.writeHead(
                            404,
                            {
                                "Content-Type":
                                    "text/plain"
                            }
                        );

                        res.end(
                            "File not found"
                        );

                        return;
                    }


                    const ext =
                        path.extname(
                            filePath
                        ).toLowerCase();


                    const contentType =
                        MIME_TYPES[ext] ||
                        "application/octet-stream";


                    res.writeHead(
                        200,
                        {
                            "Content-Type":
                                contentType,

                            "Cache-Control":
                                "no-cache"
                        }
                    );


                    res.end(data);
                }
            );
        }
    );
}


// =====================================================
// SERVER
// =====================================================

const server =
    http.createServer(
        async (req, res) => {

            try {

                const parsedUrl =
                    new URL(
                        req.url,
                        `http://${req.headers.host || "localhost"}`
                    );


                const pathname =
                    parsedUrl.pathname;


                // ==================================
                // HEALTH
                // ==================================

                if (
                    pathname ===
                    "/api/health"
                ) {

                    return sendJson(
                        res,
                        200,
                        healthResponse()
                    );
                }


                // ==================================
                // SOLVE
                // ==================================

                if (
                    pathname ===
                    "/api/solve" &&
                    req.method === "POST"
                ) {

                    console.log(
                        "\n========= SOLVE REQUEST =========="
                    );


                    const body =
                        await readBody(req);


                    console.log(
                        "Received body:",
                        body
                    );


                    // Accept both old and new frontend names
                    const problem =
                        String(
                            body.problem ||
                            body.question ||
                            ""
                        ).trim();


                    console.log(
                        "Problem:",
                        problem
                    );


                    if (!problem) {

                        return sendJson(
                            res,
                            400,
                            {
                                success:
                                    false,

                                error:
                                    "Please enter a problem."
                            }
                        );
                    }


                    const result =
                        await solveWithGemini(
                            problem
                        );


                    console.log(
                        "Final result:",
                        result
                    );


                    // ==================================
                    // IMPORTANT RESPONSE STRUCTURE
                    // ==================================

                    return sendJson(
                        res,
                        200,
                        {

                            success:
                                true,

                            result: {

                                subject:
                                    result.subject ||
                                    "General",

                                topic:
                                    result.topic ||
                                    "Problem Solving",

                                answer:
                                    result.answer ||
                                    "",

                                formula:
                                    result.formula ||
                                    "",

                                equation:
                                    result.equation ||
                                    "",

                                given:
                                    result.given ||
                                    [],

                                required:
                                    result.required ||
                                    "",

                                assumptions:
                                    result.assumptions ||
                                    [],

                                steps:
                                    Array.isArray(
                                        result.steps
                                    )
                                        ? result.steps
                                        : [],

                                calculation:
                                    result.calculation ||
                                    "",

                                checks:
                                    result.checks ||
                                    [],

                                warning:
                                    result.warning ||
                                    ""
                            }
                        }
                    );
                }


                // ==================================
                // STATIC FILES
                // ==================================

                serveStatic(
                    req,
                    res,
                    pathname
                );

            } catch (error) {

                console.error(
                    "SERVER ERROR:",
                    error
                );


                if (
                    !res.headersSent
                ) {

                    sendJson(
                        res,
                        500,
                        {

                            success:
                                false,

                            error:
                                error.message ||
                                "Internal server error."
                        }
                    );
                }
            }
        }
    );


// =====================================================
// START SERVER
// =====================================================

server.listen(
    PORT,
    () => {

        console.log(
            "\n================================="
        );

        console.log(
            "   CALCULATOR STUDIO SERVER"
        );

        console.log(
            "================================="
        );

        console.log(
            `Website: http://localhost:${PORT}`
        );

        console.log(
            `Gemini model: ${GEMINI_MODEL}`
        );

        console.log(
            `Gemini fallback: ${GEMINI_FALLBACK_MODEL}`
        );

        console.log(
            `Gemini API: ${
                GEMINI_KEYS.length > 0
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
            }`
        );

        console.log(
            `Gemini API keys loaded: ${GEMINI_KEYS.length}`
        );

        console.log(
            "=================================\n"
        );
    }
);
