const http = require("http");
const fs = require("fs");
const path = require("path");

// =====================================================
// CONFIGURATION
// =====================================================

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

const GEMINI_MODEL =
    process.env.GEMINI_MODEL || "gemini-3.6-flash";

const GEMINI_FALLBACK_MODEL =
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash-lite";

// =====================================================
// LOAD .ENV FILE
// =====================================================

function loadEnvFile() {
    const envPath = path.join(ROOT, ".env");

    if (!fs.existsSync(envPath)) {
        console.log(".env file not found.");
        return;
    }

    const content = fs.readFileSync(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const index = trimmed.indexOf("=");

        if (index === -1) {
            continue;
        }

        const key = trimmed.slice(0, index).trim();
        let value = trimmed.slice(index + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
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
// HELPERS
// =====================================================

function getNextApiKey() {
    if (GEMINI_KEYS.length === 0) {
        throw new Error(
            "No Gemini API keys configured. Check your .env file."
        );
    }

    const key = GEMINI_KEYS[currentKeyIndex];

    currentKeyIndex =
        (currentKeyIndex + 1) % GEMINI_KEYS.length;

    return key;
}

function sendJson(res, statusCode, data) {
    const output = JSON.stringify(data);

    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    });

    res.end(output);
}

function sendFile(res, filePath, contentType) {
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("File not found");
        return;
    }

    res.writeHead(200, {
        "Content-Type": contentType
    });

    fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk.toString();

            // Prevent extremely large requests
            if (body.length > 2_000_000) {
                reject(new Error("Request body is too large."));
                req.destroy();
            }
        });

        req.on("end", () => {
            try {
                if (!body) {
                    resolve({});
                    return;
                }

                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error("Invalid JSON request."));
            }
        });

        req.on("error", reject);
    });
}

// =====================================================
// GEMINI SOLVER
// =====================================================

async function solveWithGemini(problem) {
    if (!GEMINI_KEYS.length) {
        throw new Error(
            "Gemini API keys are missing. Check your .env file."
        );
    }

    const prompt = `
You are an expert educational problem solver.

Solve the following problem carefully:

${problem}

The problem may belong to:
- Mathematics
- Physics
- Chemistry
- Electronics
- Computer Science

Return ONLY valid JSON.

Use this exact structure:

{
  "subject": "",
  "topic": "",
  "answer": "",
  "formula": "",
  "equation": "",
  "given": [],
  "required": "",
  "assumptions": [],
  "steps": [],
  "calculation": "",
  "checks": [],
  "warning": ""
}

Rules:
1. Identify the subject and topic.
2. Extract all given values.
3. State what must be found.
4. Show the relevant formula.
5. Create equations when applicable.
6. Solve step by step.
7. Include units where applicable.
8. For mathematics, show algebra clearly.
9. For physics, include SI units where appropriate.
10. For chemistry, include balanced equations when relevant.
11. For electronics, identify voltage, current, resistance, power, etc.
12. For computer science, explain the logic and provide calculations or code-related reasoning when necessary.
13. Do not invent missing information.
14. If information is missing, clearly mention it in "warning".
15. Keep the final answer clear and educational.
`;

    let lastError = null;

    // Try every configured API key
    for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
        const apiKey = getNextApiKey();

        const models = [
            GEMINI_MODEL,
            GEMINI_FALLBACK_MODEL
        ];

        for (const model of models) {
            try {
                const url =
                    "https://generativelanguage.googleapis.com/v1beta/models/" +
                    model +
                    ":generateContent?key=" +
                    encodeURIComponent(apiKey);

                const response = await fetch(url, {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

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
                            temperature: 0.2,
                            responseMimeType: "application/json"
                        }
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    const message =
                        data?.error?.message ||
                        `Gemini request failed with status ${response.status}`;

                    throw new Error(message);
                }

                const text =
                    data?.candidates?.[0]?.content?.parts
                        ?.map(part => part.text || "")
                        .join("")
                        .trim();

                if (!text) {
                    throw new Error(
                        "Gemini returned an empty response."
                    );
                }

                // Remove accidental markdown JSON fences
                const cleanText = text
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim();

                try {
                    return JSON.parse(cleanText);
                } catch {
                    return {
                        subject: "General",
                        topic: "Problem Solving",
                        answer: cleanText,
                        formula: "",
                        equation: "",
                        given: [],
                        required: "",
                        assumptions: [],
                        steps: [cleanText],
                        calculation: "",
                        checks: [],
                        warning:
                            "The AI response was returned as text instead of structured JSON."
                    };
                }

            } catch (error) {
                lastError = error;

                const message =
                    String(error.message || "").toLowerCase();

                const retryable =
                    message.includes("429") ||
                    message.includes("quota") ||
                    message.includes("rate") ||
                    message.includes("limit") ||
                    message.includes("401") ||
                    message.includes("403") ||
                    message.includes("api key") ||
                    message.includes("permission") ||
                    message.includes("not found");

                if (!retryable) {
                    break;
                }
            }
        }
    }

    throw new Error(
        lastError?.message ||
        "All Gemini API keys failed."
    );
}

// =====================================================
// API ROUTES
// =====================================================

async function handleSolve(req, res) {
    try {
        const body = await readBody(req);

        console.log("\nReceived solve request:");
        console.log(body);

        // IMPORTANT:
        // Accept BOTH "problem" and "question"
        const problem =
            String(
                body.problem ||
                body.question ||
                ""
            ).trim();

        console.log("Problem:", problem);

        if (!problem) {
            return sendJson(res, 400, {
                error: "Please enter a problem."
            });
        }

        const result =
            await solveWithGemini(problem);

        return sendJson(res, 200, {
            success: true,
            result
        });

    } catch (error) {
        console.error(
            "Solve error:",
            error.message
        );

        return sendJson(res, 500, {
            success: false,
            error: error.message
        });
    }
}

// =====================================================
// SERVER
// =====================================================

const server = http.createServer(
    async (req, res) => {

        // CORS preflight
        if (req.method === "OPTIONS") {
            res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods":
                    "GET, POST, OPTIONS"
            });

            res.end();
            return;
        }

        // -----------------------------
        // HEALTH CHECK
        // -----------------------------

        if (
            req.method === "GET" &&
            req.url === "/api/health"
        ) {
            return sendJson(res, 200, {
                status: "ok",
                gemini:
                    GEMINI_KEYS.length > 0
                        ? "configured"
                        : "missing",
                keys: GEMINI_KEYS.length,
                model: GEMINI_MODEL
            });
        }

        // -----------------------------
        // AI SOLVER
        // -----------------------------

        if (
            req.method === "POST" &&
            req.url === "/api/solve"
        ) {
            return handleSolve(req, res);
        }

        // -----------------------------
        // STATIC FILES
        // -----------------------------

        let requestPath =
            req.url.split("?")[0];

        if (requestPath === "/") {
            requestPath = "/index.html";
        }

        const filePath =
            path.join(
                ROOT,
                decodeURIComponent(requestPath)
            );

        // Security protection
        if (!filePath.startsWith(ROOT)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }

        const ext =
            path.extname(filePath).toLowerCase();

        const contentTypes = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon"
        };

        const contentType =
            contentTypes[ext] ||
            "application/octet-stream";

        sendFile(
            res,
            filePath,
            contentType
        );
    }
);

// =====================================================
// START SERVER
// =====================================================

server.listen(PORT, () => {
    console.log("");
    console.log("======================================");
    console.log("       CALCULATOR STUDIO SERVER");
    console.log("======================================");
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
        `Gemini API keys loaded: ${GEMINI_KEYS.length}`
    );
    console.log("======================================");
    console.log("");
});
