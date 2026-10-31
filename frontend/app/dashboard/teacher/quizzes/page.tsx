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
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 uppercase">
                Assessment Analytics
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Quiz Results & Performance
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Inspect question-level error rates, student submissions, and score distributions for all course quizzes.
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

        {/* Search Toolbar */}
        <div className="p-4 rounded-xl bg-[#0d1425] border border-[#1b263e]">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quiz by title, topic, or course code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#080d1a] border border-[#1c2944] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="p-12 text-center text-gray-400 bg-[#0d1425] border border-[#1b263e] rounded-xl text-xs">
            Loading quiz analytics and question results...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quizzes Table */}
        {!loading && !error && (
          <div className="rounded-xl bg-[#0d1425] border border-[#1b263e] overflow-hidden">
            {filteredQuizzes.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                No quizzes found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#090e1d] text-gray-400 uppercase tracking-wider font-semibold border-b border-[#1b263e]">
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
                  <tbody className="divide-y divide-[#162137]">
                    {filteredQuizzes.map((q) => (
                      <tr key={q.id} className="hover:bg-[#10192e] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{q.title}</div>
                          <div className="text-gray-400 text-[11px] mt-0.5">{q.topic}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141d33] text-indigo-300 border border-indigo-900/40">
                            {q.course?.code || 'COURSE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">
                          {q.material?.title || q.material?.fileName || (
                            <span className="text-gray-500 italic">Curriculum</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-200">
                          {q.questionCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-indigo-300">
                          {q.attemptsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {q.averageScore !== null ? (
                            <span
                              className={`font-black text-sm ${
                                q.averageScore >= 60 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {q.averageScore}%
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">No attempts</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedQuiz(q);
                              setActiveModalTab('questions');
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all inline-flex items-center gap-1"
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
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-3xl bg-[#0e1628] border border-[#1e2d4d] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/70 text-indigo-400 border border-indigo-800/40">
                      {selectedQuiz.course?.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15203a] text-gray-300">
                      {selectedQuiz.topic}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedQuiz.title}</h2>
                  <p className="text-xs text-gray-400">
                    Source: {selectedQuiz.material?.title || selectedQuiz.material?.fileName || 'Course syllabus'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a253d] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-tabs: Questions Breakdown vs Student Submissions */}
              <div className="flex items-center gap-2 border-b border-[#1b263e] pb-1">
                <button
                  onClick={() => setActiveModalTab('questions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeModalTab === 'questions'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#121c32]'
                  }`}
                >
                  Question Analytics ({selectedQuiz.questions?.length || selectedQuiz.questionCount})
                </button>
                <button
                  onClick={() => setActiveModalTab('submissions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeModalTab === 'submissions'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#121c32]'
                  }`}
                >
                  Student Submissions ({selectedQuiz.attempts?.length || selectedQuiz.attemptsCount})
                </button>
              </div>

              {/* TAB 1: QUESTION BREAKDOWN */}
              {activeModalTab === 'questions' && (
                <div className="space-y-3">
                  {!selectedQuiz.questions || selectedQuiz.questions.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">
                      No question breakdown data available.
                    </div>
                  ) : (
                    selectedQuiz.questions.map((ques, qIdx) => (
                      <div
                        key={ques.id}
                        className="p-4 rounded-xl bg-[#080d1a] border border-[#1c2944] space-y-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-white leading-relaxed">
                            <span className="text-indigo-400 font-bold mr-1.5">Q{qIdx + 1}.</span>
                            {ques.questionText}
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                ques.successRate >= 60
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                  : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                              }`}
                            >
                              {ques.successRate}% Success
                            </span>
                            <div className="text-[10px] text-gray-500 mt-0.5">
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
                                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 font-semibold'
                                  : 'bg-[#0e1628] border-[#1b263e] text-gray-400'
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
                          <div className="p-2.5 rounded-lg bg-[#0e172a] border border-[#1d2a45] text-gray-300 text-[11px]">
                            <span className="font-bold text-indigo-300">Explanation: </span>
                            {ques.explanation}
                          </div>
                        )}

                        {ques.pageReference && (
                          <div className="text-[10px] text-indigo-400">
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
                    <div className="p-6 text-center text-gray-400 text-xs">
                      No student submissions recorded for this quiz yet.
                    </div>
                  ) : (
                    selectedQuiz.attempts.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl bg-[#080d1a] border border-[#1c2944] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white text-sm">{att.studentName}</div>
                          <div className="text-gray-400 text-[11px] font-mono">{att.studentEmail}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Attempted on {new Date(att.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-black text-sm ${
                              att.percentage >= 60 ? 'text-emerald-400' : 'text-rose-400'
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
                  onClick={() => setSelectedQuiz(null)}
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
