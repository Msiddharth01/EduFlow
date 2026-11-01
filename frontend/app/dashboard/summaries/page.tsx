'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { courseApi, tutorApi, CourseWithMeta, CourseDetails } from '@/lib/api';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  Layers,
  Sparkles,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Bookmark,
  BookOpen,
} from 'lucide-react';

export default function StandaloneSummariesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [summaryType, setSummaryType] = useState<'overview' | 'detailed' | 'exam-notes' | 'simplified'>('detailed');
  const [summaryResult, setSummaryResult] = useState<{
    title: string;
    text: string;
    type: string;
    sourcePages?: number[];
    isCached?: boolean;
    generatedAt?: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

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
      setErrorMessage(null);
      courseApi.get(selectedCourseId).then((res) => {
        if (res.success) {
          setCourseDetails(res.data.course);
          if (res.data.course.materials.length > 0) {
            setSelectedMaterialId(res.data.course.materials[0].id);
          } else {
            setSelectedMaterialId('');
          }
        }
      });
    }
  }, [selectedCourseId]);

  const handleGenerate = async () => {
    if (!selectedCourseId || !selectedMaterialId || generating) return;
    setGenerating(true);
    setErrorMessage(null);

    const res = await tutorApi.generateSummary(selectedCourseId, {
      materialId: selectedMaterialId,
      summaryType,
    });

    if (res.success) {
      setSummaryResult({
        title: res.data.materialTitle,
        text: res.data.summary,
        type: res.data.summaryType,
        sourcePages: res.data.sourcePages,
        isCached: res.data.isCached,
        generatedAt: res.data.generatedAt,
      });
    } else {
      setErrorMessage(res.error || 'Failed to generate summary.');
    }
    setGenerating(false);
  };

  const selectedMaterial = courseDetails?.materials.find((m) => m.id === selectedMaterialId);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="pb-4 border-b border-gray-200 dark:border-[#1b253b]">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>AI Material Summary Generator</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Transform course lecture PDFs into verified academic overviews, in-depth breakdowns, exam preparation notes, or simplified explanations.
          </p>
        </div>

        {/* Generator Controls Card */}
        <div className="p-6 rounded-xl bg-white dark:bg-[#0d1425] border border-gray-200 dark:border-[#1b263e] shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1.5">
                Course
              </label>
              <select
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#090e1c] border border-gray-300 dark:border-[#1e2a44] rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1.5">
                Document / Material
              </label>
              <select
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#090e1c] border border-gray-300 dark:border-[#1e2a44] rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
              >
                {courseDetails?.materials && courseDetails.materials.length > 0 ? (
                  courseDetails.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.fileName})
                    </option>
                  ))
                ) : (
                  <option value="">No materials uploaded</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1.5">
                Summary Format
              </label>
              <select
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#090e1c] border border-gray-300 dark:border-[#1e2a44] rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={summaryType}
                onChange={(e) => setSummaryType(e.target.value as any)}
              >
                <option value="detailed">In-Depth Structured Breakdown</option>
                <option value="overview">Quick Overview</option>
                <option value="exam-notes">Exam Preparation Notes</option>
                <option value="simplified">Simplified Explanation</option>
              </select>
            </div>
          </div>

          {selectedMaterial?.status === 'FAILED' && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Extraction Notice: </span>
                {selectedMaterial.errorMessage || 'This document could not be read properly by OCR. Scanned pages or handwriting could not be deciphered.'}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedMaterialId}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Document Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Summary</span>
                </>
              )}
            </button>

            {summaryResult?.isCached && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Instant Cached Retrieval</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Summary Generation Failed</p>
              <p className="mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Output Card */}
        {summaryResult ? (
          <div className="p-6 md:p-8 rounded-xl bg-white dark:bg-[#0d1425] border border-gray-200 dark:border-indigo-900/40 shadow-sm space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 dark:border-[#1b263e] gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {summaryResult.type.replace('-', ' ')}
                  </span>
                  {summaryResult.sourcePages && summaryResult.sourcePages.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{summaryResult.sourcePages.length} Pages Verified</span>
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1.5">{summaryResult.title}</h2>
              </div>

              {summaryResult.sourcePages && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Pages:</span>
                  {summaryResult.sourcePages.slice(0, 8).map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium"
                    >
                      P.{p}
                    </span>
                  ))}
                  {summaryResult.sourcePages.length > 8 && (
                    <span className="text-xs text-gray-500">+{summaryResult.sourcePages.length - 8} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Rendered Markdown Body */}
            <div className="pt-2">
              <MarkdownRenderer content={summaryResult.text} />
            </div>
          </div>
        ) : (
          !errorMessage && (
            <div className="p-12 text-center bg-gray-50 dark:bg-[#0c1322] border border-gray-200 dark:border-[#1a253c] rounded-xl text-xs text-gray-500 dark:text-gray-400 space-y-3">
              <BookOpen className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No summary generated yet.</p>
              <p className="max-w-md mx-auto text-xs">
                Select your course material above and choose between Quick Overview, In-Depth Breakdown, Exam Prep Notes, or Simplified Explanation.
              </p>
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
