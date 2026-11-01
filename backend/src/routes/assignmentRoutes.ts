import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getCourseAssignments,
  getAssignmentDetails,
  getAssignmentSubmissions,
  submitAssignment,
  serveAssignmentAttachment,
  serveSubmissionFile,
  getTimeline,
  getStudentAssignments,
  getProfessorAssignments,
  uploadAssignmentMiddleware,
} from '../controllers/assignmentController.js';

const router = Router();

// All assignment routes require authentication
router.use(authenticateToken);

// Timeline feeds (must be before :assignmentId param routes)
router.get('/timeline', getTimeline);
router.get('/my-assignments', getStudentAssignments);
router.get('/professor', requireRole([Role.PROFESSOR, Role.ADMIN]), getProfessorAssignments);

// Course-scoped assignments
router.get('/courses/:courseId', getCourseAssignments);
router.post(
  '/courses/:courseId',
  requireRole([Role.PROFESSOR, Role.ADMIN]),
  uploadAssignmentMiddleware,
  createAssignment
);

// Submission file serving (protected)
router.get('/submissions/:submissionId/file', serveSubmissionFile);

// Assignment-specific operations
router.get('/:assignmentId', getAssignmentDetails);
router.put(
  '/:assignmentId',
  requireRole([Role.PROFESSOR, Role.ADMIN]),
  uploadAssignmentMiddleware,
  updateAssignment
);
router.patch(
  '/:assignmentId',
  requireRole([Role.PROFESSOR, Role.ADMIN]),
  uploadAssignmentMiddleware,
  updateAssignment
);
router.delete(
  '/:assignmentId',
  requireRole([Role.PROFESSOR, Role.ADMIN]),
  deleteAssignment
);

// Assignment submissions dashboard & submission action
router.get(
  '/:assignmentId/submissions',
  requireRole([Role.PROFESSOR, Role.ADMIN]),
  getAssignmentSubmissions
);
router.post('/:assignmentId/submit', uploadAssignmentMiddleware, submitAssignment);

// Reference PDF attachment serving (protected)
router.get('/:assignmentId/attachment', serveAssignmentAttachment);

export default router;
