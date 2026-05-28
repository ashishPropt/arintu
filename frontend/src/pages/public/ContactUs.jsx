import { useState } from 'react';

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Opens the user's mail client with the form values pre-filled
  const handleSubmit = (e) => {
    e.preventDefault();
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:infoenfinitty@gmail.com?subject=${encodeURIComponent(form.subject || 'Arintu Enquiry')}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-500 mb-10">
        We'd love to hear from you — whether it's a question about enrolment, a partnership idea, or just a hello.
      </p>

      <div className="grid sm:grid-cols-2 gap-8">
        {/* Contact form */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Send us a message</h2>
          {sent ? (
            <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-center">
              <div className="text-3xl mb-2">📧</div>
              <p className="font-semibold text-green-800">Your mail client should open now.</p>
              <p className="text-sm text-green-700 mt-1">If it didn't, email us directly at infoenfinitty@gmail.com</p>
              <button onClick={() => setSent(false)} className="mt-3 text-xs text-green-600 underline hover:no-underline">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Your name *</label>
                  <input
                    className="input"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <input
                  className="input"
                  placeholder="e.g. Class enrolment question"
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Tell us what's on your mind…"
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Send Message
              </button>
              <p className="text-xs text-gray-400 text-center">
                This will open your email client with the message pre-filled.
              </p>
            </form>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Reach us directly</h2>

          <ContactCard
            icon="📧"
            label="Email"
            value="infoenfinitty@gmail.com"
            href="mailto:infoenfinitty@gmail.com"
          />
          <ContactCard
            icon="📍"
            label="Headquarters"
            value={<>12268 Darkwood Road<br />San Diego, CA 92129<br />United States</>}
          />
          <ContactCard
            icon="🕐"
            label="Response time"
            value="We aim to respond to all enquiries within one business day (Monday–Friday, 9 AM–6 PM PT)."
          />

          <div className="mt-6 p-5 bg-brand-50 border border-brand-100 rounded-2xl">
            <p className="text-sm font-semibold text-brand-800 mb-1">For existing students</p>
            <p className="text-sm text-brand-700">
              If you're already enrolled and have a question about your class, please reach out via your Arintu dashboard. Your teacher or admin will respond faster that way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({ icon, label, value, href }) {
  return (
    <div className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="text-2xl shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-brand-600 hover:underline font-medium">{value}</a>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
        )}
      </div>
    </div>
  );
}
