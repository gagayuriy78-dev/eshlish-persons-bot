import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { AnswerGameQuestionBody, StartGameBody } from "@workspace/api-zod";
import { HttpError } from "../lib/http-error";
import { rateLimit, requireTelegramUser } from "../middlewares/auth";
import { abandonGame, answerQuestion, getGame, getProStatus, issueQuestion, startGame } from "../services/games";
import { getUserOrThrow, isOnboarded } from "../services/users";
import { parseBody, userId } from "./me";

const router: IRouter = Router();

async function requireOnboarded(req: Request, _res: Response, next: NextFunction) {
  const user = await getUserOrThrow(userId(req));
  if (!isOnboarded(user)) return next(new HttpError(403, "Complete registration first.", "ONBOARDING_REQUIRED"));
  next();
}

function gameIdParam(req: Request): number {
  const id = Number(req.params["gameId"]);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid game.", "INVALID_INPUT");
  return id;
}

router.use(["/pro", "/games"], requireTelegramUser, requireOnboarded);

router.get("/pro/status", async (req, res) => {
  res.set("Cache-Control", "no-store").json(await getProStatus(await getUserOrThrow(userId(req))));
});

router.post("/games", rateLimit("start", 20), async (req, res) => {
  const body = parseBody(StartGameBody, req.body);
  res.set("Cache-Control", "no-store").json(await startGame(await getUserOrThrow(userId(req)), body.mode, body.level));
});

router.get("/games/:gameId", async (req, res) => {
  res.set("Cache-Control", "no-store").json(await getGame(userId(req), gameIdParam(req)));
});

router.get("/games/:gameId/question", rateLimit("question", 60), async (req, res) => {
  res.set("Cache-Control", "no-store").json(await issueQuestion(userId(req), gameIdParam(req)));
});

router.post("/games/:gameId/answer", rateLimit("answer", 60), async (req, res) => {
  const body = parseBody(AnswerGameQuestionBody, req.body);
  res.set("Cache-Control", "no-store").json(await answerQuestion(userId(req), gameIdParam(req), body.questionId, body.optionIndex));
});

router.post("/games/:gameId/abandon", async (req, res) => {
  res.json(await abandonGame(userId(req), gameIdParam(req)));
});

export default router;
