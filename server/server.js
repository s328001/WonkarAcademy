/*
 * Login and sign-up server for the Wonkar Table Tennis Academy site.
 *
 * HOW LOGIN WORKS (the big picture)
 * 1. SIGN UP: the browser sends name + email + password. We NEVER store the password.
 *    We store a "hash" of it (a one-way scrambled version) made with bcrypt.
 * 2. LOG IN: the browser sends email + password. We hash the typed password and compare it
 *    with the stored hash. If they match, we create a "token" (a signed note that says
 *    "this is user 7") and put it in a cookie.
 * 3. EVERY LATER REQUEST: the browser sends the cookie automatically. We check the signature.
 *    If it is valid, we know who the user is without asking for the password again.
 * 4. LOG OUT: we delete the cookie.
 *
 * Run it:   cd server && npm start      then open http://localhost:3000
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

/* ---------- Secret key ----------
 * The secret is used to SIGN tokens. Anyone who knows it can forge a login, so it must
 * never be written in the code or pushed to GitHub. We read it from an environment variable.
 * For local learning we make a random one if none is set (everyone is logged out on restart). */
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (IS_PROD) {
    console.error("JWT_SECRET must be set in production. Stopping.");
    process.exit(1);
  }
  JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("No JWT_SECRET set: using a temporary one. Users will be logged out when the server restarts.");
}

/* ---------- Database ----------
 * SQLite keeps everything in one file (server/data/app.db). Good for learning. */
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "app.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,   -- UNIQUE stops two accounts with one email
    password_hash TEXT    NOT NULL,          -- the bcrypt hash, never the real password
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);
// Prepared statements: the ? marks are filled in safely. This is what stops SQL injection.
// NEVER build SQL by joining strings with user input.
const findByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const findById = db.prepare("SELECT id, name, email FROM users WHERE id = ?");
const insertUser = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");

/* ---------- Settings ---------- */
const COOKIE_NAME = "wonkar_session";
const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 12; // higher = slower to crack, but also slower to log in. 10-12 is normal.

// A hash of a random password, used so login takes the same time whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), BCRYPT_ROUNDS);

const cookieOptions = {
  httpOnly: true,               // JavaScript on the page can NOT read this cookie (blocks token theft by XSS)
  sameSite: "lax",              // the browser won't send it on most cross-site requests (helps against CSRF)
  secure: IS_PROD,              // in production, only send over https
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
};

/* ---------- Helpers ---------- */
function startSession(res, user) {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: SESSION_DAYS + "d" });
  res.cookie(COOKIE_NAME, token, cookieOptions);
}

// Reads the cookie and returns the logged-in user, or null if there is no valid login.
function currentUser(req) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET); // throws if the token is forged or expired
    return findById.get(payload.sub) || null;
  } catch (e) {
    return null;
  }
}

// Middleware for PROTECTED routes: runs before the route. No valid login = 401 and the route never runs.
// (We have no protected route yet. When you add one, e.g. "my bookings", use: app.get("/api/x", requireLogin, ...))
function requireLogin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Please log in." });
  req.user = user;
  next();
}

// Validation: never trust what the browser sends. Check it again here on the server.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function cleanSignup(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (name.length < 2 || name.length > 60) return { error: "Please enter your name (2 to 60 characters)." };
  if (!EMAIL_RE.test(email) || email.length > 120) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 72) return { error: "Password must be at most 72 characters." }; // bcrypt ignores anything after 72 bytes
  return { name, email, password };
}

/* ---------- App ---------- */
const app = express();
app.disable("x-powered-by");       // don't advertise that we use Express
app.use(express.json({ limit: "10kb" })); // read JSON bodies, refuse huge ones
app.use(cookieParser());

// Basic security headers
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Rate limiting: stops someone trying thousands of passwords (brute force).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// Block cross-site form posts (a simple CSRF check): API writes must come from our own site.
function sameOriginOnly(req, res, next) {
  const origin = req.get("origin");
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch (e) { /* malformed Origin header: treated as foreign */ }
    if (host !== req.get("host")) return res.status(403).json({ error: "Request blocked." });
  }
  next();
}

/* ---------- API routes ---------- */
app.post("/api/signup", authLimiter, sameOriginOnly, async (req, res) => {
  const data = cleanSignup(req.body || {});
  if (data.error) return res.status(400).json({ error: data.error });

  if (findByEmail.get(data.email)) {
    return res.status(409).json({ error: "An account with this email already exists. Try logging in." });
  }
  const hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  let id;
  try {
    id = insertUser.run(data.name, data.email, hash).lastInsertRowid;
  } catch (e) {
    // two sign-ups at the same instant: the UNIQUE rule in the database catches it
    return res.status(409).json({ error: "An account with this email already exists. Try logging in." });
  }
  const user = { id: Number(id), name: data.name, email: data.email };
  startSession(res, user); // log them in straight away
  res.status(201).json({ user: { name: user.name, email: user.email } });
});

app.post("/api/login", authLimiter, sameOriginOnly, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const row = findByEmail.get(email);

  // Always run bcrypt, even if the email is unknown, so timing doesn't reveal which emails exist.
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);

  // The SAME message for "no such email" and "wrong password", so attackers can't find valid emails.
  if (!row || !ok) return res.status(401).json({ error: "Incorrect email or password." });

  startSession(res, row);
  res.json({ user: { name: row.name, email: row.email } });
});

app.post("/api/logout", sameOriginOnly, (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

// Who am I? The page calls this on load to know whether to show "Log in" or "Hi, name".
// Being logged out is a normal answer here, so we reply 200 with user: null (not an error).
app.get("/api/me", (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? { name: user.name, email: user.email } : null });
});

// Unknown /api paths get JSON, not an HTML page.
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

/* ---------- Serve the website ----------
 * We serve ONLY the public site files, never the server folder (it holds the database). */
const siteRoot = path.join(__dirname, "..");
app.use("/css", express.static(path.join(siteRoot, "css")));
app.use("/js", express.static(path.join(siteRoot, "js")));
app.use("/images", express.static(path.join(siteRoot, "images")));
app.get("/", (req, res) => res.sendFile(path.join(siteRoot, "index.html")));
// The UPI QR image the owner may add later (the page already looks for qr.png next to index.html)
app.get("/qr.png", (req, res) => res.sendFile(path.join(siteRoot, "qr.png"), err => { if (err) res.status(404).end(); }));

if (require.main === module) {
  app.listen(PORT, () => console.log("Wonkar site + login server running at http://localhost:" + PORT));
}
module.exports = app;
