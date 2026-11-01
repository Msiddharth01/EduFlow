'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { analyticsApi, StudentAnalytics } from '@/lib/api';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Award,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart2,
} from 'lucide-react';

export default function ProgressPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      analyticsApi.getStudentAnalytics().then((res) => {
        if (res.success) setAnalytics(res.data.analytics);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Learning Analytics...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const hasData = analytics && analytics.quizzesAttempted > 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div className="pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            <span>Learning Progress & Topic Mastery</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real performance tracking computed exclusively from submitted quiz attempts and evaluated questions.
          </p>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 app-card">
            <div className="flex items-center justify-between mb-2" style={{ color: 'var(--text-muted)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider">Quizzes Completed</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{analytics?.quizzesAttempted ?? 0}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {hasData ? 'Verified evaluation records' : 'No quiz attempts recorded'}
            </div>
          </div>

          <div className="p-5 app-card">
            <div className="flex items-center justify-between mb-2" style={{ color: 'var(--text-muted)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider">Overall Accuracy</span>
              <Award className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
              {hasData ? `${analytics.averageScore}%` : 'N/A'}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {hasData ? 'Average score percentage' : 'Complete a quiz to calculate'}
            </div>
          </div>

          <div className="p-5 app-card">
            <div className="flex items-center justify-between mb-2" style={{ color: 'var(--text-muted)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider">Weak Topics</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
              {analytics?.weakTopics?.length ?? 0}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {hasData ? 'Topics below 70% accuracy' : 'No performance data'}
            </div>
          </div>
        </div>

        {/* Topic-Level Performance Breakdown (Only when real data exists) */}
        {hasData ? (
          <div className="space-y-6">
            <div className="p-6 app-card space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                <span>Topic Mastery Breakdown</span>
              </h2>

              <div className="space-y-4">
                {analytics.topicsPerformance.map((topic, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                        {topic.topic} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({topic.courseCode})</span>
                      </span>
                      <span
                        className={`font-bold ${
                          topic.accuracy >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {topic.accuracy}% ({topic.correctQuestions}/{topic.totalQuestions} questions)
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          topic.accuracy >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(topic.accuracy, 5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Revision Recommendations */}
            <div
              className="p-6 rounded-xl border space-y-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
            >
              <h2 className="text-base font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-5 h-5" />
                <span>Targeted Revision Recommendations</span>
              </h2>

              {analytics.recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border text-xs space-y-2"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-600 dark:text-amber-300">{rec.topic}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{rec.courseCode}</span>
                      </div>
                      <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec.advice}</p>
                      <div className="pt-1">
                        <Link
                          href="/dashboard/tutor"
                          className="inline-flex items-center gap-1.5 font-medium hover:underline"
                          style={{ color: 'var(--primary)' }}
                        >
                          <span>Ask AI Tutor to clarify this topic</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Congratulations! All evaluated topics meet or exceed the 70% proficiency benchmark.
                </p>
              )}
            </div>

            {/* Quiz History */}
            <div className="p-6 app-card space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Clock className="w-5 h-5 text-cyan-500" />
                <span>Historical Attempts</span>
              </h2>

              <div className="space-y-2.5">
                {analytics.recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl border flex items-center justify-between text-xs"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--text-main)' }}>{act.title}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {act.courseCode} · Topic: {act.topic}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {act.score}/{act.maxScore} ({act.percentage}%)
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(act.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Polished Empty State when database has no quiz attempts yet */
          <div className="p-12 text-center app-card space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-500">
              <BarChart2 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>No Evaluation Data Yet</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                EduFlow tracks real academic performance without fabricated statistics. Once you take practice quizzes on your course material, your topic-level mastery and personalized revision guidance will automatically populate here.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard/quizzes"
                className="btn-primary text-xs"
              >
                Attempt Your First Practice Quiz
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
