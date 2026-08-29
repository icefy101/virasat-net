import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Security audit finding (critical): every session cookie is a JWT signed
// with JWT_SECRET (see sdk.ts's getSessionSecret). Before this check, an
// unset JWT_SECRET silently became an empty string, so the app would start
// up fine and issue real, browser-accepted session cookies signed with an
// empty HMAC key — anyone could then forge a valid session for any account
// (including one that doesn't exist yet) just by knowing HS256 was in use.
// Failing fast here means a misconfigured .env breaks obviously at startup
// instead of shipping a silently-forgeable auth system.
function assertSecureConfig() {
  const secret = ENV.cookieSecret;
  if (!secret || secret.length < 32) {
    console.error(
      "\n[FATAL] JWT_SECRET is missing or too short (need at least 32 characters).\n" +
        "Every login session is signed with this value — if it's empty or weak,\n" +
        "session cookies can be forged and any account can be impersonated.\n" +
        "Set a long random JWT_SECRET in your .env file and restart.\n" +
        "Generate one with: openssl rand -base64 48\n"
    );
    process.exit(1);
  }
}

async function startServer() {
  assertSecureConfig();
  const app = express();
  const server = createServer(app);

  // Security headers (OWASP-style baseline: HSTS, no-sniff, no powered-by, etc).
  // CSP, frameguard (X-Frame-Options) and COEP/CORP are explicitly disabled:
  // this app is designed to be embedded in an iframe by its hosting platform
  // and to load Vite's dev-time inline scripts, so a default-locked-down CSP
  // or frame policy would just break the preview rather than add real safety.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false,
    })
  );
  app.disable("x-powered-by");

  // Rate limiting: blunt brute-force / credential-stuffing against auth and
  // basic denial-of-service against the API. Generous limits so normal use
  // (including the app's own batched tRPC calls) is never affected.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again later." },
  });
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.use("/api/oauth", authLimiter);
  registerOAuthRoutes(app);
  // Security audit finding: the real self-hosted auth.login / auth.signup
  // mutations (added to replace Manus OAuth) live under /api/trpc, not
  // /api/oauth — so they were only ever covered by the generous 300/min
  // apiLimiter below, not the strict 30/15min authLimiter meant for exactly
  // this kind of endpoint. That left real brute-force / credential-stuffing
  // protection far weaker than intended for the endpoints that actually
  // check a password. The tRPC express adapter exposes each procedure at
  // /api/trpc/<router>.<procedure>, so this matches those paths specifically
  // (and stacks with apiLimiter below — both apply, so whichever is hit
  // first wins).
  app.use(/^\/api\/trpc\/(?:[\w.]+,)*auth\.(login|signup)\b/, authLimiter);
  // tRPC API
  app.use(
    "/api/trpc",
    apiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
