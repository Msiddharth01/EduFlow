'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { teacherApi, materialApi, courseApi, TeacherMaterialItem, CourseWithMeta } from '@/lib/api';
import {
  FileText,
  Upload,
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Plus,
  BookOpen,
} from 'lucide-react';

export default function TeacherMaterialsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [materials, setMaterials] = useState<TeacherMaterialItem[]>([]);
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quiz generation and retry states
  const [generatingQuizId, setGeneratingQuizId] = useState<string | null>(null);
  const [retryingMaterialId, setRetryingMaterialId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    const [matRes, courseRes] = await Promise.all([
      teacherApi.getMaterials(),
      courseApi.list(),
    ]);

    if (matRes.success) {
      setMaterials(matRes.data.materials);
    } else {
      setError(matRes.error || 'Failed to load materials.');
    }

    if (courseRes.success) {
      setCourses(courseRes.data.courses);
      if (courseRes.data.courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courseRes.data.courses[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
      loadData();
    }
  }, [user]);

  // Handle Material Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !uploadFile) return;

    setUploading(true);
    setUploadMsg(null);

    const formData = new FormData();
    formData.append('pdf', uploadFile);
    formData.append('title', uploadTitle || uploadFile.name.replace(/\.pdf$/i, ''));

    const res = await materialApi.upload(selectedCourseId, formData);
    if (res.success) {
      setUploadMsg({ type: 'success', text: 'Material uploaded and scheduled for background extraction.' });
      setUploadFile(null);
      setUploadTitle('');
      setShowUploadModal(false);
      await loadData();
    } else {
      setUploadMsg({ type: 'error', text: res.error || 'Failed to upload material.' });
    }
    setUploading(false);
  };

  // Generate quiz for specific material
  const handleGenerateQuiz = async (materialId: string) => {
    if (generatingQuizId) return;
    setGeneratingQuizId(materialId);
    setActionMsg(null);

    try {
      const res = await fetch(`http://localhost:5001/api/materials/${materialId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: 'success', text: data.message || 'AI Quiz generated successfully!' });
        await loadData();
      } else {
        setActionMsg({ type: 'error', text: data.error || 'Failed to generate quiz.' });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Quiz generation failed.' });
    }
    setGeneratingQuizId(null);
  };

  // Retry processing for failed material
  const handleRetryProcessing = async (materialId: string) => {
    if (retryingMaterialId) return;
    setRetryingMaterialId(materialId);
    setActionMsg(null);

    const res = await materialApi.retry(materialId);
    if (res.success) {
      setActionMsg({ type: 'success', text: 'Reprocessing initiated.' });
      setTimeout(loadData, 2000);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Failed to retry processing.' });
    }
    setRetryingMaterialId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-accent uppercase">
                Content Management
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] mt-1">
              Course Materials & Documents
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
              Upload PDF notes, monitor RAG vector indexing, and generate material-linked practice quizzes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDF Material</span>
            </button>
          </div>
        </div>

        {/* Global Action Banner */}
        {actionMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              actionMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
            }`}
          >
            <span>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
              ✕
            </button>
          </div>
        )}

        {/* Loading & Error States */}
        {loading && (
          <div className="app-card p-12 text-center text-[var(--text-muted)] text-xs">
            Loading course materials...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Materials Table */}
        {!loading && !error && (
          <div className="app-card overflow-hidden">
            {materials.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)] text-xs space-y-3">
                <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <p>No materials have been uploaded to your courses yet.</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary text-xs"
                >
                  Upload your first PDF
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="app-table-header uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Document Title</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Status & Indexing</th>
                      <th className="py-3 px-4 text-center">Chunks Indexed</th>
                      <th className="py-3 px-4 text-center">Linked Quizzes</th>
                      <th className="py-3 px-4">Uploaded</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {materials.map((m) => (
                      <tr key={m.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[var(--text-main)] text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                            <span>{m.title}</span>
                          </div>
                          <div className="text-[var(--text-muted)] text-[11px] font-mono mt-0.5 ml-6">
                            {m.fileName}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
                            {m.courseCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {m.status === 'READY' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <CheckCircle className="w-3 h-3" />
                                RAG Ready
                              </span>
                              {m.errorMessage && (
                                <div className="text-[10px] text-[var(--text-muted)] max-w-xs truncate" title={m.errorMessage}>
                                  {m.errorMessage}
                                </div>
                              )}
                            </div>
                          )}
                          {m.status === 'PROCESSING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                              <Clock className="w-3 h-3 animate-spin" />
                              Extracting Text
                            </span>
                          )}
                          {m.status === 'FAILED' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                <AlertCircle className="w-3 h-3" />
                                Processing Failed
                              </span>
                              {m.errorMessage && (
                                <div className="text-[10px] text-rose-600 dark:text-rose-400 max-w-xs truncate" title={m.errorMessage}>
                                  {m.errorMessage}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[var(--text-main)]">
                          {m.chunksCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[var(--primary)]">
                          {m.quizzes.length}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-muted)] text-[11px]">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRetryProcessing(m.id)}
                              disabled={retryingMaterialId === m.id}
                              title="Reprocess PDF extraction & OCR fallback"
                              className="btn-secondary text-xs inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingMaterialId === m.id ? 'animate-spin' : ''}`} />
                              <span>{retryingMaterialId === m.id ? 'Reprocessing...' : 'Reprocess'}</span>
                            </button>

                            {m.status === 'READY' && (
                              <button
                                onClick={() => handleGenerateQuiz(m.id)}
                                disabled={generatingQuizId === m.id}
                                className="px-2.5 py-1 rounded bg-[var(--primary-light)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/20 text-xs font-semibold transition-all inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>{generatingQuizId === m.id ? 'Generating...' : 'AI Quiz'}</span>
                              </button>
                            )}

                            <Link
                              href={`/dashboard/courses/${m.courseId}`}
                              className="btn-secondary text-xs inline-flex items-center gap-1"
                            >
                              <span>Workspace</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Upload Material Modal */}
        {showUploadModal && (
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
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Upload className="w-4 h-4 text-indigo-500" />
                  <span>Upload Course Material</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ color: 'var(--text-muted)' }}
                  className="p-1 rounded-lg hover:opacity-80 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {uploadMsg && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    uploadMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {uploadMsg.text}
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-3.5">
                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold uppercase mb-1">
                    Select Target Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="app-select text-xs"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold uppercase mb-1">
                    Document Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Module 1: Graph Algorithms"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="app-input text-xs"
                  />
                </div>

                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-semibold uppercase mb-1">
                    PDF File
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="btn-primary text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Uploading...' : 'Upload & Process'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
