import path from 'path';
import fs from 'fs';
import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { notifyCourseProfessors, notifyEnrolledStudents } from '../services/notificationService.js';
import { NotificationType } from '@prisma/client';

export async function createCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const { code, title, description } = req.body;

    if (!code || !title) {
      return res.status(400).json({ error: 'Course code and title are required.' });
    }

    const existing = await prisma.course.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing) {
      return res.status(409).json({ error: 'A course with this code already exists.' });
    }

    const course = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description?.trim(),
        enrollments: {
          create: {
            userId: req.user!.id,
            role: req.user!.role,
          },
        },
      },
      include: {
        enrollments: true,
      },
    });

    res.status(201).json({
      message: 'Course created successfully.',
      course,
    });
  } catch (error: any) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error while creating course.' });
  }
}

export async function listUserCourses(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { role: { in: ['PROFESSOR', 'ADMIN'] } },
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            materials: {
              select: {
                id: true,
                title: true,
                fileName: true,
                status: true,
                createdAt: true,
              },
            },
            quizzes: {
              select: {
                id: true,
              },
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

    // Fetch quiz attempts for this user across these courses
    const allQuizIds = enrollments.flatMap((e) => e.course.quizzes.map((q) => q.id));
    const userAttempts = await prisma.quizAttempt.findMany({
      where: {
        studentId: userId,
        quizId: { in: allQuizIds },
      },
      select: { quizId: true },
    });
    const attemptedQuizIdSet = new Set(userAttempts.map((a) => a.quizId));

    const courses = enrollments.map((e) => {
      const professorEnrollment = e.course.enrollments.find(
        (en) => en.role === 'PROFESSOR' || en.role === 'ADMIN'
      );
      const professorName = professorEnrollment?.user?.name || 'Prof. Faculty';

      const totalQuizzes = e.course._count.quizzes;
      const attemptedInThisCourse = e.course.quizzes.filter((q) => attemptedQuizIdSet.has(q.id)).length;

      let progress = 0;
      if (totalQuizzes > 0) {
        progress = Math.round((attemptedInThisCourse / totalQuizzes) * 100);
      } else if (e.course._count.materials > 0) {
        progress = 25; // Enrolled and course materials ready
      }

      return {
        id: e.course.id,
        code: e.course.code,
        title: e.course.title,
        description: e.course.description,
        createdAt: e.course.createdAt,
        updatedAt: e.course.updatedAt,
        materials: e.course.materials,
        _count: e.course._count,
        professor: professorName,
        progress,
        myRoleInCourse: e.role,
      };
    });

    res.json({ courses });
  } catch (error: any) {
    console.error('List courses error:', error);
    res.status(500).json({ error: 'Internal server error while fetching courses.' });
  }
}

export async function enrollInCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const { courseCode } = req.body;

    if (!courseCode) {
      return res.status(400).json({ error: 'Course code is required to enroll.' });
    }

    const course = await prisma.course.findUnique({
      where: { code: courseCode.trim().toUpperCase() },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course with specified code was not found.' });
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: course.id,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(409).json({ error: 'You are already enrolled in this course.' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: req.user!.id,
        courseId: course.id,
        role: req.user!.role,
      },
      include: {
        course: true,
      },
    });

    // Notify professors of this course about new student enrollment
    notifyCourseProfessors(course.id, {
      title: 'New Student Enrolled',
      message: `${req.user!.name} (${req.user!.email}) enrolled in ${course.title} (${course.code}).`,
      type: NotificationType.STUDENT_ENROLLED,
      relatedResourceId: req.user!.id,
      linkUrl: '/dashboard/teacher/students',
    }).catch((notifErr) => {
      console.error('[Enrollment] Error notifying professors of new enrollment:', notifErr);
    });

    res.status(201).json({
      message: `Enrolled successfully in ${course.title} (${course.code}).`,
      enrollment,
    });
  } catch (error: any) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Internal server error while enrolling.' });
  }
}

export async function getCourseDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId,
        },
      },
    });

    if (!enrollment && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not authorized to view this course.' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          where: { role: { in: ['PROFESSOR', 'ADMIN'] } },
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        materials: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            fileName: true,
            status: true,
            errorMessage: true,
            createdAt: true,
            uploader: {
              select: { name: true, email: true },
            },
          },
        },
        quizzes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            topic: true,
            createdAt: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const prof = course.enrollments[0]?.user?.name || 'Prof. Faculty';

    res.json({
      course: {
        ...course,
        professor: prof,
      },
      userRole: enrollment ? enrollment.role : req.user!.role,
    });
  } catch (error: any) {
    console.error('Get course details error:', error);
    res.status(500).json({ error: 'Internal server error while fetching course details.' });
  }
}

export async function updateCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const { code, title, description } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required.' });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Course title is required.' });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Course code is required.' });
    }

    const formattedCode = code.trim().toUpperCase();

    // Check course existence
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: true,
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Authorization check: must be Professor teaching this course or Admin
    const isProfessor = course.enrollments.some(
      (e) => e.userId === req.user!.id && (e.role === 'PROFESSOR' || e.role === 'ADMIN')
    );

    if (!isProfessor && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only the course professor or admin can edit this course.' });
    }

    // Check for duplicate course code if code has changed
    if (formattedCode !== course.code) {
      const duplicate = await prisma.course.findFirst({
        where: {
          code: formattedCode,
          id: { not: courseId },
        },
      });

      if (duplicate) {
        return res.status(409).json({ error: `A course with code '${formattedCode}' already exists.` });
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        code: formattedCode,
        title: title.trim(),
        description: description !== undefined ? (description ? description.trim() : null) : course.description,
      },
    });

    // Notify enrolled students of course update
    notifyEnrolledStudents(courseId, {
      title: 'Course Details Updated',
      message: `${updatedCourse.title} (${updatedCourse.code}) details have been updated.`,
      type: NotificationType.COURSE_UPDATE,
      linkUrl: `/dashboard/courses/${courseId}`,
    }).catch((notifErr) => {
      console.error('[CourseUpdate] Failed to send update notification:', notifErr);
    });

    res.json({
      message: 'Course updated successfully.',
      course: updatedCourse,
    });
  } catch (error: any) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error while updating course.' });
  }
}

export async function deleteCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required.' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: true,
        materials: {
          select: { id: true, filePath: true, fileName: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Authorization check: must be Professor teaching this course or Admin
    const isProfessor = course.enrollments.some(
      (e) => e.userId === req.user!.id && (e.role === 'PROFESSOR' || e.role === 'ADMIN')
    );

    if (!isProfessor && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only the course professor or admin can delete this course.' });
    }

    // Clean up uploaded files associated with this course from disk safely
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    for (const mat of course.materials) {
      if (mat.filePath) {
        try {
          const fullPath = path.resolve(uploadDir, mat.filePath);
          if (fullPath.startsWith(uploadDir) && fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`[DeleteCourse] Removed file ${mat.filePath} for material '${mat.fileName}'`);
          }
        } catch (fsErr) {
          console.warn(`[DeleteCourse] Warning: could not delete file on disk (${mat.filePath}):`, fsErr);
        }
      }
    }

    // Delete course in database (cascading deletes enrollments, materials, quizzes, attempts, questions, notifications)
    await prisma.course.delete({
      where: { id: courseId },
    });

    console.log(`[DeleteCourse] Course '${course.title}' (${course.code}, ID: ${courseId}) permanently deleted.`);

    res.json({
      message: `Course '${course.title}' (${course.code}) was permanently deleted.`,
    });
  } catch (error: any) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error while deleting course.' });
  }
}

