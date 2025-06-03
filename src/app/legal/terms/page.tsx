import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content */}
          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Aged Care Analytics ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Aged Care Analytics provides data analytics and insights for healthcare professionals and organizations in the aged care sector. Our platform helps analyze care quality, operational efficiency, and compliance metrics.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts and Registration</h2>
              <p className="text-gray-700 mb-4">
                To access certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Healthcare Data and HIPAA Compliance</h2>
              <p className="text-gray-700 mb-4">
                As a healthcare analytics platform, we understand the sensitivity of health information:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>All data is encrypted in transit and at rest</li>
                <li>We maintain HIPAA-compliant infrastructure through our cloud providers</li>
                <li>Users are responsible for ensuring their use complies with applicable healthcare regulations</li>
                <li>We do not access or view your protected health information without explicit authorization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Use the Service for any unlawful purpose or to solicit unlawful acts</li>
                <li>Violate any healthcare regulations or patient privacy laws</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Upload or transmit malicious code or malware</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Share your account credentials with unauthorized persons</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Ownership and Usage</h2>
              <p className="text-gray-700 mb-4">
                You retain ownership of all data you upload to the Service. We may use aggregated, anonymized data to improve our services and create industry insights, but will never share identifiable information without your explicit consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Service Availability</h2>
              <p className="text-gray-700 mb-4">
                While we strive for 99.9% uptime, we do not guarantee uninterrupted access to the Service. We may temporarily suspend access for maintenance, updates, or security purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Aged Care Analytics shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@agedcareanalytics.com<br />
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
                href="/legal/privacy" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-4 sm:mt-0"
              >
                View Privacy Policy →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 