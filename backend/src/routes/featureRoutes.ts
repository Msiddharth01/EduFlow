import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { uploadPdfMiddleware, uploadMaterial, serveMaterialFile, retryMaterialProcessing } from '../controllers/materialController.js';
import { askTutor, generateSummary } from '../controllers/tutorController.js';
import {
  listQuizzes,
  getQuizForStudent,
  submitQuizAttempt,
  createQuiz,
  generateQuiz,
  generateMissingQuizzes,
  retryQuizGeneration,
  generateQuizForMaterialEndpoint,
} from '../controllers/quizController.js';
import { getStudentAnalytics } from '../controllers/analyticsController.js';
import { getCourseTeacherAnalytics } from '../controllers/teacherController.js';

const router = Router();

// Student Analytics & Recommendations
router.get('/analytics/me', authenticateToken, getStudentAnalytics);
router.get('/courses/:courseId/teacher-analytics', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), getCourseTeacherAnalytics);

// Material Upload & Access
router.post('/courses/:courseId/materials', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), uploadPdfMiddleware, uploadMaterial);
router.get('/materials/:materialId/file', authenticateToken, serveMaterialFile);
router.post('/materials/:materialId/retry', authenticateToken, retryMaterialProcessing);
router.post('/courses/:courseId/materials/:materialId/retry', authenticateToken, retryMaterialProcessing);

// Material-linked Quiz Generation
router.post('/materials/:materialId/quiz', authenticateToken, generateQuizForMaterialEndpoint);
router.post('/materials/:materialId/quiz/retry', authenticateToken, generateQuizForMaterialEndpoint);

// AI Tutor & Summaries
router.post('/courses/:courseId/tutor', authenticateToken, askTutor);
router.post('/courses/:courseId/summaries', authenticateToken, generateSummary);

// Quizzes & Scoring
router.get('/courses/:courseId/quizzes', authenticateToken, listQuizzes);
router.post('/courses/:courseId/quizzes', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), createQuiz);
router.post('/courses/:courseId/quizzes/generate', authenticateToken, generateQuiz);
router.post('/courses/:courseId/quizzes/generate-missing', authenticateToken, generateMissingQuizzes);
router.get('/quizzes/:quizId', authenticateToken, getQuizForStudent);
router.post('/quizzes/:quizId/submit', authenticateToken, submitQuizAttempt);
router.post('/quizzes/:quizId/retry', authenticateToken, retryQuizGeneration);

export default router;
