import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lms, classes as classesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  return null;
}

function getVimeoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const match = u.pathname.match(/\/(\d+)/);
      return match ? match[1] : null;
    }
  } catch {}
  return null;
}

function buildEmbedUrl(url) {
  if (!url) return null;
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  return null;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClassLearn() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data state
  const [classInfo, setClassInfo]         = useState(null);
  const [modules, setModules]             = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments]     = useState([]);
  const [progress, setProgress]           = useState({ completed: [], pct: 0, completed_count: 0, total_lessons: 0 });

  // UI state
  const [loading, setLoading]               = useState(true);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [view, setView]                     = useState('lesson'); // 'lesson' | 'assignment'
  const [expandedModules, setExpandedModules] = useState({});

  // Quiz state
  const [quiz, setQuiz]                 = useState(null);
  const [quizLoading, setQuizLoading]   = useState(false);
  const [quizAnswers, setQuizAnswers]   = useState({});
  const [quizResult, setQuizResult]     = useState(null); // { score, passed, ... }
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [showRetake, setShowRetake]     = useState(false);

  // Assignment submission state
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState('');
  const [submitSuccess, setSubmitSuccess]   = useState(false);

  // ── Flatten all lessons across all modules ────────────────────────────────
  const allLessons = modules.flatMap((m) => m.lessons || []);

  const selectedLesson = allLessons.find((l) => l.id === selectedLessonId) || null;
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) || null;

  const currentLessonIndex = allLessons.findIndex((l) => l.id === selectedLessonId);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
    ? allLessons[currentLessonIndex + 1]
    : null;

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadProgress = useCallback(async () => {
    try {
      const res = await lms.myProgress(classId);
      setProgress(res.data || { completed: [], pct: 0, completed_count: 0, total_lessons: 0 });
    } catch {}
  }, [classId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      lms.curriculum(classId),
      lms.myProgress(classId),
      classesApi.get(classId),
    ]).then(([currRes, progRes, classRes]) => {
      const mods = currRes.data?.modules || [];
      const anns = currRes.data?.announcements || [];
      const asgn = currRes.data?.assignments || [];

      setModules(mods);
      setAnnouncements(anns);
      setAssignments(asgn);
      setProgress(progRes.data || { completed: [], pct: 0, completed_count: 0, total_lessons: 0 });
      setClassInfo(classRes.data);

      // Auto-select first lesson
      const flat = mods.flatMap((m) => m.lessons || []);
      if (flat.length > 0) {
        const firstUnfinished = flat.find(
          (l) => !(progRes.data?.completed || []).includes(l.id)
        );
        const firstLesson = firstUnfinished || flat[0];
        setSelectedLessonId(firstLesson.id);

        // Expand the module containing the auto-selected lesson
        const owningModule = mods.find((m) =>
          (m.lessons || []).some((l) => l.id === firstLesson.id)
        );
        if (owningModule) {
          setExpandedModules({ [owningModule.id]: true });
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [classId]);

  // ── When selected lesson changes: load quiz if needed, clear quiz state ───
  useEffect(() => {
    setQuiz(null);
    setQuizAnswers({});
    setQuizResult(null);
    setShowRetake(false);

    if (!selectedLessonId) return;

    // Expand the module that contains this lesson
    const owningModule = modules.find((m) =>
      (m.lessons || []).some((l) => l.id === selectedLessonId)
    );
    if (owningModule) {
      setExpandedModules((prev) => ({ ...prev, [owningModule.id]: true }));
    }

    // Load quiz if lesson has one
    const lesson = allLessons.find((l) => l.id === selectedLessonId);
    if (lesson?.has_quiz) {
      setQuizLoading(true);
      lms.quizForLesson(selectedLessonId)
        .then((r) => setQuiz(r.data || null))
        .catch(() => setQuiz(null))
        .finally(() => setQuizLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLessonId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const selectLesson = (lessonId) => {
    setSelectedLessonId(lessonId);
    setView('lesson');
    setSelectedAssignmentId(null);
  };

  const selectAssignment = (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    setView('assignment');
    setSelectedLessonId(null);
    setSubmissionText('');
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleMarkComplete = async () => {
    if (!selectedLessonId) return;
    try {
      await lms.markProgress(selectedLessonId, true);
      await loadProgress();
    } catch {}
  };

  const handleQuizSubmit = async () => {
    if (!quiz) return;
    setQuizSubmitting(true);
    try {
      const res = await lms.submitQuiz(quiz.id, quizAnswers);
      setQuizResult(res.data);
      setShowRetake(false);
    } catch {}
    finally { setQuizSubmitting(false); }
  };

  const handleAssignmentSubmit = async () => {
    if (!selectedAssignmentId || !submissionText.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await lms.submitAssignment(selectedAssignmentId, { submission_text: submissionText });
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCompleted = (lessonId) => (progress.completed || []).includes(lessonId);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pct = progress.pct || 0;
  const completedCount = progress.completed_count || 0;
  const totalLessons = progress.total_lessons || 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50 overflow-hidden">

      {/* ── Top bar ── */}
      <header className="h-14 bg-white border-b border-gray-100 flex items-center gap-4 px-4 shrink-0 z-10">
        {/* Back */}
        <Link
          to="/app/classes"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors shrink-0"
        >
          <span className="text-base leading-none">←</span>
          <span className="hidden sm:inline">Back to Classes</span>
        </Link>

        <div className="h-5 w-px bg-gray-200 shrink-0" />

        {/* Class name */}
        <h1 className="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">
          {classInfo?.name || 'Class'}
        </h1>

        {/* Progress */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-gray-500 leading-none mb-1">
              {completedCount} of {totalLessons} complete
            </p>
            <div className="w-36 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
            {Math.round(pct)}%
          </span>
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-72 border-r border-gray-100 bg-gray-50 flex flex-col overflow-y-auto shrink-0">

          {/* Announcements */}
          {announcements.length > 0 && (
            <SidebarSection icon="📢" title="Announcements">
              <div className="space-y-2">
                {announcements.slice(0, 3).map((ann) => (
                  <div
                    key={ann.id}
                    className="p-2.5 rounded-lg bg-white border border-gray-100 text-xs"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {ann.is_pinned && <span className="text-amber-500" title="Pinned">📌</span>}
                      <span className="font-semibold text-gray-800 truncate">{ann.title}</span>
                    </div>
                    <p className="text-gray-500 line-clamp-2 leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            </SidebarSection>
          )}

          {/* Course content */}
          {modules.length > 0 && (
            <SidebarSection icon="📋" title="Course Content">
              <div className="space-y-1">
                {modules.map((mod) => {
                  const lessons = mod.lessons || [];
                  const done = lessons.filter((l) => isCompleted(l.id)).length;
                  const isOpen = !!expandedModules[mod.id];

                  return (
                    <div key={mod.id}>
                      {/* Module header */}
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <span className="truncate">{mod.title || mod.name}</span>
                        </div>
                        <span className="text-gray-400 font-normal shrink-0 ml-1">
                          {done}/{lessons.length}
                        </span>
                      </button>

                      {/* Lessons */}
                      {isOpen && (
                        <div className="ml-3 mt-0.5 space-y-0.5">
                          {lessons.map((lesson) => {
                            const done = isCompleted(lesson.id);
                            const selected = lesson.id === selectedLessonId;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => selectLesson(lesson.id)}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                                  selected
                                    ? 'bg-brand-50 text-brand-700 font-semibold'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                              >
                                {/* Status icon */}
                                <span className={`shrink-0 text-sm leading-none ${
                                  done ? 'text-green-500' : selected ? 'text-brand-600' : 'text-gray-300'
                                }`}>
                                  {done ? '✓' : selected ? '●' : '○'}
                                </span>
                                <span className="truncate leading-snug">{lesson.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SidebarSection>
          )}

          {/* Assignments */}
          {assignments.length > 0 && (
            <SidebarSection icon="📝" title="Assignments">
              <div className="space-y-1.5">
                {assignments.map((asgn) => {
                  const days = daysUntil(asgn.due_date);
                  const isUrgent = days !== null && days <= 3;
                  const hasSubmission = !!asgn.my_submission;
                  const selected = asgn.id === selectedAssignmentId;

                  return (
                    <button
                      key={asgn.id}
                      onClick={() => selectAssignment(asgn.id)}
                      className={`w-full flex items-start gap-2 px-2.5 py-2.5 rounded-lg text-xs transition-colors text-left ${
                        selected
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {/* Submission indicator */}
                      {hasSubmission ? (
                        <span className="text-green-500 shrink-0 text-sm leading-snug">✓</span>
                      ) : (
                        <span className="text-gray-300 shrink-0 text-sm leading-snug">○</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium leading-snug ${selected ? 'text-brand-700' : 'text-gray-700'} truncate`}>
                          {asgn.title}
                        </p>
                        {asgn.due_date && (
                          <p className={`text-xs mt-0.5 ${isUrgent ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                            Due {format(new Date(asgn.due_date), 'MMM d')}
                            {isUrgent && days > 0 ? ` · ${days}d left` : ''}
                            {days !== null && days <= 0 ? ' · Overdue' : ''}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </SidebarSection>
          )}

          {/* Empty state */}
          {modules.length === 0 && assignments.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-xs text-gray-400 text-center">No content available yet.</p>
            </div>
          )}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto bg-white">
          {view === 'lesson' && selectedLesson && (
            <LessonView
              lesson={selectedLesson}
              isCompleted={isCompleted(selectedLesson.id)}
              onMarkComplete={handleMarkComplete}
              prevLesson={prevLesson}
              nextLesson={nextLesson}
              onSelectLesson={selectLesson}
              quiz={quiz}
              quizLoading={quizLoading}
              quizAnswers={quizAnswers}
              onQuizAnswer={(qId, val) => setQuizAnswers((prev) => ({ ...prev, [qId]: val }))}
              quizResult={quizResult}
              quizSubmitting={quizSubmitting}
              onQuizSubmit={handleQuizSubmit}
              showRetake={showRetake}
              onRetake={() => {
                setQuizAnswers({});
                setQuizResult(null);
                setShowRetake(false);
              }}
            />
          )}

          {view === 'assignment' && selectedAssignment && (
            <AssignmentView
              assignment={selectedAssignment}
              submissionText={submissionText}
              onSubmissionChange={setSubmissionText}
              onSubmit={handleAssignmentSubmit}
              submitting={submitting}
              submitError={submitError}
              submitSuccess={submitSuccess}
            />
          )}

          {!selectedLesson && !selectedAssignment && (
            <div className="flex items-center justify-center h-full p-12">
              <div className="text-center">
                <p className="text-4xl mb-4">📚</p>
                <p className="text-gray-500 text-sm">Select a lesson or assignment to begin.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar section wrapper ───────────────────────────────────────────────────

function SidebarSection({ icon, title, children }) {
  return (
    <div className="px-3 py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Lesson view ───────────────────────────────────────────────────────────────

function LessonView({
  lesson,
  isCompleted,
  onMarkComplete,
  prevLesson,
  nextLesson,
  onSelectLesson,
  quiz,
  quizLoading,
  quizAnswers,
  onQuizAnswer,
  quizResult,
  quizSubmitting,
  onQuizSubmit,
  showRetake,
  onRetake,
}) {
  const embedUrl = lesson.content_type === 'video' ? buildEmbedUrl(lesson.content_url) : null;

  return (
    <div className="flex flex-col min-h-full">
      {/* Scrollable content area */}
      <div className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">{lesson.title}</h2>

        {/* Content */}
        {lesson.content_type === 'video' && (
          <div className="mb-8">
            {embedUrl ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            ) : lesson.content_url ? (
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">Video URL:</p>
                <a
                  href={lesson.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:underline break-all"
                >
                  {lesson.content_url}
                </a>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 border border-gray-100 rounded-xl text-center">
                <p className="text-gray-400 text-sm">No video URL provided.</p>
              </div>
            )}
          </div>
        )}

        {lesson.content_type === 'text' && lesson.content_text && (
          <div className="mb-8">
            <div
              className="prose max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: lesson.content_text }}
            />
          </div>
        )}

        {lesson.content_type === 'file' && (
          <div className="mb-8">
            <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center text-lg shrink-0">
                📎
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {lesson.file_name || lesson.title || 'Download file'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">File attachment</p>
              </div>
              {lesson.content_url && (
                <a
                  href={lesson.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Download →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Quiz section */}
        {lesson.has_quiz && (
          <div className="mb-8">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 bg-gray-50 border-b border-gray-100">
                <span className="text-lg">🧠</span>
                <h3 className="text-sm font-semibold text-gray-800">Quiz</h3>
              </div>

              <div className="p-5">
                {quizLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!quizLoading && !quiz && (
                  <p className="text-sm text-gray-400 text-center py-4">Quiz not available.</p>
                )}

                {!quizLoading && quiz && (
                  <>
                    {/* Result banner */}
                    {quizResult && !showRetake && (
                      <div className={`mb-6 p-4 rounded-xl border ${
                        quizResult.passed
                          ? 'bg-green-50 border-green-100 text-green-700'
                          : 'bg-red-50 border-red-100 text-red-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">
                              {quizResult.passed ? '✓ Passed!' : '✗ Not passed'}
                            </p>
                            <p className="text-xs mt-0.5">
                              Score: {quizResult.score ?? quizResult.correct_count ?? '—'}
                              {quizResult.total != null ? ` / ${quizResult.total}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={onRetake}
                            className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                              border-current hover:opacity-80"
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Questions — show when no result yet OR retaking */}
                    {(!quizResult || showRetake) && (
                      <div className="space-y-6">
                        {(quiz.questions || []).map((q, qi) => (
                          <div key={q.id || qi}>
                            <p className="text-sm font-medium text-gray-800 mb-3">
                              {qi + 1}. {q.question_text || q.text}
                            </p>
                            <div className="space-y-2">
                              {(q.options || q.choices || []).map((opt, oi) => {
                                const optVal = typeof opt === 'object' ? (opt.id ?? opt.value ?? oi) : oi;
                                const optLabel = typeof opt === 'object' ? (opt.text || opt.label || String(opt)) : opt;
                                const isSelected = quizAnswers[q.id] === optVal;

                                return (
                                  <label
                                    key={optVal}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-brand-50 border-brand-300 text-brand-800'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-brand-200 hover:bg-brand-50/50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`q-${q.id}`}
                                      value={optVal}
                                      checked={isSelected}
                                      onChange={() => onQuizAnswer(q.id, optVal)}
                                      className="accent-brand-600 shrink-0"
                                    />
                                    <span className="text-sm">{optLabel}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={onQuizSubmit}
                          disabled={quizSubmitting || (quiz.questions || []).some((q) => quizAnswers[q.id] == null)}
                          className="btn-primary w-full disabled:opacity-50"
                        >
                          {quizSubmitting ? 'Submitting…' : 'Submit Quiz'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom navigation bar ── */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Mark complete */}
          <button
            onClick={onMarkComplete}
            disabled={isCompleted}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              isCompleted
                ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                : 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800'
            }`}
          >
            <span>{isCompleted ? '✓' : '○'}</span>
            <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
          </button>

          <div className="flex-1" />

          {/* Prev lesson */}
          {prevLesson && (
            <button
              onClick={() => onSelectLesson(prevLesson.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <span>←</span>
              <span className="hidden sm:inline max-w-[120px] truncate">{prevLesson.title}</span>
              <span className="sm:hidden">Prev</span>
            </button>
          )}

          {/* Next lesson */}
          {nextLesson && (
            <button
              onClick={() => onSelectLesson(nextLesson.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 transition-colors"
            >
              <span className="hidden sm:inline max-w-[120px] truncate">{nextLesson.title}</span>
              <span className="sm:hidden">Next</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Assignment view ───────────────────────────────────────────────────────────

function AssignmentView({
  assignment,
  submissionText,
  onSubmissionChange,
  onSubmit,
  submitting,
  submitError,
  submitSuccess,
}) {
  const days = daysUntil(assignment.due_date);
  const isUrgent = days !== null && days <= 3;
  const hasSubmission = !!assignment.my_submission;
  const submission = assignment.my_submission;

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{assignment.title}</h2>
          {assignment.due_date && (
            <p className={`text-xs font-medium ${isUrgent ? 'text-amber-600' : 'text-gray-400'}`}>
              Due {format(new Date(assignment.due_date), 'MMMM d, yyyy')}
              {days !== null && days > 0 ? ` · ${days} day${days !== 1 ? 's' : ''} left` : ''}
              {days !== null && days <= 0 ? ' · Overdue' : ''}
            </p>
          )}
        </div>
        {hasSubmission && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100">
            ✓ Submitted
          </span>
        )}
      </div>

      {/* Description */}
      {assignment.description && (
        <div className="prose max-w-none text-gray-700 leading-relaxed mb-8">
          <p>{assignment.description}</p>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">

        {/* Existing submission */}
        {hasSubmission && (
          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Submission</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {submission.submission_text}
            </p>

            {/* Score / Feedback */}
            {(submission.score != null || submission.feedback) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Feedback</h4>
                {submission.score != null && (
                  <p className="text-sm font-semibold text-brand-700 mb-1">
                    Score: {submission.score}
                    {assignment.max_score ? ` / ${assignment.max_score}` : ''}
                  </p>
                )}
                {submission.feedback && (
                  <p className="text-sm text-gray-600 leading-relaxed">{submission.feedback}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit form — show if not yet submitted or re-submit */}
        {!hasSubmission && (
          <div className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Answer</h3>

            {submitSuccess ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-semibold">Submission received!</p>
                  <p className="text-xs mt-0.5 text-green-600">Your instructor will review it shortly.</p>
                </div>
              </div>
            ) : (
              <>
                {submitError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                    {submitError}
                  </div>
                )}
                <textarea
                  rows={8}
                  className="input w-full resize-y text-sm leading-relaxed mb-4"
                  placeholder="Write your answer here…"
                  value={submissionText}
                  onChange={(e) => onSubmissionChange(e.target.value)}
                />
                <button
                  onClick={onSubmit}
                  disabled={submitting || !submissionText.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Assignment →'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
