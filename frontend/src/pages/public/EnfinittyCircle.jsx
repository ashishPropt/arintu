import { Link } from 'react-router-dom';

const benefits = [
  {
    icon: '🎓',
    title: 'Mentorship Sessions',
    desc: 'Monthly 1-on-1 and small-group sessions with Arintu faculty, alumni, and guest mentors from leading universities and companies.',
  },
  {
    icon: '🌐',
    title: 'Global Network',
    desc: 'Connect with hundreds of high-achieving learners and alumni across 15+ countries. Build friendships and professional relationships that last a lifetime.',
  },
  {
    icon: '🎤',
    title: 'Guest Speaker Series',
    desc: 'Exclusive access to talks by academics, entrepreneurs, researchers, and thought leaders. Past guests have included published authors, venture capitalists, and university professors.',
  },
  {
    icon: '📚',
    title: 'Advanced Resources',
    desc: 'Access curated reading lists, research papers, and practice problem sets tailored for exceptional learners who want to go further and deeper.',
  },
  {
    icon: '🏆',
    title: 'Recognition & Awards',
    desc: 'Top performers each term are recognised on the Enfinitty Honour Roll and receive a certificate they can share on their academic and professional profiles.',
  },
  {
    icon: '🤝',
    title: 'Alumni Community',
    desc: 'Stay connected after your course ends. The alumni network is active on a private forum where members collaborate, share opportunities, and support each other's growth.',
  },
];

const steps = [
  'Maintain excellent attendance and engagement in your Arintu class',
  'Demonstrate a strong commitment to continuous learning',
  'Receive a nomination from your teacher at the end of your first term',
  'Accept your invitation and complete a short onboarding',
];

export default function EnfinittyCircle() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          ✨ Invitation only
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">The Enfinitty Circle</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Our most ambitious learners are invited into the Enfinitty Circle — an exclusive community designed to accelerate your growth beyond the classroom.
        </p>
      </div>

      {/* What you get */}
      <h2 className="text-lg font-bold text-gray-900 mb-5">What members get</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {benefits.map((b) => (
          <div key={b.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-3xl mb-3">{b.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{b.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* How to join */}
      <div className="bg-gradient-to-br from-purple-50 to-brand-50 rounded-2xl border border-purple-100 p-8 mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-2">How to join</h2>
        <p className="text-sm text-gray-600 mb-5">
          Enfinitty Circle membership is not applied for — it's earned. Here's the path:
        </p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Testimonial */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-2xl" />
        <p className="text-sm text-gray-700 leading-relaxed italic pl-4">
          "Being part of the Enfinitty Circle completely changed how I think about learning. The mentors pushed me in ways my regular school never did, and the friendships I built with learners in three other countries have been invaluable."
        </p>
        <p className="text-xs text-gray-400 mt-3 pl-4">— Priya K., Arintu student, India cohort 2024</p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">Ready to start your journey?</p>
        <Link to="/" className="btn-primary text-sm px-6 py-2.5">
          Browse classes →
        </Link>
      </div>
    </div>
  );
}
