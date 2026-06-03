import { useState } from 'react';
import { Link } from 'react-router-dom';

const categories = ['All', 'Student Teachers', 'Students', 'Parents', 'Community'];

const testimonials = [
  // Student Teachers (Enfinitty Circle volunteers who mentor)
  {
    id: 1,
    category: 'Student Teachers',
    name: 'Arjun M.',
    role: 'Enfinitty Circle — Student Volunteer',
    location: 'San Diego, CA',
    quote:
      'Mentoring younger kids through the Circle completely changed my perspective on learning. When you have to explain a concept clearly enough for a 7th grader to understand it, you realize how much deeper your own understanding becomes.',
    avatar: 'AM',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 2,
    category: 'Student Teachers',
    name: 'Priya K.',
    role: 'Enfinitty Circle — Student Volunteer',
    location: 'India cohort',
    quote:
      'Hosting a math workshop at a local elementary school was one of the most rewarding things I\'ve ever done. The kids\' excitement when they finally "got it" reminded me exactly why I love mathematics.',
    avatar: 'PK',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 3,
    category: 'Student Teachers',
    name: 'Rohan S.',
    role: 'Enfinitty Circle — Student Volunteer',
    location: 'San Jose, CA',
    quote:
      'I was nervous about public speaking, but the Circle gave me a safe space to grow. After running three school events, I can now stand in front of a room of 60 kids with confidence.',
    avatar: 'RS',
    color: 'bg-purple-100 text-purple-700',
  },

  // Students
  {
    id: 4,
    category: 'Students',
    name: 'Maya T.',
    role: 'Arintu student',
    location: 'Los Angeles, CA',
    quote:
      'I applied to Arintu not knowing what to expect. A year later, I\'m admitted to UC Berkeley. The rigor, the teachers, and the community of peers pushed me far beyond what I thought I was capable of.',
    avatar: 'MT',
    color: 'bg-brand-100 text-brand-700',
  },
  {
    id: 5,
    category: 'Students',
    name: 'Ethan L.',
    role: 'Arintu student',
    location: 'Vancouver, BC',
    quote:
      'The scholarship made Arintu accessible for me. What I got in return was so much more than world-class instruction — I found mentors and friends from five different countries who I\'m still in touch with today.',
    avatar: 'EL',
    color: 'bg-brand-100 text-brand-700',
  },
  {
    id: 6,
    category: 'Students',
    name: 'Aisha N.',
    role: 'Arintu student',
    location: 'Lagos, Nigeria',
    quote:
      'Growing up, I assumed the best education was only for students in the US or UK. Arintu showed me that geography is no longer a barrier. I\'m competing with — and learning alongside — some of the brightest students in the world, right from my home.',
    avatar: 'AN',
    color: 'bg-brand-100 text-brand-700',
  },

  // Parents
  {
    id: 7,
    category: 'Parents',
    name: 'Sunita R.',
    role: 'Parent of an Arintu student',
    location: 'Hyderabad, India',
    quote:
      'What I appreciate most is how transparent the communication is. I always know what\'s being taught, when classes are happening, and how my daughter is progressing. I feel like a genuine partner in her education, not an afterthought.',
    avatar: 'SR',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 8,
    category: 'Parents',
    name: 'James O.',
    role: 'Parent of an Arintu student',
    location: 'Austin, TX',
    quote:
      'My son was bored and disengaged in his regular school. After two months at Arintu, he was waking up early on class days. That transformation in attitude toward learning is priceless.',
    avatar: 'JO',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 9,
    category: 'Parents',
    name: 'Lin W.',
    role: 'Parent of an Arintu student',
    location: 'Singapore',
    quote:
      'The teachers genuinely care. My daughter struggled at the start, and her teacher reached out to us before we even had a chance to ask for help. That level of attentiveness is rare.',
    avatar: 'LW',
    color: 'bg-emerald-100 text-emerald-700',
  },

  // Community Members
  {
    id: 10,
    category: 'Community',
    name: 'Dr. Patricia H.',
    role: 'Elementary school principal',
    location: 'San Diego, CA',
    quote:
      'The Enfinitty Circle volunteers who came to our school were remarkable young people — prepared, enthusiastic, and great with kids. Our 4th and 5th graders are still talking about the math challenges they ran. We\'ve already invited them back.',
    avatar: 'PH',
    color: 'bg-accent-100 text-accent-700',
  },
  {
    id: 11,
    category: 'Community',
    name: 'Marcus J.',
    role: 'Middle school teacher',
    location: 'Chula Vista, CA',
    quote:
      'Having near-peer role models — high schoolers and college students who look like my students and come from similar backgrounds — has a motivational power that adult teachers simply can\'t replicate. The Circle volunteers understand this instinctively.',
    avatar: 'MJ',
    color: 'bg-accent-100 text-accent-700',
  },
];

function Avatar({ initials, color }) {
  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

export default function Testimonials() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? testimonials
    : testimonials.filter((t) => t.category === activeCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          💬 Real stories
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Testimonials</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Hear from the people at the heart of the Enfinitty Circle — student volunteers,
          students, parents, and community members who have experienced its impact firsthand.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === cat
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Testimonials grid */}
      <div className="grid sm:grid-cols-2 gap-5 mb-14">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden"
          >
            {/* Category badge */}
            <span className={`absolute top-4 right-4 text-xs font-medium px-2.5 py-1 rounded-full ${t.color}`}>
              {t.category}
            </span>

            {/* Quote */}
            <div className="relative">
              <svg className="w-6 h-6 text-gray-200 absolute -top-1 -left-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
              <p className="text-sm text-gray-700 leading-relaxed pl-5 italic">
                "{t.quote}"
              </p>
            </div>

            {/* Person */}
            <div className="flex items-center gap-3 mt-auto pt-2 border-t border-gray-50">
              <Avatar initials={t.avatar} color={t.color} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
                <p className="text-xs text-gray-400">{t.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-purple-50 to-brand-50 rounded-2xl border border-purple-100 p-8 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Be part of the story</h2>
        <p className="text-sm text-gray-600 mb-5 max-w-md mx-auto">
          Whether you're a prospective student, a parent, or someone looking to volunteer — there's a place for you in the Enfinitty community.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/" className="btn-primary text-sm px-5 py-2">Browse classes →</Link>
          <Link to="/community/enfinitty-circle" className="btn-secondary text-sm px-5 py-2">Join the Circle →</Link>
        </div>
      </div>
    </div>
  );
}
