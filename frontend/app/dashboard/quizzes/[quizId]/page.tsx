'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { quizApi, QuizWithQuestions, EvaluatedAnswer } from '@/lib/api';
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Award,
  RotateCcw,
} from 'lucide-react';

function QuizTakeContent() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    answers: EvaluatedAnswer[];
  } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (quizId) {
      setLoading(true);
      quizApi.get(quizId).then((res) => {
        if (res.success) setQuiz(res.data.quiz);
        setLoading(false);
      });
    }
  }, [quizId]);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (result) return; // quiz already submitted
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmit = async () => {
    if (!quizId || submitting || !quiz) return;
    setSubmitting(true);

    const answersPayload = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOption: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1,
    }));

    const res = await quizApi.submit(quizId, answersPayload);
    if (res.success) {
      setResult({
        score: res.data.attempt.score,
        maxScore: res.data.attempt.maxScore,
        percentage: res.data.attempt.percentage,
        answers: res.data.results,
      });
    }
    setSubmitting(false);
  };

  if (loading || !quiz) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Quiz Assessment...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentQ = quiz.questions[currentIndex];
  const isLast = currentIndex === quiz.questions.length - 1;
  const allAnswered = quiz.questions.every((q) => selectedAnswers[q.id] !== undefined);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/quizzes"
              className="p-2 rounded-lg border transition-colors"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                  {quiz.course?.code} · {quiz.topic}
                </span>
                {quiz.material?.title && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md font-medium border"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Source: {quiz.material.title}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>{quiz.title}</h1>
            </div>
          </div>

          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Question <span className="font-bold" style={{ color: 'var(--text-main)' }}>{currentIndex + 1}</span> of{' '}
            {quiz.questions.length}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border-color)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              backgroundColor: 'var(--primary)',
              width: `${((currentIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>

        {/* If Quiz Completed Result */}
        {result ? (
          <div className="p-6 md:p-8 rounded-2xl app-card space-y-6">
            <div className="text-center space-y-2 pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500 mb-2">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Quiz Completed!</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                You scored <span className="text-emerald-600 dark:text-emerald-400 font-bold">{result.score}</span> out of{' '}
                {result.maxScore} ({result.percentage}%)
              </p>
            </div>

            {/* Answer Breakdown with Explanations */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Review & Explanations
              </h3>

              {result.answers.map((ans, idx) => (
                <div
                  key={ans.questionId}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    ans.isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {ans.questionType && (
                          <span
                            className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border"
                            style={{
                              backgroundColor: 'var(--bg-subtle)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--primary)',
                            }}
                          >
                            {ans.questionType}
                          </span>
                        )}
                        {ans.difficulty && (
                          <span
                            className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border"
                            style={{
                              backgroundColor: 'var(--bg-subtle)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {ans.difficulty}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>
                        {idx + 1}. {ans.questionText}
                      </span>
                    </div>
                    {ans.isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold flex-shrink-0">
                        <CheckCircle className="w-4 h-4" /> Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold flex-shrink-0">
                        <XCircle className="w-4 h-4" /> Incorrect
                      </span>
                    )}
                  </div>

                  <div style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Correct Answer: </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-300">Option {ans.correctOption + 1}</span>
                  </div>

                  {ans.explanation && (
                    <div
                      className="p-2.5 rounded-lg border italic"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      💡 {ans.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSelectedAnswers({});
                  setCurrentIndex(0);
                }}
                className="btn-secondary flex-1"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Quiz</span>
              </button>
              <Link
                href="/dashboard/progress"
                className="btn-primary flex-1 text-center"
              >
                View Updated Mastery Progress →
              </Link>
            </div>
          </div>
        ) : (
          /* Question Taking Card */
          <div className="p-6 md:p-8 rounded-2xl app-card space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              {currentQ.questionType && (
                <span
                  className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                  }}
                >
                  {currentQ.questionType}
                </span>
              )}
              {currentQ.difficulty && (
                <span
                  className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {currentQ.difficulty}
                </span>
              )}
            </div>

            <h2 className="text-base md:text-lg font-semibold leading-relaxed" style={{ color: 'var(--text-main)' }}>
              {currentQ.questionText}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className="w-full p-4 rounded-xl border text-left text-xs md:text-sm font-medium transition-all flex items-center gap-3 cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                      }}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Question Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary text-xs"
              >
                Previous
              </button>

              {isLast ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  {submitting ? 'Submitting & Scoring...' : 'Submit Final Answers'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
                  className="btn-primary text-xs"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function QuizTakePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400" style={{ backgroundColor: 'var(--bg-main)' }}>
          Loading...
        </div>
      }
    >
      <QuizTakeContent />
    </Suspense>
  );
}
