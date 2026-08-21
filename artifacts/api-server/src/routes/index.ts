import { Router, type IRouter } from "express";
import healthRouter from "./health";
import envRouter from "./env";
import authRouter from "./auth";
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
import probationActionEvidenceRouter from "./probationActionEvidence";
import probationManagerReviewsRouter from "./probationManagerReviews";
import usersRouter from "./users";
import managerRouter from "./manager";
import teamsRouter from "./teams";
import hierarchyRouter from "./hierarchy";
import auditLogRouter from "./auditLog";
import learningLogRouter from "./learningLog";
import managerLdRouter from "./managerLd";
import companyLearningRouter from "./companyLearning";
import ldFeedbackRouter from "./ldFeedback";
import {
  requireApprovedProductionUser,
  requireProductionRoles,
  requireProductionWriteRoles,
} from "../middlewares/productionAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/env", envRouter);
router.use("/auth", authRouter);
router.use(requireApprovedProductionUser);
router.use("/career-paths", requireProductionWriteRoles("ld", "admin"), careerPathsRouter);
router.use("/roles", requireProductionWriteRoles("ld", "admin"), rolesRouter);
router.use("/competencies", requireProductionWriteRoles("ld", "admin"), competenciesRouter);
router.use("/assessments", assessmentsRouter);
router.use("/evidence", evidenceRouter);
router.use("/summary", summaryRouter);
router.use("/financial-targets", requireProductionWriteRoles("ld", "admin"), financialTargetsRouter);
router.use("/financial-progress", financialProgressRouter);
router.use("/probation/items", probationItemsRouter);
router.use("/probation/assessments", probationAssessmentsRouter);
router.use("/probation/reflections", probationReflectionsRouter);
router.use("/probation/actions", probationActionsRouter);
router.use("/probation/action-evidence", probationActionEvidenceRouter);
router.use("/probation/manager-reviews", probationManagerReviewsRouter);
router.use("/users", usersRouter);
router.use("/manager", requireProductionRoles("manager", "director", "ld", "admin"), managerRouter);
router.use("/teams", requireProductionWriteRoles("admin"), teamsRouter);
router.use("/hierarchy", hierarchyRouter);
router.use("/audit-log", requireProductionRoles("admin"), auditLogRouter);
router.use("/learning-log", learningLogRouter);
router.use("/manager-ld", requireProductionRoles("manager", "director", "ld", "admin"), managerLdRouter);
router.use("/company-learning", requireProductionWriteRoles("ld", "admin"), companyLearningRouter);
router.use("/ld-feedback", ldFeedbackRouter);

export default router;
