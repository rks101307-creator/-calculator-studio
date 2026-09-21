const http = require("http");
const fs = require("fs");
const path = require("path");

// =====================================================
// CONFIG
// =====================================================

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

const GEMINI_MODEL =
    process.env.GEMINI_MODEL || "gemini-3.6-flash";

const GEMINI_FALLBACK_MODEL =
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash-lite";

// =====================================================
// LOAD .ENV
// =====================================================

function loadEnvFile() {

    const envPath =
        path.join(ROOT, ".env");

    if (!fs.existsSync(envPath)) {
        console.log(".env file not found.");
        return;
    }

    const content =
        fs.readFileSync(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {

        const trimmed = line.trim();

        if (!trimmed ||
            trimmed.startsWith("#")) {
            continue;
        }

        const index =
            trimmed.indexOf("=");

        if (index === -1) {
            continue;
        }

        const key =
            trimmed.slice(0, index).trim();

        let value =
            trimmed.slice(index + 1).trim();

        if (
            (value.startsWith('"') &&
                value.endsWith('"')) ||

            (value.startsWith("'") &&
                value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    }
}

loadEnvFile();

// =====================================================
// GEMINI KEYS
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
// JSON RESPONSE
// =====================================================

function sendJson(res, status, data) {

    const output =
        JSON.stringify(data);

    res.writeHead(status, {
        "Content-Type":
            "application/json; charset=utf-8",

        "Access-Control-Allow-Origin": "*",

        "Access-Control-Allow-Headers":
            "Content-Type",

        "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS"
    });

    res.end(output);
}

// =====================================================
// READ REQUEST BODY
// =====================================================

function readBody(req) {

    return new Promise((resolve, reject) => {

        let body = "";

        req.on("data", chunk => {

            body += chunk.toString();

            if (body.length > 2000000) {

                reject(
                    new Error(
                        "Request body is too large."
                    )
                );

                req.destroy();
            }
        });

        req.on("end", () => {

            if (!body.trim()) {
                resolve({});
                return;
            }

            try {

                resolve(
                    JSON.parse(body)
                );

            } catch (error) {

                console.log(
                    "INVALID JSON RECEIVED:",
                    body
                );

                reject(
                    new Error(
                        "Invalid JSON request."
                    )
                );
            }
        });

        req.on("error", error => {
            reject(error);
        });
    });
}

// =====================================================
// GET NEXT API KEY
// =====================================================

function getNextApiKey() {

    if (GEMINI_KEYS.length === 0) {

        throw new Error(
            "No Gemini API keys configured."
        );
    }

    const key =
        GEMINI_KEYS[currentKeyIndex];

    currentKeyIndex =
        (currentKeyIndex + 1) %
        GEMINI_KEYS.length;

    return key;
}

// =====================================================
// GEMINI SOLVER
// =====================================================

async function solveWithGemini(problem) {

    if (GEMINI_KEYS.length === 0) {
        throw new Error(
            "Gemini API keys are missing."
        );
    }

    const prompt = `
You are an expert teacher and problem solver.

Solve this problem:

${problem}

Give a clear educational solution.

Your response MUST contain:

FINAL ANSWER:
The direct final answer.

SUBJECT:
The subject.

TOPIC:
The topic.

GIVEN:
List the given information.

REQUIRED:
What needs to be found.

FORMULA:
The formula used, if applicable.

EQUATION:
The equation used, if applicable.

STEPS:
1. First step
2. Second step
3. Third step

CALCULATION:
Show the calculation.

Keep the solution concise and accurate.
`;

    let lastError = null;

    for (
        let i = 0;
        i < GEMINI_KEYS.length;
        i++
    ) {

        const apiKey =
            getNextApiKey();

        console.log(
            `Trying Gemini key ${i + 1}/${GEMINI_KEYS.length}`
        );

        const controller =
            new AbortController();

        const timeout =
            setTimeout(() => {
                controller.abort();
            }, 20000);

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                GEMINI_MODEL +
                ":generateContent?key=" +
                encodeURIComponent(apiKey);

            const response =
                await fetch(url, {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    signal: controller.signal,

                    body: JSON.stringify({

                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ],

                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 1500
                        }
                    })
                });

            clearTimeout(timeout);

            const raw =
                await response.text();

            console.log(
                "Gemini HTTP:",
                response.status
            );

            if (!response.ok) {

                throw new Error(
                    `Gemini API error ${response.status}: ${raw}`
                );
            }

            let data;

            try {

                data =
                    JSON.parse(raw);

            } catch {

                throw new Error(
                    "Gemini returned invalid API data."
                );
            }

            const answer =
                data
                    ?.candidates?.[0]
                    ?.content?.parts
                    ?.map(part => part.text || "")
                    ?.join("\n")
                    ?.trim();

            if (!answer) {

                throw new Error(
                    "Gemini returned an empty answer."
                );
            }

            console.log(
                "Gemini final text:",
                answer
            );

            // -----------------------------------------
            // Extract sections from normal text
            // -----------------------------------------

            const getSection =
                (name, nextNames = []) => {

                    let pattern =
                        `${name}:`;

                    let start =
                        answer
                            .toUpperCase()
                            .indexOf(
                                pattern.toUpperCase()
                            );

                    if (start === -1) {
                        return "";
                    }

                    start += pattern.length;

                    let end =
                        answer.length;

                    for (
                        const next of nextNames
                    ) {

                        const position =
                            answer
                                .toUpperCase()
                                .indexOf(
                                    `${next}:`.toUpperCase(),
                                    start
                                );

                        if (
                            position !== -1 &&
                            position < end
                        ) {
                            end = position;
                        }
                    }

                    return answer
                        .substring(start, end)
                        .trim();
                };

            const finalAnswer =
                getSection(
                    "FINAL ANSWER",
                    [
                        "SUBJECT",
                        "TOPIC",
                        "GIVEN",
                        "REQUIRED",
                        "FORMULA",
                        "EQUATION",
                        "STEPS",
                        "CALCULATION"
                    ]
                );

            const subject =
                getSection(
                    "SUBJECT",
                    [
                        "TOPIC",
                        "GIVEN",
                        "REQUIRED",
                        "FORMULA",
                        "EQUATION",
                        "STEPS",
                        "CALCULATION"
                    ]
                );

            const topic =
                getSection(
                    "TOPIC",
                    [
                        "GIVEN",
                        "REQUIRED",
                        "FORMULA",
                        "EQUATION",
                        "STEPS",
                        "CALCULATION"
                    ]
                );

            const given =
                getSection(
                    "GIVEN",
                    [
                        "REQUIRED",
                        "FORMULA",
                        "EQUATION",
                        "STEPS",
                        "CALCULATION"
                    ]
                );

            const required =
                getSection(
                    "REQUIRED",
                    [
                        "FORMULA",
                        "EQUATION",
                        "STEPS",
                        "CALCULATION"
                    ]
                );

            const formula =
                getSection(
                    "FORMULA",
                    [
                        "EQUATION",
                        "STEPS",
                        "CALCULATION"
                    ]
                );

            const equation =
                getSection(
                    "EQUATION",
                    [
                        "STEPS",
                        "CALCULATION"
                    ]
                );

            const stepsText =
                getSection(
                    "STEPS",
                    [
                        "CALCULATION"
                    ]
                );

            const calculation =
                getSection(
                    "CALCULATION"
                );

            // -----------------------------------------
            // Convert steps into array
            // -----------------------------------------

            let steps = [];

            if (stepsText) {

                steps =
                    stepsText
                        .split(/\n/)
                        .map(line =>
                            line
                                .replace(
                                    /^\s*[-•*]\s*/,
                                    ""
                                )
                                .replace(
                                    /^\s*\d+[\.\)]\s*/,
                                    ""
                                )
                                .trim()
                        )
                        .filter(Boolean);
            }

            // -----------------------------------------
            // FALLBACK
            // -----------------------------------------

            const safeAnswer =
                finalAnswer ||
                calculation ||
                answer;

            return {

                subject:
                    subject || "General",

                topic:
                    topic || "Problem Solving",

                answer:
                    safeAnswer,

                formula:
                    formula || "",

                equation:
                    equation || "",

                given:
                    given
                        ? given
                            .split(/\n/)
                            .map(x => x.trim())
                            .filter(Boolean)
                        : [],

                required:
                    required || "",

                assumptions: [],

                steps:
                    steps.length
                        ? steps
                        : [
                            answer
                        ],

                calculation:
                    calculation || answer,

                checks: [],

                warning: ""
            };

        } catch (error) {

            clearTimeout(timeout);

            lastError =
                error;

            console.error(
                `Gemini key ${i + 1} failed:`,
                error.message
            );

            continue;
        }
    }

    throw new Error(
        lastError?.message ||
        "All Gemini API keys failed."
    );
}
// =====================================================
// SOLVE API
// =====================================================

async function handleSolve(req, res) {

    try {

        console.log("");
        console.log(
            "========== SOLVE REQUEST =========="
        );

        const body =
            await readBody(req);

        console.log(
            "Received body:",
            body
        );

        // Accept BOTH names
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
                    success: false,
                    error:
                        "Please enter a problem."
                }
            );
        }

        const result =
            await solveWithGemini(problem);

        console.log(
            "Final result:",
            result
        );

        return sendJson(
            res,
            200,
            {
                success: true,
                result: result
            }
        );

    } catch (error) {

        console.error(
            "SOLVE ERROR:",
            error
        );

        return sendJson(
            res,
            500,
            {
                success: false,
                error:
                    error.message ||
                    "Server error."
            }
        );
    }
}

// =====================================================
// STATIC FILES
// =====================================================

function sendFile(
    res,
    filePath,
    contentType
) {

    if (!fs.existsSync(filePath)) {

        sendJson(
            res,
            404,
            {
                error:
                    "File not found."
            }
        );

        return;
    }

    res.writeHead(
        200,
        {
            "Content-Type":
                contentType
        }
    );

    fs.createReadStream(
        filePath
    ).pipe(res);
}

// =====================================================
// SERVER
// =====================================================

const server =
    http.createServer(
        async (req, res) => {

            // -----------------------------
            // OPTIONS
            // -----------------------------

            if (req.method === "OPTIONS") {

                res.writeHead(
                    204,
                    {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type",
                        "Access-Control-Allow-Methods":
                            "GET, POST, OPTIONS"
                    }
                );

                res.end();

                return;
            }

            // -----------------------------
            // HEALTH
            // -----------------------------

            if (
                req.method === "GET" &&
                req.url === "/api/health"
            ) {

                return sendJson(
                    res,
                    200,
                    {
                        status: "ok",

                        gemini:
                            GEMINI_KEYS.length
                                ? "configured"
                                : "missing",

                        keys:
                            GEMINI_KEYS.length,

                        model:
                            GEMINI_MODEL
                    }
                );
            }

            // -----------------------------
            // SOLVE
            // -----------------------------

            if (
                req.method === "POST" &&
                req.url === "/api/solve"
            ) {

                return handleSolve(
                    req,
                    res
                );
            }

            // -----------------------------
            // STATIC WEBSITE
            // -----------------------------

            let requestPath =
                req.url.split("?")[0];

            if (requestPath === "/") {
                requestPath =
                    "/index.html";
            }

            const filePath =
                path.join(
                    ROOT,
                    decodeURIComponent(
                        requestPath
                    )
                );

            if (
                !filePath.startsWith(ROOT)
            ) {

                return sendJson(
                    res,
                    403,
                    {
                        error: "Forbidden"
                    }
                );
            }

            const ext =
                path.extname(
                    filePath
                ).toLowerCase();

            const types = {

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

            sendFile(
                res,
                filePath,
                types[ext] ||
                    "application/octet-stream"
            );
        }
    );

// =====================================================
// START
// =====================================================

server.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "======================================"
        );
        console.log(
            "       CALCULATOR STUDIO SERVER"
        );
        console.log(
            "======================================"
        );

        console.log(
            `Website: http://localhost:${PORT}`
        );

        console.log(
            `Gemini model: ${GEMINI_MODEL}`
        );

        console.log(
            `Gemini API: ${
                GEMINI_KEYS.length
                    ? "CONFIGURED"
                    : "MISSING"
            }`
        );

        console.log(
            `Gemini API keys loaded: ${GEMINI_KEYS.length}`
        );

        console.log(
            "======================================"
        );

        console.log("");
    }
);
