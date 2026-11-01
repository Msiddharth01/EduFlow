import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  queueQuizGenerationForMaterial,
  generateMissingQuizzesForCourse,
} from '../services/quizGeneratorService.js';
import {
  createNotification,
  notifyEnrolledStudents,
  notifyCourseProfessors,
} from '../services/notificationService.js';
import { NotificationType } from '@prisma/client';

/**
 * List all quizzes for a course, including material linkage, generation status, and student attempts
 */
export async function listQuizzes(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const materialId = req.query.materialId as string | undefined;
    const userId = req.user!.id;

    // Check course enrollment or admin
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    const whereClause: any = { courseId };
    if (materialId) {
      whereClause.materialId = materialId;
    }

    const quizzes: any[] = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        material: {
          select: {
            id: true,
            title: true,
            fileName: true,
            status: true,
          },
        },
        _count: { select: { questions: true, attempts: true } },
        attempts: {
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = quizzes.map((q: any) => ({
      id: q.id,
      courseId: q.courseId,
      materialId: q.materialId,
      title: q.title,
      topic: q.topic,
      status: q.status || 'READY',
      errorMessage: q.errorMessage || null,
      material: q.material || null,
      questionCount: q._count?.questions ?? 0,
      totalAttempts: q._count?.attempts ?? 0,
      myLatestAttempt: q.attempts?.[0] || null,
      createdAt: q.createdAt,
    }));

    res.json({ quizzes: formatted });
  } catch (error: any) {
    console.error('[QuizController] List quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
}

/**
 * Get quiz details with questions for student attempt (HIDES correctIndex)
 */
export async function getQuizForStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.quizId as string;
    const userId = req.user!.id;

    const quiz: any = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          include: {
            enrollments: true,
          },
        },
        material: {
          select: {
            id: true,
            title: true,
            fileName: true,
            status: true,
            courseId: true,
          },
        },
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            pageReference: true,
            questionType: true,
            difficulty: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    // Strict Course & Material Isolation Check
    if (quiz.material && quiz.material.courseId !== quiz.courseId) {
      console.warn(`[QuizController] Isolation conflict detected on Quiz ${quizId}: Material belongs to ${quiz.material.courseId}, but Quiz belongs to ${quiz.courseId}`);
      return res.status(400).json({ error: 'Course isolation error: Quiz material association is mismatched.' });
    }

    // Check enrollment
    const isEnrolled = quiz.course.enrollments.some((e: any) => e.userId === userId);
    if (!isEnrolled && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    if (quiz.status === 'PROCESSING') {
      return res.status(400).json({ error: 'This quiz is currently being generated. Please wait a moment.' });
    }

    if (quiz.status === 'FAILED') {
      return res.status(400).json({
        error: quiz.errorMessage || 'Quiz generation failed. Please request a retry.',
        canRetry: true,
      });
    }

    const { enrollments, ...cleanCourse } = quiz.course;

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        status: quiz.status,
        courseId: quiz.courseId,
        materialId: quiz.materialId,
        material: quiz.material,
        course: cleanCourse,
        questions: quiz.questions,
      },
    });
  } catch (error: any) {
    console.error('[QuizController] Get quiz for student error:', error);
    res.status(500).json({ error: 'Failed to retrieve quiz questions.' });
  }
}

/**
 * Submit quiz answers, score on backend, store attempt & answer records
 */
export async function submitQuizAttempt(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.quizId as string;
    const { answers } = req.body; // Array of { questionId: string, selectedOption: number }
    const studentId = req.user!.id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be provided as an array.' });
    }

    const quiz: any = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          include: {
            enrollments: true,
          },
        },
        questions: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    // Verify enrollment
    const isEnrolled = quiz.course.enrollments.some((e: any) => e.userId === studentId);
    if (!isEnrolled && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    let score = 0;
    const evaluatedAnswers: Array<{
      questionId: string;
      selectedOption: number;
      isCorrect: boolean;
      correctOption: number;
      explanation: string;
      questionText: string;
      questionType?: string;
      difficulty?: string;
    }> = [];

    for (const q of quiz.questions) {
      const userAns = answers.find((a: any) => a.questionId === q.id);
      const selectedOption = userAns !== undefined ? userAns.selectedOption : -1;
      const isCorrect = selectedOption === q.correctIndex;
      if (isCorrect) score += 1;

      evaluatedAnswers.push({
        questionId: q.id,
        selectedOption,
        isCorrect,
        correctOption: q.correctIndex,
        explanation: q.explanation,
        questionText: q.questionText,
        questionType: q.questionType || 'CONCEPTUAL',
        difficulty: q.difficulty || 'MEDIUM',
      });
    }

    const maxScore = quiz.questions.length;

    // Create DB attempt record
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        score,
        maxScore,
        answers: {
          create: evaluatedAnswers.map((ea) => ({
            questionId: ea.questionId,
            selectedOption: ea.selectedOption,
            isCorrect: ea.isCorrect,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Send quiz result notification to student
    createNotification({
      recipientUserId: studentId,
      courseId: quiz.courseId,
      title: 'Quiz Result Available',
      message: `You scored ${score}/${maxScore} (${percentage}%) on "${quiz.title}".`,
      type: NotificationType.QUIZ_RESULT,
      relatedResourceId: attempt.id,
      linkUrl: `/dashboard/courses/${quiz.courseId}`,
    }).catch((err) => console.error('[QuizAttempt] Error notifying student:', err));

    // Send notification to course professors
    notifyCourseProfessors(quiz.courseId, {
      title: 'Student Quiz Submission',
      message: `${req.user!.name} completed "${quiz.title}" with a score of ${percentage}%.`,
      type: NotificationType.ASSIGNMENT_SUBMISSION,
      relatedResourceId: attempt.id,
      linkUrl: `/dashboard/teacher/quizzes`,
    }).catch((err) => console.error('[QuizAttempt] Error notifying professor:', err));

    res.status(201).json({
      message: 'Quiz evaluated successfully.',
      attempt: {
        id: attempt.id,
        score,
        maxScore,
        percentage,
        createdAt: attempt.createdAt,
      },
      results: evaluatedAnswers,
    });
  } catch (error: any) {
    console.error('[QuizController] Submit quiz attempt error:', error);
    res.status(500).json({ error: 'Failed to submit quiz attempt.' });
  }
}

/**
 * Professor or system creates a custom quiz
 */
export async function createQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const { title, topic, materialId, questions } = req.body;

    if (!title || !topic || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title, topic, and at least one question are required.' });
    }

    for (const q of questions) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2 || q.correctIndex === undefined) {
        return res.status(400).json({ error: 'Each question must have text, at least 2 options, and a valid correctIndex.' });
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        materialId: materialId || null,
        title: title.trim(),
        topic: topic.trim(),
        status: 'READY',
        questions: {
          create: questions.map((q: any) => ({
            questionText: q.questionText.trim(),
            options: q.options.map((o: any) => String(o).trim()),
            correctIndex: Number(q.correctIndex),
            explanation: q.explanation ? String(q.explanation).trim() : 'Correct answer verified by course material.',
            pageReference: q.pageReference ? Number(q.pageReference) : null,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    // Notify enrolled students about the newly published quiz
    notifyEnrolledStudents(courseId, {
      title: 'New Quiz Published',
      message: `A new quiz "${quiz.title}" has been published in your course.`,
      type: NotificationType.QUIZ_PUBLISHED,
      relatedResourceId: quiz.id,
      linkUrl: `/dashboard/courses/${courseId}`,
    }).catch((err) => console.error('[QuizCreate] Error notifying students:', err));

    res.status(201).json({
      message: 'Quiz created successfully.',
      quiz,
    });
  } catch (error: any) {
    console.error('[QuizController] Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz.' });
  }
}

/**
 * Generate AI Practice Quiz for a specific material or missing materials in the course
 */
export async function generateQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const { materialId, topic, questionCount = 10, force = false } = req.body;

    // Check course enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId,
        },
      },
    });

    if (!enrollment && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    let targetMaterialId = materialId;

    // If materialId was not passed but a topic/search string was passed, locate matching material in this course
    if (!targetMaterialId && topic && typeof topic === 'string' && topic.trim().length > 0) {
      const matchedMat = await prisma.material.findFirst({
        where: {
          courseId,
          status: 'READY',
          OR: [
            { title: { contains: topic.trim(), mode: 'insensitive' } },
            { fileName: { contains: topic.trim(), mode: 'insensitive' } },
          ],
        },
      });
      if (matchedMat) {
        targetMaterialId = matchedMat.id;
      }
    }

    if (targetMaterialId) {
      // Validate material belongs to this exact course
      const material = await prisma.material.findUnique({
        where: { id: targetMaterialId },
        select: { id: true, courseId: true, title: true, status: true },
      });

      if (!material) {
        return res.status(404).json({ error: 'Target material not found.' });
      }

      if (material.courseId !== courseId) {
        return res.status(400).json({
          error: `Course isolation violation: Material "${material.title}" does not belong to this course.`,
        });
      }

      // Generate quiz strictly for this material
      const result = await queueQuizGenerationForMaterial(courseId, targetMaterialId, questionCount, force);
      const quiz = await prisma.quiz.findUnique({
        where: { id: result.quizId },
        include: {
          material: { select: { id: true, title: true, fileName: true, status: true } },
          _count: { select: { questions: true } },
        },
      });

      return res.status(result.success ? 200 : 400).json({
        message: result.message,
        quiz,
      });
    }

    // MaterialId was not provided: scan and generate for materials lacking quizzes in this course
    const missingRes = await generateMissingQuizzesForCourse(courseId);
    if (missingRes.processedCount === 0) {
      // If all materials have quizzes, find first ready material to practice or return message
      return res.json({
        message: 'All available materials already have practice quizzes.',
        quizzes: missingRes.quizzes,
      });
    }

    res.status(201).json({
      message: `Generated ${missingRes.processedCount} quizzes for course materials.`,
      quizzes: missingRes.quizzes,
    });
  } catch (error: any) {
    console.error('[QuizController] Generate quiz error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate practice quiz.' });
  }
}

/**
 * Scan course materials and generate quizzes for all READY materials that don't have one
 */
export async function generateMissingQuizzes(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId,
        },
      },
    });

    if (!enrollment && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    const result = await generateMissingQuizzesForCourse(courseId);
    res.json({
      message: `Checked course materials. Generated ${result.processedCount} new quizzes.`,
      processedCount: result.processedCount,
      quizzes: result.quizzes,
    });
  } catch (error: any) {
    console.error('[QuizController] Generate missing quizzes error:', error);
    res.status(500).json({ error: 'Failed to generate missing quizzes.' });
  }
}

/**
 * Retry generation for a failed quiz
 */
export async function retryQuizGeneration(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.quizId as string;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: { include: { enrollments: true } },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    const isAuthorized =
      req.user!.role === 'ADMIN' ||
      quiz.course.enrollments.some(
        (e: any) => e.userId === req.user!.id && (e.role === 'PROFESSOR' || e.role === 'STUDENT')
      );

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!quiz.materialId) {
      return res.status(400).json({ error: 'This quiz is not linked to a course material and cannot be re-extracted.' });
    }

    const result = await queueQuizGenerationForMaterial(quiz.courseId, quiz.materialId, 10, true, quizId);
    res.json({
      message: result.message,
      success: result.success,
    });
  } catch (error: any) {
    console.error('[QuizController] Retry quiz error:', error);
    res.status(500).json({ error: 'Failed to retry quiz generation.' });
  }
}

/**
 * Generate or retry quiz for a specific material via materialId
 */
export async function generateQuizForMaterialEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const materialId = req.params.materialId as string;
    const { questionCount = 10, force = false } = req.body;

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        course: { include: { enrollments: true } },
      },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const isAuthorized =
      req.user!.role === 'ADMIN' ||
      material.course.enrollments.some((e: any) => e.userId === req.user!.id);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (material.status !== 'READY') {
      return res.status(400).json({
        error: `Material is in '${material.status}' state. Text extraction must succeed before generating a quiz.`,
      });
    }

    const result = await queueQuizGenerationForMaterial(material.courseId, materialId, questionCount, force);
    const quiz = await prisma.quiz.findUnique({
      where: { id: result.quizId },
      include: {
        material: { select: { id: true, title: true, fileName: true, status: true } },
        _count: { select: { questions: true } },
      },
    });

    res.status(result.success ? 200 : 400).json({
      message: result.message,
      quiz,
    });
  } catch (error: any) {
    console.error('[QuizController] Generate quiz for material error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz for material.' });
  }
}
