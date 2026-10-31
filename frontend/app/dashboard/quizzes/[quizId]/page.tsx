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
        <div className="flex items-center justify-between pb-4 border-b border-[#1b253b]">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/quizzes"
              className="p-2 rounded-lg bg-[#0e1628] hover:bg-[#162139] border border-[#1e2a45] text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                {quiz.course?.code} · {quiz.topic}
              </div>
              <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Question <span className="text-white font-bold">{currentIndex + 1}</span> of{' '}
            {quiz.questions.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#11192b] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>

        {/* If Quiz Completed Result */}
        {result ? (
          <div className="p-6 md:p-8 rounded-2xl bg-[#0d1425] border border-indigo-900/40 space-y-6">
            <div className="text-center space-y-2 pb-6 border-b border-[#1b263e]">
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center mx-auto text-emerald-400 mb-2">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Quiz Completed!</h2>
              <p className="text-sm text-gray-400">
                You scored <span className="text-emerald-400 font-bold">{result.score}</span> out of{' '}
                {result.maxScore} ({result.percentage}%)
              </p>
            </div>

            {/* Answer Breakdown with Explanations */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Review & Explanations
              </h3>

              {result.answers.map((ans, idx) => (
                <div
                  key={ans.questionId}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    ans.isCorrect
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-red-950/20 border-red-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-white">
                      {idx + 1}. {ans.questionText}
                    </span>
                    {ans.isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold flex-shrink-0">
                        <CheckCircle className="w-4 h-4" /> Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 font-bold flex-shrink-0">
                        <XCircle className="w-4 h-4" /> Incorrect
                      </span>
                    )}
                  </div>

                  <div className="text-gray-300">
                    <span className="text-gray-400">Correct Answer: </span>
                    <span className="font-medium text-emerald-300">Option {ans.correctOption + 1}</span>
                  </div>

                  {ans.explanation && (
                    <div className="p-2.5 rounded bg-[#0a0f1d] border border-[#1b263e] text-gray-300 italic">
                      💡 {ans.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedAnswers({});
                  setCurrentIndex(0);
                }}
                className="flex-1 py-2.5 bg-[#141d33] hover:bg-[#1a2642] text-gray-200 border border-[#23314f] rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Quiz</span>
              </button>
              <Link
                href="/dashboard/progress"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold text-center"
              >
                View Updated Mastery Progress →
              </Link>
            </div>
          </div>
        ) : (
          /* Question Taking Card */
          <div className="p-6 md:p-8 rounded-2xl bg-[#0d1425] border border-[#1b263e] space-y-6">
            <h2 className="text-base md:text-lg font-semibold text-white leading-relaxed">
              {currentQ.questionText}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className={`w-full p-4 rounded-xl border text-left text-xs md:text-sm font-medium transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-[#10172a] border-[#1e2a44] text-gray-300 hover:bg-[#141d33] hover:border-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-600 text-white'
                          : 'border-gray-500 text-gray-400'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Question Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#18233a]">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-lg bg-[#11192d] border border-[#1e2a44] text-xs font-medium text-gray-300 disabled:opacity-40"
              >
                Previous
              </button>

              {isLast ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? 'Submitting & Scoring...' : 'Submit Final Answers'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
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
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <QuizTakeContent />
    </Suspense>
  );
}
