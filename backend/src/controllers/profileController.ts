import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup avatar directory
const avatarDir = path.resolve(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

export const uploadAvatarMiddleware = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) are allowed for profile pictures.'));
    }
  },
}).single('avatar');

/**
 * Get profile data for the authenticated user, role-customized
 */
export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        loginActivity: {
          select: {
            firstAccessAt: true,
            lastAccessAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Default login activity fallback to user.createdAt if not yet recorded
    const loginActivity = user.loginActivity || {
      firstAccessAt: user.createdAt,
      lastAccessAt: user.createdAt,
    };

    if (user.role === 'STUDENT') {
      // Fetch enrolled courses for this student
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              enrollments: {
                where: { role: { in: ['PROFESSOR', 'ADMIN'] } },
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
              _count: {
                select: {
                  materials: true,
                  quizzes: true,
                  enrollments: true,
                },
              },
              quizzes: {
                select: { id: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch user quiz attempts across courses to compute progress
      const allQuizIds = enrollments.flatMap((e) => e.course.quizzes.map((q) => q.id));
      const userAttempts = await prisma.quizAttempt.findMany({
        where: {
          studentId: userId,
          quizId: { in: allQuizIds },
        },
        select: { quizId: true },
      });
      const attemptedQuizIdSet = new Set(userAttempts.map((a) => a.quizId));

      const enrolledCourses = enrollments.map((enr) => {
        const professorEnrollment = enr.course.enrollments.find(
          (e) => e.role === 'PROFESSOR' || e.role === 'ADMIN'
        );
        const professorName = professorEnrollment?.user?.name || 'Prof. Faculty';

        const totalQuizzes = enr.course._count.quizzes;
        const attempted = enr.course.quizzes.filter((q) => attemptedQuizIdSet.has(q.id)).length;
        let progress = 0;
        if (totalQuizzes > 0) {
          progress = Math.round((attempted / totalQuizzes) * 100);
        } else if (enr.course._count.materials > 0) {
          progress = 25;
        }

        return {
          id: enr.course.id,
          code: enr.course.code,
          title: enr.course.title,
          description: enr.course.description,
          professorName,
          enrollmentDate: enr.createdAt,
          materialsCount: enr.course._count.materials,
          quizzesCount: enr.course._count.quizzes,
          courseStatus: progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Active',
          progress,
        };
      });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
        },
        loginActivity,
        enrolledCourses,
      });
    }

    // Role is PROFESSOR or ADMIN
    // Fetch courses created/taught by this professor
    const teacherEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        role: { in: ['PROFESSOR', 'ADMIN'] },
      },
      include: {
        course: {
          include: {
            enrollments: {
              where: { role: 'STUDENT' },
            },
            materials: {
              select: { id: true },
            },
            quizzes: {
              select: { id: true },
            },
            _count: {
              select: {
                materials: true,
                quizzes: true,
                enrollments: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const coursesCreated = teacherEnrollments.map((te) => {
      const c = te.course;
      const studentCount = c.enrollments.length;
      return {
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        totalEnrolledStudents: studentCount,
        totalUploadedMaterials: c._count.materials,
        totalQuizzes: c._count.quizzes,
        createdAt: c.createdAt,
        courseStatus: 'Active',
      };
    });

    // Compute aggregate teaching statistics
    const totalCoursesCreated = coursesCreated.length;
    const totalEnrolledStudents = coursesCreated.reduce((sum, c) => sum + c.totalEnrolledStudents, 0);
    const totalMaterialsUploaded = coursesCreated.reduce((sum, c) => sum + c.totalUploadedMaterials, 0);
    const totalQuizzesCreated = coursesCreated.reduce((sum, c) => sum + c.totalQuizzes, 0);

    const teachingOverview = {
      totalCoursesCreated,
      totalEnrolledStudents,
      totalMaterialsUploaded,
      totalQuizzesCreated,
    };

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
      loginActivity,
      coursesCreated,
      teachingOverview,
    });
  } catch (error: any) {
    console.error('[ProfileController] Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
}

/**
 * Update authenticated user's profile information
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { name, profileImage } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name cannot be empty.' });
    }

    const dataToUpdate: { name: string; profileImage?: string | null } = {
      name: name.trim(),
    };

    if (profileImage !== undefined) {
      dataToUpdate.profileImage = profileImage;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        updatedAt: true,
      },
    });

    console.log(`[ProfileController] User ${userId} updated profile name to '${updatedUser.name}'.`);

    res.json({
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[ProfileController] Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

/**
 * Upload a profile picture file
 */
export async function uploadAvatar(req: AuthenticatedRequest, res: Response) {
  uploadAvatarMiddleware(req as any, res as any, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error uploading profile image.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    try {
      const userId = req.user!.id;
      // Relative URL or served URL
      const avatarUrl = `/api/auth/profile/avatar/${file.filename}`;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { profileImage: avatarUrl },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profileImage: true,
        },
      });

      res.json({
        message: 'Profile picture uploaded successfully.',
        avatarUrl,
        user: updatedUser,
      });
    } catch (dbErr: any) {
      console.error('[ProfileController] Avatar DB update error:', dbErr);
      res.status(500).json({ error: 'Failed to save profile picture.' });
    }
  });
}

/**
 * Serve an avatar image file
 */
export async function serveAvatar(req: any, res: Response) {
  try {
    const filename = req.params.filename as string;
    // Sanitize filename against path traversal
    const safeFilename = path.basename(filename);
    const fullPath = path.resolve(avatarDir, safeFilename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Avatar not found.' });
    }

    res.sendFile(fullPath);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to serve avatar.' });
  }
}
