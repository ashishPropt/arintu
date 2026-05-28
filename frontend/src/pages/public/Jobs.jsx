const openings = [
  {
    title: 'Learning Experience Designer',
    team: 'Curriculum',
    location: 'Remote — Global',
    type: 'Full-time',
    description:
      "Work with our faculty to design engaging, outcome-focused curricula. You'll own the arc of every learning module — from concept to student feedback loop.",
    requirements: [
      '3+ years designing instructional content or e-learning programmes',
      'Familiarity with competency-based frameworks',
      'Strong written communication skills',
    ],
  },
  {
    title: 'Full-Stack Software Engineer',
    team: 'Technology',
    location: 'Remote — Global',
    type: 'Full-time',
    description:
      "Help build and scale the Arintu platform. You'll work across the stack — React frontend, Node.js API, PostgreSQL — and contribute to our AI-assisted learning roadmap.",
    requirements: [
      '2+ years with React and Node.js / Express',
      'Comfortable with PostgreSQL and REST API design',
      'Passion for education technology',
    ],
  },
  {
    title: 'Student Success Manager',
    team: 'Operations',
    location: 'Remote — Asia / Pacific',
    type: 'Full-time',
    description:
      "Be the first point of contact for our learners. You'll guide students through enrolment, monitor engagement, and work with teachers to intervene before issues become crises.",
    requirements: [
      '2+ years in customer success, student advising, or a related role',
      'Fluency in English; additional language a bonus',
      'Empathy-first approach to problem-solving',
    ],
  },
  {
    title: 'Growth & Community Manager',
    team: 'Marketing',
    location: 'Remote — Global',
    type: 'Full-time',
    description:
      "Grow our learner community across channels. You'll manage social presence, run campaigns, and nurture the Enfinitty Circle and Book Club programmes.",
    requirements: [
      '3+ years in growth marketing or community management',
      'Data-driven, with experience measuring engagement funnels',
      'Creative storyteller with genuine passion for education',
    ],
  },
  {
    title: 'Chief of Staff',
    team: 'Executive',
    location: 'San Ramon, CA (hybrid)',
    type: 'Full-time',
    description:
      'Work directly alongside the CEO to coordinate cross-functional initiatives, manage key partnerships, and ensure organisational priorities stay on track.',
    requirements: [
      '5+ years of experience in a high-growth organisation',
      'Exceptional project management and communication skills',
      'Ability to operate at both strategic and operational levels',
    ],
  },
];

export default function Jobs() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Our Team</h1>
      <p className="text-gray-500 mb-3">
        We're a small, distributed team building something meaningful. If you believe education can change lives, you'll fit right in.
      </p>
      <p className="text-sm text-brand-600 font-medium mb-10">
        {openings.length} open positions
      </p>

      <div className="space-y-5">
        {openings.map((job, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{job.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{job.team} · {job.location}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                {job.type}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">{job.description}</p>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">We're looking for</p>
              <ul className="space-y-1">
                {job.requirements.map((r, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-brand-500 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={`mailto:careers@arintu.com?subject=Application: ${encodeURIComponent(job.title)}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors"
            >
              Apply via email
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
            </a>
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 bg-brand-50 rounded-2xl text-center">
        <p className="text-sm font-semibold text-brand-800 mb-1">Don't see a perfect fit?</p>
        <p className="text-sm text-brand-700 mb-3">
          We're always interested in hearing from talented people who share our mission.
        </p>
        <a href="mailto:careers@arintu.com" className="text-sm font-medium text-brand-600 hover:underline">
          Send us an open application →
        </a>
      </div>
    </div>
  );
}
