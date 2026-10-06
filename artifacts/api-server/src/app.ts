import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { HttpError } from "./lib/http-error";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Same-origin in production (served behind the shared proxy); CORS kept permissive
// only for the dev preview. Auth relies on a signed header, never cookies.
app.use(cors({ origin: process.env["NODE_ENV"] === "production" ? false : true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
});

// Single-service hosting (Cloud Run): serve the built Mini App from STATIC_DIR,
// with index.html for client-side routes. On Replit a proxy did this instead.
const staticDir = process.env["STATIC_DIR"];
if (staticDir) {
  app.use(express.static(staticDir, { index: "index.html", maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.sendFile("index.html", { root: staticDir, headers: { "Cache-Control": "no-cache" } });
  });
}

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body", code: "INVALID_INPUT" });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong. Please try again.", code: "SERVER_ERROR" });
});

export default app;
