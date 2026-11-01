'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { courseApi, quizApi, CourseWithMeta, QuizWithMeta, MaterialSummary } from '@/lib/api';
import { CheckCircle, BookOpen, Clock, ArrowRight, Sparkles, Plus, AlertCircle, FileText } from 'lucide-react';

export default function StandaloneQuizzesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseMaterials, setCourseMaterials] = useState<MaterialSummary[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
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
      // Fetch materials for selected course to enable material-targeted quiz generation
      courseApi.get(selectedCourseId).then((res) => {
        if (res.success && res.data.course.materials) {
          setCourseMaterials(res.data.course.materials.filter((m) => m.status === 'READY'));
        } else {
          setCourseMaterials([]);
        }
      });
    }
  }, [selectedCourseId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || genLoading) return;

    setGenLoading(true);
    setGenMsg(null);

    const res = await quizApi.generate(selectedCourseId, {
      materialId: selectedMaterialId || undefined,
      topic: genTopic.trim() || undefined,
      force: true,
    });

    if (res.success) {
      setGenMsg({ type: 'success', text: 'AI Practice Quiz generated successfully!' });
      setGenTopic('');
      setSelectedMaterialId('');
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <span>Practice Quizzes</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Attempt syllabus-aligned multiple choice questions evaluated with instant explanations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              className="app-select text-xs py-1.5 w-auto"
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
              className="btn-primary text-xs py-1.5"
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
              <div key={i} className="h-40 app-card animate-pulse" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center app-card space-y-2">
            <CheckCircle className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No practice quizzes found for this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-5 app-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      {quiz.topic}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{quiz.questionCount} Questions</span>
                  </div>

                  <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-main)' }}>{quiz.title}</h3>

                  {quiz.material?.title && (
                    <div className="text-[11px] font-medium flex items-center gap-1.5 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Source Material: {quiz.material.title}</span>
                    </div>
                  )}

                  {quiz.myLatestAttempt && (
                    <div
                      className="p-2.5 rounded-lg border text-xs flex justify-between items-center mb-4"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>Previous Score:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
            className="w-full max-w-md border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <span>Generate Practice Quiz</span>
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Synthesize syllabus-grounded multiple choice questions from authorized course materials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                disabled={genLoading}
                style={{ color: 'var(--text-muted)' }}
                className="p-1 rounded-lg hover:opacity-80 cursor-pointer"
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
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold uppercase mb-1">
                  Source Material (Strict Isolation)
                </label>
                <select
                  className="app-select text-xs w-full"
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  disabled={genLoading}
                >
                  <option value="">All Course Materials (Auto-Generate Missing)</option>
                  {courseMaterials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.title} ({mat.fileName})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-subtle)' }}>
                  Selecting a specific document ensures questions are drawn strictly and exclusively from that material.
                </p>
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold uppercase mb-1">
                  Topic or Focus Area (Optional)
                </label>
                <input
                  className="app-input text-xs"
                  placeholder="e.g. Iterative Development, LIFO Stacks, Function Points..."
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  disabled={genLoading}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  disabled={genLoading}
                  className="btn-secondary flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genLoading}
                  className="btn-primary flex-1 text-xs"
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
