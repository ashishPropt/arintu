import { Link } from 'react-router-dom';

const activities = [
  {
    icon: '🎓',
    title: 'Peer Mentorship',
    desc: 'Circle members mentor younger students one-on-one and in small groups, sharing study strategies, subject expertise, and guidance on navigating school.',
  },
  {
    icon: '🏫',
    title: 'School Outreach Events',
    desc: 'Volunteers host workshops, math challenges, and science demos at local middle and elementary schools — sparking curiosity and a love of learning in younger kids.',
  },
  {
    icon: '🌐',
    title: 'Global Community',
    desc: 'Members collaborate across cities and countries, building friendships and a shared sense of purpose that goes far beyond any single classroom.',
  },
  {
    icon: '🗣️',
    title: 'Leadership & Communication',
    desc: 'Running events, coordinating with schools, and mentoring peers builds real leadership skills — public speaking, project management, and empathy.',
  },
  {
    icon: '📣',
    title: 'Student-Led Initiatives',
    desc: 'The Circle is entirely student-driven. Members propose and lead their own events, giving every volunteer real ownership and creative freedom.',
  },
  {
    icon: '🤝',
    title: 'Community Impact',
    desc: 'Every event and mentorship session creates a ripple effect — students who are inspired go on to inspire others, growing a culture of learning in the community.',
  },
];

const steps = [
  'Be an active, engaged Arintu student or alumni',
  'Express your interest to your teacher or via the Contact page',
  'Complete a short orientation with a Circle coordinator',
  'Choose your first event or mentorship commitment and get started',
];

export default function EnfinittyCircle() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          🌟 Student Volunteers
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">The Enfinitty Circle</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          The Enfinitty Circle is a student-run volunteer club dedicated to mentoring younger learners and
          hosting educational events at middle and elementary schools across our community.
        </p>
      </div>

      {/* Mission banner */}
      <div className="bg-gradient-to-r from-purple-600 to-brand-600 rounded-2xl p-8 mb-12 text-white text-center">
        <p className="text-lg font-semibold mb-2">Our mission</p>
        <p className="text-white/90 max-w-2xl mx-auto text-sm leading-relaxed">
          To give every student a role model they can relate to — someone just a few years ahead of them —
          and to bring the joy of learning to kids in their own neighborhoods.
        </p>
      </div>

      {/* What members do */}
      <h2 className="text-lg font-bold text-gray-900 mb-5">What Circle volunteers do</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {activities.map((a) => (
          <div key={a.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-3xl mb-3">{a.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{a.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{a.desc}</p>
          </div>
        ))}
      </div>

      {/* How to join */}
      <div className="bg-gradient-to-br from-purple-50 to-brand-50 rounded-2xl border border-purple-100 p-8 mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-2">How to get involved</h2>
        <p className="text-sm text-gray-600 mb-5">
          The Circle is open to all Arintu students and alumni who want to give back. Here's how to join:
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

      {/* Testimonials link */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10 flex flex-col sm:flex-row items-center gap-4">
        <div className="text-4xl">💬</div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-semibold text-gray-900 mb-1">Hear from our Circle members</p>
          <p className="text-sm text-gray-500">
            Read what student volunteers, students, parents, and community members have to say
            about the Enfinitty Circle experience.
          </p>
        </div>
        <Link
          to="/community/testimonials"
          className="btn-primary text-sm px-5 py-2 shrink-0"
        >
          Read testimonials →
        </Link>
      </div>

      {/* CTA */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">Want to start your learning journey?</p>
        <Link to="/" className="btn-primary text-sm px-6 py-2.5">
          Browse classes →
        </Link>
      </div>
    </div>
  );
}
