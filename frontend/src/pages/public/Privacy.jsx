import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'January 1, 2025';
const COMPANY = 'Arintu Learning Inc.';
const EMAIL = 'infoenfinitty@gmail.com';

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Effective date: {EFFECTIVE_DATE}</p>

      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-8 text-sm text-brand-800">
        At Arintu, we take your privacy seriously. This policy explains what information we collect, how we use it, and the choices you have. We do not sell your personal data.
      </div>

      <Section title="1. Who We Are">
        <p>
          {COMPANY} ("Arintu," "we," "us," or "our") operates the Arintu online education platform. Our registered address is 12268 Darkwood Road, San Diego, CA 92129, United States. For privacy enquiries, contact us at <a href={`mailto:${EMAIL}`} className="text-brand-600 hover:underline">{EMAIL}</a>.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p><strong>Account information.</strong> When you register, we collect your name, email address, and a hashed password. If you are a teacher or administrator, we may also collect professional information such as your qualifications.</p>

        <p><strong>Application and enrolment data.</strong> When you apply to a class, we collect information about the class selected, your country of residence (for pricing), scholarship or fee waiver requests, and any notes submitted as part of the process.</p>

        <p><strong>Payment information.</strong> We do not store full payment card details on our servers. Payment processing is handled by third-party providers, and we retain only the metadata necessary for record-keeping (e.g. amount paid, date, transaction reference).</p>

        <p><strong>Usage data.</strong> We collect standard server logs including IP addresses, browser type, pages visited, and timestamps. This is used for platform security, debugging, and aggregate analytics.</p>

        <p><strong>Communications.</strong> If you contact us by email or through the Platform, we retain that correspondence to help resolve your enquiry.</p>

        <p><strong>Community contributions.</strong> If you submit a book suggestion via the Book Club, the submitted content (title, Amazon URL, reason) and your name are stored and may be displayed publicly if approved.</p>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and manage your account</li>
          <li>To process class applications and manage enrolments</li>
          <li>To determine applicable pricing and application fees based on your country</li>
          <li>To review scholarship and fee waiver requests</li>
          <li>To send transactional notifications (application decisions, schedule changes, Zoom links)</li>
          <li>To facilitate class sessions, including sharing your name with your assigned teacher</li>
          <li>To improve the Platform through aggregate, anonymised analytics</li>
          <li>To comply with legal obligations</li>
        </ul>
        <p>
          We do not use your data for behavioural advertising. We do not sell, rent, or trade your personal information to third parties.
        </p>
      </Section>

      <Section title="4. Children's Privacy">
        <p>
          Arintu serves learners of all ages, including minors. We take the privacy of children very seriously and operate in compliance with applicable laws, including the Children's Online Privacy Protection Act (COPPA) in the United States.
        </p>
        <p>
          Children under 13 may only use the Platform through an account created and managed by a parent or legal guardian. If we become aware that we have collected personal information from a child under 13 without verifiable parental consent, we will delete that information promptly.
        </p>
        <p>
          Parents may contact us at <a href={`mailto:${EMAIL}`} className="text-brand-600 hover:underline">{EMAIL}</a> to review, update, or request deletion of their child's information.
        </p>
      </Section>

      <Section title="5. Student Data and FERPA">
        <p>
          For students whose records may be subject to the Family Educational Rights and Privacy Act (FERPA), we act as a "school official" with a legitimate educational interest in the data we process. We do not disclose education records to third parties without appropriate consent, except as permitted by FERPA.
        </p>
      </Section>

      <Section title="6. Sharing Your Information">
        <p>We share your information only in the following circumstances:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Teachers and administrators:</strong> Your name and class enrolment details are shared with the teachers and administrators of classes you are enrolled in.</li>
          <li><strong>Video conferencing:</strong> We use Zoom to deliver live classes. When you join a session, Zoom's own privacy policy governs that interaction.</li>
          <li><strong>Service providers:</strong> We work with trusted third-party providers for hosting, email delivery, and payment processing. These providers are contractually bound to protect your data and use it only as directed by us.</li>
          <li><strong>Legal requirements:</strong> We may disclose information if required to do so by law, court order, or governmental authority.</li>
        </ul>
      </Section>

      <Section title="7. Cookies and Tracking">
        <p>
          We use a small number of essential cookies to keep you logged in and maintain your session. We do not use advertising or tracking cookies. We do not use third-party analytics services that track you across websites.
        </p>
        <p>
          You can configure your browser to refuse cookies, but doing so may affect your ability to log in and use the Platform.
        </p>
      </Section>

      <Section title="8. Data Retention">
        <p>
          We retain your account data for as long as your account is active. If you request deletion of your account, we will delete or anonymise your personal data within 30 days, except where we are required to retain it by law (e.g. financial records, which we keep for 7 years).
        </p>
        <p>
          Application and enrolment records may be retained in anonymised form for educational programme reporting and analytics after your account is deleted.
        </p>
      </Section>

      <Section title="9. Your Rights">
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data ("right to be forgotten")</li>
          <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
          <li><strong>Objection:</strong> Object to certain types of processing</li>
        </ul>
        <p>
          To exercise any of these rights, email us at <a href={`mailto:${EMAIL}`} className="text-brand-600 hover:underline">{EMAIL}</a>. We will respond within 30 days.
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          We implement industry-standard security measures including encrypted data transmission (HTTPS), hashed password storage (bcrypt), and access controls that limit data access to authorised personnel only.
        </p>
        <p>
          No method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security. If you believe your account has been compromised, please contact us immediately.
        </p>
      </Section>

      <Section title="11. International Transfers">
        <p>
          Arintu is based in the United States, and our servers are located in the United States. If you access the Platform from outside the United States, your data will be transferred to and processed in the United States. By using the Platform, you consent to this transfer.
        </p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice on the Platform. The updated policy will take effect on the date indicated at the top of this page.
        </p>
      </Section>

      <Section title="13. Contact Us">
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
        </p>
        <address className="not-italic mt-2 p-4 bg-gray-50 rounded-xl text-sm">
          <strong>{COMPANY}</strong><br />
          12268 Darkwood Road<br />
          San Diego, CA 92129<br />
          United States<br />
          <a href={`mailto:${EMAIL}`} className="text-brand-600 hover:underline mt-1 inline-block">{EMAIL}</a>
        </address>
        <p className="mt-3">
          You can also reach us via our <Link to="/contact" className="text-brand-600 hover:underline">Contact page</Link>.
        </p>
      </Section>
    </div>
  );
}
