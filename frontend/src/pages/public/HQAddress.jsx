export default function HQAddress() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Headquarters</h1>
      <p className="text-gray-500 mb-10">Come visit us or send us mail at our California office.</p>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Address card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Mailing Address</h2>
          <address className="not-italic text-sm text-gray-600 leading-relaxed">
            Arintu<br />
            12268 Darkwood Road<br />
            San Diego, CA 92129<br />
            United States
          </address>
        </div>

        {/* Contact card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="w-10 h-10 bg-accent-50 text-accent-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Get in Touch</h2>
          <p className="text-sm text-gray-600 mb-3">
            Have a question or want to partner with us? We'd love to hear from you.
          </p>
          <a href="mailto:infoenfinitty@gmail.com" className="text-sm font-medium text-brand-600 hover:underline">
            infoenfinitty@gmail.com
          </a>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Office Hours</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Monday – Friday<br />
            9:00 AM – 6:00 PM PT
          </p>
          <p className="text-xs text-gray-400 mt-2">Closed on major US holidays</p>
        </div>

        {/* Region */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Global Reach</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Headquartered in the San Diego area, Arintu plans to serve learners from around the world.
          </p>
        </div>
      </div>
    </div>
  );
}
