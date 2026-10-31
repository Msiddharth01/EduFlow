import { Router } from 'express';
import {
  createCourse,
  listUserCourses,
  enrollInCourse,
  getCourseDetails,
} from '../controllers/courseController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

// All course routes require authentication
router.use(authenticateToken);

// List courses current user is enrolled in or teaching
router.get('/', listUserCourses);

// Get course details (materials, quizzes) for authorized members
router.get('/:courseId', getCourseDetails);

// Only Professors or Admins can create courses
router.post('/', requireRole([Role.PROFESSOR, Role.ADMIN]), createCourse);

// Students can enroll in a course using courseCode
router.post('/enroll', enrollInCourse);

export default router;
