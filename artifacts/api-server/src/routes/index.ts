import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import gamesRouter from "./games";
import healthRouter from "./health";
import meRouter from "./me";
import socialRouter from "./social";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(gamesRouter);
router.use(socialRouter);
router.use(adminRouter);

export default router;
