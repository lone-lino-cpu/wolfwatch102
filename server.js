import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const app = express();
const projectDirectory = dirname(fileURLToPath(import.meta.url));
const distDirectory = resolve(projectDirectory, "dist");
const adminPagePath = resolve(distDirectory, "admin-lino.html");
const indexPath = resolve(distDirectory, "index.html");
const port = Number(process.env.PORT || 3000);
const cookieName = "wolfwatch_admin";
const sessionDurationMs = 8 * 60 * 60 * 1000;
const sessionDurationSeconds = sessionDurationMs / 1000;
const { ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET } = process.env;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}
if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
  throw new Error(
    "ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and JWT_SECRET must be configured.",
  );
}
if (!/^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(ADMIN_PASSWORD_HASH)) {
  throw new Error("ADMIN_PASSWORD_HASH must be a valid bcrypt hash.");
}
if (Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET must be at least 32 bytes long.");
}

app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

function isAuthenticated(request) {
  const token = request.cookies[cookieName];
  if (!token) return false;

  try {
    const claims = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return typeof claims === "object" && claims.sub === ADMIN_USERNAME;
  } catch {
    return false;
  }
}

function requireAdminPage(request, response, next) {
  if (!isAuthenticated(request)) {
    response.redirect(302, "/login.html");
    return;
  }
  next();
}

function requireAdminApi(request, response, next) {
  if (!isAuthenticated(request)) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.post("/api/login", loginRateLimit, async (request, response, next) => {
  try {
    const { username, password } = request.body ?? {};
    if (typeof username !== "string" || typeof password !== "string") {
      response.status(400).json({ error: "Username and password are required." });
      return;
    }

    const validPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (username !== ADMIN_USERNAME || !validPassword) {
      response.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const token = jwt.sign({ sub: ADMIN_USERNAME }, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: sessionDurationSeconds,
    });
    response.cookie(cookieName, token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: sessionDurationMs,
    });
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/logout", (_request, response) => {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
  response.json({ success: true });
});

app.get("/api/me", (request, response) => {
  response.json({ loggedIn: isAuthenticated(request) });
});

app.use("/api/admin", requireAdminApi);

app.get("/health", (_request, response) => {
  response.type("text/plain").send("OK");
});

app.get(["/admin-lino.html", "/admin"], requireAdminPage, (_request, response, next) => {
  response.sendFile(adminPagePath, (error) => {
    if (error) next(error);
  });
});

app.get("/citizen", (_request, response, next) => {
  response.sendFile(indexPath, (error) => {
    if (error) next(error);
  });
});

app.use(express.static(distDirectory));

app.use((_request, response) => {
  response.status(404).type("text/plain").send("Not Found");
});

app.use((error, _request, response, next) => {
  console.error("Request failed:", error);
  if (response.headersSent) return next(error);
  response.status(500).type("text/plain").send("Internal Server Error");
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`WolfWatch listening on 0.0.0.0:${port}`);
});

server.on("error", (error) => {
  console.error("HTTP server failed:", error);
  process.exit(1);
});
