const https = require("https");
const http = require("http");

const LOG_SERVER_URL =
  process.env.LOG_SERVER_URL || "http://test-server.chistats.com";

const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const VALID_STACKS = ["frontend", "backend", "db", "auth", "infra"];

function selectTransport(url) {
  return url.startsWith("https://") ? https : http;
}

function buildRequestOptions(url, bodyLength) {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    path: parsed.pathname + (parsed.search || ""),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyLength),
    },
  };
}

// ─── Core: send a single log entry to the test server ─────────────────────────
/**
 * Posts a log entry to the remote test server.
 *
 * @param {string} stack   - Application stack context (e.g. "backend", "frontend")
 * @param {string} level   - Severity level (e.g. "info", "warn", "error", "fatal")
 * @param {string} pkg     - Package / module / layer generating the log (e.g. "handler", "db")
 * @param {string} message - Human-readable description of the event
 * @returns {Promise<void>}
 */
function Log(stack, level, pkg, message) {
  // ── 1. Input validation ────────────────────────────────────────────────────
  if (!stack || typeof stack !== "string") {
    console.error("[LoggingMiddleware] Invalid argument: `stack` must be a non-empty string.");
    return Promise.resolve();
  }
  if (!level || typeof level !== "string") {
    console.error("[LoggingMiddleware] Invalid argument: `level` must be a non-empty string.");
    return Promise.resolve();
  }
  if (!pkg || typeof pkg !== "string") {
    console.error("[LoggingMiddleware] Invalid argument: `package` must be a non-empty string.");
    return Promise.resolve();
  }
  if (!message || typeof message !== "string") {
    console.error("[LoggingMiddleware] Invalid argument: `message` must be a non-empty string.");
    return Promise.resolve();
  }

  // ── 2. Build the payload ───────────────────────────────────────────────────
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    stack: stack.toLowerCase(),
    level: level.toLowerCase(),
    package: pkg.toLowerCase(),
    message,
    timestamp,
  });

  // ── 3. Local console echo (mirrors what's sent to the server) ─────────────
  const label = `[${timestamp}] [${stack.toUpperCase()}] [${level.toUpperCase()}] [${pkg}]`;
  if (level.toLowerCase() === "fatal" || level.toLowerCase() === "error") {
    console.error(`${label} ${message}`);
  } else if (level.toLowerCase() === "warn") {
    console.warn(`${label} ${message}`);
  } else {
    console.log(`${label} ${message}`);
  }

  // ── 4. POST to the test server ─────────────────────────────────────────────
  const targetUrl = `${LOG_SERVER_URL}/log`;
  const transport = selectTransport(LOG_SERVER_URL);
  const options = buildRequestOptions(targetUrl, payload);

  return new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Success – silently resolve
          resolve();
        } else {
          console.error(
            `[LoggingMiddleware] Server responded with ${res.statusCode}: ${data}`
          );
          resolve(); // Non-fatal: logging failures should never crash the app
        }
      });
    });

    req.on("error", (err) => {
      // Network error – log locally but don't crash the caller
      console.error(`[LoggingMiddleware] Failed to reach log server: ${err.message}`);
      resolve();
    });

    // Set a 5-second timeout so logging never blocks the application
    req.setTimeout(5000, () => {
      console.error("[LoggingMiddleware] Request to log server timed out.");
      req.destroy();
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// ─── Convenience wrappers ──────────────────────────────────────────────────────
const LogDebug = (stack, pkg, message) => Log(stack, "debug", pkg, message);
const LogInfo  = (stack, pkg, message) => Log(stack, "info",  pkg, message);
const LogWarn  = (stack, pkg, message) => Log(stack, "warn",  pkg, message);
const LogError = (stack, pkg, message) => Log(stack, "error", pkg, message);
const LogFatal = (stack, pkg, message) => Log(stack, "fatal", pkg, message);

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  Log,
  LogDebug,
  LogInfo,
  LogWarn,
  LogError,
  LogFatal,
};
