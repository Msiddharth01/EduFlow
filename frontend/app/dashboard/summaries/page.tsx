'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { courseApi, tutorApi, CourseWithMeta, CourseDetails } from '@/lib/api';
import { Layers, Sparkles, FileText, BookOpen } from 'lucide-react';

export default function StandaloneSummariesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [summaryType, setSummaryType] = useState<'concise' | 'detailed' | 'revision-notes'>('detailed');
  const [summaryResult, setSummaryResult] = useState<{ title: string; text: string; type: string } | null>(null);
  const [generating, setGenerating] = useState(false);

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

    const res = await tutorApi.generateSummary(selectedCourseId, {
      materialId: selectedMaterialId,
      summaryType,
    });

    if (res.success) {
      setSummaryResult({
        title: res.data.materialTitle,
        text: res.data.summary,
        type: res.data.summaryType,
      });
    }
    setGenerating(false);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="pb-4 border-b border-[#1b253b]">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Document Summaries</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Generate concise executive overviews, detailed notes, or quick revision formulas from lecture PDFs.
          </p>
        </div>

        {/* Generator Controls Card */}
        <div className="p-6 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Course
              </label>
              <select
                className="w-full px-3 py-2 bg-[#090e1c] border border-[#1e2a44] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
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
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Document / Material
              </label>
              <select
                className="w-full px-3 py-2 bg-[#090e1c] border border-[#1e2a44] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
              >
                {courseDetails?.materials && courseDetails.materials.length > 0 ? (
                  courseDetails.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))
                ) : (
                  <option value="">No materials uploaded</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Summary Type
              </label>
              <select
                className="w-full px-3 py-2 bg-[#090e1c] border border-[#1e2a44] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                value={summaryType}
                onChange={(e) => setSummaryType(e.target.value as any)}
              >
                <option value="detailed">In-Depth Structured Breakdown</option>
                <option value="concise">Concise 3-Bullet Executive Overview</option>
                <option value="revision-notes">Exam Revision Flash Notes</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedMaterialId}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-2"
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
          </div>
        </div>

        {/* Output */}
        {summaryResult ? (
          <div className="p-6 rounded-xl bg-[#0d1425] border border-indigo-900/40 space-y-4">
            <div className="pb-3 border-b border-[#1b263e]">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {summaryResult.type.replace('-', ' ')}
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">{summaryResult.title}</h2>
            </div>
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {summaryResult.text}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-[#0c1322] border border-[#1a253c] rounded-xl text-xs text-gray-400 space-y-2">
            <FileText className="w-8 h-8 text-gray-500 mx-auto" />
            <p>Select your course material above to generate tailored summaries.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
