import { useState } from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_FAQ = {
  items: [
    {
      q: "Who are Arintu's classes for?",
      a: 'Our classes are designed for motivated learners of all ages who want to go beyond what their local school or institution offers. We serve students from primary school through to working professionals looking to upskill.',
    },
    {
      q: 'How do I enroll in a class?',
      a: 'Browse our class catalog on the home page. Click "Apply Now" on any class you\'re interested in. You\'ll need to create a free account (or sign in) and submit an application. Applications are reviewed and you\'ll be notified of the outcome within a few days.',
    },
    {
      q: 'Is there an application fee?',
      a: "Yes, there is a one-time application fee that varies by country. The fee is charged on your first class application and is waived for all subsequent classes. If you're unable to pay the fee, you can request a waiver from your dashboard — a super admin will review your request.",
    },
    {
      q: 'What is the scholarship program?',
      a: 'Every class reserves up to 20% of its seats for scholarship recipients. Scholarships can be full (class fee fully covered) or partial (a percentage discount). You can request a scholarship when you apply for a class. The super admin makes all scholarship decisions.',
    },
    {
      q: 'Are classes live or recorded?',
      a: 'Our classes are primarily live, conducted over Zoom at scheduled times. Recorded sessions are made available to enrolled students for review. We believe live interaction between students and teachers is essential to the Arintu learning experience.',
    },
    {
      q: 'What languages are classes taught in?',
      a: 'The majority of our classes are taught in English. We periodically offer classes in Hindi and other languages — check the class description for language details.',
    },
    {
      q: "Can I drop a class once I've enrolled?",
      a: 'Please contact your class teacher or reach out to us at infoenfinitty@gmail.com. Refund and withdrawal policies depend on the class and how far along the course has progressed.',
    },
    {
      q: 'How are teachers vetted?',
      a: 'All Arintu teachers go through a rigorous review process that includes credential verification, a teaching demonstration, and reference checks. We prioritize educators with a track record of engaging, inclusive teaching.',
    },
    {
      q: 'What is Enfinitty Circle?',
      a: 'Enfinitty Circle is our exclusive community for high-achieving Arintu learners. Members get access to mentorship sessions, networking events, guest speaker series, and an alumni network spanning dozens of countries.',
    },
    {
      q: 'How do I get in touch with support?',
      a: "Email us at infoenfinitty@gmail.com or reach out through the dashboard's notification system. We aim to respond to all queries within one business day.",
    },
  ],
};

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 flex-1">{q}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 bg-white">
          <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const { data } = useSiteContent('faq', DEFAULT_FAQ);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-500 mb-10">
        Everything you need to know about learning with Arintu. Can't find the answer you're looking for?{' '}
        <a href="mailto:infoenfinitty@gmail.com" className="text-brand-600 hover:underline">Send us an email.</a>
      </p>

      <div className="space-y-3">
        {(data.items || []).map((item, i) => (
          <FAQItem key={i} {...item} />
        ))}
      </div>
    </div>
  );
}
