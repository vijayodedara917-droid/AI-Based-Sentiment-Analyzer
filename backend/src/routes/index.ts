import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sentimentRouter from "./sentiment";
import analysesRouter from "./analyses";
import alertsRouter from "./alerts";
import apiKeysRouter from "./apikeys";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sentimentRouter);
router.use(analysesRouter);
router.use(alertsRouter);
router.use(apiKeysRouter);

export default router;
