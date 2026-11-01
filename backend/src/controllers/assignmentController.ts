import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  calculateSubmissionTiming,
  formatKolkataDateTime,
  getDeadlineCountdown,
} from '../utils/assignmentTiming.js';
import {
  notifyEnrolledStudents,
  notifyCourseProfessors,
} from '../services/notificationService.js';
import { NotificationType, Role } from '@prisma/client';

// Setup upload directories
const baseUploadDir = path.resolve(process.cwd(), 'uploads');
const assignmentsUploadDir = path.resolve(baseUploadDir, 'assignments');
const attachmentsDir = path.resolve(assignmentsUploadDir, 'attachments');
const submissionsDir = path.resolve(assignmentsUploadDir, 'submissions');

for (const dir of [baseUploadDir, assignmentsUploadDir, attachmentsDir, submissionsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Multer storage for assignment attachments and submissions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // If route matches /submit, put in submissionsDir, else attachmentsDir
    if (req.originalUrl.includes('/submit')) {
      cb(null, submissionsDir);
    } else {
      cb(null, attachmentsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

export const uploadAssignmentPdf = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are supported.'));
    }
  },
});

export const uploadAssignmentMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  uploadAssignmentPdf.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res
            .status(400)
            .json({ error: 'File size exceeds maximum allowed upload size (50 MB).' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Invalid upload request.' });
    }
    next();
  });
};

/**
 * Helper: Check if user is professor of course (or ADMIN)
 */
async function checkCourseProfessor(courseId: string, userId: string, userRole?: string) {
  if (userRole === Role.ADMIN) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });
  return enrollment && enrollment.role === Role.PROFESSOR;
}

/**
 * Helper: Check if user is enrolled in course (Student, Professor, or Admin)
 */
async function checkCourseAccess(courseId: string, userId: string, userRole?: string) {
  if (userRole === Role.ADMIN) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });
  return !!enrollment;
}

/**
 * POST /api/courses/:courseId/assignments
 * Create a new assignment (Professor only)
 */
export async function createAssignment(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const { title, description, deadline, status, allowLateSubmission } = req.body;
    const file = req.file;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Assignment title is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Assignment description/instructions are required.' });
    }
    if (!deadline) {
      return res.status(400).json({ error: 'Submission deadline date and time are required.' });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ error: 'Invalid deadline timestamp provided.' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          include: { user: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const isProf = await checkCourseProfessor(courseId, req.user!.id, req.user!.role);
    if (!isProf) {
      return res.status(403).json({ error: 'Only course professors can create assignments.' });
    }

    const assignmentStatus = status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
    const isLateAllowed =
      allowLateSubmission === true ||
      allowLateSubmission === 'true' ||
      allowLateSubmission === '1';

    const attachmentPath = file ? path.relative(baseUploadDir, file.path) : null;

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        professorId: req.user!.id,
        title: title.trim(),
        description: description.trim(),
        deadline: deadlineDate,
        status: assignmentStatus,
        allowLateSubmission: isLateAllowed,
        attachmentPath,
        attachmentName: file ? file.originalname : null,
        attachmentSize: file ? file.size : null,
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        professor: { select: { id: true, name: true, email: true } },
      },
    });

    // If published immediately, dispatch notifications to all enrolled students
    if (assignmentStatus === 'PUBLISHED') {
      const formattedDeadline = formatKolkataDateTime(deadlineDate);
      await notifyEnrolledStudents(courseId, {
        title: `New Assignment: ${assignment.title}`,
        message: `New assignment posted in ${course.code} (${course.title}): "${assignment.title}". Deadline: ${formattedDeadline}.`,
        type: NotificationType.ASSIGNMENT_PUBLISHED,
        relatedResourceId: assignment.id,
        linkUrl: `/dashboard/courses/${courseId}?tab=assignments`,
      });
    }

    console.log(
      `[Assignment] Created assignment '${assignment.title}' in course ${course.code} (Status: ${assignment.status}) by ${req.user!.email}.`
    );

    res.status(201).json({
      message: 'Assignment created successfully.',
      assignment: {
        ...assignment,
        deadlineFormatted: formatKolkataDateTime(assignment.deadline),
      },
    });
  } catch (error: any) {
    console.error('[Assignment] Create error:', error);
    res.status(500).json({ error: error.message || 'Failed to create assignment.' });
  }
}

/**
 * PUT/PATCH /api/assignments/:assignmentId
 * Edit an existing assignment (Professor only)
 */
export async function updateAssignment(req: AuthenticatedRequest, res: Response) {
  try {
    const assignmentId = req.params.assignmentId as string;
    const { title, description, deadline, status, allowLateSubmission } = req.body;
    const file = req.file;

    const existing = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const isProf = await checkCourseProfessor(existing.courseId, req.user!.id, req.user!.role);
    if (!isProf) {
      return res.status(403).json({ error: 'Only course professors can update this assignment.' });
    }

    let deadlineDate = existing.deadline;
    let deadlineChanged = false;
    if (deadline) {
      const parsed = new Date(deadline);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid deadline timestamp provided.' });
      }
      if (parsed.getTime() !== existing.deadline.getTime()) {
        deadlineDate = parsed;
        deadlineChanged = true;
      }
    }

    let newAttachmentPath = existing.attachmentPath;
    let newAttachmentName = existing.attachmentName;
    let newAttachmentSize = existing.attachmentSize;

    if (file) {
      // Remove old attachment if exists
      if (existing.attachmentPath) {
        const oldFile = path.resolve(baseUploadDir, existing.attachmentPath);
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
      newAttachmentPath = path.relative(baseUploadDir, file.path);
      newAttachmentName = file.originalname;
      newAttachmentSize = file.size;
    }

    const newStatus = status ? (status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED') : existing.status;
    const isLateAllowed =
      allowLateSubmission !== undefined
        ? allowLateSubmission === true || allowLateSubmission === 'true' || allowLateSubmission === '1'
        : existing.allowLateSubmission;

    const wasDraft = existing.status === 'DRAFT';
    const isNowPublished = newStatus === 'PUBLISHED';

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: title ? title.trim() : existing.title,
        description: description ? description.trim() : existing.description,
        deadline: deadlineDate,
        status: newStatus,
        allowLateSubmission: isLateAllowed,
        attachmentPath: newAttachmentPath,
        attachmentName: newAttachmentName,
        attachmentSize: newAttachmentSize,
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        professor: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify students if newly published or deadline changed
    if (wasDraft && isNowPublished) {
      await notifyEnrolledStudents(existing.courseId, {
        title: `New Assignment Published: ${updated.title}`,
        message: `Assignment "${updated.title}" in ${existing.course.code} has now been published. Due on ${formatKolkataDateTime(deadlineDate)}.`,
        type: NotificationType.ASSIGNMENT_PUBLISHED,
        relatedResourceId: updated.id,
        linkUrl: `/dashboard/courses/${existing.courseId}?tab=assignments`,
      });
    } else if (deadlineChanged && isNowPublished) {
      await notifyEnrolledStudents(existing.courseId, {
        title: `Assignment Deadline Updated: ${updated.title}`,
        message: `The deadline for "${updated.title}" in ${existing.course.code} has been updated to ${formatKolkataDateTime(deadlineDate)}.`,
        type: NotificationType.ASSIGNMENT_DEADLINE,
        relatedResourceId: updated.id,
        linkUrl: `/dashboard/courses/${existing.courseId}?tab=assignments`,
      });
    }

    res.json({
      message: 'Assignment updated successfully.',
      assignment: {
        ...updated,
        deadlineFormatted: formatKolkataDateTime(updated.deadline),
      },
    });
  } catch (error: any) {
    console.error('[Assignment] Update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update assignment.' });
  }
}

/**
 * DELETE /api/assignments/:assignmentId
 * Delete assignment with confirmation (Professor only)
 */
export async function deleteAssignment(req: AuthenticatedRequest, res: Response) {
  try {
    const assignmentId = req.params.assignmentId as string;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { submissions: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const isProf = await checkCourseProfessor(assignment.courseId, req.user!.id, req.user!.role);
    if (!isProf) {
      return res.status(403).json({ error: 'Only course professors can delete this assignment.' });
    }

    // Clean up attachment file
    if (assignment.attachmentPath) {
      const fullPath = path.resolve(baseUploadDir, assignment.attachmentPath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.warn('[Assignment] Could not remove attachment file:', e);
        }
      }
    }

    // Clean up submission files
    for (const sub of assignment.submissions) {
      if (sub.filePath) {
        const subPath = path.resolve(baseUploadDir, sub.filePath);
        if (fs.existsSync(subPath)) {
          try {
            fs.unlinkSync(subPath);
          } catch (e) {
            console.warn('[Assignment] Could not remove submission file:', e);
          }
        }
      }
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    console.log(`[Assignment] Deleted assignment ${assignmentId} by user ${req.user!.email}.`);
    res.json({ message: 'Assignment and related submissions deleted successfully.' });
  } catch (error: any) {
    console.error('[Assignment] Delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete assignment.' });
  }
}

/**
 * GET /api/courses/:courseId/assignments
 * List assignments for a specific course
 */
export async function getCourseAssignments(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const hasAccess = await checkCourseAccess(courseId, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You are not enrolled in or authorized for this course.' });
    }

    const isProf = await checkCourseProfessor(courseId, userId, userRole);

    // If professor: show all assignments (PUBLISHED and DRAFT)
    // If student: show only PUBLISHED assignments
    const whereClause: any = { courseId };
    if (!isProf) {
      whereClause.status = 'PUBLISHED';
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, code: true, title: true } },
        professor: { select: { id: true, name: true, email: true } },
        submissions: isProf
          ? { select: { id: true, studentId: true, status: true, submittedAt: true, isLate: true } }
          : {
              where: { studentId: userId },
              select: {
                id: true,
                studentId: true,
                status: true,
                submittedAt: true,
                isLate: true,
                timingDescription: true,
                originalFileName: true,
                fileSize: true,
              },
            },
      },
      orderBy: { deadline: 'asc' },
    });

    // Total enrolled students count for professor metrics
    let totalEnrolled = 0;
    if (isProf) {
      totalEnrolled = await prisma.enrollment.count({
        where: { courseId, role: Role.STUDENT },
      });
    }

    const now = new Date();

    const formatted = assignments.map((a) => {
      const deadlineDate = new Date(a.deadline);
      const isPastDeadline = now.getTime() > deadlineDate.getTime();
      const countdown = getDeadlineCountdown(deadlineDate, now);

      if (isProf) {
        const submittedCount = a.submissions.length;
        const notSubmittedCount = Math.max(0, totalEnrolled - submittedCount);
        return {
          id: a.id,
          courseId: a.courseId,
          professorId: a.professorId,
          title: a.title,
          description: a.description,
          deadline: a.deadline,
          deadlineFormatted: formatKolkataDateTime(a.deadline),
          status: a.status,
          allowLateSubmission: a.allowLateSubmission,
          hasAttachment: !!a.attachmentPath,
          attachmentName: a.attachmentName,
          attachmentSize: a.attachmentSize,
          totalEnrolled,
          submittedCount,
          notSubmittedCount,
          isPastDeadline,
          countdown: countdown.countdownText,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          course: a.course,
          professor: a.professor,
        };
      } else {
        const mySub = a.submissions[0] || null;
        const isSubmitted = !!mySub;

        let displayStatus: 'Submitted' | 'Not Submitted' | 'Overdue' | 'Late Submitted';
        if (isSubmitted) {
          displayStatus = mySub.isLate ? 'Late Submitted' : 'Submitted';
        } else if (isPastDeadline) {
          displayStatus = 'Overdue';
        } else {
          displayStatus = 'Not Submitted';
        }

        return {
          id: a.id,
          courseId: a.courseId,
          title: a.title,
          description: a.description,
          deadline: a.deadline,
          deadlineFormatted: formatKolkataDateTime(a.deadline),
          status: a.status,
          allowLateSubmission: a.allowLateSubmission,
          hasAttachment: !!a.attachmentPath,
          attachmentName: a.attachmentName,
          attachmentSize: a.attachmentSize,
          isPastDeadline,
          countdown: countdown.countdownText,
          mySubmission: mySub
            ? {
                ...mySub,
                submittedAtFormatted: formatKolkataDateTime(mySub.submittedAt),
              }
            : null,
          displayStatus,
          canSubmit: !isPastDeadline || a.allowLateSubmission,
          course: a.course,
          professor: a.professor,
        };
      }
    });

    res.json({
      assignments: formatted,
      isProfessor: isProf,
    });
  } catch (error: any) {
    console.error('[Assignment] List error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignments.' });
  }
}

/**
 * GET /api/assignments/:assignmentId
 * Get single assignment details
 */
export async function getAssignmentDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const assignmentId = req.params.assignmentId as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { id: true, code: true, title: true } },
        professor: { select: { id: true, name: true, email: true } },
        submissions: {
          where: { studentId: userId },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const hasAccess = await checkCourseAccess(assignment.courseId, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    const isProf = await checkCourseProfessor(assignment.courseId, userId, userRole);
    const mySub = assignment.submissions[0] || null;
    const now = new Date();
    const isPastDeadline = now.getTime() > new Date(assignment.deadline).getTime();
    const countdown = getDeadlineCountdown(assignment.deadline, now);

    res.json({
      assignment: {
        id: assignment.id,
        courseId: assignment.courseId,
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline,
        deadlineFormatted: formatKolkataDateTime(assignment.deadline),
        status: assignment.status,
        allowLateSubmission: assignment.allowLateSubmission,
        hasAttachment: !!assignment.attachmentPath,
        attachmentName: assignment.attachmentName,
        attachmentSize: assignment.attachmentSize,
        isPastDeadline,
        countdown: countdown.countdownText,
        canSubmit: !isPastDeadline || assignment.allowLateSubmission,
        course: assignment.course,
        professor: assignment.professor,
        mySubmission: mySub
          ? {
              ...mySub,
              submittedAtFormatted: formatKolkataDateTime(mySub.submittedAt),
            }
          : null,
      },
      isProfessor: isProf,
    });
  } catch (error: any) {
    console.error('[Assignment] Details error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignment details.' });
  }
}

/**
 * GET /api/assignments/:assignmentId/submissions
 * Professor submission tracking dashboard:
 * Lists ALL enrolled students, their submission status, timing, and PDF access.
 */
export async function getAssignmentSubmissions(req: AuthenticatedRequest, res: Response) {
  try {
    const assignmentId = req.params.assignmentId as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { role: Role.STUDENT },
              include: {
                user: {
                  select: { id: true, name: true, email: true, profileImage: true },
                },
              },
              orderBy: { user: { name: 'asc' } },
            },
          },
        },
        submissions: {
          include: {
            student: {
              select: { id: true, name: true, email: true, profileImage: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const isProf = await checkCourseProfessor(assignment.courseId, userId, userRole);
    if (!isProf) {
      return res
        .status(403)
        .json({ error: 'Only course professors can view assignment submissions.' });
    }

    const submissionsByStudentId = new Map(
      assignment.submissions.map((sub) => [sub.studentId, sub])
    );

    const now = new Date();
    const isPastDeadline = now.getTime() > new Date(assignment.deadline).getTime();

    // Map ALL enrolled students
    const studentRows = assignment.course.enrollments.map((enrollment) => {
      const student = enrollment.user;
      const sub = submissionsByStudentId.get(student.id);

      if (sub) {
        // Calculate timing info if not stored or for display
        const timing = calculateSubmissionTiming(sub.submittedAt, assignment.deadline);
        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          profileImage: student.profileImage,
          hasSubmitted: true,
          submissionId: sub.id,
          submittedAt: sub.submittedAt,
          submittedAtFormatted: formatKolkataDateTime(sub.submittedAt),
          originalFileName: sub.originalFileName,
          fileSize: sub.fileSize,
          status: sub.status, // SUBMITTED, RESUBMITTED, LATE
          isLate: sub.isLate,
          timingDescription: sub.timingDescription || timing.timingDescription,
          timingShort: timing.timingShort, // e.g. "1 day early", "2h 30m late", "On time"
          grade: sub.grade,
          feedback: sub.feedback,
        };
      } else {
        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          profileImage: student.profileImage,
          hasSubmitted: false,
          submissionId: null,
          submittedAt: null,
          submittedAtFormatted: '—',
          originalFileName: null,
          fileSize: null,
          status: isPastDeadline ? 'OVERDUE' : 'NOT_SUBMITTED',
          isLate: false,
          timingDescription: isPastDeadline ? 'Not submitted (Past deadline)' : 'Not yet submitted',
          timingShort: isPastDeadline ? 'Overdue' : 'Pending',
          grade: null,
          feedback: null,
        };
      }
    });

    const totalStudents = studentRows.length;
    const submittedCount = studentRows.filter((r) => r.hasSubmitted).length;
    const notSubmittedCount = totalStudents - submittedCount;
    const earlyCount = studentRows.filter((r) => r.hasSubmitted && !r.isLate).length;
    const lateCount = studentRows.filter((r) => r.hasSubmitted && r.isLate).length;

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline,
        deadlineFormatted: formatKolkataDateTime(assignment.deadline),
        allowLateSubmission: assignment.allowLateSubmission,
        status: assignment.status,
        hasAttachment: !!assignment.attachmentPath,
        attachmentName: assignment.attachmentName,
        courseCode: assignment.course.code,
        courseTitle: assignment.course.title,
      },
      metrics: {
        totalStudents,
        submittedCount,
        notSubmittedCount,
        earlyCount,
        lateCount,
        submissionRate: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
      },
      submissions: studentRows,
    });
  } catch (error: any) {
    console.error('[Assignment] Submissions error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignment submissions.' });
  }
}

/**
 * POST /api/assignments/:assignmentId/submit
 * Student uploads & submits their assignment PDF.
 * Validates file, compares server timestamp with deadline, calculates timing,
 * and notifies the professor.
 */
export async function submitAssignment(req: AuthenticatedRequest, res: Response) {
  try {
    const assignmentId = req.params.assignmentId as string;
    const studentId = req.user!.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please select a PDF file to submit.' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { userId: studentId, role: Role.STUDENT },
            },
          },
        },
      },
    });

    if (!assignment) {
      // Clean up uploaded file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    if (assignment.status !== 'PUBLISHED') {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'This assignment is not yet published.' });
    }

    // Check student enrollment in the course
    const isEnrolled = assignment.course.enrollments.length > 0;
    if (!isEnrolled && req.user!.role !== Role.ADMIN) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res
        .status(403)
        .json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    // Server-recorded submission timestamp
    const serverTimestamp = new Date();
    const deadline = new Date(assignment.deadline);

    // Calculate early/late submission timing dynamically
    const timing = calculateSubmissionTiming(serverTimestamp, deadline);

    // If deadline has passed and late submission is NOT allowed:
    if (timing.isLate && !assignment.allowLateSubmission) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        error: `Submission deadline has passed. Late submissions are not permitted for this assignment. (Deadline was: ${formatKolkataDateTime(deadline)})`,
      });
    }

    const relativePath = path.relative(baseUploadDir, file.path);

    // Check for existing submission to support resubmission
    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
    });

    let submission;
    const isResubmission = !!existingSubmission;

    if (existingSubmission) {
      // Clean up previously submitted file
      if (existingSubmission.filePath) {
        const oldFile = path.resolve(baseUploadDir, existingSubmission.filePath);
        if (fs.existsSync(oldFile)) {
          try {
            fs.unlinkSync(oldFile);
          } catch (e) {
            console.warn('[Assignment] Failed to delete old submission file:', e);
          }
        }
      }

      submission = await prisma.assignmentSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          filePath: relativePath,
          originalFileName: file.originalname,
          fileSize: file.size,
          submittedAt: serverTimestamp,
          status: timing.isLate ? 'LATE' : 'RESUBMITTED',
          isLate: timing.isLate,
          timingDescription: timing.timingDescription,
        },
      });
    } else {
      submission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId,
          studentId,
          filePath: relativePath,
          originalFileName: file.originalname,
          fileSize: file.size,
          submittedAt: serverTimestamp,
          status: timing.isLate ? 'LATE' : 'SUBMITTED',
          isLate: timing.isLate,
          timingDescription: timing.timingDescription,
        },
      });
    }

    // Notify professor of the course
    const studentUser = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, email: true },
    });
    const studentName = studentUser?.name || 'A student';

    await notifyCourseProfessors(assignment.courseId, {
      title: isResubmission ? 'Assignment Resubmitted' : 'Assignment Submitted',
      message: `${studentName} has ${
        isResubmission ? 'resubmitted' : 'submitted'
      } assignment "${assignment.title}" in ${assignment.course.code} (${timing.timingShort}).`,
      type: NotificationType.ASSIGNMENT_SUBMISSION,
      relatedResourceId: assignment.id,
      linkUrl: `/dashboard/courses/${assignment.courseId}?tab=assignments`,
    });

    console.log(
      `[Assignment] Student ${studentName} (${studentId}) submitted assignment '${assignment.title}'. Timing: ${timing.timingDescription}`
    );

    res.status(200).json({
      message: timing.timingDescription,
      submission: {
        ...submission,
        submittedAtFormatted: formatKolkataDateTime(submission.submittedAt),
        timingDescription: timing.timingDescription,
        timingShort: timing.timingShort,
      },
    });
  } catch (error: any) {
    console.error('[Assignment] Submit error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit assignment.' });
  }
}

/**
 * GET /api/assignments/:assignmentId/attachment
 * Securely stream professor's reference attachment PDF
 */
export async function serveAssignmentAttachment(req: AuthenticatedRequest, res: Response) {
  try {
    const assignmentId = req.params.assignmentId as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          include: { enrollments: true },
        },
      },
    });

    if (!assignment || !assignment.attachmentPath) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    const isMember = assignment.course.enrollments.some((e) => e.userId === userId);
    if (!isMember && userRole !== Role.ADMIN) {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    const fullPath = path.resolve(baseUploadDir, assignment.attachmentPath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Attachment file on disk not found.' });
    }

    const safeFilename = assignment.attachmentName || 'assignment-reference.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (error: any) {
    console.error('[Assignment] Stream attachment error:', error);
    res.status(500).json({ error: 'Failed to stream attachment file.' });
  }
}

/**
 * GET /api/assignments/submissions/:submissionId/file
 * Securely stream student's submitted assignment PDF.
 * Only authorized professor or the submitting student can view.
 */
export async function serveSubmissionFile(req: AuthenticatedRequest, res: Response) {
  try {
    const submissionId = req.params.submissionId as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            course: {
              include: { enrollments: true },
            },
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Check authorization: must be submitting student or course professor or admin
    const isOwner = submission.studentId === userId;
    const isProf = submission.assignment.course.enrollments.some(
      (e) => e.userId === userId && (e.role === Role.PROFESSOR || userRole === Role.ADMIN)
    );

    if (!isOwner && !isProf && userRole !== Role.ADMIN) {
      return res
        .status(403)
        .json({ error: 'Access denied. You are not authorized to view this submission.' });
    }

    const fullPath = path.resolve(baseUploadDir, submission.filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Submitted file on disk not found.' });
    }

    const safeFilename = submission.originalFileName || 'submission.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (error: any) {
    console.error('[Assignment] Stream submission error:', error);
    res.status(500).json({ error: 'Failed to stream submission file.' });
  }
}

/**
 * GET /api/assignments/timeline
 * Student and Professor timeline feed with chronological deadlines and status
 */
export async function getTimeline(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const now = new Date();

    if (userRole === Role.PROFESSOR) {
      // Professor timeline: courses they teach
      const professorCourses = await prisma.enrollment.findMany({
        where: {
          userId,
          role: { in: [Role.PROFESSOR, Role.ADMIN] },
        },
        select: { courseId: true },
      });
      const courseIds = professorCourses.map((e) => e.courseId);

      const assignments = await prisma.assignment.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          course: { select: { id: true, code: true, title: true } },
          submissions: {
            include: {
              student: { select: { id: true, name: true, email: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
        },
        orderBy: { deadline: 'asc' },
      });

      // Get enrollment count for each course
      const enrollments = await prisma.enrollment.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds }, role: Role.STUDENT },
        _count: { userId: true },
      });
      const enrolledMap = new Map(enrollments.map((e) => [e.courseId, e._count.userId]));

      const timelineItems = assignments.map((a) => {
        const deadlineDate = new Date(a.deadline);
        const isPastDeadline = now.getTime() > deadlineDate.getTime();
        const countdown = getDeadlineCountdown(deadlineDate, now);
        const totalEnrolled = enrolledMap.get(a.courseId) || 0;
        const submittedCount = a.submissions.length;
        const notSubmittedCount = Math.max(0, totalEnrolled - submittedCount);

        let timelineStatus: 'Upcoming' | 'Overdue' | 'Draft' | 'Completed';
        if (a.status === 'DRAFT') {
          timelineStatus = 'Draft';
        } else if (submittedCount >= totalEnrolled && totalEnrolled > 0) {
          timelineStatus = 'Completed';
        } else if (isPastDeadline) {
          timelineStatus = 'Overdue';
        } else {
          timelineStatus = 'Upcoming';
        }

        return {
          id: a.id,
          courseId: a.courseId,
          courseCode: a.course.code,
          courseTitle: a.course.title,
          title: a.title,
          description: a.description,
          deadline: a.deadline,
          deadlineFormatted: formatKolkataDateTime(a.deadline),
          countdown: countdown.countdownText,
          isPastDeadline,
          status: a.status,
          timelineStatus,
          totalEnrolled,
          submittedCount,
          notSubmittedCount,
          recentSubmissions: a.submissions.slice(0, 3).map((s) => ({
            studentName: s.student.name,
            submittedAtFormatted: formatKolkataDateTime(s.submittedAt),
            timingShort: s.timingDescription,
            isLate: s.isLate,
          })),
        };
      });

      return res.json({
        timeline: timelineItems,
        isProfessor: true,
      });
    }

    // Student timeline: courses student is enrolled in
    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        role: Role.STUDENT,
      },
      select: { courseId: true },
    });
    const courseIds = studentEnrollments.map((e) => e.courseId);

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'PUBLISHED',
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        professor: { select: { id: true, name: true, email: true } },
        submissions: {
          where: { studentId: userId },
        },
      },
      orderBy: { deadline: 'asc' },
    });

    const timelineItems = assignments.map((a) => {
      const deadlineDate = new Date(a.deadline);
      const isPastDeadline = now.getTime() > deadlineDate.getTime();
      const countdown = getDeadlineCountdown(deadlineDate, now);
      const mySub = a.submissions[0] || null;

      let status: 'Submitted' | 'Not Submitted' | 'Overdue' | 'Upcoming';
      if (mySub) {
        status = 'Submitted';
      } else if (isPastDeadline) {
        status = 'Overdue';
      } else {
        status = 'Upcoming';
      }

      return {
        id: a.id,
        courseId: a.courseId,
        courseCode: a.course.code,
        courseTitle: a.course.title,
        professorName: a.professor.name,
        title: a.title,
        description: a.description,
        deadline: a.deadline,
        deadlineFormatted: formatKolkataDateTime(a.deadline),
        countdown: countdown.countdownText,
        isPastDeadline,
        status, // 'Submitted' | 'Not Submitted' | 'Overdue' | 'Upcoming'
        hasAttachment: !!a.attachmentPath,
        attachmentName: a.attachmentName,
        canSubmit: !isPastDeadline || a.allowLateSubmission,
        submission: mySub
          ? {
              id: mySub.id,
              submittedAt: mySub.submittedAt,
              submittedAtFormatted: formatKolkataDateTime(mySub.submittedAt),
              timingDescription: mySub.timingDescription,
              isLate: mySub.isLate,
              originalFileName: mySub.originalFileName,
            }
          : null,
      };
    });

    res.json({
      timeline: timelineItems,
      isProfessor: false,
    });
  } catch (error: any) {
    console.error('[Assignment] Timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignment timeline.' });
  }
}

/**
 * GET /api/assignments/my-assignments
 * Dedicated list of assignments for student across all their enrolled courses
 */
export async function getStudentAssignments(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const studentEnrollments = await prisma.enrollment.findMany({
      where: { userId, role: Role.STUDENT },
      select: { courseId: true },
    });
    const courseIds = studentEnrollments.map((e) => e.courseId);

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'PUBLISHED',
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        professor: { select: { id: true, name: true, email: true } },
        submissions: {
          where: { studentId: userId },
        },
      },
      orderBy: { deadline: 'asc' },
    });

    const formatted = assignments.map((a) => {
      const deadlineDate = new Date(a.deadline);
      const isPastDeadline = now.getTime() > deadlineDate.getTime();
      const countdown = getDeadlineCountdown(deadlineDate, now);
      const mySub = a.submissions[0] || null;

      let status: 'Submitted' | 'Not Submitted' | 'Overdue';
      if (mySub) {
        status = 'Submitted';
      } else if (isPastDeadline) {
        status = 'Overdue';
      } else {
        status = 'Not Submitted';
      }

      return {
        id: a.id,
        courseId: a.courseId,
        courseCode: a.course.code,
        courseTitle: a.course.title,
        professorName: a.professor.name,
        title: a.title,
        description: a.description,
        deadline: a.deadline,
        deadlineFormatted: formatKolkataDateTime(a.deadline),
        countdown: countdown.countdownText,
        isPastDeadline,
        status,
        allowLateSubmission: a.allowLateSubmission,
        hasAttachment: !!a.attachmentPath,
        attachmentName: a.attachmentName,
        canSubmit: !isPastDeadline || a.allowLateSubmission,
        mySubmission: mySub
          ? {
              id: mySub.id,
              submittedAt: mySub.submittedAt,
              submittedAtFormatted: formatKolkataDateTime(mySub.submittedAt),
              timingDescription: mySub.timingDescription,
              isLate: mySub.isLate,
              originalFileName: mySub.originalFileName,
            }
          : null,
      };
    });

    res.json({ assignments: formatted });
  } catch (error: any) {
    console.error('[Assignment] My assignments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignments.' });
  }
}

/**
 * GET /api/assignments/professor
 * Dedicated list of all assignments created by professor across all their courses
 */
export async function getProfessorAssignments(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const assignments = await prisma.assignment.findMany({
      where: { professorId: userId },
      include: {
        course: { select: { id: true, code: true, title: true } },
        submissions: {
          select: { id: true, studentId: true, isLate: true, submittedAt: true },
        },
      },
      orderBy: { deadline: 'desc' },
    });

    const courseIds = Array.from(new Set(assignments.map((a) => a.courseId)));
    const enrollments = await prisma.enrollment.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds }, role: Role.STUDENT },
      _count: { userId: true },
    });
    const enrolledMap = new Map(enrollments.map((e) => [e.courseId, e._count.userId]));

    const formatted = assignments.map((a) => {
      const totalEnrolled = enrolledMap.get(a.courseId) || 0;
      const submittedCount = a.submissions.length;
      const notSubmittedCount = Math.max(0, totalEnrolled - submittedCount);
      const isPastDeadline = now.getTime() > new Date(a.deadline).getTime();
      const countdown = getDeadlineCountdown(a.deadline, now);

      return {
        id: a.id,
        courseId: a.courseId,
        courseCode: a.course.code,
        courseTitle: a.course.title,
        title: a.title,
        description: a.description,
        deadline: a.deadline,
        deadlineFormatted: formatKolkataDateTime(a.deadline),
        countdown: countdown.countdownText,
        isPastDeadline,
        status: a.status,
        allowLateSubmission: a.allowLateSubmission,
        hasAttachment: !!a.attachmentPath,
        attachmentName: a.attachmentName,
        totalEnrolled,
        submittedCount,
        notSubmittedCount,
        lateCount: a.submissions.filter((s) => s.isLate).length,
      };
    });

    res.json({ assignments: formatted });
  } catch (error: any) {
    console.error('[Assignment] Professor assignments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignments.' });
  }
}
