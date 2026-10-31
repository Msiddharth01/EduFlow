import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

/**
 * Get aggregated teacher dashboard metrics, courses, student performance, weak topics, and quiz analytics
 */
export async function getTeacherDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    const teacherId = req.user!.id;

    // Find all courses where this user is enrolled as PROFESSOR or ADMIN
    const teacherEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: teacherId,
        role: { in: ['PROFESSOR', 'ADMIN'] },
      },
      include: {
        course: {
          include: {
            enrollments: {
              where: { role: 'STUDENT' },
              include: {
                user: {
                  select: { id: true, name: true, email: true, profileImage: true, createdAt: true },
                },
              },
            },
            materials: {
              select: { id: true, title: true, fileName: true, status: true, createdAt: true },
            },
            quizzes: {
              include: {
                material: { select: { id: true, title: true, fileName: true } },
                questions: {
                  select: { id: true, questionText: true, explanation: true, pageReference: true },
                },
                attempts: {
                  include: {
                    student: { select: { id: true, name: true, email: true, profileImage: true } },
                    answers: true,
                  },
                },
                _count: { select: { questions: true, attempts: true } },
              },
            },
          },
        },
      },
    });

    const teacherCourses = teacherEnrollments.map((te) => te.course);
    const courseIds = teacherCourses.map((c) => c.id);

    // 1. Gather all student enrollments across teacher's courses
    const studentMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      profileImage: string | null;
      enrolledCourses: Array<{ courseId: string; courseCode: string; courseTitle: string; enrolledAt: Date }>;
      attempts: Array<{
        attemptId: string;
        quizId: string;
        quizTitle: string;
        courseCode: string;
        score: number;
        maxScore: number;
        percentage: number;
        createdAt: Date;
      }>;
    }>();

    for (const course of teacherCourses) {
      for (const enr of course.enrollments) {
        if (!studentMap.has(enr.user.id)) {
          studentMap.set(enr.user.id, {
            id: enr.user.id,
            name: enr.user.name,
            email: enr.user.email,
            profileImage: enr.user.profileImage,
            enrolledCourses: [],
            attempts: [],
          });
        }
        const studentEntry = studentMap.get(enr.user.id)!;
        if (!studentEntry.enrolledCourses.some((c) => c.courseId === course.id)) {
          studentEntry.enrolledCourses.push({
            courseId: course.id,
            courseCode: course.code,
            courseTitle: course.title,
            enrolledAt: enr.createdAt,
          });
        }
      }
    }

    // 2. Collect all quiz attempts submitted across teacher's courses by enrolled students
    let totalScoreSum = 0;
    let totalMaxScoreSum = 0;
    const allAttempts: Array<{
      id: string;
      quizId: string;
      quizTitle: string;
      courseCode: string;
      studentId: string;
      studentName: string;
      studentEmail: string;
      score: number;
      maxScore: number;
      percentage: number;
      createdAt: Date;
    }> = [];

    let totalMaterialsCount = 0;
    let totalQuizzesCount = 0;

    for (const course of teacherCourses) {
      totalMaterialsCount += course.materials.length;
      totalQuizzesCount += course.quizzes.length;

      for (const quiz of course.quizzes) {
        for (const attempt of quiz.attempts) {
          // Strictly only include attempts from students enrolled in this teacher's courses
          if (!studentMap.has(attempt.studentId)) {
            continue;
          }

          totalScoreSum += attempt.score;
          totalMaxScoreSum += attempt.maxScore;

          const percentage = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
          const attemptData = {
            id: attempt.id,
            quizId: quiz.id,
            quizTitle: quiz.title,
            courseCode: course.code,
            studentId: attempt.studentId,
            studentName: attempt.student.name,
            studentEmail: attempt.student.email,
            score: attempt.score,
            maxScore: attempt.maxScore,
            percentage,
            createdAt: attempt.createdAt,
          };

          allAttempts.push(attemptData);

          studentMap.get(attempt.studentId)!.attempts.push({
            attemptId: attempt.id,
            quizId: quiz.id,
            quizTitle: quiz.title,
            courseCode: course.code,
            score: attempt.score,
            maxScore: attempt.maxScore,
            percentage,
            createdAt: attempt.createdAt,
          });
        }
      }
    }

    // 3. Compute Student Performance Summary
    const studentsList = Array.from(studentMap.values()).map((s) => {
      const totalAttempts = s.attempts.length;
      let averageScore: number | null = null;
      let status: 'NEEDS_SUPPORT' | 'GOOD' | 'NO_ATTEMPTS' = 'NO_ATTEMPTS';

      if (totalAttempts > 0) {
        const studentScoreSum = s.attempts.reduce((sum, a) => sum + a.score, 0);
        const studentMaxSum = s.attempts.reduce((sum, a) => sum + a.maxScore, 0);
        averageScore = studentMaxSum > 0 ? Math.round((studentScoreSum / studentMaxSum) * 100) : 0;
        status = averageScore < 60 ? 'NEEDS_SUPPORT' : 'GOOD';
      }

      // Latest activity
      const latestAttemptDate = s.attempts.length > 0
        ? new Date(Math.max(...s.attempts.map((a) => new Date(a.createdAt).getTime())))
        : null;
      const latestEnrollDate = s.enrolledCourses.length > 0
        ? new Date(Math.max(...s.enrolledCourses.map((c) => new Date(c.enrolledAt).getTime())))
        : null;
      const lastActivity = latestAttemptDate || latestEnrollDate;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        courseCount: s.enrolledCourses.length,
        courses: s.enrolledCourses,
        totalAttempts,
        averageScore,
        status,
        lastActivity,
      };
    });

    // 4. Compute Top Summary Cards
    const totalStudents = studentMap.size;
    const averageQuizScore = totalMaxScoreSum > 0 ? Math.round((totalScoreSum / totalMaxScoreSum) * 100) : 0;
    // Students needing support: average score < 60% among those with >= 1 attempt
    const studentsNeedingSupportCount = studentsList.filter((s) => s.status === 'NEEDS_SUPPORT').length;

    // 5. Weak Topics Analytics
    // Fetch all AttemptAnswer records for quizzes in teacher's courses
    const allQuizIds = teacherCourses.flatMap((c) => c.quizzes.map((q) => q.id));
    const attemptAnswers = await prisma.attemptAnswer.findMany({
      where: {
        attempt: {
          quizId: { in: allQuizIds },
        },
      },
      include: {
        attempt: {
          select: { studentId: true, quizId: true },
        },
        question: {
          select: {
            id: true,
            questionText: true,
            explanation: true,
            pageReference: true,
            quiz: {
              select: { id: true, title: true, topic: true, materialId: true, material: { select: { title: true, fileName: true } } },
            },
          },
        },
      },
    });

    const topicStatsMap = new Map<string, {
      topic: string;
      materialTitle: string;
      materialFileName: string;
      materialId: string | null;
      quizId: string;
      quizTitle: string;
      totalAnswered: number;
      correctAnswered: number;
      incorrectAnswered: number;
      strugglingStudents: Set<string>;
      sampleQuestions: Array<{ id: string; text: string; pageReference: number | null; incorrectCount: number }>;
    }>();

    for (const ans of attemptAnswers) {
      const topic = ans.question.quiz.topic || 'General';
      const key = `${ans.question.quiz.id}_${topic}`;

      if (!topicStatsMap.has(key)) {
        topicStatsMap.set(key, {
          topic,
          materialTitle: ans.question.quiz.material?.title || topic,
          materialFileName: ans.question.quiz.material?.fileName || 'Material',
          materialId: ans.question.quiz.materialId,
          quizId: ans.question.quiz.id,
          quizTitle: ans.question.quiz.title,
          totalAnswered: 0,
          correctAnswered: 0,
          incorrectAnswered: 0,
          strugglingStudents: new Set(),
          sampleQuestions: [],
        });
      }

      const item = topicStatsMap.get(key)!;
      item.totalAnswered += 1;
      if (ans.isCorrect) {
        item.correctAnswered += 1;
      } else {
        item.incorrectAnswered += 1;
        item.strugglingStudents.add(ans.attempt.studentId);

        let sq = item.sampleQuestions.find((q) => q.id === ans.question.id);
        if (!sq) {
          sq = {
            id: ans.question.id,
            text: ans.question.questionText,
            pageReference: ans.question.pageReference,
            incorrectCount: 0,
          };
          item.sampleQuestions.push(sq);
        }
        sq.incorrectCount += 1;
      }
    }

    const weakTopics = Array.from(topicStatsMap.values())
      .map((t) => {
        const accuracyRate = t.totalAnswered > 0 ? Math.round((t.correctAnswered / t.totalAnswered) * 100) : 100;
        return {
          topic: t.topic,
          materialTitle: t.materialTitle,
          materialFileName: t.materialFileName,
          materialId: t.materialId,
          quizId: t.quizId,
          quizTitle: t.quizTitle,
          totalAnswers: t.totalAnswered,
          accuracyRate,
          incorrectCount: t.incorrectAnswered,
          affectedStudentsCount: t.strugglingStudents.size,
          isWeak: accuracyRate < 60 || t.strugglingStudents.size > 0,
          sampleQuestions: t.sampleQuestions.sort((a, b) => b.incorrectCount - a.incorrectCount).slice(0, 3),
        };
      })
      .sort((a, b) => a.accuracyRate - b.accuracyRate);

    // 6. Course Overview with Class Performance
    const coursesOverview = teacherCourses.map((c) => {
      const courseQuizzes = c.quizzes;
      const courseAttempts = courseQuizzes.flatMap((q) => q.attempts);
      const cScoreSum = courseAttempts.reduce((sum, a) => sum + a.score, 0);
      const cMaxSum = courseAttempts.reduce((sum, a) => sum + a.maxScore, 0);
      const classAverage = cMaxSum > 0 ? Math.round((cScoreSum / cMaxSum) * 100) : null;

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        enrollmentCount: c.enrollments.length,
        materialCount: c.materials.length,
        quizCount: c.quizzes.length,
        totalAttempts: courseAttempts.length,
        classAverage,
        createdAt: c.createdAt,
      };
    });

    // 7. Quiz Analytics Overview
    const quizzesAnalytics = teacherCourses.flatMap((c) =>
      c.quizzes.map((q) => {
        const qScoreSum = q.attempts.reduce((sum, a) => sum + a.score, 0);
        const qMaxSum = q.attempts.reduce((sum, a) => sum + a.maxScore, 0);
        const avgScore = qMaxSum > 0 ? Math.round((qScoreSum / qMaxSum) * 100) : null;

        // Score distributions
        const dist = { below50: 0, from50to70: 0, from70to90: 0, above90: 0 };
        for (const att of q.attempts) {
          const pct = att.maxScore > 0 ? (att.score / att.maxScore) * 100 : 0;
          if (pct < 50) dist.below50++;
          else if (pct < 70) dist.from50to70++;
          else if (pct < 90) dist.from70to90++;
          else dist.above90++;
        }

        return {
          id: q.id,
          courseId: c.id,
          courseCode: c.code,
          materialId: q.materialId,
          materialTitle: q.material?.title || null,
          materialFileName: q.material?.fileName || null,
          title: q.title,
          topic: q.topic,
          status: q.status,
          questionCount: q._count.questions,
          attemptsCount: q.attempts.length,
          averageScore: avgScore,
          scoreDistribution: dist,
          latestAttemptDate: q.attempts.length > 0 ? q.attempts[0].createdAt : null,
        };
      })
    );

    res.json({
      summary: {
        totalStudents,
        averageQuizScore,
        studentsNeedingSupportCount,
        totalMaterials: totalMaterialsCount,
        totalQuizzes: totalQuizzesCount,
        totalCourses: teacherCourses.length,
        totalAttempts: allAttempts.length,
      },
      courses: coursesOverview,
      students: studentsList,
      weakTopics,
      quizzes: quizzesAnalytics,
    });
  } catch (error: any) {
    console.error('[TeacherController] Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher dashboard data.' });
  }
}

/**
 * Get all students enrolled across teacher's courses with detailed history
 */
export async function getTeacherStudents(req: AuthenticatedRequest, res: Response) {
  try {
    const teacherId = req.user!.id;
    const { courseId, courseCode } = req.query;

    const teacherEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: teacherId,
        role: { in: ['PROFESSOR', 'ADMIN'] },
      },
      include: {
        course: { select: { id: true, code: true } },
      },
    });

    const teacherCourseIds = teacherEnrollments.map((e) => e.courseId);

    let targetCourseIds = teacherCourseIds;
    if (courseId && typeof courseId === 'string' && courseId !== 'ALL') {
      if (!teacherCourseIds.includes(courseId)) {
        return res.status(403).json({ error: 'You are not authorized to view students for this course.' });
      }
      targetCourseIds = [courseId];
    } else if (courseCode && typeof courseCode === 'string' && courseCode !== 'ALL') {
      const match = teacherEnrollments.find(
        (e) => e.course.code.toLowerCase() === (courseCode as string).toLowerCase()
      );
      if (!match) {
        return res.status(403).json({ error: 'You are not authorized to view students for this course.' });
      }
      targetCourseIds = [match.courseId];
    }

    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId: { in: targetCourseIds },
        role: 'STUDENT',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            createdAt: true,
            quizAttempts: {
              where: {
                quiz: { courseId: { in: targetCourseIds } },
              },
              include: {
                quiz: {
                  select: { id: true, title: true, topic: true, courseId: true, course: { select: { code: true } } },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        course: {
          select: { id: true, code: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentsMap = new Map<string, any>();

    for (const enr of studentEnrollments) {
      const st = enr.user;
      if (!studentsMap.has(st.id)) {
        const attempts = st.quizAttempts;
        const totalAttempts = attempts.length;
        const scoreSum = attempts.reduce((acc, a) => acc + a.score, 0);
        const maxSum = attempts.reduce((acc, a) => acc + a.maxScore, 0);
        const avgScore = maxSum > 0 ? Math.round((scoreSum / maxSum) * 100) : null;

        let status: 'NEEDS_SUPPORT' | 'GOOD' | 'NO_ATTEMPTS' = 'NO_ATTEMPTS';
        if (totalAttempts > 0) {
          status = avgScore !== null && avgScore < 60 ? 'NEEDS_SUPPORT' : 'GOOD';
        }

        const lastActivity = attempts.length > 0 ? attempts[0].createdAt : enr.createdAt;

        studentsMap.set(st.id, {
          id: st.id,
          name: st.name,
          email: st.email,
          profileImage: st.profileImage,
          enrolledCourses: [],
          attempts: attempts.map((a) => ({
            id: a.id,
            quizId: a.quizId,
            quizTitle: a.quiz.title,
            courseCode: a.quiz.course.code,
            score: a.score,
            maxScore: a.maxScore,
            percentage: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
            createdAt: a.createdAt,
          })),
          totalAttempts,
          averageScore: avgScore,
          status,
          lastActivity,
        });
      }

      const studentEntry = studentsMap.get(st.id)!;
      if (!studentEntry.enrolledCourses.some((c: any) => c.courseId === enr.course.id)) {
        studentEntry.enrolledCourses.push({
          courseId: enr.course.id,
          courseCode: enr.course.code,
          courseTitle: enr.course.title,
          enrolledAt: enr.createdAt,
        });
      }
    }

    res.json({
      students: Array.from(studentsMap.values()),
    });
  } catch (error: any) {
    console.error('[TeacherController] Get students error:', error);
    res.status(500).json({ error: 'Failed to retrieve students roster.' });
  }
}

/**
 * Get detailed quiz analytics with student attempts and per-question error breakdown
 */
export async function getTeacherQuizResults(req: AuthenticatedRequest, res: Response) {
  try {
    const teacherId = req.user!.id;

    const teacherEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: teacherId,
        role: { in: ['PROFESSOR', 'ADMIN'] },
      },
      select: { courseId: true },
    });

    const courseIds = teacherEnrollments.map((e) => e.courseId);

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: { in: courseIds },
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        material: { select: { id: true, title: true, fileName: true, status: true } },
        questions: {
          include: {
            answers: true,
          },
        },
        attempts: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            answers: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedQuizzes = quizzes.map((q) => {
      const qScoreSum = q.attempts.reduce((sum, a) => sum + a.score, 0);
      const qMaxSum = q.attempts.reduce((sum, a) => sum + a.maxScore, 0);
      const avgScore = qMaxSum > 0 ? Math.round((qScoreSum / qMaxSum) * 100) : null;

      // Question breakdown
      const questionBreakdown = q.questions.map((ques) => {
        const totalAns = ques.answers.length;
        const correctAns = ques.answers.filter((a) => a.isCorrect).length;
        const successRate = totalAns > 0 ? Math.round((correctAns / totalAns) * 100) : 100;
        return {
          id: ques.id,
          questionText: ques.questionText,
          options: ques.options,
          correctIndex: ques.correctIndex,
          explanation: ques.explanation,
          pageReference: ques.pageReference,
          totalResponses: totalAns,
          correctResponses: correctAns,
          incorrectResponses: totalAns - correctAns,
          successRate,
        };
      });

      // Student attempt breakdown
      const attemptsBreakdown = q.attempts.map((att) => ({
        id: att.id,
        studentId: att.studentId,
        studentName: att.student.name,
        studentEmail: att.student.email,
        score: att.score,
        maxScore: att.maxScore,
        percentage: att.maxScore > 0 ? Math.round((att.score / att.maxScore) * 100) : 0,
        createdAt: att.createdAt,
      }));

      return {
        id: q.id,
        title: q.title,
        topic: q.topic,
        status: q.status,
        errorMessage: q.errorMessage,
        course: q.course,
        material: q.material,
        questionCount: q.questions.length,
        attemptsCount: q.attempts.length,
        averageScore: avgScore,
        questions: questionBreakdown,
        attempts: attemptsBreakdown,
        createdAt: q.createdAt,
      };
    });

    res.json({ quizzes: formattedQuizzes });
  } catch (error: any) {
    console.error('[TeacherController] Quiz results error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz results and analytics.' });
  }
}

/**
 * Get course specific teacher analytics, roster, and weak topics
 */
export async function getCourseTeacherAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const teacherId = req.user!.id;

    // Check teacher authorization for this course
    const teacherEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: teacherId,
          courseId,
        },
      },
    });

    if ((!teacherEnrollment || teacherEnrollment.role === 'STUDENT') && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You do not teach this course.' });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          where: { role: 'STUDENT' },
          include: {
            user: { select: { id: true, name: true, email: true, profileImage: true, createdAt: true } },
          },
        },
        materials: {
          include: {
            _count: { select: { chunks: true, quizzes: true } },
          },
        },
        quizzes: {
          include: {
            material: { select: { id: true, title: true, fileName: true } },
            questions: {
              include: {
                answers: true,
              },
            },
            attempts: {
              include: {
                student: { select: { id: true, name: true, email: true } },
                answers: true,
              },
            },
            _count: { select: { questions: true, attempts: true } },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Build Student Roster
    const studentRoster = course.enrollments.map((enr) => {
      const studentAttempts = course.quizzes.flatMap((q) =>
        q.attempts.filter((a) => a.studentId === enr.user.id)
      );

      const totalAttempts = studentAttempts.length;
      const scoreSum = studentAttempts.reduce((sum, a) => sum + a.score, 0);
      const maxSum = studentAttempts.reduce((sum, a) => sum + a.maxScore, 0);
      const avgScore = maxSum > 0 ? Math.round((scoreSum / maxSum) * 100) : null;

      let status: 'NEEDS_SUPPORT' | 'GOOD' | 'NO_ATTEMPTS' = 'NO_ATTEMPTS';
      if (totalAttempts > 0) {
        status = avgScore !== null && avgScore < 60 ? 'NEEDS_SUPPORT' : 'GOOD';
      }

      return {
        id: enr.user.id,
        name: enr.user.name,
        email: enr.user.email,
        enrolledAt: enr.createdAt,
        totalAttempts,
        averageScore: avgScore,
        status,
        attempts: studentAttempts.map((a) => ({
          id: a.id,
          score: a.score,
          maxScore: a.maxScore,
          percentage: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
          createdAt: a.createdAt,
        })),
      };
    });

    // Compute Course Stats
    const allCourseAttempts = course.quizzes.flatMap((q) => q.attempts);
    const scoreSum = allCourseAttempts.reduce((sum, a) => sum + a.score, 0);
    const maxSum = allCourseAttempts.reduce((sum, a) => sum + a.maxScore, 0);
    const classAverage = maxSum > 0 ? Math.round((scoreSum / maxSum) * 100) : null;
    const studentsNeedingSupport = studentRoster.filter((s) => s.status === 'NEEDS_SUPPORT').length;

    // Per-question analytics for the course
    const questionAnalytics = course.quizzes.flatMap((q) =>
      q.questions.map((ques) => {
        const total = ques.answers.length;
        const correct = ques.answers.filter((a) => a.isCorrect).length;
        const successRate = total > 0 ? Math.round((correct / total) * 100) : 100;
        return {
          id: ques.id,
          quizId: q.id,
          quizTitle: q.title,
          topic: q.topic,
          questionText: ques.questionText,
          pageReference: ques.pageReference,
          totalResponses: total,
          correctResponses: correct,
          incorrectResponses: total - correct,
          successRate,
        };
      })
    );

    res.json({
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        description: course.description,
      },
      stats: {
        enrollmentCount: course.enrollments.length,
        materialCount: course.materials.length,
        quizCount: course.quizzes.length,
        totalAttempts: allCourseAttempts.length,
        classAverage,
        studentsNeedingSupport,
      },
      students: studentRoster,
      materials: course.materials,
      quizzes: course.quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        topic: q.topic,
        status: q.status,
        questionCount: q._count.questions,
        attemptsCount: q._count.attempts,
        materialTitle: q.material?.title || null,
        materialFileName: q.material?.fileName || null,
      })),
      questionAnalytics: questionAnalytics.sort((a, b) => a.successRate - b.successRate),
    });
  } catch (error: any) {
    console.error('[TeacherController] Course analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve course teacher analytics.' });
  }
}

/**
 * Get all course materials across teacher's courses
 */
export async function getTeacherMaterials(req: AuthenticatedRequest, res: Response) {
  try {
    const teacherId = req.user!.id;
    const teacherEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: teacherId,
        role: { in: ['PROFESSOR', 'ADMIN'] },
      },
      select: { courseId: true },
    });
    const courseIds = teacherEnrollments.map((e) => e.courseId);

    const materials = await prisma.material.findMany({
      where: {
        courseId: { in: courseIds },
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        quizzes: { select: { id: true, title: true, status: true, _count: { select: { questions: true } } } },
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      materials: materials.map((m) => ({
        id: m.id,
        title: m.title,
        fileName: m.fileName,
        filePath: m.filePath,
        fileSize: m.fileSize,
        status: m.status,
        errorMessage: m.errorMessage,
        courseId: m.courseId,
        courseCode: m.course.code,
        courseTitle: m.course.title,
        chunksCount: m._count.chunks,
        quizzes: m.quizzes,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[TeacherController] Get materials error:', error);
    res.status(500).json({ error: 'Failed to retrieve course materials.' });
  }
}

