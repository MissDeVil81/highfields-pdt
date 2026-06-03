import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerPathsRouter from "./careerPaths";
import rolesRouter from "./roles";
import competenciesRouter from "./competencies";
import assessmentsRouter from "./assessments";
import evidenceRouter from "./evidence";
import summaryRouter from "./summary";
import financialTargetsRouter from "./financialTargets";
import financialProgressRouter from "./financialProgress";
import probationItemsRouter from "./probationItems";
import probationAssessmentsRouter from "./probationAssessments";
import probationReflectionsRouter from "./probationReflections";
import probationActionsRouter from "./probationActions";
import probationManagerReviewsRouter from "./probationManagerReviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/career-paths", careerPathsRouter);
router.use("/roles", rolesRouter);
router.use("/competencies", competenciesRouter);
router.use("/assessments", assessmentsRouter);
router.use("/evidence", evidenceRouter);
router.use("/summary", summaryRouter);
router.use("/financial-targets", financialTargetsRouter);
router.use("/financial-progress", financialProgressRouter);
router.use("/probation/items", probationItemsRouter);
router.use("/probation/assessments", probationAssessmentsRouter);
router.use("/probation/reflections", probationReflectionsRouter);
router.use("/probation/actions", probationActionsRouter);
router.use("/probation/manager-reviews", probationManagerReviewsRouter);

export default router;
