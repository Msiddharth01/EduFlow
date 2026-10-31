import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export async function getStudentAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const studentId = req.user!.id;

    // 1. Fetch all quiz attempts for this student
    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            topic: true,
            courseId: true,
            course: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
        answers: {
          select: {
            id: true,
            questionId: true,
            selectedOption: true,
            isCorrect: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const quizzesAttempted = attempts.length;
    let averageScore = 0;

    if (quizzesAttempted > 0) {
      const totalScorePercent = attempts.reduce((acc, curr) => {
        const pct = curr.maxScore > 0 ? (curr.score / curr.maxScore) * 100 : 0;
        return acc + pct;
      }, 0);
      averageScore = Math.round(totalScorePercent / quizzesAttempted);
    }

    // 2. Calculate topic breakdown & weak topics
    const topicStats: Record<
      string,
      { totalQuestions: number; correctQuestions: number; attempts: number; courseCode: string; courseTitle: string }
    > = {};

    for (const attempt of attempts) {
      const topic = attempt.quiz.topic || 'General';
      if (!topicStats[topic]) {
        topicStats[topic] = {
          totalQuestions: 0,
          correctQuestions: 0,
          attempts: 0,
          courseCode: attempt.quiz.course.code,
          courseTitle: attempt.quiz.course.title,
        };
      }
      topicStats[topic].attempts += 1;
      topicStats[topic].totalQuestions += attempt.answers.length;
      topicStats[topic].correctQuestions += attempt.answers.filter((a) => a.isCorrect).length;
    }

    const topicsPerformance = Object.entries(topicStats).map(([topic, stats]) => {
      const accuracy =
        stats.totalQuestions > 0
          ? Math.round((stats.correctQuestions / stats.totalQuestions) * 100)
          : 0;
      return {
        topic,
        accuracy,
        totalQuestions: stats.totalQuestions,
        correctQuestions: stats.correctQuestions,
        attempts: stats.attempts,
        courseCode: stats.courseCode,
        courseTitle: stats.courseTitle,
      };
    });

    // Weak topics: accuracy < 70%
    const weakTopics = topicsPerformance
      .filter((t) => t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy);

    // Dynamic actionable recommendations based on weak topics
    const recommendations = weakTopics.map((w) => ({
      topic: w.topic,
      courseCode: w.courseCode,
      courseTitle: w.courseTitle,
      accuracy: w.accuracy,
      advice: `Your score is ${w.accuracy}% in "${w.topic}". Use the AI Tutor to review core concepts and take a follow-up practice quiz.`,
    }));

    // Recent activity list
    const recentActivity = attempts.slice(0, 5).map((a) => ({
      id: a.id,
      type: 'QUIZ_ATTEMPT',
      title: a.quiz.title,
      topic: a.quiz.topic,
      courseCode: a.quiz.course.code,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
      createdAt: a.createdAt,
    }));

    res.json({
      analytics: {
        quizzesAttempted,
        averageScore,
        topicsPerformance,
        weakTopics,
        recommendations,
        recentActivity,
      },
    });
  } catch (error: any) {
    console.error('Student analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve student analytics.' });
  }
}
