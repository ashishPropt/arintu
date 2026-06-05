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

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-8">Effective date: {EFFECTIVE_DATE}</p>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-8 text-sm text-amber-800">
        Please read these Terms of Service carefully before using the Arintu platform. By creating an account or applying to any class, you agree to be bound by these terms.
      </div>

      <Section title="1. About Arintu">
        <p>
          {COMPANY} ("Arintu," "we," "us," or "our") operates an online education management platform at arintu.com (the "Platform"). Our Platform enables learners to browse classes, submit applications, and attend live and recorded educational sessions.
        </p>
        <p>
          These Terms of Service ("Terms") govern your access to and use of the Platform. If you are using the Platform on behalf of a minor, you represent that you are that minor's parent or legal guardian and accept these Terms on their behalf.
        </p>
      </Section>

      <Section title="2. Accounts">
        <p>
          To apply for or enroll in a class, you must create an account. You agree to provide accurate, current, and complete information and to keep your account credentials confidential. You are responsible for all activity that occurs under your account.
        </p>
        <p>
          Students must be at least 13 years of age to create an account independently. Learners under 13 must have a parent or guardian create and manage the account on their behalf.
        </p>
        <p>
          We reserve the right to suspend or terminate accounts that violate these Terms or that we determine, in our sole discretion, are harmful to the Platform or its community.
        </p>
      </Section>

      <Section title="3. Enrollment and Applications">
        <p>
          Submitting an application does not guarantee enrollment. All applications are reviewed by an Arintu administrator, and enrollment is confirmed only upon approval and completion of any applicable payment.
        </p>
        <p>
          A one-time application fee may apply depending on your country of residence. This fee is charged on your first approved application and is waived for all subsequent classes in which you enroll. The application fee is non-refundable unless Arintu is unable to enroll you.
        </p>
        <p>
          Class fees are charged separately upon enrollment confirmation and are subject to the pricing applicable to your country at the time of application.
        </p>
      </Section>

      <Section title="4. Scholarships and Fee Waivers">
        <p>
          Arintu reserves up to 20% of seats in each class for scholarship recipients. Scholarships (full or partial) are awarded at the sole discretion of the Arintu super administrator and may reduce or eliminate the class fee.
        </p>
        <p>
          Application fee waivers are available to students who demonstrate financial hardship. A waiver request must be submitted through your account dashboard and is subject to super administrator review. While a waiver request is pending, you may not apply to new classes. Approved waivers exempt you from the one-time application fee.
        </p>
      </Section>

      <Section title="5. Classes and Attendance">
        <p>
          Arintu classes are conducted primarily via live video conferencing (Zoom or equivalent). Session recordings may be made available to enrolled students for the duration of their course for review purposes only.
        </p>
        <p>
          You agree to attend classes punctually, treat teachers and fellow students with respect, and adhere to any conduct guidelines communicated by your teacher. Arintu reserves the right to remove a student from a class for repeated disruptive behavior without refund.
        </p>
        <p>
          Class schedules are subject to change. We will provide reasonable advance notice of any material changes to scheduled sessions.
        </p>
      </Section>

      <Section title="6. Intellectual Property">
        <p>
          All content on the Platform — including course materials, recordings, written resources, and the Arintu brand — is owned by {COMPANY} or its licensors and is protected by applicable intellectual property laws.
        </p>
        <p>
          Enrolled students are granted a limited, non-transferable, non-exclusive licence to access and use course content solely for their personal educational purposes. You may not reproduce, redistribute, record, sell, or publicly display any course content without our prior written consent.
        </p>
      </Section>

      <Section title="7. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the Platform for any unlawful purpose or in violation of any applicable law</li>
          <li>Harass, bully, or intimidate teachers, administrators, or other students</li>
          <li>Share your account credentials or allow others to access your account</li>
          <li>Attempt to gain unauthorised access to any part of the Platform</li>
          <li>Upload, post, or transmit any content that is harmful, offensive, or infringes the rights of others</li>
          <li>Use automated tools to scrape, index, or otherwise extract data from the Platform</li>
        </ul>
      </Section>

      <Section title="8. Refund Policy">
        <p>
          Class fees paid prior to the start of a course may be refunded in full if a written refund request is submitted at least 7 days before the first scheduled session. Requests received less than 7 days before the start of a course will not be eligible for a refund unless exceptional circumstances apply, as determined by Arintu at its sole discretion.
        </p>
        <p>
          Application fees are non-refundable once an application has been reviewed and a decision communicated, except where Arintu is unable to offer you a place.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Platform, even if we have been advised of the possibility of such damages.
        </p>
        <p>
          Our total cumulative liability to you for any claim arising from or relating to these Terms or the Platform shall not exceed the total amount paid by you to Arintu in the twelve (12) months preceding the claim.
        </p>
      </Section>

      <Section title="10. Disclaimer of Warranties">
        <p>
          The Platform is provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.
        </p>
      </Section>

      <Section title="11. Privacy">
        <p>
          Your use of the Platform is also governed by our <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. By using the Platform, you consent to our collection and use of your data as described in the Privacy Policy.
        </p>
      </Section>

      <Section title="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. We will notify registered users of material changes by email or by posting a notice on the Platform. Your continued use of the Platform after the effective date of the updated Terms constitutes your acceptance of the changes.
        </p>
      </Section>

      <Section title="13. Governing Law">
        <p>
          These Terms are governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in San Diego County, California.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          If you have questions about these Terms, please contact us at{' '}
          <a href={`mailto:${EMAIL}`} className="text-brand-600 hover:underline">{EMAIL}</a> or visit our{' '}
          <Link to="/contact" className="text-brand-600 hover:underline">Contact page</Link>.
        </p>
      </Section>
    </div>
  );
}
