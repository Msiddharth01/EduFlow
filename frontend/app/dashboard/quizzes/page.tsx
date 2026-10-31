'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { courseApi, quizApi, CourseWithMeta, QuizWithMeta } from '@/lib/api';
import { CheckCircle, BookOpen, Clock, ArrowRight, Sparkles, Plus, AlertCircle } from 'lucide-react';

export default function StandaloneQuizzesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [quizzes, setQuizzes] = useState<QuizWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genMsg, setGenMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const fetchQuizzes = async (courseId: string) => {
    setLoading(true);
    const res = await quizApi.list(courseId);
    if (res.success) setQuizzes(res.data.quizzes);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      courseApi.list().then((res) => {
        if (res.success && res.data.courses.length > 0) {
          setCourses(res.data.courses);
          setSelectedCourseId(res.data.courses[0].id);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchQuizzes(selectedCourseId);
    }
  }, [selectedCourseId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || genLoading) return;

    setGenLoading(true);
    setGenMsg(null);

    const res = await quizApi.generate(selectedCourseId, {
      topic: genTopic.trim() || undefined,
    });

    if (res.success) {
      setGenMsg({ type: 'success', text: 'AI Practice Quiz generated successfully!' });
      setGenTopic('');
      await fetchQuizzes(selectedCourseId);
      setTimeout(() => {
        setShowGenModal(false);
        setGenMsg(null);
      }, 1200);
    } else {
      setGenMsg({ type: 'error', text: res.error });
    }
    setGenLoading(false);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span>Practice Quizzes</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Attempt syllabus-aligned multiple choice questions evaluated with instant explanations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              className="px-3 py-1.5 bg-[#0c1322] border border-[#1e2a44] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setGenMsg(null);
                setShowGenModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Quiz</span>
            </button>
          </div>
        </div>

        {/* Quizzes List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-[#0d1425] border border-[#1b263e] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center bg-[#0c1322] border border-[#1a253c] rounded-xl text-xs text-gray-400 space-y-2">
            <CheckCircle className="w-8 h-8 text-gray-500 mx-auto" />
            <p>No practice quizzes found for this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                      {quiz.topic}
                    </span>
                    <span className="text-xs text-gray-400">{quiz.questionCount} Questions</span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">{quiz.title}</h3>

                  {quiz.myLatestAttempt && (
                    <div className="p-2.5 rounded bg-[#10182b] border border-[#1a263d] text-xs flex justify-between items-center mb-4">
                      <span className="text-gray-400">Previous Score:</span>
                      <span className="font-bold text-emerald-400">
                        {quiz.myLatestAttempt.score}/{quiz.myLatestAttempt.maxScore} (
                        {Math.round(
                          (quiz.myLatestAttempt.score / quiz.myLatestAttempt.maxScore) * 100
                        )}
                        %)
                      </span>
                    </div>
                  )}
                </div>

                <Link
                  href={`/dashboard/quizzes/${quiz.id}`}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-center rounded-lg text-xs font-semibold transition-colors block"
                >
                  {quiz.myLatestAttempt ? 'Retake Quiz →' : 'Start Quiz →'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Quiz Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#0e1628] border border-[#1e2d4d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>Generate Practice Quiz</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Synthesize syllabus-grounded multiple choice questions from authorized course materials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                disabled={genLoading}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {genMsg && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  genMsg.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-red-950/40 border-red-800/50 text-red-300'
                }`}
              >
                {genMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{genMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Topic or Focus Area (Optional)
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#080d1a] border border-[#22304e] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Vector Search & RAG, Algorithms, Neural Nets..."
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  disabled={genLoading}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Leave blank to automatically sample key concepts from all uploaded course notes.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  disabled={genLoading}
                  className="flex-1 py-2 text-xs font-medium text-gray-300 border border-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genLoading}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {genLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
