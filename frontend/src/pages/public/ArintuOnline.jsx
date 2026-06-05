import { Link } from 'react-router-dom';
import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_ARINTU_ONLINE = {
  hero_badge: '🌐 All classes. One platform.',
  hero_title: 'Arintu Online',
  hero_subtitle:
    "Every Arintu class runs on our integrated online platform — purpose-built for deep learning, not just content delivery. Here's what you get when you enroll.",
  features: [
    {
      icon: '🎥',
      title: 'Live Classes via Zoom',
      desc: 'All Arintu sessions run live, so you learn in real time alongside classmates from around the world. Every class is capped to keep the teacher-student ratio high.',
    },
    {
      icon: '📼',
      title: 'Session Recordings',
      desc: 'Miss a session or want to review? Enrolled students have access to recordings for the duration of their course. Learn at your own pace without falling behind.',
    },
    {
      icon: '🤖',
      title: 'AI Learning Assistant',
      desc: 'Our AI assistant analyses your practice patterns and suggests targeted exercises. It flags topics you should revisit before the next session and celebrates your wins.',
    },
    {
      icon: '📊',
      title: 'Progress Dashboard',
      desc: 'Track attendance, assignment completion, and performance trends in a clear, visual dashboard. Teachers and students see the same data, making support conversations more effective.',
    },
    {
      icon: '🗓️',
      title: 'Smart Scheduling',
      desc: "Our scheduling system considers timezones, public holidays, and teacher availability to find slots that work for every student. You'll never miss a class due to a scheduling conflict.",
    },
    {
      icon: '💬',
      title: 'Async Q&A',
      desc: 'Got a question between sessions? Post it in the class channel. Teachers and TAs respond within 24 hours. High-quality answers are pinned for the whole cohort to see.',
    },
    {
      icon: '👨‍👩‍👧',
      title: 'Parent Sync',
      desc: 'Parents stay fully in the loop. All class communications, session summaries, progress updates, and schedule changes are automatically shared with parents so families are always informed.',
    },
  ],
  how_it_works: [
    { step: '01', label: 'Browse classes', desc: 'Find the right class for your level and schedule.' },
    { step: '02', label: 'Apply', desc: 'Create an account and submit your application in minutes.' },
    { step: '03', label: 'Get approved', desc: 'An admin reviews your application and enrolls you.' },
    { step: '04', label: 'Start learning', desc: 'Join your first live session and never look back.' },
  ],
};

export default function ArintuOnline() {
  const { data } = useSiteContent('arintu_online', DEFAULT_ARINTU_ONLINE);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          {data.hero_badge}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{data.hero_title}</h1>
        <p className="text-gray-500 max-w-xl mx-auto">{data.hero_subtitle}</p>
      </div>

      {/* Features grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {(data.features || []).map((f, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">How it works</h2>
        <div className="grid sm:grid-cols-4 gap-6">
          {(data.how_it_works || []).map(({ step, label, desc }, i) => (
            <div key={i} className="text-center">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center mx-auto mb-2">
                {step}
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link to="/" className="btn-primary text-sm px-6 py-2.5">
          Browse classes →
        </Link>
      </div>
    </div>
  );
}
