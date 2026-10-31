import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  serveAvatar,
} from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);

// Profile Management
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/profile/avatar', authenticateToken, uploadAvatar);
router.get('/profile/avatar/:filename', serveAvatar);

export default router;
