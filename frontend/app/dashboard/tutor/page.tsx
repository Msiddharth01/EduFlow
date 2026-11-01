'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { courseApi, tutorApi, CourseWithMeta, Citation } from '@/lib/api';
import {
  MessageSquare,
  Sparkles,
  Send,
  BookOpen,
  FileText,
  HelpCircle,
  ArrowRight,
  Maximize2,
} from 'lucide-react';

export default function StandaloneTutorPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; citations?: Citation[] }>
  >([
    {
      role: 'assistant',
      content:
        'Welcome to the EduFlow AI Tutor. Select one of your enrolled courses above and ask any question. Answers are grounded in the professor’s uploaded materials.',
    },
  ]);

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

  const handleAsk = async (textPrompt?: string) => {
    const q = textPrompt || question;
    if (!q.trim() || !selectedCourseId || tutorLoading) return;

    const newMsgs = [...messages, { role: 'user' as const, content: q }];
    setMessages(newMsgs);
    if (!textPrompt) setQuestion('');
    setTutorLoading(true);

    const res = await tutorApi.ask(selectedCourseId, { question: q });
    if (res.success) {
      setMessages([
        ...newMsgs,
        {
          role: 'assistant',
          content: res.data.answer,
          citations: res.data.citations,
        },
      ]);
    } else {
      setMessages([
        ...newMsgs,
        {
          role: 'assistant',
          content: `Unable to get answer: ${res.error}`,
        },
      ]);
    }
    setTutorLoading(false);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Sparkles className="w-6 h-6 text-indigo-500" />
              <span>AI Tutor</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Grounded, syllabus-aware answers using RAG with citations and page references.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Active Course:</span>
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
          </div>
        </div>

        {/* Suggested Prompts */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Quick Prompts:</span>
          {[
            'Explain the core intuition of this course',
            'Summarize the most important formulas/algorithms',
            'What are common exam questions for this subject?',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleAsk(prompt)}
              className="px-3 py-1.5 app-card-subtle hover:border-indigo-500 text-xs transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Window */}
        <div
          className="border rounded-xl flex flex-col h-[580px] overflow-hidden shadow-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs md:text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-xl leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                      : 'app-card-subtle rounded-bl-none shadow-sm'
                  }`}
                  style={
                    m.role === 'assistant'
                      ? {
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-main)',
                        }
                      : undefined
                  }
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                        Source Citations:
                      </div>
                      {m.citations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-2.5 rounded-lg border text-xs"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <div className="font-semibold" style={{ color: 'var(--text-main)' }}>
                            {c.documentTitle} <span className="text-indigo-500 font-normal ml-2">Page {c.pageNumber}</span>
                          </div>
                          <p className="text-[11px] mt-1 italic" style={{ color: 'var(--text-muted)' }}>{c.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {tutorLoading && (
              <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Searching course vector chunks and generating response...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="p-3.5 border-t flex items-center gap-3"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
          >
            <input
              className="app-input flex-1 py-2 text-xs md:text-sm"
              placeholder="Ask a question about your enrolled course materials..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={tutorLoading}
            />
            <button
              type="submit"
              disabled={tutorLoading || !question.trim()}
              className="btn-primary text-sm"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
