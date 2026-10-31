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
        <div className="pb-4 border-b border-[#1b253b]">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
            <span>Learning Progress & Topic Mastery</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real performance tracking computed exclusively from submitted quiz attempts and evaluated questions.
          </p>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Quizzes Completed</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white">{analytics?.quizzesAttempted ?? 0}</div>
            <div className="text-xs text-gray-400 mt-1">
              {hasData ? 'Verified evaluation records' : 'No quiz attempts recorded'}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Overall Accuracy</span>
              <Award className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {hasData ? `${analytics.averageScore}%` : 'N/A'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {hasData ? 'Average score percentage' : 'Complete a quiz to calculate'}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Weak Topics</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {analytics?.weakTopics?.length ?? 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {hasData ? 'Topics below 70% accuracy' : 'No performance data'}
            </div>
          </div>
        </div>

        {/* Topic-Level Performance Breakdown (Only when real data exists) */}
        {hasData ? (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-400" />
                <span>Topic Mastery Breakdown</span>
              </h2>

              <div className="space-y-4">
                {analytics.topicsPerformance.map((topic, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">
                        {topic.topic} <span className="text-gray-400 font-normal">({topic.courseCode})</span>
                      </span>
                      <span
                        className={`font-bold ${
                          topic.accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {topic.accuracy}% ({topic.correctQuestions}/{topic.totalQuestions} questions)
                      </span>
                    </div>

                    <div className="w-full bg-[#11192d] h-2.5 rounded-full overflow-hidden">
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
            <div className="p-6 rounded-xl bg-[#0d1425] border border-amber-900/30 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Targeted Revision Recommendations</span>
              </h2>

              {analytics.recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-[#0f172a] border border-amber-500/20 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-300">{rec.topic}</span>
                        <span className="text-gray-400">{rec.courseCode}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{rec.advice}</p>
                      <div className="pt-1">
                        <Link
                          href="/dashboard/tutor"
                          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          <span>Ask AI Tutor to clarify this topic</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Congratulations! All evaluated topics meet or exceed the 70% proficiency benchmark.
                </p>
              )}
            </div>

            {/* Quiz History */}
            <div className="p-6 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>Historical Attempts</span>
              </h2>

              <div className="space-y-2.5">
                {analytics.recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl bg-[#10182b] border border-[#1a253c] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{act.title}</div>
                      <div className="text-gray-400 text-[11px] mt-0.5">
                        {act.courseCode} · Topic: {act.topic}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-emerald-400">
                        {act.score}/{act.maxScore} ({act.percentage}%)
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">
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
          <div className="p-12 text-center bg-[#0c1322] border border-[#1a253c] rounded-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-400">
              <BarChart2 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white">No Evaluation Data Yet</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                EduFlow tracks real academic performance without fabricated statistics. Once you take practice quizzes on your course material, your topic-level mastery and personalized revision guidance will automatically populate here.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard/quizzes"
                className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20"
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
