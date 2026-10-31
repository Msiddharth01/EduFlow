import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getTeacherDashboard,
  getTeacherStudents,
  getTeacherQuizResults,
  getCourseTeacherAnalytics,
  getTeacherMaterials,
} from '../controllers/teacherController.js';

const router = Router();

// Enforce PROFESSOR or ADMIN role on all teacher endpoints
router.get('/dashboard', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), getTeacherDashboard);
router.get('/students', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), getTeacherStudents);
router.get('/quizzes', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), getTeacherQuizResults);
router.get('/materials', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), getTeacherMaterials);
router.get('/courses/:courseId/analytics', authenticateToken, requireRole(['PROFESSOR', 'ADMIN']), getCourseTeacherAnalytics);

export default router;
