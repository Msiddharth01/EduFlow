'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { teacherApi, TeacherDashboardData, TeacherWeakTopicItem } from '@/lib/api';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  BarChart2,
  BookOpen,
  Users,
  Target,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function TeacherAnalyticsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Weak topic detail modal
  const [inspectedTopic, setInspectedTopic] = useState<TeacherWeakTopicItem | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const res = await teacherApi.getDashboard();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load teacher analytics.');
      }
      setLoading(false);
    };

    if (user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-gray-400 text-xs">
          Loading learning analytics and diagnostic data...
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="p-6 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || 'Unable to retrieve analytics data.'}</span>
        </div>
      </AppLayout>
    );
  }

  const { summary, courses, weakTopics, quizzes } = data;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 uppercase">
                Diagnostic Analytics
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Class Performance & Topic Mastery
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Gain deep insights into learning gaps, concept accuracy rates, and struggling students across all your courses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/teacher"
              className="px-3.5 py-2 bg-[#0e1628] hover:bg-[#16223b] border border-[#1e2d4d] text-gray-300 text-xs font-semibold rounded-lg transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Class Average</span>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-2">
              {summary.averageQuizScore}%
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Across {summary.totalAttempts} student submissions
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Needs Attention</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-rose-400 mt-2">
              {summary.studentsNeedingSupportCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Scoring &lt; 60% on quiz attempts
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Active Enrolments</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-2">
              {summary.totalStudents}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              In {summary.totalCourses} managed courses
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Diagnostic Quizzes</span>
              <BarChart2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-emerald-400 mt-2">
              {summary.totalQuizzes}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Linked to verified PDF materials
            </div>
          </div>
        </div>

        {/* WEAK TOPICS SECTION */}
        <div className="p-6 rounded-2xl bg-[#0d1425] border border-[#1b263e] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>Weak Topics & Struggling Concepts</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Aggregated from verified student answers. Topics below 60% accuracy indicate core comprehension gaps.
              </p>
            </div>
          </div>

          {weakTopics.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-[#080d1a] border border-[#1b263e] rounded-xl text-xs">
              No weak topics identified yet. As students take course quizzes, diagnostic analytics will be automatically updated.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weakTopics.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#080d1a] border border-[#1b263e] hover:border-indigo-500/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141d33] text-indigo-300">
                          {item.quizTitle}
                        </span>
                        {item.accuracyRate < 50 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                            Critical Gap
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">{item.topic}</h3>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <FileText className="w-3 h-3 text-gray-500" />
                        <span>Source: {item.materialTitle || item.materialFileName || 'Course PDF'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-black ${
                          item.accuracyRate >= 60 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.accuracyRate}%
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">
                        Accuracy Rate
                      </div>
                    </div>
                  </div>

                  {/* Accuracy Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-[#16223b] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.accuracyRate >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, item.accuracyRate))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>{item.affectedStudentsCount} student(s) struggling</span>
                      <span>{item.incorrectCount} incorrect responses</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-[#141e34]">
                    <span className="text-[11px] text-gray-400">
                      {item.sampleQuestions.length} flagged question(s)
                    </span>
                    <button
                      onClick={() => setInspectedTopic(item)}
                      className="px-2.5 py-1 rounded bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all inline-flex items-center gap-1"
                    >
                      <span>Inspect Questions</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COURSE LEVEL PERFORMANCE BREAKDOWN */}
        <div className="p-6 rounded-2xl bg-[#0d1425] border border-[#1b263e] space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Course-Level Performance Breakdown</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090e1d] text-gray-400 uppercase tracking-wider font-semibold border-b border-[#1b263e]">
                <tr>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-center">Materials</th>
                  <th className="py-3 px-4 text-center">Quizzes</th>
                  <th className="py-3 px-4 text-center">Quiz Submissions</th>
                  <th className="py-3 px-4 text-center">Class Average</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162137]">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-[#10192e] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{c.title}</div>
                      <div className="text-gray-400 text-[11px] font-mono">{c.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-200">
                      {c.enrollmentCount}
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-300">{c.materialCount}</td>
                    <td className="py-3.5 px-4 text-center text-gray-300">{c.quizCount}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-200">
                      {c.totalAttempts}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.classAverage !== null ? (
                        <span
                          className={`font-black text-sm ${
                            c.classAverage >= 60 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {c.classAverage}%
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">No attempts</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/courses/${c.id}`}
                        className="px-2.5 py-1 rounded bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <span>Workspace</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weak Topic Questions Inspection Modal */}
        {inspectedTopic && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-[#0e1628] border border-[#1e2d4d] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/70 text-indigo-400 border border-indigo-800/40">
                      Concept Diagnostic
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                      {inspectedTopic.accuracyRate}% Accuracy
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">{inspectedTopic.topic}</h2>
                  <p className="text-xs text-gray-400">
                    Source Material: {inspectedTopic.materialTitle || inspectedTopic.materialFileName || 'PDF'}
                  </p>
                </div>
                <button
                  onClick={() => setInspectedTopic(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a253d] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Struggling Questions ({inspectedTopic.sampleQuestions.length})
                </h3>
                {inspectedTopic.sampleQuestions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 rounded-xl bg-[#080d1a] border border-[#1c2944] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-white leading-relaxed">
                        <span className="text-indigo-400 font-bold mr-2">Q{qIdx + 1}.</span>
                        {q.text}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40 shrink-0">
                        {q.incorrectCount} misses
                      </span>
                    </div>

                    {q.pageReference && (
                      <div className="text-[11px] text-indigo-400 font-medium">
                        Referenced in lecture notes on Page {q.pageReference}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setInspectedTopic(null)}
                  className="px-4 py-2 bg-[#1b263e] hover:bg-[#253555] text-white text-xs font-semibold rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
