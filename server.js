const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

/* =========================================================
   LOAD .ENV
========================================================= */

function loadEnvFile() {
    const envPath = path.join(ROOT, ".env");

    if (!fs.existsSync(envPath)) {
        console.log("WARNING: .env file not found.");
        return;
    }

    const content = fs.readFileSync(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const equalIndex = trimmed.indexOf("=");

        if (equalIndex === -1) {
            continue;
        }

        const key = trimmed
            .slice(0, equalIndex)
            .trim();

        let value = trimmed
            .slice(equalIndex + 1)
            .trim();

        value = value.replace(/^["']|["']$/g, "");

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

loadEnvFile();

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = Number(
    process.env.PORT || 3000
);

/* =========================================================
   SIX GEMINI API KEYS
========================================================= */

const GEMINI_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6
].filter(Boolean);

/* =========================================================
   GEMINI MODEL
========================================================= */

const GEMINI_MODEL =
    process.env.GEMINI_MODEL ||
    process.env.GOOGLE_MODEL ||
    "gemini-3.6-flash";

const GEMINI_FALLBACK_MODEL =
    process.env.GEMINI_FALLBACK_MODEL ||
    "gemini-3.6-flash-lite";

/* =========================================================
   KEY ROTATION
========================================================= */

let currentKeyIndex = 0;

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

/* =========================================================
   MIME TYPES
========================================================= */

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

    ".gif":
        "image/gif",

    ".svg":
        "image/svg+xml",

    ".ico":
        "image/x-icon",

    ".webp":
        "image/webp"
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function sendJson(
    res,
    statusCode,
    data
) {

    const body =
        JSON.stringify(data);

    res.writeHead(
        statusCode,
        {
            "Content-Type":
                "application/json; charset=utf-8",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Headers":
                "Content-Type",

            "Access-Control-Allow-Methods":
                "GET, POST, OPTIONS",

            "Cache-Control":
                "no-store"
        }
    );

    res.end(body);
}

function sendText(
    res,
    statusCode,
    text,
    contentType = "text/plain"
) {

    res.writeHead(
        statusCode,
        {
            "Content-Type":
                `${contentType}; charset=utf-8`,

            "Access-Control-Allow-Origin":
                "*"
        }
    );

    res.end(text);
}

/* =========================================================
   SAFE STATIC FILE PATH
========================================================= */

function getSafeFilePath(
    requestUrl
) {

    const cleanUrl =
        requestUrl.split("?")[0];

    let requestedPath =
        cleanUrl === "" ||
        cleanUrl === "/"
            ? "/index.html"
            : cleanUrl;

    try {

        requestedPath =
            decodeURIComponent(
                requestedPath
            );

    } catch {

        return null;
    }

    const filePath =
        path.resolve(
            ROOT,
            "." + requestedPath
        );

    const relativePath =
        path.relative(
            ROOT,
            filePath
        );

    if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath)
    ) {

        return null;
    }

    return filePath;
}

/* =========================================================
   READ REQUEST BODY
========================================================= */

function readRequestBody(
    req,
    maxSize = 1024 * 1024
) {

    return new Promise(
        (resolve, reject) => {

            let body = "";
            let size = 0;

            req.on(
                "data",
                chunk => {

                    size +=
                        chunk.length;

                    if (size > maxSize) {

                        reject(
                            new Error(
                                "Request body is too large."
                            )
                        );

                        req.destroy();

                        return;
                    }

                    body +=
                        chunk.toString();
                }
            );

            req.on(
                "end",
                () => resolve(body)
            );

            req.on(
                "error",
                reject
            );
        }
    );
}

/* =========================================================
   WAIT
========================================================= */

function wait(ms) {

    return new Promise(
        resolve => {
            setTimeout(
                resolve,
                ms
            );
        }
    );
}

/* =========================================================
   GEMINI REQUEST WITH RETRY
========================================================= */

async function fetchGeminiWithRetry(
    url,
    options,
    maxRetries = 2
) {

    let lastError = null;

    for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
    ) {

        try {

            const response =
                await fetch(
                    url,
                    options
                );

            if (response.ok) {
                return response;
            }

            const errorText =
                await response.text();

            lastError =
                new Error(
                    errorText ||
                    `Gemini returned HTTP ${response.status}`
                );

            const lowerError =
                errorText.toLowerCase();

            const temporaryError =
                response.status === 429 ||
                response.status === 500 ||
                response.status === 502 ||
                response.status === 503 ||
                response.status === 504 ||
                lowerError.includes(
                    "high demand"
                ) ||
                lowerError.includes(
                    "temporarily"
                ) ||
                lowerError.includes(
                    "overloaded"
                ) ||
                lowerError.includes(
                    "unavailable"
                );

            console.log(
                `Gemini attempt ${
                    attempt + 1
                }/${maxRetries + 1}: HTTP ${
                    response.status
                }`
            );

            if (
                !temporaryError ||
                attempt === maxRetries
            ) {

                break;
            }

            const delay =
                2000 *
                Math.pow(
                    2,
                    attempt
                );

            console.log(
                `Retrying in ${
                    delay / 1000
                } seconds...`
            );

            await wait(delay);

        } catch (error) {

            lastError = error;

            if (
                attempt === maxRetries
            ) {

                break;
            }

            const delay =
                2000 *
                Math.pow(
                    2,
                    attempt
                );

            console.log(
                `Network error. Retrying in ${
                    delay / 1000
                } seconds...`
            );

            await wait(delay);
        }
    }

    throw (
        lastError ||
        new Error(
            "Gemini request failed."
        )
    );
}

/* =========================================================
   GEMINI SOLVER
========================================================= */

async function solveWithGemini(
    problem
) {

    if (GEMINI_KEYS.length === 0) {

        throw new Error(
            "Gemini API key is not configured on the server."
        );
    }

    const systemInstruction = `
You are Calculator Studio AI, an advanced educational problem-solving assistant.

Solve questions from:

- Mathematics
- Physics
- Chemistry
- Electronics
- Computer Science

Read the user's problem carefully.

Give a correct, structured solution.

Requirements:

1. Identify the subject and topic.
2. Extract the given values.
3. Identify what is required.
4. State useful formulas.
5. Show equations.
6. Solve step by step.
7. Keep units consistent.
8. Explain assumptions when necessary.
9. Perform a final check when possible.
10. Give a clear final answer.

For programming questions:
- Explain the logic.
- Provide corrected code when appropriate.
- Explain important lines.

For electronics:
- Identify voltage, current, resistance, components, connections and formulas when applicable.

Do not invent missing values.
If important information is missing, clearly state the assumption or ask for the missing information.

Return ONLY valid JSON matching the requested schema.
`;

    const userPrompt = `
Solve this problem:

${problem}
`;

    const requestBody = {

        systemInstruction: {

            parts: [
                {
                    text:
                        systemInstruction
                }
            ]
        },

        contents: [

            {
                role: "user",

                parts: [
                    {
                        text:
                            userPrompt
                    }
                ]
            }

        ],

        generationConfig: {

            temperature: 0.2,

            responseMimeType:
                "application/json",

            responseSchema: {

                type: "object",

                properties: {

                    subject: {
                        type: "string"
                    },

                    topic: {
                        type: "string"
                    },

                    answer: {
                        type: "string"
                    },

                    formula: {
                        type: "string"
                    },

                    equation: {
                        type: "string"
                    },

                    given: {

                        type: "array",

                        items: {
                            type: "string"
                        }
                    },

                    required: {

                        type: "array",

                        items: {
                            type: "string"
                        }
                    },

                    assumptions: {

                        type: "array",

                        items: {
                            type: "string"
                        }
                    },

                    steps: {

                        type: "array",

                        items: {
                            type: "string"
                        }
                    },

                    calculation: {
                        type: "string"
                    },

                    checks: {

                        type: "array",

                        items: {
                            type: "string"
                        }
                    },

                    warning: {
                        type: "string"
                    }
                },

                required: [

                    "subject",

                    "topic",

                    "answer",

                    "formula",

                    "equation",

                    "given",

                    "required",

                    "assumptions",

                    "steps",

                    "calculation",

                    "checks",

                    "warning"

                ]
            }
        }
    };

    let lastError = null;

    /* =====================================================
       TRY ALL SIX API KEYS
    ===================================================== */

    for (
        let i = 0;
        i < GEMINI_KEYS.length;
        i++
    ) {

        const apiKey =
            getNextApiKey();

        console.log(
            `Trying Gemini API key ${
                i + 1
            }/${GEMINI_KEYS.length}`
        );

        const endpoint =
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
                GEMINI_MODEL
            )}:generateContent?key=${encodeURIComponent(
                apiKey
            )}`;

        try {

            const response =
                await fetchGeminiWithRetry(

                    endpoint,

                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                requestBody
                            )
                    },

                    1
                );

            const data =
                await response.json();

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

            if (!text) {

                console.error(
                    "Unexpected Gemini response:",
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );

                throw new Error(
                    "Gemini returned an empty response."
                );
            }

            let result;

            try {

                result =
                    JSON.parse(text);

            } catch {

                console.error(
                    "Gemini returned invalid JSON:",
                    text
                );

                throw new Error(
                    "Gemini returned an invalid solution format."
                );
            }

            console.log(
                `Gemini request successful using API key ${
                    i + 1
                }`
            );

            return result;

        } catch (error) {

            lastError =
                error;

            const message =
                error?.message || "";

            const lower =
                message.toLowerCase();

            const keyError =
                lower.includes("429") ||
                lower.includes("quota") ||
                lower.includes("rate limit") ||
                lower.includes("401") ||
                lower.includes("403") ||
                lower.includes("api key");

            if (keyError) {

                console.log(
                    `API key ${
                        i + 1
                    } failed. Trying next key...`
                );

                continue;
            }

            throw error;
        }
    }

    throw (
        lastError ||
        new Error(
            "All Gemini API keys failed."
        )
    );
}

/* =========================================================
   API: SOLVE
========================================================= */

async function handleSolve(
    req,
    res
) {

    try {

        const body =
            await readRequestBody(req);

        let data;

        try {

            data =
                JSON.parse(body);

        } catch {

            return sendJson(
                res,
                400,
                {
                    error:
                        "Invalid JSON request."
                }
            );
        }

        const problem =
            typeof data.problem === "string"
                ? data.problem.trim()
                : "";

        if (!problem) {

            return sendJson(
                res,
                400,
                {
                    error:
                        "Please enter a problem."
                }
            );
        }

        if (
            problem.length > 20000
        ) {

            return sendJson(
                res,
                400,
                {
                    error:
                        "Problem is too long."
                }
            );
        }

        console.log(
            `AI request received (${
                problem.length
            } characters)`
        );

        const result =
            await solveWithGemini(
                problem
            );

        return sendJson(
            res,
            200,
            result
        );

    } catch (error) {

        console.error(
            "Solve error:",
            error.message
        );

        const message =
            error.message || "";

        const lower =
            message.toLowerCase();

        let userMessage =
            "Unable to solve the problem right now.";

        if (
            lower.includes(
                "high demand"
            ) ||
            lower.includes(
                "overloaded"
            ) ||
            lower.includes(
                "503"
            ) ||
            lower.includes(
                "temporarily"
            )
        ) {

            userMessage =
                "Gemini is temporarily experiencing high demand. Please try again in a few seconds.";
        }

        else if (
            lower.includes("429") ||
            lower.includes("quota") ||
            lower.includes("rate")
        ) {

            userMessage =
                "Gemini API rate limit or quota was reached on the configured keys.";
        }

        else if (
            lower.includes(
                "api key"
            ) ||
            lower.includes(
                "401"
            ) ||
            lower.includes(
                "403"
            )
        ) {

            userMessage =
                "Gemini API authentication failed. Check your API keys in the .env file.";
        }

        else if (
            lower.includes("404") ||
            lower.includes("not found")
        ) {

            userMessage =
                `The Gemini model "${GEMINI_MODEL}" was not found or is unavailable for the configured API key.`;
        }

        else if (
            lower.includes(
                "invalid json"
            )
        ) {

            userMessage =
                "Gemini returned an unexpected response. Please try the problem again.";
        }

        return sendJson(
            res,
            500,
            {
                error:
                    userMessage
            }
        );
    }
}

/* =========================================================
   STATIC FILE SERVER
========================================================= */

function serveStatic(
    req,
    res
) {

    const filePath =
        getSafeFilePath(
            req.url
        );

    if (!filePath) {

        return sendJson(
            res,
            400,
            {
                error:
                    "Invalid file path."
            }
        );
    }

    if (
        !fs.existsSync(filePath)
    ) {

        return sendJson(
            res,
            404,
            {
                error:
                    "File not found."
            }
        );
    }

    const stat =
        fs.statSync(filePath);

    if (!stat.isFile()) {

        return sendJson(
            res,
            404,
            {
                error:
                    "File not found."
            }
        );
    }

    const extension =
        path.extname(
            filePath
        ).toLowerCase();

    const contentType =
        MIME_TYPES[extension] ||
        "application/octet-stream";

    res.writeHead(
        200,
        {
            "Content-Type":
                contentType,

            "Cache-Control":
                extension === ".html"
                    ? "no-cache"
                    : "public, max-age=3600"
        }
    );

    fs.createReadStream(
        filePath
    ).pipe(res);
}

/* =========================================================
   SERVER
========================================================= */

const server =
    http.createServer(
        async (req, res) => {

            res.setHeader(
                "Access-Control-Allow-Origin",
                "*"
            );

            res.setHeader(
                "Access-Control-Allow-Headers",
                "Content-Type"
            );

            res.setHeader(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS"
            );

            /* ---------------------------------------------
               OPTIONS
            --------------------------------------------- */

            if (
                req.method === "OPTIONS"
            ) {

                res.writeHead(204);

                return res.end();
            }

            const url =
                req.url.split("?")[0];

            /* ---------------------------------------------
               HEALTH CHECK
            --------------------------------------------- */

            if (
                req.method === "GET" &&
                url === "/api/health"
            ) {

                return sendJson(
                    res,
                    200,
                    {
                        status: "ok",

                        gemini:
                            GEMINI_KEYS.length > 0
                                ? "configured"
                                : "missing",

                        keys:
                            GEMINI_KEYS.length,

                        model:
                            GEMINI_MODEL
                    }
                );
            }

            /* ---------------------------------------------
               AI SOLVER
            --------------------------------------------- */

            if (
                req.method === "POST" &&
                url === "/api/solve"
            ) {

                return handleSolve(
                    req,
                    res
                );
            }

            /* ---------------------------------------------
               STATIC WEBSITE
            --------------------------------------------- */

            if (
                req.method === "GET"
            ) {

                return serveStatic(
                    req,
                    res
                );
            }

            /* ---------------------------------------------
               METHOD NOT ALLOWED
            --------------------------------------------- */

            return sendJson(
                res,
                405,
                {
                    error:
                        "Method not allowed."
                }
            );
        }
    );

/* =========================================================
   START SERVER
========================================================= */

server.listen(
    PORT,
    "0.0.0.0",
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
                GEMINI_KEYS.length > 0
                    ? "CONFIGURED"
                    : "MISSING"
            }`
        );

        console.log(
            `Gemini API keys loaded: ${
                GEMINI_KEYS.length
            }`
        );

        console.log(
            "======================================"
        );

        console.log("");
    }
);

/* =========================================================
   SERVER ERROR
========================================================= */

server.on(
    "error",
    error => {

        console.error(
            "Server error:",
            error
        );
    }
);
