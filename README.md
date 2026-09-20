# Smart Math Calculator

This project includes a local AI-assisted word-problem mode using Google AI Studio.

## Setup

1. Copy `.env.example` to `.env`
2. Replace `your_google_ai_studio_api_key_here` with your real Google AI Studio API key
3. Start the server:

```bash
node server.js
```

4. Open http://localhost:3000

## Notes

- The API key stays on the server, not in the browser.
- If no key is configured, the calculator keeps using the built-in local math logic.
