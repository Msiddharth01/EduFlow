'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import {
  courseApi,
  materialApi,
  tutorApi,
  quizApi,
  teacherApi,
  CourseDetails,
  MaterialSummary,
  QuizWithMeta,
  Citation,
  TeacherCourseAnalytics,
} from '@/lib/api';
import {
  BookOpen,
  FileText,
  MessageSquare,
  CheckCircle,
  TrendingUp,
  Upload,
  Send,
  Sparkles,
  ArrowLeft,
  Clock,
  Layers,
  AlertCircle,
  HelpCircle,
  Maximize2,
  ChevronRight,
  RefreshCw,
  Plus,
  Users,
  Search,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function CourseWorkspaceContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [userRole, setUserRole] = useState<string>('STUDENT');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'materials' | 'tutor' | 'summaries' | 'quizzes' | 'progress' | 'roster' | 'analytics'
  >('overview');

  // Teacher Analytics State
  const [courseAnalytics, setCourseAnalytics] = useState<TeacherCourseAnalytics | null>(null);
  const [courseAnalyticsLoading, setCourseAnalyticsLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Materials & Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedMaterialForSplit, setSelectedMaterialForSplit] = useState<MaterialSummary | null>(null);

  // Authenticated PDF Viewer State
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [retryingMaterialId, setRetryingMaterialId] = useState<string | null>(null);

  // AI Tutor state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: Citation[] }>>([
    {
      role: 'assistant',
      content: 'Hello! I am your course AI Tutor. Ask me any question regarding your lecture notes, slides, or syllabus.',
    },
  ]);
  const [questionInput, setQuestionInput] = useState('');
  const [tutorMaterialFilter, setTutorMaterialFilter] = useState<string>('');
  const [tutorLoading, setTutorLoading] = useState(false);

  // Summaries state
  const [summaryMaterialId, setSummaryMaterialId] = useState<string>('');
  const [summaryType, setSummaryType] = useState<'concise' | 'detailed' | 'revision-notes'>('detailed');
  const [summaryResult, setSummaryResult] = useState<{ title: string; text: string; type: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Quizzes state
  const [courseQuizzes, setCourseQuizzes] = useState<QuizWithMeta[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [aiQuizLoading, setAiQuizLoading] = useState(false);
  const [retryingQuizId, setRetryingQuizId] = useState<string | null>(null);
  const [generatingQuizMaterialId, setGeneratingQuizMaterialId] = useState<string | null>(null);

  // Professor create quiz modal state
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '',
    topic: '',
    materialId: '',
    questions: [
      {
        questionText: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
      },
    ],
  });

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const loadCourse = async () => {
    if (!courseId) return;
    setLoading(true);
    const res = await courseApi.get(courseId);
    if (res.success) {
      setCourse(res.data.course);
      setUserRole(res.data.userRole);
      if (res.data.course.materials.length > 0 && !selectedMaterialForSplit) {
        const firstMat = res.data.course.materials[0];
        setSelectedMaterialForSplit(firstMat);
        setTutorMaterialFilter(firstMat.id);
        setSummaryMaterialId(firstMat.id);
      }
    }
    setLoading(false);
  };

  const loadQuizzes = async () => {
    if (!courseId) return;
    setQuizLoading(true);
    const res = await quizApi.list(courseId);
    if (res.success) setCourseQuizzes(res.data.quizzes);
    setQuizLoading(false);
  };

  const loadTeacherAnalytics = async () => {
    if (!courseId) return;
    setCourseAnalyticsLoading(true);
    const res = await teacherApi.getCourseAnalytics(courseId);
    if (res.success) {
      setCourseAnalytics(res.data);
    }
    setCourseAnalyticsLoading(false);
  };

  useEffect(() => {
    if (courseId) {
      loadCourse();
      loadQuizzes();
      if (user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
        loadTeacherAnalytics();
      }
    }
  }, [courseId, user]);

  // Load and manage authenticated PDF Blob URL with proper cleanup
  useEffect(() => {
    let activeUrl: string | null = null;
    let isMounted = true;

    async function loadPdfBlob() {
      if (!selectedMaterialForSplit?.id) {
        setPdfBlobUrl(null);
        setPdfError(null);
        setPdfLoading(false);
        return;
      }

      setPdfLoading(true);
      setPdfError(null);

      const res = await materialApi.fetchPdfBlob(selectedMaterialForSplit.id);
      if (!isMounted) {
        if (res.success) {
          URL.revokeObjectURL(res.blobUrl);
        }
        return;
      }

      if (res.success) {
        activeUrl = res.blobUrl;
        setPdfBlobUrl(res.blobUrl);
      } else {
        setPdfBlobUrl(null);
        setPdfError(res.error || 'Unable to load PDF document.');
      }
      setPdfLoading(false);
    }

    loadPdfBlob();

    return () => {
      isMounted = false;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [selectedMaterialForSplit?.id]);

  // Handle PDF Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !courseId || uploading) return;

    setUploading(true);
    setUploadMsg(null);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle || uploadFile.name.replace(/\.[^/.]+$/, ''));

    const res = await materialApi.upload(courseId, formData);
    if (res.success) {
      setUploadMsg({ type: 'success', text: 'PDF uploaded successfully! Processing and extracting text chunks...' });
      setUploadFile(null);
      setUploadTitle('');
      await loadCourse();
      const interval = setInterval(() => {
        loadCourse();
      }, 3000);
      setTimeout(() => clearInterval(interval), 45000);
    } else {
      setUploadMsg({ type: 'error', text: res.error });
    }
    setUploading(false);
  };

  // Handle Retry Material Processing
  const handleRetryMaterial = async (materialId: string) => {
    setRetryingMaterialId(materialId);
    const res = await materialApi.retry(materialId);
    if (res.success) {
      await loadCourse();
      const interval = setInterval(() => {
        loadCourse();
      }, 3000);
      setTimeout(() => clearInterval(interval), 35000);
    } else {
      alert(`Retry failed: ${res.error}`);
    }
    setRetryingMaterialId(null);
  };

  // Handle AI Tutor Ask
  const handleAskTutor = async (promptText?: string) => {
    const q = promptText || questionInput;
    if (!q.trim() || !courseId || tutorLoading) return;

    const newMessages = [...messages, { role: 'user' as const, content: q }];
    setMessages(newMessages);
    if (!promptText) setQuestionInput('');
    setTutorLoading(true);

    const activeMaterialId = tutorMaterialFilter || selectedMaterialForSplit?.id || undefined;
    const res = await tutorApi.ask(courseId, {
      question: q,
      materialId: activeMaterialId,
    });

    if (res.success) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.data.answer,
          citations: res.data.citations,
        },
      ]);
    } else {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Unable to get answer: ${res.error}`,
        },
      ]);
    }
    setTutorLoading(false);
  };

  // Handle Summary Generation
  const handleGenerateSummary = async () => {
    if (!courseId || !summaryMaterialId || summaryLoading) return;
    setSummaryLoading(true);

    const res = await tutorApi.generateSummary(courseId, {
      materialId: summaryMaterialId,
      summaryType,
    });

    if (res.success) {
      setSummaryResult({
        title: res.data.materialTitle,
        text: res.data.summary,
        type: res.data.summaryType,
      });
    }
    setSummaryLoading(false);
  };

  // Professor create quiz
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    const res = await quizApi.create(courseId, {
      title: quizForm.title,
      topic: quizForm.topic,
      materialId: quizForm.materialId || undefined,
      questions: quizForm.questions,
    });

    if (res.success) {
      setShowCreateQuiz(false);
      loadQuizzes();
    }
  };

  const handleGenerateAIQuiz = async () => {
    if (!courseId || aiQuizLoading) return;
    setAiQuizLoading(true);
    // Scan and generate for any missing course materials first
    const missingRes = await quizApi.generateMissing(courseId);
    if (missingRes.success && missingRes.data.processedCount > 0) {
      await loadQuizzes();
    } else {
      // Generate practice quiz from course materials
      await quizApi.generate(courseId, { questionCount: 10 });
      await loadQuizzes();
    }
    setAiQuizLoading(false);
  };

  const handleRetryQuiz = async (quizId: string) => {
    if (retryingQuizId === quizId) return;
    setRetryingQuizId(quizId);
    const res = await quizApi.retry(quizId);
    if (res.success) {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const listRes = await quizApi.list(courseId);
        if (listRes.success) {
          setCourseQuizzes(listRes.data.quizzes);
          const target = listRes.data.quizzes.find((q) => q.id === quizId);
          if (target && target.status !== 'PROCESSING') {
            clearInterval(interval);
            setRetryingQuizId(null);
          }
        }
        if (attempts >= 15) {
          clearInterval(interval);
          setRetryingQuizId(null);
        }
      }, 1500);
    } else {
      setRetryingQuizId(null);
    }
  };

  const handleGenerateQuizForMaterial = async (materialId: string) => {
    if (generatingQuizMaterialId === materialId || aiQuizLoading) return;
    setGeneratingQuizMaterialId(materialId);
    setAiQuizLoading(true);
    const res = await quizApi.generate(courseId, { materialId, questionCount: 10, force: true });
    if (res.success) {
      await loadQuizzes();
      setActiveTab('quizzes');
    }
    setGeneratingQuizMaterialId(null);
    setAiQuizLoading(false);
  };

  if (loading || !course) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Course Workspace...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isProfessor = userRole === 'PROFESSOR' || user?.role === 'PROFESSOR' || user?.role === 'ADMIN';

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Workspace Top Nav & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/courses"
              className="p-2 rounded-lg bg-[#0e1628] hover:bg-[#162139] border border-[#1e2a45] text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold tracking-wide bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                  {course.code}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isProfessor
                      ? 'bg-purple-950/50 text-purple-300 border border-purple-800/40'
                      : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                  }`}
                >
                  {userRole}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white mt-1">{course.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isProfessor && (
              <button
                onClick={() => setActiveTab('materials')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all shadow-md shadow-indigo-600/20"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Material</span>
              </button>
            )}
          </div>
        </div>

        {/* Workspace Tabs Navigation */}
        <div className="flex items-center gap-1 border-b border-[#1b253b] overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'materials', label: `Materials (${course.materials.length})`, icon: FileText },
            ...(isProfessor
              ? [
                  {
                    id: 'roster',
                    label: `Student Roster (${courseAnalytics?.students.length ?? 0})`,
                    icon: Users,
                  },
                  { id: 'analytics', label: 'Quiz Analytics', icon: TrendingUp },
                ]
              : []),
            { id: 'tutor', label: 'AI Tutor & Split View', icon: MessageSquare },
            { id: 'summaries', label: 'Summaries', icon: Layers },
            { id: 'quizzes', label: `Quizzes (${courseQuizzes.length})`, icon: CheckCircle },
            ...(!isProfessor ? [{ id: 'progress', label: 'Progress', icon: TrendingUp }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#0d1425]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-4">
                <h2 className="text-base font-bold text-white">Course Overview & Syllabus</h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {course.description || 'No detailed syllabus provided for this course yet.'}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#18233a]">
                  <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c273e]">
                    <div className="text-xs text-gray-400">Total Materials</div>
                    <div className="text-xl font-bold text-white mt-0.5">{course.materials.length}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c273e]">
                    <div className="text-xs text-gray-400">Quizzes</div>
                    <div className="text-xl font-bold text-white mt-0.5">{courseQuizzes.length}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c273e]">
                    <div className="text-xs text-gray-400">AI Tutor Index</div>
                    <div className="text-xl font-bold text-emerald-400 mt-0.5">
                      {course.materials.filter((m) => m.status === 'READY').length} Ready
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('tutor')}
                  className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e] hover:border-indigo-500/50 hover:bg-[#10192e] text-left transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-indigo-600/15 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400" />
                  </div>
                  <div className="text-sm font-semibold text-white">Open AI Tutor Workspace</div>
                  <div className="text-xs text-gray-400">
                    Ask questions grounded directly in lecture slides and PDF notes.
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('quizzes')}
                  className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e] hover:border-emerald-500/50 hover:bg-[#10192e] text-left transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-emerald-600/15 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400" />
                  </div>
                  <div className="text-sm font-semibold text-white">Take Practice Quizzes</div>
                  <div className="text-xs text-gray-400">
                    Test your understanding with auto-evaluated MCQs and explanations.
                  </div>
                </button>
              </div>
            </div>

            {/* Sidebar Overview Stats */}
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Course Metadata
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#18233a]">
                    <span className="text-gray-400">Course Code</span>
                    <span className="font-semibold text-white">{course.code}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#18233a]">
                    <span className="text-gray-400">Instructor</span>
                    <span className="font-semibold text-white">{course.professor || 'Prof. Faculty'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#18233a]">
                    <span className="text-gray-400">Your Role</span>
                    <span className="font-semibold text-indigo-400">{userRole}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-400">Created On</span>
                    <span className="text-gray-300">{new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LECTURE PDF MATERIALS & PROFESSOR UPLOAD */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            {/* Upload Area for Professors */}
            {isProfessor && (
              <div className="p-5 rounded-xl bg-[#0d1425] border border-indigo-900/30 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Upload Lecture Material (PDF)</span>
                </h2>

                {uploadMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      uploadMsg.type === 'success'
                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                        : 'bg-red-950/30 border-red-800/40 text-red-300'
                    }`}
                  >
                    {uploadMsg.text}
                  </div>
                )}

                <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Material Title
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-[#090e1c] border border-[#1e2a44] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Unit 1: Neural Networks & Transformers"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Select PDF Document
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full px-2 py-1.5 bg-[#090e1c] border border-[#1e2a44] rounded-lg text-xs text-gray-300 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-indigo-600 file:text-white"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing & Chunking...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload & Extract Chunks</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Materials List */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Uploaded Materials ({course.materials.length})
              </h2>

              {course.materials.length === 0 ? (
                <div className="p-8 text-center bg-[#0c1322] border border-[#1a253c] rounded-xl text-xs text-gray-400 space-y-2">
                  <FileText className="w-8 h-8 text-gray-500 mx-auto" />
                  <p>No materials have been uploaded for this course yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.materials.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-sm font-semibold text-white truncate">{m.title}</div>
                            <div className="text-[11px] text-gray-400 truncate">
                              {m.fileName} · {new Date(m.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              m.status === 'READY'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                                : m.status === 'PROCESSING'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40 animate-pulse'
                                : 'bg-red-950/60 text-red-300 border border-red-800/40'
                            }`}
                          >
                            {m.status}
                          </span>

                          {m.status === 'FAILED' && (
                            <button
                              onClick={() => handleRetryMaterial(m.id)}
                              disabled={retryingMaterialId === m.id}
                              className="px-2.5 py-1 text-xs bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 rounded border border-amber-800/50 transition-colors flex items-center gap-1.5"
                              title="Retry processing this document"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingMaterialId === m.id ? 'animate-spin' : ''}`} />
                              <span>{retryingMaterialId === m.id ? 'Retrying...' : 'Retry'}</span>
                            </button>
                          )}

                          {m.status === 'READY' && (() => {
                            const matQuiz = courseQuizzes.find((q) => q.materialId === m.id);
                            if (matQuiz) {
                              if (matQuiz.status === 'READY') {
                                return (
                                  <Link
                                    href={`/dashboard/quizzes/${matQuiz.id}`}
                                    className="px-2.5 py-1 text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded border border-emerald-800/40 transition-colors flex items-center gap-1"
                                    title="Take Practice Quiz for this material"
                                  >
                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    <span>Quiz ({matQuiz.questionCount}Q)</span>
                                  </Link>
                                );
                              }
                              if (matQuiz.status === 'PROCESSING') {
                                return (
                                  <span className="px-2.5 py-1 text-xs bg-amber-950/60 text-amber-300 rounded border border-amber-800/40 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                    <span>Quiz Generating...</span>
                                  </span>
                                );
                              }
                              if (matQuiz.status === 'FAILED') {
                                return (
                                  <button
                                    onClick={() => handleRetryQuiz(matQuiz.id)}
                                    className="px-2.5 py-1 text-xs bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded border border-rose-800/40 flex items-center gap-1"
                                    title="Retry quiz generation"
                                  >
                                    <span>Retry Quiz</span>
                                  </button>
                                );
                              }
                            }
                            return (
                              <button
                                onClick={() => handleGenerateQuizForMaterial(m.id)}
                                disabled={generatingQuizMaterialId === m.id || aiQuizLoading}
                                className="px-2.5 py-1 text-xs bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 rounded border border-indigo-800/40 transition-colors flex items-center gap-1"
                                title="Generate AI practice quiz for this material"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span>{generatingQuizMaterialId === m.id ? 'Generating...' : 'Generate Quiz'}</span>
                              </button>
                            );
                          })()}

                          <button
                            onClick={() => {
                              setSelectedMaterialForSplit(m);
                              setTutorMaterialFilter(m.id);
                              setActiveTab('tutor');
                            }}
                            className="px-2.5 py-1 text-xs bg-[#162139] hover:bg-[#1e2d4e] text-indigo-300 rounded border border-[#243456] transition-colors"
                          >
                            Split View →
                          </button>
                        </div>
                      </div>

                      {m.status === 'FAILED' && m.errorMessage && (
                        <div className="text-[11px] text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-2 flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" />
                          <span>{m.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AI TUTOR & SPLIT VIEW PDF WORKSPACE */}
        {activeTab === 'tutor' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#0d1425] border border-[#1b263e] rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-medium">Material Context:</span>
                <select
                  className="bg-[#090e1c] border border-[#1e2a44] rounded px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
                  value={tutorMaterialFilter}
                  onChange={(e) => {
                    setTutorMaterialFilter(e.target.value);
                    const mat = course.materials.find((m) => m.id === e.target.value);
                    if (mat) setSelectedMaterialForSplit(mat);
                  }}
                >
                  <option value="">All Course Materials ({course.materials.length})</option>
                  {course.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Prompts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-500">Suggested:</span>
                {['Explain this topic simply', 'Key formulas and definitions', 'Summarize main points'].map(
                  (prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleAskTutor(prompt)}
                      className="px-2.5 py-1 bg-[#131d33] hover:bg-indigo-950/60 border border-[#23314f] text-gray-300 hover:text-indigo-300 rounded text-[11px] transition-colors"
                    >
                      {prompt}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[650px]">
              {/* LEFT: PDF Viewer */}
              <div className="bg-[#0b101f] border border-[#1b263e] rounded-xl overflow-hidden flex flex-col">
                <div className="p-3 bg-[#0d1425] border-b border-[#1b263e] flex items-center justify-between text-xs text-gray-300">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold truncate">
                      {selectedMaterialForSplit ? selectedMaterialForSplit.title : 'No Material Selected'}
                    </span>
                  </div>
                  {selectedMaterialForSplit && (
                    <a
                      href={pdfBlobUrl || materialApi.getFileUrlWithToken(selectedMaterialForSplit.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                      title="Open PDF in new tab"
                    >
                      <span>New Tab</span>
                      <Maximize2 className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex-1 bg-[#090d18] relative">
                  {selectedMaterialForSplit ? (
                    pdfLoading ? (
                      <div className="h-full flex items-center justify-center text-center p-6 text-gray-400">
                        <div className="space-y-3">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-xs">Loading authentic course PDF...</p>
                        </div>
                      </div>
                    ) : pdfError ? (
                      <div className="h-full flex items-center justify-center text-center p-6 text-gray-400">
                        <div className="max-w-xs space-y-3 p-4 rounded-xl bg-red-950/30 border border-red-900/40">
                          <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
                          <div className="text-xs font-semibold text-red-300">Unable to Display PDF</div>
                          <p className="text-[11px] text-gray-400">{pdfError}</p>
                          <button
                            onClick={() => {
                              if (selectedMaterialForSplit) {
                                setPdfLoading(true);
                                setPdfError(null);
                                materialApi.fetchPdfBlob(selectedMaterialForSplit.id).then((res) => {
                                  if (res.success) setPdfBlobUrl(res.blobUrl);
                                  else setPdfError(res.error || 'Unable to load PDF document.');
                                  setPdfLoading(false);
                                });
                              }
                            }}
                            className="px-3 py-1 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-200 text-[11px] rounded transition-colors"
                          >
                            Retry Loading
                          </button>
                        </div>
                      </div>
                    ) : pdfBlobUrl ? (
                      <iframe
                        src={pdfBlobUrl}
                        className="w-full h-full border-0"
                        title={selectedMaterialForSplit.title}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-center p-6 text-gray-500 text-xs">
                        <div>
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Preparing PDF document...</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="h-full flex items-center justify-center text-center p-6 text-gray-500 text-xs">
                      <div>
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Select a material from the dropdown above to view the PDF alongside the tutor.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: AI Tutor Chat */}
              <div className="bg-[#0b101f] border border-[#1b263e] rounded-xl flex flex-col overflow-hidden">
                <div className="p-3 bg-[#0d1425] border-b border-[#1b263e] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>AI Tutor (RAG Pipeline)</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Context: Extracted Chunks</span>
                </div>

                {/* Messages scroll */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3.5 rounded-xl leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-[#121a2d] text-gray-200 border border-[#1e2a44] rounded-bl-none'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {/* Source Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-[#1e2a44] space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                              Verified Citations & Page References:
                            </div>
                            {msg.citations.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2 rounded bg-[#0b1120] border border-indigo-900/30 text-[11px] text-gray-300"
                              >
                                <span className="font-semibold text-white">{c.documentTitle}</span>
                                <span className="text-indigo-400 ml-1.5">Page {c.pageNumber}</span>
                                <p className="text-gray-400 mt-0.5 italic">{c.snippet}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {tutorLoading && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Retrieving course chunks and generating answer...</span>
                    </div>
                  )}
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskTutor();
                  }}
                  className="p-3 bg-[#0d1425] border-t border-[#1b263e] flex items-center gap-2"
                >
                  <input
                    className="flex-1 px-3 py-2 bg-[#080d1a] border border-[#1e2a44] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Ask a question about this course or document..."
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    disabled={tutorLoading}
                  />
                  <button
                    type="submit"
                    disabled={tutorLoading || !questionInput.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SUMMARIES */}
        {activeTab === 'summaries' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>AI Material Summary Generator</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Select Material
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-[#090e1c] border border-[#1e2a44] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    value={summaryMaterialId}
                    onChange={(e) => setSummaryMaterialId(e.target.value)}
                  >
                    <option value="">-- Choose a material --</option>
                    {course.materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Summary Format
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

                <div className="flex items-end">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading || !summaryMaterialId}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {summaryLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Summary</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary View Container */}
            {summaryResult ? (
              <div className="p-6 rounded-xl bg-[#0d1425] border border-indigo-900/30 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1b263e]">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      {summaryResult.type.replace('-', ' ')}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{summaryResult.title}</h3>
                  </div>
                </div>

                <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {summaryResult.text}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-[#0c1322] border border-[#1a253c] rounded-xl text-xs text-gray-400 space-y-2">
                <Layers className="w-8 h-8 text-gray-500 mx-auto" />
                <p>Select a material above to create concise or comprehensive revision summaries.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: QUIZZES */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>Course Practice Quizzes</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Every uploaded lecture material generates an AI-grounded quiz scored on the server.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadQuizzes}
                  disabled={quizLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#162139] hover:bg-[#1e2d4e] border border-[#243456] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                  title="Refresh Quizzes"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${quizLoading ? 'animate-spin' : ''}`} />
                  <span>{quizLoading ? 'Refreshing...' : 'Refresh'}</span>
                </button>

                <button
                  onClick={handleGenerateAIQuiz}
                  disabled={aiQuizLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiQuizLoading ? 'Synthesizing Quizzes...' : 'Generate with AI'}</span>
                </button>

                {isProfessor && (
                  <button
                    onClick={() => setShowCreateQuiz(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#162139] hover:bg-[#1e2d4e] border border-[#243456] text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Quiz</span>
                  </button>
                )}
              </div>
            </div>

            {courseQuizzes.length === 0 ? (
              <div className="p-12 text-center bg-[#0c1322] border border-[#1a253c] rounded-xl text-xs text-gray-400 space-y-3">
                <CheckCircle className="w-8 h-8 text-gray-500 mx-auto" />
                <p>No quizzes currently available for this course.</p>
                <button
                  onClick={handleGenerateAIQuiz}
                  disabled={aiQuizLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Quizzes from Course Materials</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              quiz.status === 'READY'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                                : quiz.status === 'PROCESSING'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center gap-1'
                                : 'bg-red-950/60 text-red-300 border border-red-800/40'
                            }`}
                          >
                            {quiz.status === 'PROCESSING' && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                            {quiz.status}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                            {quiz.topic}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{quiz.questionCount} Questions</span>
                      </div>

                      <div className="text-xs text-indigo-400 flex items-center gap-1.5 mb-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          Source PDF: {quiz.material?.fileName || quiz.material?.title || 'Course Lecture'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-2 leading-snug">{quiz.title}</h3>

                      {quiz.status === 'FAILED' && (
                        <div className="p-2.5 rounded bg-red-950/30 border border-red-900/40 text-xs text-red-300 flex items-start gap-2 mb-3">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{quiz.errorMessage || 'Quiz generation failed.'}</span>
                        </div>
                      )}

                      {quiz.status === 'PROCESSING' && (
                        <div className="p-3 rounded bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300 flex items-center gap-2 mb-3">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 flex-shrink-0" />
                          <span>Synthesizing questions from extracted PDF content...</span>
                        </div>
                      )}

                      {quiz.status === 'READY' && quiz.myLatestAttempt && (
                        <div className="p-2.5 rounded bg-[#10182b] border border-[#1a263d] text-xs flex justify-between items-center mb-3">
                          <span className="text-gray-400">Latest Score:</span>
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

                    {quiz.status === 'READY' && (
                      <Link
                        href={`/dashboard/quizzes/${quiz.id}`}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-center rounded-lg text-xs font-semibold transition-colors block mt-2"
                      >
                        {quiz.myLatestAttempt ? 'Retake Quiz →' : 'Take Quiz →'}
                      </Link>
                    )}

                    {quiz.status === 'FAILED' && (
                      <button
                        onClick={() => handleRetryQuiz(quiz.id)}
                        disabled={retryingQuizId === quiz.id}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-center rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 mt-2"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${retryingQuizId === quiz.id ? 'animate-spin' : ''}`} />
                        <span>{retryingQuizId === quiz.id ? 'Retrying Generation...' : 'Retry Quiz Generation'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PROGRESS & ANALYTICS (Student View) */}
        {activeTab === 'progress' && (
          <div className="p-6 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Course Learning & Topic Mastery</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Your overall course progress is computed directly from verified server quiz attempts and
              retention metrics. To review your complete multi-course analytics and topic breakdown,
              visit your{' '}
              <Link href="/dashboard/progress" className="text-indigo-400 underline font-semibold">
                Global Progress Dashboard
              </Link>
              .
            </p>
          </div>
        )}

        {/* TEACHER TAB: STUDENT ROSTER */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Enrolled Students & Performance</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Track individual student progress, quiz attempts, and learning support needs for this course.
                </p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter roster by student name..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#080d1a] border border-[#1c2944] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick stats banner */}
            {courseAnalytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
                  <div className="text-xs text-gray-400">Total Enrolled</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {courseAnalytics.stats.enrollmentCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
                  <div className="text-xs text-emerald-400">Class Average</div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">
                    {courseAnalytics.stats.classAverage !== null
                      ? `${courseAnalytics.stats.classAverage}%`
                      : 'N/A'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
                  <div className="text-xs text-rose-400">Needs Support (&lt;60%)</div>
                  <div className="text-xl font-bold text-rose-400 mt-0.5">
                    {courseAnalytics.stats.studentsNeedingSupport}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
                  <div className="text-xs text-indigo-400">Quiz Submissions</div>
                  <div className="text-xl font-bold text-indigo-300 mt-0.5">
                    {courseAnalytics.stats.totalAttempts}
                  </div>
                </div>
              </div>
            )}

            {/* Roster Table */}
            <div className="rounded-xl bg-[#0d1425] border border-[#1b263e] overflow-hidden">
              {courseAnalyticsLoading ? (
                <div className="p-12 text-center text-gray-400 text-xs">Loading course roster...</div>
              ) : !courseAnalytics || courseAnalytics.students.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs space-y-2">
                  <Users className="w-8 h-8 text-gray-600 mx-auto" />
                  <p>No students have enrolled in this course yet.</p>
                  <p className="text-[11px] text-gray-500">
                    Share course code <span className="font-mono text-indigo-400 font-bold">{course.code}</span> with your students.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#090e1d] text-gray-400 uppercase tracking-wider font-semibold border-b border-[#1b263e]">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Enrolled Date</th>
                        <th className="py-3 px-4 text-center">Quiz Attempts</th>
                        <th className="py-3 px-4 text-center">Average Score</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#162137]">
                      {courseAnalytics.students
                        .filter(
                          (s) =>
                            s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                            s.email.toLowerCase().includes(rosterSearch.toLowerCase())
                        )
                        .map((st) => (
                          <>
                            <tr key={st.id} className="hover:bg-[#10192e] transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white text-sm">{st.name}</div>
                                <div className="text-gray-400 text-[11px] font-mono">{st.email}</div>
                              </td>
                              <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                                {new Date(st.enrolledAt).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-gray-200">
                                {st.totalAttempts}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {st.averageScore !== null ? (
                                  <span
                                    className={`font-black text-sm ${
                                      st.averageScore >= 60 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {st.averageScore}%
                                  </span>
                                ) : (
                                  <span className="text-gray-500 italic">No attempts</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                {st.status === 'GOOD' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                                    <CheckCircle className="w-3 h-3" />
                                    Good Standing
                                  </span>
                                )}
                                {st.status === 'NEEDS_SUPPORT' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                                    <AlertCircle className="w-3 h-3" />
                                    Needs Attention
                                  </span>
                                )}
                                {st.status === 'NO_ATTEMPTS' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                                    <HelpCircle className="w-3 h-3" />
                                    No Attempts
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {st.attempts.length > 0 && (
                                  <button
                                    onClick={() =>
                                      setExpandedStudentId(
                                        expandedStudentId === st.id ? null : st.id
                                      )
                                    }
                                    className="px-2.5 py-1 rounded bg-[#162137] hover:bg-[#1e2d4d] text-gray-300 hover:text-white text-xs font-semibold transition-all inline-flex items-center gap-1"
                                  >
                                    <span>{expandedStudentId === st.id ? 'Hide' : 'History'}</span>
                                    {expandedStudentId === st.id ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {/* Expandable attempt history */}
                            {expandedStudentId === st.id && (
                              <tr className="bg-[#080d1a]">
                                <td colSpan={6} className="p-4 border-b border-[#1b263e]">
                                  <div className="space-y-2 max-w-xl mx-auto">
                                    <div className="text-xs font-bold text-gray-300 uppercase">
                                      Submission History for {st.name}
                                    </div>
                                    <div className="space-y-1.5">
                                      {st.attempts.map((att) => (
                                        <div
                                          key={att.id}
                                          className="p-2.5 rounded-lg bg-[#0e1628] border border-[#1c2944] flex items-center justify-between text-xs"
                                        >
                                          <span className="text-gray-400 text-[11px]">
                                            {new Date(att.createdAt).toLocaleString()}
                                          </span>
                                          <span
                                            className={`font-black ${
                                              att.percentage >= 60
                                                ? 'text-emerald-400'
                                                : 'text-rose-400'
                                            }`}
                                          >
                                            {att.score} / {att.maxScore} ({att.percentage}%)
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEACHER TAB: QUIZ ANALYTICS & QUESTION BREAKDOWN */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <span>Quiz Analytics & Question Breakdown</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Examine student accuracy rates on individual questions to pinpoint weak topics and lecture slide references.
              </p>
            </div>

            {/* Question Breakdown */}
            <div className="space-y-3">
              {!courseAnalytics || courseAnalytics.questionAnalytics.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-[#0d1425] border border-[#1b263e] rounded-xl text-xs">
                  No question responses recorded yet for this course.
                </div>
              ) : (
                courseAnalytics.questionAnalytics.map((ques, idx) => (
                  <div
                    key={ques.id || idx}
                    className="p-5 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141d33] text-indigo-300">
                            {ques.quizTitle}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#17223b] text-gray-300">
                            {ques.topic}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white mt-1.5 leading-relaxed">
                          <span className="text-indigo-400 font-bold mr-1.5">Q{idx + 1}.</span>
                          {ques.questionText}
                        </h3>
                        {ques.pageReference && (
                          <div className="text-[11px] text-indigo-400 font-medium mt-1">
                            Referenced on Page {ques.pageReference} in course notes
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold border ${
                            ques.successRate >= 60
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                              : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                          }`}
                        >
                          {ques.successRate}% Success
                        </span>
                        <div className="text-[11px] text-gray-400 mt-1">
                          {ques.correctResponses} / {ques.totalResponses} correct ({ques.incorrectResponses} incorrect)
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Professor Create Quiz Modal */}
      {showCreateQuiz && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-[#0e1628] border border-[#1e2d4d] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white">Create Practice Quiz</h2>
            <form onSubmit={handleCreateQuiz} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Quiz Title
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#080d1a] border border-[#22304e] text-white text-xs rounded-lg"
                  placeholder="e.g. Transformers & Self-Attention Quiz"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Topic Tag
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#080d1a] border border-[#22304e] text-white text-xs rounded-lg"
                  placeholder="e.g. Attention Mechanism"
                  value={quizForm.topic}
                  onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })}
                  required
                />
              </div>

              {/* Question 1 Editor */}
              <div className="p-3.5 rounded-lg bg-[#0a0f1d] border border-[#1b263e] space-y-2">
                <div className="text-xs font-bold text-indigo-400">Question 1</div>
                <input
                  className="w-full px-3 py-1.5 bg-[#080d1a] border border-[#22304e] text-white text-xs rounded-lg"
                  placeholder="Question text..."
                  value={quizForm.questions[0].questionText}
                  onChange={(e) => {
                    const q = [...quizForm.questions];
                    q[0].questionText = e.target.value;
                    setQuizForm({ ...quizForm, questions: q });
                  }}
                  required
                />

                <div className="space-y-1.5 pt-1">
                  {quizForm.questions[0].options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctIdx"
                        checked={quizForm.questions[0].correctIndex === oIdx}
                        onChange={() => {
                          const q = [...quizForm.questions];
                          q[0].correctIndex = oIdx;
                          setQuizForm({ ...quizForm, questions: q });
                        }}
                      />
                      <input
                        className="flex-1 px-2.5 py-1 bg-[#080d1a] border border-[#22304e] text-white text-xs rounded"
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const q = [...quizForm.questions];
                          q[0].options[oIdx] = e.target.value;
                          setQuizForm({ ...quizForm, questions: q });
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>

                <input
                  className="w-full px-3 py-1.5 bg-[#080d1a] border border-[#22304e] text-white text-xs rounded-lg mt-2"
                  placeholder="Explanation for the correct answer..."
                  value={quizForm.questions[0].explanation}
                  onChange={(e) => {
                    const q = [...quizForm.questions];
                    q[0].explanation = e.target.value;
                    setQuizForm({ ...quizForm, questions: q });
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateQuiz(false)}
                  className="flex-1 py-2 text-gray-400 border border-gray-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function CourseWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <CourseWorkspaceContent />
    </Suspense>
  );
}
