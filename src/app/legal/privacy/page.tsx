import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/auth/signup" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block"
            >
              ← Back to Sign Up
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content */}
          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Aged Care Analytics ("we," "our," or "us") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our healthcare analytics platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Personal Information</h3>
              <p className="text-gray-700 mb-4">We may collect the following personal information:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Name and contact information (email address, phone number)</li>
                <li>Account credentials (username, encrypted password)</li>
                <li>Professional information (job title, organization, license numbers)</li>
                <li>Usage data and analytics preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Health Information</h3>
              <p className="text-gray-700 mb-4">
                As a healthcare analytics platform, we may process Protected Health Information (PHI) that you upload or input into our system. This information is subject to additional protections under HIPAA and other healthcare privacy laws.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Technical Information</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Usage patterns and preferences</li>
                <li>Log files and security monitoring data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information for the following purposes:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Providing and maintaining our analytics services</li>
                <li>Creating personalized dashboards and reports</li>
                <li>Communicating with you about your account and services</li>
                <li>Improving our platform through aggregated, anonymized analytics</li>
                <li>Ensuring security and preventing fraud</li>
                <li>Complying with legal obligations and regulatory requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to outside parties except in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>With your consent:</strong> When you explicitly authorize us to share your information</li>
                <li><strong>Service providers:</strong> Trusted third parties who assist in operating our platform (all bound by strict confidentiality agreements)</li>
                <li><strong>Legal requirements:</strong> When required by law, regulation, or legal process</li>
                <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets (with continued privacy protection)</li>
                <li><strong>Protection of rights:</strong> To protect our rights, privacy, safety, or property, or that of our users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">We implement comprehensive security measures to protect your information:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                <li><strong>Access controls:</strong> Multi-factor authentication and role-based access</li>
                <li><strong>Infrastructure:</strong> HIPAA-compliant cloud hosting with regular security audits</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and incident response</li>
                <li><strong>Regular testing:</strong> Penetration testing and vulnerability assessments</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">Under various privacy laws (GDPR, CCPA, Australian Privacy Act), you have the following rights:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
                <li><strong>Restriction:</strong> Limit how we process your information</li>
                <li><strong>Objection:</strong> Object to certain types of processing</li>
                <li><strong>Withdraw consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Healthcare-Specific Privacy Protections</h2>
              <p className="text-gray-700 mb-4">
                As a healthcare technology provider, we comply with additional privacy requirements:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>HIPAA Compliance:</strong> We maintain Business Associate Agreements with healthcare providers</li>
                <li><strong>Minimum Necessary:</strong> We access only the minimum necessary health information</li>
                <li><strong>Purpose Limitation:</strong> Health information is used only for authorized healthcare purposes</li>
                <li><strong>Breach Notification:</strong> We have procedures for reporting any potential data breaches</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your information only as long as necessary for the purposes outlined in this policy or as required by law. Healthcare data may be retained longer due to regulatory requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers, including adequacy decisions and standard contractual clauses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes via email or through our platform at least 30 days before the changes take effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Privacy Officer:</strong> privacy@agedcareanalytics.com<br />
                  <strong>Data Protection Officer:</strong> dpo@agedcareanalytics.com<br />
                  <strong>Address:</strong> [Your Business Address]<br />
                  <strong>Phone:</strong> [Your Contact Number]
                </p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <Link 
                href="/auth/signup" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                I Understand - Continue to Sign Up
              </Link>
              <Link 
                href="/legal/terms" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-4 sm:mt-0"
              >
                View Terms of Service →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 