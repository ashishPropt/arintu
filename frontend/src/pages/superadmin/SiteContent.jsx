import { useState, useEffect, useCallback } from 'react';
import { content as contentApi } from '../../api';

// ── Default content mirrors the hardcoded data in public pages ─────────────────

const DEFAULTS = {
  history: {
    subtitle: "From a small living room in San Ramon to a global learning platform — here's the story so far.",
    milestones: [
      { year: '2018', title: 'The Beginning', description: 'Arintu was founded in San Ramon, California by Shiv Kayal and a small group of educators who believed that geography should never be a barrier to a world-class education. The first cohort of 12 students joined from three countries.' },
      { year: '2019', title: 'First 100 Students', description: 'Word spread quickly. By the end of 2019, Arintu had enrolled over 100 students across India, Nepal, and the United States. The team grew to include five dedicated teachers and an operations coordinator.' },
      { year: '2020', title: 'Going Fully Online', description: 'When the global pandemic forced classrooms to close, Arintu pivoted fast. The entire program moved online within two weeks. What was initially a constraint became a strength — suddenly learners anywhere in the world could attend. Enrollment tripled.' },
      { year: '2021', title: '10+ Countries', description: 'Arintu expanded its footprint to over ten countries. Country-specific pricing was introduced to ensure that quality learning remained accessible regardless of economic background. A dedicated scholarship fund was established.' },
      { year: '2022', title: 'Scholarship Program Launch', description: 'Formalising what had been an informal arrangement, Arintu launched a structured scholarship program. Every class now reserves 20% of its seats for scholarship recipients — full or partial — chosen by the super admin.' },
      { year: '2023', title: '5,000 Learners', description: 'A milestone year. Arintu crossed 5,000 active learners, running over 40 concurrent classes taught by a faculty of 30+ teachers. Ashish Mathur joined as VP of Technology to lead the next phase of platform development.' },
      { year: '2024', title: 'AI-Assisted Learning', description: 'Arintu introduced its first AI-powered features: personalised practice recommendations, automatic progress summaries, and a smart scheduling assistant. The platform infrastructure was rebuilt from the ground up to support the next ten years of growth.' },
      { year: '2025', title: 'Community & Beyond', description: 'Arintu Online and Enfinitty Circle launched — connecting learners, alumni, and educators in a vibrant global community. The Book Club was introduced, giving every member a voice in shaping the curriculum. The journey continues.' },
    ],
  },
  jobs: {
    emoji: '🚀',
    title: "We're Hiring — Soon",
    subtitle: "Exciting opportunities are on the way. We're building a small, passionate team committed to making quality education accessible everywhere. Check back here for open roles as we grow.",
    contact_email: 'infoenfinitty@gmail.com',
  },
  faq: {
    items: [
      { q: "Who are Arintu's classes for?", a: 'Our classes are designed for motivated learners of all ages who want to go beyond what their local school or institution offers. We serve students from primary school through to working professionals looking to upskill.' },
      { q: 'How do I sign up for a class? (Step by step)', a: 'Here\'s the full path from browsing a class to attending your first session:\n\n1. Browse the classes. Open the home page and scroll to "Our Classes". Each card shows the available schedule slots (day and time in PST), the price, the teacher, and how many spots are left in each slot.\n\n2. Click "Apply Now" on the class you want.\n\n3. Create a student account (or sign in if you already have one). You\'ll provide your name, email, parent/guardian contact details, country, and a government-issued ID (passport, driver\'s licence, or national ID — JPG, PNG, or PDF up to 5 MB).\n\n4. Wait for ID verification. Our team reviews your ID within 24 hours. You can keep browsing classes in the meantime.\n\n5. Pick a schedule. Each class runs in multiple slots (for example, Tuesdays 5:00 PM PST and Saturdays 7:00 AM PST). Choose the one that fits your week. Each slot has its own capacity, so a full slot doesn\'t block you from joining another.\n\n6. Pay the one-time application fee. Roughly $6 USD (₹500), auto-converted to your local currency. This is charged on your very first class application only — every class after that is waived. If you can\'t afford it, you can request a fee waiver from your dashboard.\n\n7. Pay the class fee — or request a scholarship. When you submit the application you can tick "Request a scholarship" and write a short reason. Up to 20% of each class\'s seats are reserved for scholarship recipients (full or partial). A super admin reviews each request and lets you know the outcome.\n\n8. You\'re enrolled! As soon as the class fee is paid (or a full scholarship is awarded), you\'re automatically enrolled — no further admin approval needed. You\'ll get a confirmation notification.\n\n9. Join your sessions. From your dashboard, open "Classes" or "Schedule". Each session has a Zoom join link, and recordings are kept available afterwards in case you miss one.' },
      { q: 'Is there an application fee?', a: "Yes, there is a one-time application fee that varies by country. The fee is charged on your first class application and is waived for all subsequent classes. If you're unable to pay the fee, you can request a waiver from your dashboard — a super admin will review your request." },
      { q: 'What is the scholarship program?', a: 'Every class reserves up to 20% of its seats for scholarship recipients. Scholarships can be full (class fee fully covered) or partial (a percentage discount). You can request a scholarship when you apply for a class. The super admin makes all scholarship decisions.' },
      { q: 'Are classes live or recorded?', a: 'Our classes are primarily live, conducted over Zoom at scheduled times. Recorded sessions are made available to enrolled students for review. We believe live interaction between students and teachers is essential to the Arintu learning experience.' },
      { q: 'What languages are classes taught in?', a: 'The majority of our classes are taught in English. We periodically offer classes in Hindi and other languages — check the class description for language details.' },
      { q: "Can I drop a class once I've enrolled?", a: 'Please contact your class teacher or reach out to us at infoenfinitty@gmail.com. Refund and withdrawal policies depend on the class and how far along the course has progressed.' },
      { q: 'How are teachers vetted?', a: 'All Arintu teachers go through a rigorous review process that includes credential verification, a teaching demonstration, and reference checks. We prioritize educators with a track record of engaging, inclusive teaching.' },
      { q: 'What is Enfinitty Circle?', a: 'Enfinitty Circle is our exclusive community for high-achieving Arintu learners. Members get access to mentorship sessions, networking events, guest speaker series, and an alumni network spanning dozens of countries.' },
      { q: 'How do I get in touch with support?', a: "Email us at infoenfinitty@gmail.com or reach out through the dashboard's notification system. We aim to respond to all queries within one business day." },
    ],
  },
  testimonials: {
    categories: ['All', 'Student Teachers', 'Students', 'Parents', 'Community'],
    items: [
      { id: 1, category: 'Student Teachers', name: 'Arjun M.', role: 'Enfinitty Circle — Student Volunteer', location: 'San Diego, CA', quote: 'Mentoring younger kids through the Circle completely changed my perspective on learning. When you have to explain a concept clearly enough for a 7th grader to understand it, you realize how much deeper your own understanding becomes.', avatar: 'AM', color: 'bg-purple-100 text-purple-700' },
      { id: 2, category: 'Student Teachers', name: 'Priya K.', role: 'Enfinitty Circle — Student Volunteer', location: 'India cohort', quote: "Hosting a math workshop at a local elementary school was one of the most rewarding things I've ever done. The kids' excitement when they finally \"got it\" reminded me exactly why I love mathematics.", avatar: 'PK', color: 'bg-purple-100 text-purple-700' },
      { id: 3, category: 'Student Teachers', name: 'Rohan S.', role: 'Enfinitty Circle — Student Volunteer', location: 'San Jose, CA', quote: 'I was nervous about public speaking, but the Circle gave me a safe space to grow. After running three school events, I can now stand in front of a room of 60 kids with confidence.', avatar: 'RS', color: 'bg-purple-100 text-purple-700' },
      { id: 4, category: 'Students', name: 'Maya T.', role: 'Arintu student', location: 'Los Angeles, CA', quote: "I applied to Arintu not knowing what to expect. A year later, I'm admitted to UC Berkeley. The rigor, the teachers, and the community of peers pushed me far beyond what I thought I was capable of.", avatar: 'MT', color: 'bg-brand-100 text-brand-700' },
      { id: 5, category: 'Students', name: 'Ethan L.', role: 'Arintu student', location: 'Vancouver, BC', quote: "The scholarship made Arintu accessible for me. What I got in return was so much more than world-class instruction — I found mentors and friends from five different countries who I'm still in touch with today.", avatar: 'EL', color: 'bg-brand-100 text-brand-700' },
      { id: 6, category: 'Students', name: 'Aisha N.', role: 'Arintu student', location: 'Lagos, Nigeria', quote: "Growing up, I assumed the best education was only for students in the US or UK. Arintu showed me that geography is no longer a barrier. I'm competing with — and learning alongside — some of the brightest students in the world, right from my home.", avatar: 'AN', color: 'bg-brand-100 text-brand-700' },
      { id: 7, category: 'Parents', name: 'Sunita R.', role: 'Parent of an Arintu student', location: 'Hyderabad, India', quote: "What I appreciate most is how transparent the communication is. I always know what's being taught, when classes are happening, and how my daughter is progressing. I feel like a genuine partner in her education, not an afterthought.", avatar: 'SR', color: 'bg-emerald-100 text-emerald-700' },
      { id: 8, category: 'Parents', name: 'James O.', role: 'Parent of an Arintu student', location: 'Austin, TX', quote: 'My son was bored and disengaged in his regular school. After two months at Arintu, he was waking up early on class days. That transformation in attitude toward learning is priceless.', avatar: 'JO', color: 'bg-emerald-100 text-emerald-700' },
      { id: 9, category: 'Parents', name: 'Lin W.', role: 'Parent of an Arintu student', location: 'Singapore', quote: 'The teachers genuinely care. My daughter struggled at the start, and her teacher reached out to us before we even had a chance to ask for help. That level of attentiveness is rare.', avatar: 'LW', color: 'bg-emerald-100 text-emerald-700' },
      { id: 10, category: 'Community', name: 'Dr. Patricia H.', role: 'Elementary school principal', location: 'San Diego, CA', quote: "The Enfinitty Circle volunteers who came to our school were remarkable young people — prepared, enthusiastic, and great with kids. Our 4th and 5th graders are still talking about the math challenges they ran. We've already invited them back.", avatar: 'PH', color: 'bg-accent-100 text-accent-700' },
      { id: 11, category: 'Community', name: 'Marcus J.', role: 'Middle school teacher', location: 'Chula Vista, CA', quote: "Having near-peer role models — high schoolers and college students who look like my students and come from similar backgrounds — has a motivational power that adult teachers simply can't replicate. The Circle volunteers understand this instinctively.", avatar: 'MJ', color: 'bg-accent-100 text-accent-700' },
    ],
  },
  enfinitty_circle: {
    hero_badge: '🌟 Student Volunteers',
    hero_title: 'The Enfinitty Circle',
    hero_subtitle: 'The Enfinitty Circle is a student-run volunteer club dedicated to mentoring younger learners and hosting educational events at middle and elementary schools across our community.',
    mission: 'To give every student a role model they can relate to — someone just a few years ahead of them — and to bring the joy of learning to kids in their own neighborhoods.',
    activities: [
      { icon: '🎓', title: 'Peer Mentorship', desc: 'Circle members mentor younger students one-on-one and in small groups, sharing study strategies, subject expertise, and guidance on navigating school.' },
      { icon: '🏫', title: 'School Outreach Events', desc: 'Volunteers host workshops, math challenges, and science demos at local middle and elementary schools — sparking curiosity and a love of learning in younger kids.' },
      { icon: '🌐', title: 'Global Community', desc: 'Members collaborate across cities and countries, building friendships and a shared sense of purpose that goes far beyond any single classroom.' },
      { icon: '🗣️', title: 'Leadership & Communication', desc: 'Running events, coordinating with schools, and mentoring peers builds real leadership skills — public speaking, project management, and empathy.' },
      { icon: '📣', title: 'Student-Led Initiatives', desc: 'The Circle is entirely student-driven. Members propose and lead their own events, giving every volunteer real ownership and creative freedom.' },
      { icon: '🤝', title: 'Community Impact', desc: 'Every event and mentorship session creates a ripple effect — students who are inspired go on to inspire others, growing a culture of learning in the community.' },
    ],
    steps: [
      'Be an active, engaged Arintu student or alumni',
      'Express your interest to your teacher or via the Contact page',
      'Complete a short orientation with a Circle coordinator',
      'Choose your first event or mentorship commitment and get started',
    ],
  },
  arintu_online: {
    hero_badge: '🌐 All classes. One platform.',
    hero_title: 'Arintu Online',
    hero_subtitle: "Every Arintu class runs on our integrated online platform — purpose-built for deep learning, not just content delivery. Here's what you get when you enroll.",
    features: [
      { icon: '🎥', title: 'Live Classes via Zoom', desc: 'All Arintu sessions run live, so you learn in real time alongside classmates from around the world. Every class is capped to keep the teacher-student ratio high.' },
      { icon: '📼', title: 'Session Recordings', desc: 'Miss a session or want to review? Enrolled students have access to recordings for the duration of their course. Learn at your own pace without falling behind.' },
      { icon: '🤖', title: 'AI Learning Assistant', desc: 'Our AI assistant analyzes your practice patterns and suggests targeted exercises. It flags topics you should revisit before the next session and celebrates your wins.' },
      { icon: '📊', title: 'Progress Dashboard', desc: 'Track attendance, assignment completion, and performance trends in a clear, visual dashboard. Teachers and students see the same data, making support conversations more effective.' },
      { icon: '🗓️', title: 'Smart Scheduling', desc: "Our scheduling system considers timezones, public holidays, and teacher availability to find slots that work for every student. You'll never miss a class due to a scheduling conflict." },
      { icon: '💬', title: 'Async Q&A', desc: 'Got a question between sessions? Post it in the class channel. Teachers and TAs respond within 24 hours. High-quality answers are pinned for the whole cohort to see.' },
      { icon: '👨‍👩‍👧', title: 'Parent Sync', desc: 'Parents stay fully in the loop. All class communications, session summaries, progress updates, and schedule changes are automatically shared with parents so families are always informed.' },
    ],
    how_it_works: [
      { step: '01', label: 'Browse classes', desc: 'Find the right class for your level and schedule.' },
      { step: '02', label: 'Apply', desc: 'Create an account and submit your application in minutes.' },
      { step: '03', label: 'Get approved', desc: 'An admin reviews your application and enrolls you.' },
      { step: '04', label: 'Start learning', desc: 'Join your first live session and never look back.' },
    ],
  },
  hq: {
    address_lines: ['Arintu', '12268 Darkwood Road', 'San Diego, CA 92129', 'United States'],
    email: 'infoenfinitty@gmail.com',
    hours: 'Monday – Friday\n9:00 AM – 6:00 PM PT',
    hours_note: 'Closed on major US holidays',
    global_reach: 'Headquartered in the San Diego area, Arintu plans to serve learners from around the world.',
  },
  book_club: {
    emoji: '📚',
    title: 'Book Club — Coming Soon',
    subtitle: "We're putting together something special for our reading community. The Arintu Book Club will launch soon — stay tuned!",
  },
  contact: {
    email: 'infoenfinitty@gmail.com',
    address_lines: ['12268 Darkwood Road', 'San Diego, CA 92129', 'United States'],
    response_time: 'We aim to respond to all inquiries within one business day (Monday–Friday, 9 AM–6 PM PT).',
  },
};

const SECTIONS = [
  { key: 'history',         label: 'History',        icon: '📖' },
  { key: 'jobs',            label: 'Jobs',           icon: '💼' },
  { key: 'faq',             label: 'FAQ',            icon: '❓' },
  { key: 'testimonials',    label: 'Testimonials',   icon: '💬' },
  { key: 'enfinitty_circle',label: 'Enfinitty Circle',icon: '🌟' },
  { key: 'arintu_online',   label: 'Arintu Online',  icon: '🌐' },
  { key: 'hq',              label: 'Headquarters',   icon: '🏢' },
  { key: 'book_club',       label: 'Book Club',      icon: '📚' },
  { key: 'contact',         label: 'Contact Us',     icon: '📧' },
];

// ── Reusable primitives ────────────────────────────────────────────────────────

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

/**
 * Generic list editor for arrays of objects.
 * `fields` = [{ key, label, type='text'|'textarea', rows=3, colSpan=1 }]
 */
function ArrayEditor({ items = [], fields, onChange, addLabel = 'Add Item', newItem = {} }) {
  const update = (idx, key, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { ...newItem }]);
  const move = (idx, dir) => {
    const next = [...items];
    const other = idx + dir;
    if (other < 0 || other >= next.length) return;
    [next[idx], next[other]] = [next[other], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-100 rounded-xl p-4 relative">
          <div className="absolute top-2 right-2 flex gap-0.5">
            <button onClick={() => move(idx, -1)} title="Move up"
              className="text-gray-300 hover:text-gray-600 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100">↑</button>
            <button onClick={() => move(idx, 1)} title="Move down"
              className="text-gray-300 hover:text-gray-600 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100">↓</button>
            <button onClick={() => remove(idx)} title="Remove"
              className="text-red-200 hover:text-red-600 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-red-50">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-20">
            {fields.map(({ key, label, type = 'text', rows = 3, colSpan = 1 }) => (
              <div key={key} className={colSpan === 2 ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    className="input text-sm"
                    rows={rows}
                    value={item[key] || ''}
                    onChange={(e) => update(idx, key, e.target.value)}
                  />
                ) : (
                  <input
                    className="input text-sm"
                    value={item[key] || ''}
                    onChange={(e) => update(idx, key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={add} className="btn-secondary text-sm w-full py-2">
        + {addLabel}
      </button>
    </div>
  );
}

function StepsEditor({ steps = [], onChange }) {
  const update = (idx, val) => { const n = [...steps]; n[idx] = val; onChange(n); };
  const remove = (idx) => onChange(steps.filter((_, i) => i !== idx));
  const add = () => onChange([...steps, '']);
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{idx + 1}.</span>
          <input
            className="input flex-1 text-sm"
            value={step}
            onChange={(e) => update(idx, e.target.value)}
          />
          <button onClick={() => remove(idx)} className="text-red-200 hover:text-red-600 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-red-50">✕</button>
        </div>
      ))}
      <button onClick={add} className="btn-secondary text-sm w-full py-2">+ Add Step</button>
    </div>
  );
}

// ── Section editors ────────────────────────────────────────────────────────────

function HistoryEditor({ value, onChange }) {
  return (
    <div className="space-y-6">
      <Field label="Page subtitle">
        <textarea className="input" rows={2} value={value.subtitle || ''} onChange={(e) => onChange({ subtitle: e.target.value })} />
      </Field>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-3">Timeline Milestones</p>
        <ArrayEditor
          items={value.milestones || []}
          onChange={(milestones) => onChange({ milestones })}
          addLabel="Add Milestone"
          newItem={{ year: '', title: '', description: '' }}
          fields={[
            { key: 'year',        label: 'Year' },
            { key: 'title',       label: 'Title' },
            { key: 'description', label: 'Description', type: 'textarea', rows: 3, colSpan: 2 },
          ]}
        />
      </div>
    </div>
  );
}

function JobsEditor({ value, onChange }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Emoji">
        <input className="input" value={value.emoji || ''} onChange={(e) => onChange({ emoji: e.target.value })} />
      </Field>
      <Field label="Contact Email">
        <input className="input" type="email" value={value.contact_email || ''} onChange={(e) => onChange({ contact_email: e.target.value })} />
      </Field>
      <Field label="Heading" className="sm:col-span-2">
        <input className="input" value={value.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Body Text" className="sm:col-span-2">
        <textarea className="input" rows={3} value={value.subtitle || ''} onChange={(e) => onChange({ subtitle: e.target.value })} />
      </Field>
    </div>
  );
}

function FAQEditor({ value, onChange }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">FAQ items displayed on the public FAQ page. Supports up to any number of items.</p>
      <ArrayEditor
        items={value.items || []}
        onChange={(items) => onChange({ items })}
        addLabel="Add FAQ Item"
        newItem={{ q: '', a: '' }}
        fields={[
          { key: 'q', label: 'Question', type: 'textarea', rows: 2, colSpan: 2 },
          { key: 'a', label: 'Answer',   type: 'textarea', rows: 3, colSpan: 2 },
        ]}
      />
    </div>
  );
}

function TestimonialsEditor({ value, onChange }) {
  const cats = (value.categories || []).join(', ');
  return (
    <div className="space-y-6">
      <Field label="Filter Categories (comma-separated)">
        <input
          className="input"
          value={cats}
          placeholder="All, Students, Parents, Community"
          onChange={(e) => onChange({ categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </Field>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-3">Testimonials</p>
        <ArrayEditor
          items={value.items || []}
          onChange={(items) => onChange({ items })}
          addLabel="Add Testimonial"
          newItem={{ name: '', role: '', location: '', quote: '', avatar: '', color: 'bg-brand-100 text-brand-700', category: 'Students' }}
          fields={[
            { key: 'name',     label: 'Name' },
            { key: 'avatar',   label: 'Avatar Initials (e.g. AM)' },
            { key: 'role',     label: 'Role / Title',    colSpan: 2 },
            { key: 'location', label: 'Location' },
            { key: 'category', label: 'Category' },
            { key: 'color',    label: 'Badge Color (Tailwind classes)' },
            { key: 'quote',    label: 'Quote', type: 'textarea', rows: 3, colSpan: 2 },
          ]}
        />
      </div>
    </div>
  );
}

function EnfinittyCircleEditor({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Hero Badge Text">
          <input className="input" value={value.hero_badge || ''} onChange={(e) => onChange({ hero_badge: e.target.value })} />
        </Field>
        <Field label="Hero Title">
          <input className="input" value={value.hero_title || ''} onChange={(e) => onChange({ hero_title: e.target.value })} />
        </Field>
        <Field label="Hero Subtitle" className="sm:col-span-2">
          <textarea className="input" rows={2} value={value.hero_subtitle || ''} onChange={(e) => onChange({ hero_subtitle: e.target.value })} />
        </Field>
        <Field label="Mission Statement" className="sm:col-span-2">
          <textarea className="input" rows={3} value={value.mission || ''} onChange={(e) => onChange({ mission: e.target.value })} />
        </Field>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-3">Activities (displayed as cards)</p>
        <ArrayEditor
          items={value.activities || []}
          onChange={(activities) => onChange({ activities })}
          addLabel="Add Activity"
          newItem={{ icon: '📌', title: '', desc: '' }}
          fields={[
            { key: 'icon',  label: 'Emoji Icon' },
            { key: 'title', label: 'Title' },
            { key: 'desc',  label: 'Description', type: 'textarea', rows: 2, colSpan: 2 },
          ]}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-3">How to Join (numbered steps)</p>
        <StepsEditor
          steps={value.steps || []}
          onChange={(steps) => onChange({ steps })}
        />
      </div>
    </div>
  );
}

function ArintuOnlineEditor({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Hero Badge Text">
          <input className="input" value={value.hero_badge || ''} onChange={(e) => onChange({ hero_badge: e.target.value })} />
        </Field>
        <Field label="Hero Title">
          <input className="input" value={value.hero_title || ''} onChange={(e) => onChange({ hero_title: e.target.value })} />
        </Field>
        <Field label="Hero Subtitle" className="sm:col-span-2">
          <textarea className="input" rows={2} value={value.hero_subtitle || ''} onChange={(e) => onChange({ hero_subtitle: e.target.value })} />
        </Field>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-3">Platform Features (displayed as cards)</p>
        <ArrayEditor
          items={value.features || []}
          onChange={(features) => onChange({ features })}
          addLabel="Add Feature"
          newItem={{ icon: '📌', title: '', desc: '' }}
          fields={[
            { key: 'icon',  label: 'Emoji Icon' },
            { key: 'title', label: 'Title' },
            { key: 'desc',  label: 'Description', type: 'textarea', rows: 2, colSpan: 2 },
          ]}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700 mb-3">How It Works (numbered steps)</p>
        <ArrayEditor
          items={value.how_it_works || []}
          onChange={(how_it_works) => onChange({ how_it_works })}
          addLabel="Add Step"
          newItem={{ step: '01', label: '', desc: '' }}
          fields={[
            { key: 'step',  label: 'Step No. (e.g. 01)' },
            { key: 'label', label: 'Step Label' },
            { key: 'desc',  label: 'Description', type: 'textarea', rows: 2, colSpan: 2 },
          ]}
        />
      </div>
    </div>
  );
}

function HQEditor({ value, onChange }) {
  const addrText = (value.address_lines || []).join('\n');
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Mailing Address (one line per row)" className="sm:col-span-2">
        <textarea
          className="input"
          rows={4}
          value={addrText}
          onChange={(e) => onChange({ address_lines: e.target.value.split('\n') })}
        />
      </Field>
      <Field label="Email Address">
        <input className="input" type="email" value={value.email || ''} onChange={(e) => onChange({ email: e.target.value })} />
      </Field>
      <Field label="Hours Note (e.g. Closed on US holidays)">
        <input className="input" value={value.hours_note || ''} onChange={(e) => onChange({ hours_note: e.target.value })} />
      </Field>
      <Field label="Office Hours (use new line for line breaks)" className="sm:col-span-2">
        <textarea className="input" rows={2} value={value.hours || ''} onChange={(e) => onChange({ hours: e.target.value })} />
      </Field>
      <Field label="Global Reach Description" className="sm:col-span-2">
        <textarea className="input" rows={2} value={value.global_reach || ''} onChange={(e) => onChange({ global_reach: e.target.value })} />
      </Field>
    </div>
  );
}

function BookClubEditor({ value, onChange }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Emoji">
        <input className="input" value={value.emoji || ''} onChange={(e) => onChange({ emoji: e.target.value })} />
      </Field>
      <Field label="Title">
        <input className="input" value={value.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Description / Body Text" className="sm:col-span-2">
        <textarea className="input" rows={3} value={value.subtitle || ''} onChange={(e) => onChange({ subtitle: e.target.value })} />
      </Field>
    </div>
  );
}

function ContactEditor({ value, onChange }) {
  const addrText = (value.address_lines || []).join('\n');
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Contact Email">
        <input className="input" type="email" value={value.email || ''} onChange={(e) => onChange({ email: e.target.value })} />
      </Field>
      <Field label="Response Time Note">
        <input className="input" value={value.response_time || ''} onChange={(e) => onChange({ response_time: e.target.value })} />
      </Field>
      <Field label="Address (one line per row)" className="sm:col-span-2">
        <textarea
          className="input"
          rows={3}
          value={addrText}
          onChange={(e) => onChange({ address_lines: e.target.value.split('\n') })}
        />
      </Field>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SiteContent() {
  const [activeTab, setActiveTab] = useState('history');
  const [drafts,    setDrafts]    = useState({});
  const [loading,   setLoading]   = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState(null);

  const currentDraft = drafts[activeTab];
  const isLoading    = loading[activeTab];

  const loadSection = useCallback(async (section) => {
    if (drafts[section] !== undefined) return;
    setLoading((l) => ({ ...l, [section]: true }));
    try {
      const res = await contentApi.getSiteContent(section);
      const fetched = res.data?.content;
      setDrafts((d) => ({
        ...d,
        [section]:
          fetched && typeof fetched === 'object' && Object.keys(fetched).length > 0
            ? fetched
            : DEFAULTS[section],
      }));
    } catch {
      setDrafts((d) => ({ ...d, [section]: DEFAULTS[section] }));
    } finally {
      setLoading((l) => ({ ...l, [section]: false }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSection(activeTab); }, [activeTab, loadSection]);

  // Merge partial updates into the active draft
  const updateDraft = useCallback((changes) => {
    setDrafts((d) => ({ ...d, [activeTab]: { ...d[activeTab], ...changes } }));
    setSaved(false);
  }, [activeTab]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await contentApi.updateSiteContent(activeTab, currentDraft);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Site Content</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Edit the text and data shown on public-facing pages of the website.
          Changes take effect immediately after saving.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
        {SECTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setSaved(false); setError(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Editor card */}
      <div className="card p-5 min-h-[300px]">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading content…</div>
        ) : !currentDraft ? (
          <div className="py-12 text-center text-gray-400">Select a section above to start editing.</div>
        ) : (
          <>
            {/* Section heading */}
            <div className="mb-5 pb-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {SECTIONS.find((s) => s.key === activeTab)?.icon}{' '}
                {SECTIONS.find((s) => s.key === activeTab)?.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Changes here update the public <strong>{SECTIONS.find((s) => s.key === activeTab)?.label}</strong> page.
                Click <em>Save Changes</em> to publish.
              </p>
            </div>

            {/* Section-specific editor */}
            {activeTab === 'history'          && <HistoryEditor          value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'jobs'             && <JobsEditor             value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'faq'              && <FAQEditor              value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'testimonials'     && <TestimonialsEditor     value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'enfinitty_circle' && <EnfinittyCircleEditor  value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'arintu_online'    && <ArintuOnlineEditor     value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'hq'               && <HQEditor               value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'book_club'        && <BookClubEditor         value={currentDraft} onChange={updateDraft} />}
            {activeTab === 'contact'          && <ContactEditor          value={currentDraft} onChange={updateDraft} />}

            {/* Save bar */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-4">
              <button
                onClick={save}
                disabled={saving}
                className={`btn-primary px-6 ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
              </button>
              <a
                href={activeTab === 'history' ? '/about/history'
                    : activeTab === 'jobs' ? '/about/jobs'
                    : activeTab === 'faq' ? '/about/faq'
                    : activeTab === 'testimonials' ? '/community/testimonials'
                    : activeTab === 'enfinitty_circle' ? '/community/enfinitty-circle'
                    : activeTab === 'arintu_online' ? '/community/arintu-online'
                    : activeTab === 'hq' ? '/about/hq'
                    : activeTab === 'book_club' ? '/community/book-club'
                    : '/contact'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline"
              >
                Preview page ↗
              </a>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
