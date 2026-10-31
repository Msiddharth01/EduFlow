'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { courseApi, CourseWithMeta } from '@/lib/api';
import { BookOpen, Plus, FileText, CheckCircle, Search, Users } from 'lucide-react';

export default function CoursesListPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [courseForm, setCourseForm] = useState({ code: '', title: '', description: '' });
  const [enrollCode, setEnrollCode] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const fetchCourses = async () => {
    setLoading(true);
    const res = await courseApi.list();
    if (res.success) setCourses(res.data.courses);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchCourses();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await courseApi.create(courseForm);
    if (res.success) {
      setMsg({ type: 'success', text: `Course ${courseForm.code} created successfully.` });
      setShowCreateModal(false);
      setCourseForm({ code: '', title: '', description: '' });
      fetchCourses();
    } else {
      setMsg({ type: 'error', text: res.error });
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await courseApi.enroll(enrollCode);
    if (res.success) {
      setMsg({ type: 'success', text: res.data.message });
      setShowEnrollModal(false);
      setEnrollCode('');
      fetchCourses();
    } else {
      setMsg({ type: 'error', text: res.error });
    }
  };

  const filtered = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <BookOpen className="w-6 h-6 text-indigo-500" />
              <span>Course Directory</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Access your enrolled modules, curriculum materials, and AI-assisted workspaces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'PROFESSOR' ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span>New Course</span>
              </button>
            ) : (
              <button
                onClick={() => setShowEnrollModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span>Enroll in Course</span>
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div
            className={`p-3 rounded-lg text-sm ${
              msg.type === 'success'
                ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-400'
                : 'bg-red-950/30 border border-red-800/40 text-red-400'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
            placeholder="Search by course code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 app-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center app-card space-y-3">
            <BookOpen className="w-10 h-10 mx-auto" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>No courses found</h3>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No courses match your search criteria.' : 'You have not joined any courses yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course) => (
              <Link
                key={course.id}
                href={`/dashboard/courses/${course.id}`}
                className="p-5 rounded-xl app-card hover:border-indigo-500/50 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold tracking-wide bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                      {course.code}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        course.myRoleInCourse === 'PROFESSOR'
                          ? 'bg-purple-950/50 text-purple-300 border border-purple-800/40'
                          : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                      }`}
                    >
                      {course.myRoleInCourse}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold transition-colors mb-2" style={{ color: 'var(--text-main)' }}>
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-xs line-clamp-2 leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
                      {course.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#182238] flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {course._count?.materials ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      {course._count?.quizzes ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-500" />
                      {course._count?.enrollments ?? 0}
                    </span>
                  </div>
                  <span className="text-indigo-500 font-medium group-hover:underline">Enter Workspace →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md app-card rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Create New Course</h2>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                  Course Code
                </label>
                <input
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 uppercase"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                  placeholder="e.g. CS401"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                  Course Title
                </label>
                <input
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                  placeholder="e.g. Distributed Operating Systems"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none h-20"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                  placeholder="Course syllabus and prerequisites..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm app-card rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Enroll in Course</h2>
            <form onSubmit={handleEnroll} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                  Course Code
                </label>
                <input
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 uppercase"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                  placeholder="e.g. CS101"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
