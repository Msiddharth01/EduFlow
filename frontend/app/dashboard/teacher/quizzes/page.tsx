'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { teacherApi, TeacherQuizItem } from '@/lib/api';
import {
  CheckSquare,
  Search,
  BookOpen,
  FileText,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function TeacherQuizzesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<TeacherQuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selected quiz for detailed question & submission inspection modal
  const [selectedQuiz, setSelectedQuiz] = useState<TeacherQuizItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'questions' | 'submissions'>('questions');

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await teacherApi.getQuizzes();
    if (res.success) {
      setQuizzes(res.data.quizzes);
    } else {
      setError(res.error || 'Failed to retrieve quiz analytics.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
      loadData();
    }
  }, [user]);

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.course?.code && q.course.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.material?.title && q.material.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-accent uppercase">
                Assessment Analytics
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] mt-1">
              Quiz Results & Performance
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
              Inspect question-level error rates, student submissions, and score distributions for all course quizzes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/teacher"
              className="btn-secondary text-xs"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="app-card p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quiz by title, topic, or course code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="app-input w-full pl-9"
            />
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="app-card p-12 text-center text-[var(--text-muted)] text-xs">
            Loading quiz analytics and question results...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quizzes Table */}
        {!loading && !error && (
          <div className="app-card overflow-hidden">
            {filteredQuizzes.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)] text-xs">
                No quizzes found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="app-table-header uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Quiz Title & Topic</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Source Material</th>
                      <th className="py-3 px-4 text-center">Questions</th>
                      <th className="py-3 px-4 text-center">Submissions</th>
                      <th className="py-3 px-4 text-center">Class Average</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredQuizzes.map((q) => (
                      <tr key={q.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[var(--text-main)] text-sm">{q.title}</div>
                          <div className="text-[var(--text-muted)] text-[11px] mt-0.5">{q.topic}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
                            {q.course?.code || 'COURSE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                          {q.material?.title || q.material?.fileName || (
                            <span className="text-[var(--text-muted)] italic">Curriculum</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[var(--text-main)]">
                          {q.questionCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[var(--primary)]">
                          {q.attemptsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {q.averageScore !== null ? (
                            <span
                              className={`font-black text-sm ${
                                q.averageScore >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {q.averageScore}%
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">No attempts</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedQuiz(q);
                              setActiveModalTab('questions');
                            }}
                            className="px-2.5 py-1 rounded bg-[var(--primary-light)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/20 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quiz Detailed Question Breakdown & Submissions Modal */}
        {selectedQuiz && (
          <div
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
              className="w-full max-w-3xl border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      {selectedQuiz.course?.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                      {selectedQuiz.topic}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>{selectedQuiz.title}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Source: {selectedQuiz.material?.title || selectedQuiz.material?.fileName || 'Course syllabus'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuiz(null)}
                  style={{ color: 'var(--text-muted)' }}
                  className="p-1 rounded-lg hover:opacity-80 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-tabs: Questions Breakdown vs Student Submissions */}
              <div className="flex items-center gap-2 border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('questions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeModalTab === 'questions'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  Question Analytics ({selectedQuiz.questions?.length || selectedQuiz.questionCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('submissions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeModalTab === 'submissions'
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  Student Submissions ({selectedQuiz.attempts?.length || selectedQuiz.attemptsCount})
                </button>
              </div>

              {/* TAB 1: QUESTION BREAKDOWN */}
              {activeModalTab === 'questions' && (
                <div className="space-y-3">
                  {!selectedQuiz.questions || selectedQuiz.questions.length === 0 ? (
                    <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      No question breakdown data available.
                    </div>
                  ) : (
                    selectedQuiz.questions.map((ques, qIdx) => (
                      <div
                        key={ques.id}
                        className="p-4 rounded-xl border space-y-2.5 text-xs"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-color)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold leading-relaxed" style={{ color: 'var(--text-main)' }}>
                            <span className="font-bold mr-1.5" style={{ color: 'var(--primary)' }}>Q{qIdx + 1}.</span>
                            {ques.questionText}
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                ques.successRate >= 60
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {ques.successRate}% Success
                            </span>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {ques.correctResponses}/{ques.totalResponses} correct
                            </div>
                          </div>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {ques.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg text-[11px] border ${
                                oIdx === ques.correctIndex
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="font-bold mr-1.5">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {ques.explanation && (
                          <div
                            className="p-2.5 rounded-lg border text-[11px]"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <span className="font-bold" style={{ color: 'var(--primary)' }}>Explanation: </span>
                            {ques.explanation}
                          </div>
                        )}

                        {ques.pageReference && (
                          <div className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}>
                            Page {ques.pageReference} in source lecture document
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: STUDENT SUBMISSIONS */}
              {activeModalTab === 'submissions' && (
                <div className="space-y-2">
                  {!selectedQuiz.attempts || selectedQuiz.attempts.length === 0 ? (
                    <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      No student submissions recorded for this quiz yet.
                    </div>
                  ) : (
                    selectedQuiz.attempts.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl border flex items-center justify-between text-xs"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-color)',
                        }}
                      >
                        <div>
                          <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{att.studentName}</div>
                          <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{att.studentEmail}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                            Attempted on {new Date(att.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-black text-sm ${
                              att.percentage >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {att.score} / {att.maxScore} ({att.percentage}%)
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedQuiz(null)}
                  className="btn-secondary text-xs"
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
