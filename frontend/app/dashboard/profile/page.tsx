'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { profileApi, ProfileData, getAvatarUrl } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import {
  User as UserIcon,
  Mail,
  Shield,
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  HelpCircle,
  Users,
  Edit3,
  Check,
  X,
  Camera,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, token, isLoading, updateUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Redirect if definitely not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!stored) {
        router.push('/auth/login');
      }
    }
  }, [user, isLoading, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken =
        token ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('token') || sessionStorage.getItem('token')
          : null);

      if (!authToken) {
        if (!isLoading) {
          setError('Access denied. No authentication token provided.');
          setLoading(false);
        }
        return;
      }

      const res = await profileApi.getProfile(authToken);
      if (res.success) {
        setProfileData(res.data);
        setEditName(res.data.user.name);
        setAvatarPreview(res.data.user.profileImage || null);
        setError(null);
      } else {
        setError(res.error || 'Failed to load profile data.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to profile service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user || (!isLoading && typeof window !== 'undefined' && localStorage.getItem('token'))) {
      fetchProfile();
    } else if (!isLoading && !user) {
      setLoading(false);
    }
  }, [user, isLoading, token]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFeedback({ type: 'error', message: 'Please select an image file (JPG, PNG, WebP).' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'Image size must be less than 5 MB.' });
        return;
      }
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profileData) {
      setEditName(profileData.user.name);
      setAvatarPreview(profileData.user.profileImage || null);
    }
    setAvatarFile(null);
    setFeedback(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setFeedback({ type: 'error', message: 'Full name cannot be empty.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      let finalAvatarUrl = profileData?.user.profileImage;

      // If an avatar file was chosen, upload it first
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const avatarRes = await profileApi.uploadAvatar(formData);
        if (!avatarRes.success) {
          throw new Error(avatarRes.error || 'Failed to upload profile picture.');
        }
        finalAvatarUrl = avatarRes.data.avatarUrl;
      }

      // Update name and profile image
      const updateRes = await profileApi.updateProfile({
        name: editName.trim(),
        profileImage: finalAvatarUrl,
      });

      if (!updateRes.success) {
        throw new Error(updateRes.error || 'Failed to save changes.');
      }

      // Update local profile state
      if (profileData) {
        setProfileData({
          ...profileData,
          user: {
            ...profileData.user,
            name: updateRes.data.user.name,
            profileImage: updateRes.data.user.profileImage,
          },
        });
      }

      // Sync global AuthContext
      updateUser({
        name: updateRes.data.user.name,
        profileImage: updateRes.data.user.profileImage,
      });

      setAvatarFile(null);
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Profile changes saved successfully!' });

      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save profile changes.' });
    } finally {
      setSaving(false);
    }
  };

  // Helper to format timestamps into Date, Day of Week, and Time in user's local timezone
  const formatAccessTimestamp = (utcTimestampStr?: string) => {
    if (!utcTimestampStr) {
      return { date: 'Not recorded', dayOfWeek: '—', time: '—' };
    }

    try {
      const date = new Date(utcTimestampStr);
      if (isNaN(date.getTime())) {
        return { date: 'Invalid date', dayOfWeek: '—', time: '—' };
      }

      const dateFormatted = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const dayOfWeek = date.toLocaleDateString(undefined, {
        weekday: 'long',
      });

      const timeFormatted = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      return {
        date: dateFormatted,
        dayOfWeek,
        time: timeFormatted,
      };
    } catch {
      return { date: utcTimestampStr, dayOfWeek: '—', time: '—' };
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">Loading profile details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !profileData) {
    return (
      <AppLayout>
        <div className="p-8 max-w-6xl mx-auto">
          <div className="p-6 rounded-2xl bg-red-900/10 border border-red-800/30 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <h2 className="text-base font-bold text-red-300">Unable to load profile</h2>
            <p className="text-xs text-red-200 mt-1">{error || 'User profile not found.'}</p>
            <button
              onClick={fetchProfile}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isTeacher = profileData.user.role === 'PROFESSOR' || profileData.user.role === 'ADMIN';
  const firstAccess = formatAccessTimestamp(profileData.loginActivity?.firstAccessAt);
  const lastAccess = formatAccessTimestamp(profileData.loginActivity?.lastAccessAt);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2.5">
              <UserIcon className="w-6 h-6 text-indigo-500" />
              <span>{isTeacher ? 'Professor Profile' : 'Student Profile'}</span>
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Manage your personal credentials, view your enrolled courses, and inspect account activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isTeacher
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {isTeacher ? <Shield className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
              {isTeacher ? 'Professor Account' : 'Student Account'}
            </span>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-top-2 duration-150 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION A: Personal Information & Editing                 */}
        {/* ========================================================= */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
          className="p-6 md:p-8 rounded-2xl border shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <span>Personal Information</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isEditing
                  ? 'Update your display name and profile picture. Changes reflect across your courses and activity.'
                  : 'Your profile details are currently read-only. Click Edit Profile to make modifications.'}
              </p>
            </div>

            {!isEditing ? (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer hover:shadow-indigo-600/20"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:opacity-80 text-[var(--text-main)] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 hover:shadow-indigo-600/20"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar & Basic Credentials Grid */}
            <div className="flex flex-col md:flex-row gap-6 md:items-center">
              {/* Profile Avatar with Upload Overlay */}
              <div className="relative group self-center md:self-start">
                <div
                  style={{
                    borderColor: 'var(--border-color)',
                  }}
                  className="w-24 h-24 rounded-2xl overflow-hidden border-2 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md relative"
                >
                  {avatarPreview ? (
                    <img
                      src={getAvatarUrl(avatarPreview)}
                      alt={profileData.user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className={avatarPreview ? 'hidden group-[.img-hidden]:block' : 'block'}>
                    {profileData.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Edit avatar overlay */}
                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl bg-black/60 text-white flex flex-col items-center justify-center opacity-90 hover:opacity-100 transition-opacity cursor-pointer group"
                      title="Upload new picture"
                    >
                      <Camera className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-semibold">Change</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Editable Fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter full name"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-main)',
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                      required
                    />
                  ) : (
                    <div
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-color)',
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-[var(--text-main)]"
                    >
                      {profileData.user.name}
                    </div>
                  )}
                </div>

                {/* Email Address (Authenticated, Read-only with lock indicator) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Email Address
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Authenticated
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-color)',
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium text-[var(--text-main)] flex items-center justify-between opacity-80"
                  >
                    <span className="truncate">{profileData.user.email}</span>
                    <Mail className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 ml-2" />
                  </div>
                  {isEditing && (
                    <p className="text-[10px] text-[var(--text-subtle)]">
                      Email address is managed by your authenticated account security provider.
                    </p>
                  )}
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Account Role
                  </label>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-color)',
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-[var(--text-main)] flex items-center gap-2"
                  >
                    {isTeacher ? (
                      <Shield className="w-4 h-4 text-purple-400" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                    )}
                    <span>
                      {profileData.user.role === 'PROFESSOR'
                        ? 'Professor / Teacher'
                        : profileData.user.role === 'ADMIN'
                        ? 'System Administrator'
                        : 'Student'}
                    </span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Member Since
                  </label>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-color)',
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium text-[var(--text-main)] flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>
                      {profileData.user.createdAt
                        ? new Date(profileData.user.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Active Member'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* ========================================================= */}
        {/* PROFESSOR SPECIFIC: SECTION C: Teaching Overview Summary  */}
        {/* ========================================================= */}
        {isTeacher && profileData.teachingOverview && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Teaching Overview</span>
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
                className="p-5 rounded-2xl border shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Courses Created</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[var(--text-main)]">
                  {profileData.teachingOverview.totalCoursesCreated}
                </div>
                <p className="text-[11px] text-[var(--text-subtle)] mt-1">Active faculty offerings</p>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
                className="p-5 rounded-2xl border shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Enrolled Students</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[var(--text-main)]">
                  {profileData.teachingOverview.totalEnrolledStudents}
                </div>
                <p className="text-[11px] text-[var(--text-subtle)] mt-1">Across all your courses</p>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
                className="p-5 rounded-2xl border shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Materials Uploaded</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[var(--text-main)]">
                  {profileData.teachingOverview.totalMaterialsUploaded}
                </div>
                <p className="text-[11px] text-[var(--text-subtle)] mt-1">Lectures & syllabus PDFs</p>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
                className="p-5 rounded-2xl border shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Quizzes Created</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[var(--text-main)]">
                  {profileData.teachingOverview.totalQuizzesCreated}
                </div>
                <p className="text-[11px] text-[var(--text-subtle)] mt-1">Generated & active assessments</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION B: Courses Section (Role-Specific)                */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>{isTeacher ? 'Courses Created & Instructed' : 'Enrolled Courses'}</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isTeacher
                  ? 'All courses created and managed by your faculty account.'
                  : 'Courses you are currently participating in as an enrolled student.'}
              </p>
            </div>

            <Link
              href="/dashboard/courses"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <span>View all courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Student Enrolled Courses */}
          {!isTeacher && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {!profileData.enrolledCourses || profileData.enrolledCourses.length === 0 ? (
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                  }}
                  className="col-span-full p-10 rounded-2xl border text-center"
                >
                  <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                  <h3 className="text-sm font-bold text-[var(--text-main)]">No Enrolled Courses</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                    You have not enrolled in any course yet. Explore the course catalog to begin learning.
                  </p>
                  <Link
                    href="/dashboard/courses"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>Browse Courses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                profileData.enrolledCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/dashboard/courses/${course.id}`}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                    }}
                    className="p-5 rounded-2xl border hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {course.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {course.courseStatus}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[var(--text-main)] group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {course.title}
                      </h3>

                      {course.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--text-muted)]">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="truncate">Instructor: {course.professorName}</span>
                      </div>

                      {course.enrollmentDate && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[var(--text-subtle)]">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Enrolled: {new Date(course.enrollmentDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)] mb-3">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{course.materialsCount} Materials</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{course.quizzesCount} Quizzes</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                          <span>Course Progress</span>
                          <span className="text-indigo-400">{course.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-300"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Professor Created Courses */}
          {isTeacher && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {!profileData.coursesCreated || profileData.coursesCreated.length === 0 ? (
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                  }}
                  className="col-span-full p-10 rounded-2xl border text-center"
                >
                  <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                  <h3 className="text-sm font-bold text-[var(--text-main)]">No Courses Created</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                    You have not published any courses yet. Create a course to upload syllabus materials and invite students.
                  </p>
                  <Link
                    href="/dashboard/courses"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>Create Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                profileData.coursesCreated.map((course) => (
                  <Link
                    key={course.id}
                    href={`/dashboard/courses/${course.id}`}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                    }}
                    className="p-5 rounded-2xl border hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {course.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {course.courseStatus}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[var(--text-main)] group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {course.title}
                      </h3>

                      {course.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[var(--text-subtle)]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Created: {new Date(course.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--border-color)] grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-[var(--bg-subtle)]">
                        <div className="text-xs font-bold text-[var(--text-main)]">
                          {course.totalEnrolledStudents}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Students</div>
                      </div>

                      <div className="p-2 rounded-xl bg-[var(--bg-subtle)]">
                        <div className="text-xs font-bold text-[var(--text-main)]">
                          {course.totalUploadedMaterials}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Materials</div>
                      </div>

                      <div className="p-2 rounded-xl bg-[var(--bg-subtle)]">
                        <div className="text-xs font-bold text-[var(--text-main)]">
                          {course.totalQuizzes}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Quizzes</div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SECTION C/D: Login Activity (Verified Authentication DB)  */}
        {/* ========================================================= */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
          className="p-6 md:p-8 rounded-2xl border shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                <span>Account Login Activity</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Real authentication security timestamps persisted in server database and converted to your local timezone.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
              <CheckCircle2 className="w-3 h-3" />
              <span>Database UTC Grounded</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* First Access */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-color)',
              }}
              className="p-5 rounded-xl border flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>First Access</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Registration Login
                  </span>
                </div>

                <div className="text-base font-bold text-[var(--text-main)]">
                  {firstAccess.date}
                </div>
                <div className="text-xs font-semibold text-indigo-400 mt-1">
                  {firstAccess.dayOfWeek}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-color)]/60 text-xs text-[var(--text-muted)] flex items-center justify-between">
                <span>Exact Time (Local):</span>
                <span className="font-semibold text-[var(--text-main)]">{firstAccess.time}</span>
              </div>
            </div>

            {/* Last Access */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-color)',
              }}
              className="p-5 rounded-xl border flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Last Access</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Latest Session
                  </span>
                </div>

                <div className="text-base font-bold text-[var(--text-main)]">
                  {lastAccess.date}
                </div>
                <div className="text-xs font-semibold text-emerald-400 mt-1">
                  {lastAccess.dayOfWeek}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-color)]/60 text-xs text-[var(--text-muted)] flex items-center justify-between">
                <span>Exact Time (Local):</span>
                <span className="font-semibold text-[var(--text-main)]">{lastAccess.time}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
