const http = require("http");
const fs = require("fs");
const path = require("path");

// ======================================================
// CONFIGURATION
// ======================================================

const ROOT = __dirname;

// ======================================================
// LOAD .ENV FILE
// ======================================================

function loadEnvFile() {
    
    const envPath = path.join(ROOT, ".env");

    if (!fs.existsSync(envPath)) {
        return;
    }

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();

        if (
            !trimmed ||
            trimmed.startsWith("#") ||
            !trimmed.includes("=")
        ) {
            continue;
        }

        const index = trimmed.indexOf("=");

        const key = trimmed
            .slice(0, index)
            .trim();

        let value = trimmed
            .slice(index + 1)
            .trim();

        value = value.replace(/^['"]|['"]$/g, "");

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

loadEnvFile();

// ======================================================
// GEMINI CONFIGURATION
// ======================================================

// Supports both names so you don't have to change
// an existing .env file.
const PORT = Number(process.env.PORT || 3000);

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

const GEMINI_MODEL =
    process.env.GEMINI_MODEL ||
    process.env.GOOGLE_MODEL ||
    "gemini-3.6-flash";

// ======================================================
// MIME TYPES
// ======================================================

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8"
};

// ======================================================
// RESPONSE HELPERS
// ======================================================

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });

    res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text, contentType) {
    res.writeHead(statusCode, {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*"
    });

    res.end(text);
}

// ======================================================
// READ REQUEST BODY
// ======================================================

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk;

            // Prevent extremely large requests
            if (body.length > 1000000) {
                reject(new Error("Request body is too large."));
                req.destroy();
            }
        });

        req.on("end", () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                const data = JSON.parse(body);
                resolve(data);
            } catch {
                reject(new Error("Invalid JSON request."));
            }
        });

        req.on("error", reject);
    });
}

// ======================================================
// GEMINI SYSTEM INSTRUCTION
// ======================================================

const SYSTEM_INSTRUCTION = `
You are an advanced educational problem-solving AI.

You are capable of solving and explaining problems from:

- Mathematics
- Physics
- Chemistry
- Electronics
- Electrical engineering
- Computer science
- Programming
- Algorithms
- Data structures
- Digital logic
- Basic engineering mathematics
- Statistics
- Calculus
- Algebra
- Geometry
- Trigonometry
- Probability
- Linear algebra
- Differential equations
- Numerical problems
- Circuit analysis

Your job is to solve the user's problem accurately and teach the reasoning.

IMPORTANT RULES:

1. First identify the subject and topic.

2. Identify:
   - Given information
   - Required information
   - Unknown variables
   - Units
   - Conditions

3. Choose the correct:
   - Formula
   - Law
   - Theorem
   - Principle
   - Algorithm
   - Chemical equation
   - Circuit rule
   - Programming concept

4. Show the solution step-by-step.

5. Use correct units.

6. Convert units when necessary.

7. For mathematics:
   - Show equations
   - Show substitutions
   - Show calculations
   - Simplify the result
   - Check the result when possible

8. For physics:
   - Clearly identify vectors/scalars when relevant
   - Use correct signs
   - Show SI units
   - Explain assumptions

9. For chemistry:
   - Balance chemical equations
   - Track atoms
   - Track charge
   - Distinguish mass, moles, molarity and molecular quantities
   - Show oxidation states when relevant

10. For electronics:
   - Identify components
   - State circuit laws
   - Use Ohm's law when relevant
   - Use Kirchhoff's laws when relevant
   - Calculate voltage, current, resistance and power
   - Explain circuit behavior

11. For computer science:
   - Explain the algorithm
   - Give pseudocode when useful
   - Provide code when requested
   - Explain time complexity
   - Explain space complexity
   - Mention important edge cases

12. Adapt the explanation level:
   - Beginner → simple explanation
   - School → clear answer-sheet style
   - College → detailed derivation
   - Advanced → rigorous mathematical/technical reasoning

13. Never invent missing values.

14. If information is missing, clearly explain what information is required.

15. If a problem is ambiguous, explain the ambiguity.

16. Always provide a clearly labeled final answer.

17. Keep calculations transparent so the student can verify them.

18. Do not merely give the final number. Explain how it was obtained.

Return the result in the requested structured JSON format.
`;

// ======================================================
// GEMINI RESPONSE SCHEMA
// ======================================================

const RESPONSE_SCHEMA = {
    type: "OBJECT",

    properties: {
        subject: {
            type: "STRING"
        },

        topic: {
            type: "STRING"
        },

        answer: {
            type: "STRING"
        },

        formula: {
            type: "STRING"
        },

        equation: {
            type: "STRING"
        },

        given: {
            type: "ARRAY",
            items: {
                type: "STRING"
            }
        },

        required: {
            type: "ARRAY",
            items: {
                type: "STRING"
            }
        },

        assumptions: {
            type: "ARRAY",
            items: {
                type: "STRING"
            }
        },

        steps: {
            type: "ARRAY",
            items: {
                type: "STRING"
            }
        },

        calculation: {
            type: "STRING"
        },

        checks: {
            type: "ARRAY",
            items: {
                type: "STRING"
            }
        },

        warning: {
            type: "STRING"
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
};

// ======================================================
// CALL GEMINI API
// ======================================================

async function solveWithGemini(question) {

    if (!GEMINI_API_KEY) {
        return {
            error:
                "Gemini API key is missing. Add GEMINI_API_KEY to your .env file."
        };
    }

    if (!question || !question.trim()) {
        return {
            error: "Question is empty."
        };
    }

    // Prevent excessively large questions
    if (question.length > 20000) {
        return {
            error:
                "Question is too long. Please keep the question under 20,000 characters."
        };
    }

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(GEMINI_MODEL)}:generateContent` +
        `?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const requestBody = {

        systemInstruction: {
            parts: [
                {
                    text: SYSTEM_INSTRUCTION
                }
            ]
        },

        contents: [
            {
                role: "user",

                parts: [
                    {
                        text: question.trim()
                    }
                ]
            }
        ],

        generationConfig: {
            temperature: 0.2,

            maxOutputTokens: 8192,

            responseMimeType: "application/json",

            responseSchema: RESPONSE_SCHEMA
        }
    };

    try {

        const response = await fetch(url, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // --------------------------------------------------
        // GEMINI API ERROR
        // --------------------------------------------------

        if (!response.ok) {

            const message =
                data?.error?.message ||
                "Gemini API request failed.";

            return {
                error: message
            };
        }

        // --------------------------------------------------
        // EXTRACT GEMINI TEXT
        // --------------------------------------------------

        const parts =
            data?.candidates?.[0]?.content?.parts || [];

        const text = parts
            .map(part => part.text || "")
            .join("")
            .trim();

        if (!text) {

            return {
                error:
                    "Gemini returned an empty response."
            };
        }

        // --------------------------------------------------
        // PARSE STRUCTURED JSON
        // --------------------------------------------------

        let result;

        try {

            result = JSON.parse(text);

        } catch (error) {

            console.error(
                "Gemini JSON parsing failed:",
                error
            );

            // Fallback if Gemini returns plain text
            return {
                subject: "General",
                topic: "Problem solving",
                answer: text,
                formula: "",
                equation: "",
                given: [],
                required: [],
                assumptions: [],
                steps: [text],
                calculation: "",
                checks: [],
                warning: ""
            };
        }

        // --------------------------------------------------
        // NORMALIZE RESPONSE
        // --------------------------------------------------

        return {
            subject: result.subject || "General",

            topic: result.topic || "Problem solving",

            answer: result.answer || "No final answer returned.",

            formula: result.formula || "",

            equation: result.equation || "",

            given: Array.isArray(result.given)
                ? result.given
                : [],

            required: Array.isArray(result.required)
                ? result.required
                : [],

            assumptions: Array.isArray(result.assumptions)
                ? result.assumptions
                : [],

            steps: Array.isArray(result.steps)
                ? result.steps
                : [],

            calculation: result.calculation || "",

            checks: Array.isArray(result.checks)
                ? result.checks
                : [],

            warning: result.warning || ""
        };

    } catch (error) {

        console.error(
            "Gemini connection error:",
            error
        );

        return {
            error:
                "Could not connect to Gemini. Check your internet connection and API configuration."
        };
    }
}

// ======================================================
// STATIC FILE SERVER
// ======================================================

function serveFile(res, filePath) {

    fs.readFile(filePath, (error, content) => {

        if (error) {

            sendJson(res, 404, {
                error: "File not found."
            });

            return;
        }

        const extension =
            path.extname(filePath).toLowerCase();

        const contentType =
            MIME_TYPES[extension] ||
            "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*"
        });

        res.end(content);
    });
}

// ======================================================
// SAFE STATIC PATH
// ======================================================

function getSafeFilePath(requestUrl) {

    let requestedPath =
        requestUrl === "/"
            ? "/index.html"
            : requestUrl.split("?")[0];

    // Decode URL
    try {
        requestedPath = decodeURIComponent(
            requestedPath
        );
    } catch {
        return null;
    }

    const filePath = path.resolve(
        ROOT,
        "." + requestedPath
    );

    const relativePath =
        path.relative(ROOT, filePath);

    // Prevent ../ path traversal
    if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath)
    ) {
        return null;
    }

    return filePath;
}

// ======================================================
// HTTP SERVER
// ======================================================

const server = http.createServer(
    async (req, res) => {

        // --------------------------------------------------
        // CORS PREFLIGHT
        // --------------------------------------------------

        if (req.method === "OPTIONS") {

            res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods":
                    "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers":
                    "Content-Type"
            });

            res.end();

            return;
        }

        // --------------------------------------------------
        // GEMINI SOLVER API
        // --------------------------------------------------

        if (
            req.url === "/api/solve" &&
            req.method === "POST"
        ) {

            try {

                const body =
                    await readBody(req);

                const question =
                    String(body.question || "").trim();

                if (!question) {

                    sendJson(res, 400, {
                        error:
                            "Please enter a question."
                    });

                    return;
                }

                console.log(
                    `Solving question (${question.length} characters)...`
                );

                const result =
                    await solveWithGemini(question);

                if (result.error) {

                    sendJson(res, 400, {
                        error: result.error
                    });

                    return;
                }

                sendJson(res, 200, result);

                console.log(
                    "Gemini solution returned successfully."
                );

            } catch (error) {

                console.error(
                    "API error:",
                    error
                );

                sendJson(res, 500, {
                    error:
                        error.message ||
                        "Unexpected server error."
                });
            }

            return;
        }

        // --------------------------------------------------
        // HEALTH CHECK
        // --------------------------------------------------

        if (
            req.url === "/api/health" &&
            req.method === "GET"
        ) {

            sendJson(res, 200, {
                status: "ok",

                gemini:
                    GEMINI_API_KEY
                        ? "configured"
                        : "missing",

                model: GEMINI_MODEL
            });

            return;
        }

        // --------------------------------------------------
        // STATIC WEBSITE
        // --------------------------------------------------

        if (req.method !== "GET") {

            sendJson(res, 405, {
                error: "Method not allowed."
            });

            return;
        }

        const filePath =
            getSafeFilePath(req.url);

        if (!filePath) {

            sendJson(res, 403, {
                error: "Forbidden."
            });

            return;
        }

        if (!fs.existsSync(filePath)) {

            sendJson(res, 404, {
                error: "Page not found."
            });

            return;
        }

        serveFile(res, filePath);
    }
);

// ======================================================
// SERVER ERROR HANDLING
// ======================================================

server.on("error", error => {

    if (error.code === "EADDRINUSE") {

        console.error(
            `Port ${PORT} is already in use.`
        );

        console.error(
            `Try closing the other Node.js server or use another port.`
        );

        return;
    }

    console.error(
        "Server error:",
        error
    );
});

// ======================================================
// START SERVER
// ======================================================

server.listen(PORT, "0.0.0.0", () => {

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
            GEMINI_API_KEY
                ? "CONFIGURED"
                : "MISSING"
        }`
    );
    console.log("======================================");
    console.log("");
});