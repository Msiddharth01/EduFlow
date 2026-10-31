'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) router.push('/dashboard');
  }, [user, isLoading, router]);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background gradient orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div className="fade-in" style={{ textAlign: 'center', maxWidth: '720px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '9999px', padding: '0.4rem 1rem', fontSize: '0.85rem', color: '#a5b4fc' }}>
          <span>🎓</span> AI-Powered Learning Platform
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem' }}>
          Your Personal <span className="gradient-text">AI Course Tutor</span>
        </h1>

        <p style={{ fontSize: '1.15rem', color: '#9ca3af', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '560px', margin: '0 auto 2.5rem' }}>
          Ask questions grounded in your lecture notes. Generate smart quizzes. Track your weak topics and get targeted revision recommendations — all offline with local AI.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
          {['📄 PDF-Grounded RAG Answers', '🧠 Auto MCQ Generation', '📊 Topic Mastery Tracking', '🔒 100% Private & Offline'].map((f) => (
            <span key={f} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#d1d5db' }}>{f}</span>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/register" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '0.9rem 2rem', fontSize: '1rem' }}>
              Get Started Free →
            </button>
          </Link>
          <Link href="/auth/login" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}>
              Sign In
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
