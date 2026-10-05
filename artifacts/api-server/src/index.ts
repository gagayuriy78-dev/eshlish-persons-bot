import app from "./app";
import { logger } from "./lib/logger";
import { seedQuestionsIfEmpty } from "./services/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env["TEST_TOKEN"]) {
  logger.error("TEST_TOKEN is not set; Telegram authentication will reject every request.");
}

try {
  const seeded = await seedQuestionsIfEmpty();
  if (seeded) logger.info({ seeded }, "Seeded question bank");
} catch (err) {
  logger.error({ err }, "Question seeding failed");
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});
server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
