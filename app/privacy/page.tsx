'use client'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Apple-style legal header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[980px] mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm font-medium text-gray-900">TrueFi Legal</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[980px] mx-auto px-4 py-12">
        {/* Document header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center">
            <h1 className="text-[32px] font-semibold text-gray-900 mb-2 tracking-tight">
              Privacy Policy
            </h1>
            <div className="text-sm text-gray-500 font-medium tracking-wide uppercase mb-3">
              TrueFi AI, Inc. DBA TrueFi.ai
            </div>
            <div className="text-sm text-gray-600">
              Effective Date: September 3, 2025
            </div>
          </div>
        </div>

        {/* Policy sections */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-8">
          <section className="mb-8 pb-8 border-b border-gray-100">
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              This Privacy Policy explains how TrueFi AI, Inc. doing business as TrueFi.ai collects, uses, discloses, and protects information about you when you use our websites, mobile apps, and related services (collectively, the "Services"). Capitalized terms that are not defined here have the meaning given in the Terms of Use.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              1. Notice at Collection for United States Users
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              We collect the categories of personal information listed below for the purposes described in this Policy. We retain information for the periods described in Section 7. We do not sell personal information and we do not share personal information for cross-context behavioral advertising as those terms are defined by California law. Where required, we honor opt-out preference signals such as Global Privacy Control.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              2. Information We Collect
            </h2>
            
            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              A. Information You Provide
            </h3>
            <ul className="space-y-2.5 ml-4">
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Identifiers and contact information such as name, email, phone number, and date of birth where needed for verification.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Profile and settings such as household information, goals, and preferences you provide.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Support and communications such as messages, survey responses, and content you submit.</span>
              </li>
            </ul>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              B. Information from Your Devices and Use of Services
            </h3>
            <ul className="space-y-2.5 ml-4">
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Device and usage data such as IP address, device identifiers, app version, timestamps, pages and screens viewed, features used, and crash logs.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Cookies and software development kits. We use strictly necessary, functional, and analytics cookies and SDKs. We do not use advertising trackers for cross-context behavioral advertising.</span>
              </li>
            </ul>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              C. Information from Linked Financial Accounts (with Your Consent)
            </h3>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              Financial account metadata and transactions including account type, last four digits, balances, transactions, merchant and category data, and when applicable, holdings. We access this data through data aggregators such as Plaid and through your financial institutions. We do not store your bank login credentials.
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              D. Inferences
            </h3>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              Derived insights such as budgets, cash flow projections, modeled scenarios, savings opportunities, and risk flags.
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              E. Sensitive Personal Information
            </h3>
            <ul className="space-y-2.5 ml-4">
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Financial data elements such as account and transaction information</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Government identification if you submit it for verification</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Precise location only if you enable it</span>
              </li>
            </ul>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              3. Sources of Personal Information
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              We collect information from you, from your devices, from your financial institutions through data aggregators such as Plaid, from our service providers, from publicly available sources used for validation or fraud prevention, and from other sources as permitted by law.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              4. How We Use Personal Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use personal information to:
            </p>
            <ul className="space-y-2.5 ml-4">
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Provide, maintain, and improve the Services, including AI-powered insights and scenario modeling</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Authenticate users, link and refresh accounts, and detect and prevent fraud, abuse, and security incidents</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Personalize experiences, provide customer support, and communicate about updates and features</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Comply with contractual, legal, tax, and regulatory obligations</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Perform internal research, testing, debugging, and analytics</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Develop and evaluate models and features using de-identified and aggregated data</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We do not use your personal information to train third-party foundation models. We do not allow our cloud or model vendors to use your information for their own advertising or model training.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              5. How We Disclose Personal Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We disclose personal information to the following categories of recipients:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-cyan-600 mr-2">•</span>
                <div>
                  <strong>Service providers and processors</strong> under written contracts, including cloud hosting (e.g., AWS), data aggregation (e.g., Plaid), analytics, communications, and customer support. These providers may use the information only to provide services to us and must protect it.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-600 mr-2">•</span>
                <div>
                  <strong>Parties you authorize</strong>, such as when you request that we export a report or share information on your behalf.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-600 mr-2">•</span>
                <div>
                  <strong>Parties to a corporate transaction</strong>, such as a merger, acquisition, or financing, subject to appropriate protections.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-600 mr-2">•</span>
                <div>
                  <strong>Legal and safety recipients</strong>, including regulators, law enforcement, and others where required or permitted by law or to protect the rights, property, or safety of TrueFi, our users, or the public.
                </div>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We do not sell personal information. We do not share personal information for cross-context behavioral advertising. We do not permit third parties to collect information across non-affiliated sites for such purposes through our Services.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              6. GLBA and Sector-Specific Rules
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              To the extent TrueFi is considered a financial institution under the Gramm-Leach-Bliley Act (GLBA), certain personal information we collect and use to provide financial tools may be nonpublic personal information (NPI). Where GLBA applies, we handle NPI consistent with GLBA and its implementing regulations. NPI covered by GLBA is exempt from certain state privacy requirements. For data that is not covered by GLBA, this Privacy Policy and applicable state laws apply.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              7. Retention
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We retain personal information only as long as necessary for the purposes described here, to comply with legal obligations, to resolve disputes, and to enforce agreements.
            </p>
            <ul className="space-y-2.5 ml-4">
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span><strong>Identifiers and contact information:</strong> Life of account plus up to 7 years.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span><strong>Profile settings and preferences:</strong> Life of account plus up to 3 years.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span><strong>Support and communications:</strong> Up to 3 years or longer if required by law.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span><strong>Device and usage data:</strong> Up to 24 months. De-identified or aggregate analytics may be kept longer.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span><strong>Financial account data:</strong> While accounts remain linked plus up to 3 years. De-identified analytics may be retained.</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span><strong>Inferences:</strong> Life of account plus up to 3 years.</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Retention periods may be adjusted to comply with legal holds, audits, or regulatory requirements.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              8. Your Privacy Rights
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Depending on your location, you may have the right to access, correct, delete, obtain a portable copy, restrict or object to certain processing, and opt out of certain uses including targeted advertising, sale, or profiling. You can exercise rights through in-app controls, through our web form, or by emailing privacy@truefi.ai.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              We will verify your request and respond within the time required by law. You may use an authorized agent where permitted. We will not discriminate against you for exercising rights.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Appeals:</strong> If we deny your request, you may appeal by emailing privacy@truefi.ai with the word "Appeal" in the subject line.
            </p>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              <strong>Global Privacy Control:</strong> Where required, we treat a valid GPC signal as a request to opt out of sale or sharing.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              9. Children
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              The Services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, contact us at privacy@truefi.ai and we will delete it.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              10. Security
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              We use administrative, technical, and physical safeguards that are designed to protect personal information. Examples include encryption in transit and at rest, role-based access controls, network segmentation, logging and monitoring, and employee training. No system can be perfectly secure. You are responsible for safeguarding your credentials and for promptly notifying us of any suspected compromise.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              11. International Data Transfers
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              If you access the Services from outside the United States, your information may be processed in the United States or in other countries with different data protection laws. Where required, we use approved transfer mechanisms such as Standard Contractual Clauses and we maintain appropriate contractual and technical safeguards.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              12. Automated Decision Making
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              Our AI features assist with budgeting and planning scenarios. We do not make decisions that produce legal or similarly significant effects about you solely by automated means without meaningful human review. You may contact us for more information.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              13. State and Regional Disclosures
            </h2>
            
            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              California (CCPA and CPRA)
            </h3>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              We collect the following categories of personal information: identifiers, personal records categories, commercial information, internet or network activity, geolocation (if enabled), professional or employment information (if you provide it), inferences, and sensitive financial information such as account and transaction data. We use and disclose these categories for the business purposes described in Sections 4 and 5. You have the rights described in Section 8. We do not sell personal information and we do not share it for cross-context behavioral advertising. If we offer a financial incentive such as a referral bonus, we will disclose the material terms at the time of signup and participation will be voluntary.
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              Virginia, Colorado, Connecticut, Utah, and Other States
            </h3>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              We comply with applicable state laws including rights to opt out of targeted advertising, sale, or profiling for decisions that have legal or similarly significant effects. We recognize opt-out preference signals where required.
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              GDPR and UK Addendum (if applicable)
            </h3>
            <ul className="space-y-2.5 ml-4">
              <li><strong>Controller:</strong> TrueFi AI, Inc.</li>
              <li><strong>Legal bases:</strong> Performance of a contract, legitimate interests (such as securing and improving the Services), consent where required, and compliance with legal obligations.</li>
              <li><strong>Data subject rights:</strong> Access, rectification, erasure, restriction, portability, objection, and the right to lodge a complaint with your supervisory authority.</li>
              <li><strong>Contact:</strong> privacy@truefi.ai</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-2">
              If required, we will designate an EU or UK representative and update this Policy.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              14. Third-Party Services and Links
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              Our Services may link to or integrate with services that are operated by third parties such as banks, aggregators, and app stores. Their privacy practices apply to their services. Review their policies to understand how they handle your information.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              15. Changes to this Policy
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              We may update this Privacy Policy from time to time. For material changes, we will provide notice (for example, by email or an in-product message). The Effective Date at the top shows the most recent revision. Continued use of the Services after the Effective Date means you accept the changes.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              16. Contact Us
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="text-[15px] text-gray-700 leading-[1.6]">
                <p className="font-semibold mb-3">TrueFi AI, Inc.</p>
                <p className="text-gray-600">Attn: Privacy</p>
                <p className="text-gray-600">110 Westwood Plaza</p>
                <p className="text-gray-600">Los Angeles, CA 90095-1481</p>
                <p className="mt-4 text-gray-600">
                  Email: <a href="mailto:Hello@truefi.ai" className="text-cyan-600 hover:text-cyan-700 font-medium">
                    Hello@truefi.ai
                  </a>
                </p>
                <p className="mt-2 text-gray-600">
                  Rights Portal: <a href="https://truefi.ai/privacy-rights" className="text-cyan-600 hover:text-cyan-700 font-medium">
                    truefi.ai/privacy-rights
                  </a>
                </p>
              </div>
            </div>
          </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 mb-8">
        <div className="max-w-[980px] mx-auto px-4">
          <div className="border-t border-gray-200 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
              <div className="mb-4 sm:mb-0">
                Copyright © 2025 TrueFi AI, Inc. All rights reserved.
              </div>
              <div className="flex items-center space-x-4">
                <a href="/terms" className="hover:text-gray-700 transition-colors">Terms of Use</a>
                <span className="text-gray-300">|</span>
                <a href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}