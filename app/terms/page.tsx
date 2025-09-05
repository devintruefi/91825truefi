'use client'

export default function TermsAndConditions() {
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
              Terms of Use
            </h1>
            <div className="text-sm text-gray-500 font-medium tracking-wide uppercase mb-3">
              TrueFi AI, Inc. DBA TrueFi.ai
            </div>
            <div className="text-sm text-gray-600">
              Effective Date: September 3, 2025
            </div>
          </div>
        </div>

        {/* Terms sections */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-8">
          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              1. Agreement and Scope
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              These Terms of Use are a binding contract between TrueFi AI, Inc. doing business as TrueFi.ai and you. By creating an account, connecting financial accounts, or using our websites, mobile apps, and related services (collectively, the "Services"), you agree to these Terms and to our Privacy Policy. If you do not agree, then do not use the Services. You represent that you are at least 18 years old and capable of entering a binding contract. If you use the Services on behalf of an organization, you confirm you have authority to bind that organization and that you accept these Terms on its behalf.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              2. What TrueFi Is and Is Not
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              TrueFi.ai provides AI-enabled financial education, planning tools, budgeting insights, and scenario modeling based on information that you provide or connect. TrueFi AI, Inc. is not a bank, not a broker-dealer, not an investment adviser, not a tax adviser, and not a law firm. The Services do not provide individualized investment, tax, accounting, or legal advice and do not recommend any specific security, strategy, or transaction. AI outputs are probabilistic, may be incomplete, time-lagged, or inaccurate, and may not reflect current market or regulatory conditions. You are solely responsible for your decisions.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              3. Accounts, ESIGN, and Communications
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              You must keep your account information accurate and your credentials secure. You consent to receive disclosures and communications electronically, including by email, in-product messages, and SMS where available. Your electronic acceptance has the same effect as a handwritten signature. You may withdraw ESIGN consent by contacting the address in Section 21, although withdrawal may limit your ability to use the Services.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              4. Linking Financial Accounts and Third Parties
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              If you choose to connect external financial accounts, you authorize TrueFi and our data aggregators (for example, Plaid) to access, retrieve, transmit, and display information from your financial institutions on your behalf. We do not store your bank login credentials. Availability, accuracy, and timeliness depend on third-party systems and networks. You authorize us to act as your agent to obtain and use such data to provide and improve the Services. Third-party terms may apply and you are responsible for reviewing them.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              5. AI Outputs, Beta Features, and Reliance
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              AI features generate content that may contain errors or omissions. Use independent judgment and verification. We may offer experimental or beta features that are provided "as is" and that may be modified or discontinued at any time.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              6. Subscriptions, Trials, Billing, and Taxes
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              Some features require a paid subscription. If you start a free trial, the plan converts to a paid subscription at the end of the trial unless you cancel before renewal. Subscriptions renew each period and your payment method will be charged the then-current price until you cancel. You can cancel at any time with effect at the end of the current billing period unless a different policy is stated for your jurisdiction. Except where required by law, fees are nonrefundable once the period begins. We may change prices upon notice and your continued use after the effective date constitutes acceptance. You are responsible for applicable taxes.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              7. Acceptable Use
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="space-y-2.5 ml-4">
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Access or use the Services in a way that violates law or these Terms</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Interfere with or disrupt the Services or related systems</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Introduce malware or other harmful code</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Scrape, harvest, or reverse engineer except where permitted by law</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Misrepresent your identity or provide false information</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Use the Services to provide investment, tax, or legal advice to others</span>
              </li>
              <li className="flex items-start text-[15px] text-gray-700 leading-[1.6]">
                <span className="text-gray-400 mr-3 mt-0.5">•</span>
                <span>Use the Services in connection with any high-risk activity or emergency service</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We may suspend or terminate access for violations or where needed for security, legal, or operational reasons.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              8. Your Content and Feedback
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              You retain ownership of content you submit ("User Content"). You grant TrueFi a worldwide, non-exclusive, royalty-free license to use, reproduce, display, perform, and create derivative works of your User Content only to operate, provide, and improve the Services, to comply with law, and to prevent fraud and abuse. If you submit feedback, ideas, or suggestions, you grant TrueFi a perpetual, irrevocable license to use them without restriction and without compensation.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              9. Privacy
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              Our collection, use, and disclosure of personal information are described in our Privacy Policy. By using the Services, you agree that we may process your information and share it with service providers such as cloud hosting, data aggregation, analytics, customer support, and communications vendors under appropriate agreements.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              10. Intellectual Property and License to You
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              TrueFi owns all rights in the Services including software, user interfaces, designs, text, graphics, logos, and all related intellectual property. Subject to these Terms, TrueFi grants you a limited, revocable, non-exclusive, non-transferable license to use the Services for your personal, non-commercial use. All rights not expressly granted are reserved.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              11. Open Source, Mobile Terms, and App Stores
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              The Services may include open source components that are governed by their own licenses. For mobile apps downloaded from Apple or Google, you must also comply with their store terms. Apple and Google are not parties to these Terms and are not responsible for support or warranty. Apple and its subsidiaries are third-party beneficiaries of these Terms for apps downloaded from the App Store and may enforce them.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              12. Copyright Complaints (DMCA)
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you believe content in the Services infringes your copyright, send a notice to our DMCA Agent that includes your physical or electronic signature, identification of the copyrighted work and the material claimed to be infringing, your contact information, a statement of good faith belief that the use is not authorized, and a statement under penalty of perjury that the information in the notice is accurate and that you are authorized to act.
            </p>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="text-[15px] text-gray-700 leading-[1.6]">
                <p className="font-semibold mb-2">DMCA Agent:</p>
                <p className="text-gray-600">TrueFi AI, Inc.</p>
                <p className="text-gray-600">Attn: Legal</p>
                <p className="text-gray-600">110 Westwood Plaza, Los Angeles, CA 90095-1481</p>
                <p className="text-gray-600 mt-2">
                  <a href="mailto:Hello@truefi.ai" className="text-cyan-600 hover:text-cyan-700 font-medium">
                    Hello@truefi.ai
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              13. Disclaimers
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              The Services, including AI outputs, are provided "as is" and "as available." To the fullest extent permitted by law, TrueFi disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. TrueFi does not warrant that the Services will be accurate, complete, reliable, secure, or error-free, or that they will meet your requirements.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              14. Limitation of Liability
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              To the maximum extent permitted by law, TrueFi and its affiliates, officers, directors, employees, and suppliers will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages or for any loss of profits, revenue, data, or goodwill arising out of or relating to the Services or these Terms, even if advised of the possibility of such damages. TrueFi's total liability for any claim will not exceed the amounts you paid to TrueFi for the Services in the 12 months before the event giving rise to the claim, or $100 United States Dollars if you have not paid any amounts. Some jurisdictions do not allow certain limitations, so some of the above may not apply to you.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              15. Indemnification
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              You will indemnify, defend, and hold harmless TrueFi and its affiliates, officers, directors, employees, and agents from and against all third-party claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of the Services, your User Content, or your violation of these Terms or of law.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              16. Export, Sanctions, and Government Rights
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              You must comply with United States export control and sanctions laws, and you may not use or access the Services if you are located in an embargoed country or on a restricted list. The Services are commercial computer software and related documentation, and United States Government end users receive only those rights set forth in these Terms.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              17. Changes to the Services and to These Terms
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              We may modify or discontinue features from time to time. We may update these Terms. For material changes, we will provide notice (for example, by email or in-product message). Unless a later date is stated, changes are effective when posted. If you do not agree, stop using the Services. Continued use after the effective date means you accept the changes.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              18. Governing Law and Venue
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              Except as preempted by federal law, these Terms are governed by the laws of the State of Delaware without regard to conflicts of law rules. Subject to Section 19, the exclusive venue for any action that is not subject to arbitration is the state or federal courts located in San Francisco County, California, and the parties consent to personal jurisdiction there.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              19. Dispute Resolution, Arbitration, and Class Action Waiver
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
              <p className="text-[14px] text-amber-900 font-semibold leading-[1.5]">
                ⚠️ Important: Please read this section carefully. It affects your rights.
              </p>
            </div>
            
            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              a. Agreement to Arbitrate
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Any dispute, claim, or controversy arising out of or relating to these Terms or the Services will be resolved by binding individual arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules. The Federal Arbitration Act governs the interpretation and enforcement of this section. The arbitration will occur in the county where you reside or in San Francisco, California, or by video conference, as you prefer.
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              b. Exceptions
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Either party may bring an individual action in small claims court. Either party may seek injunctive or other equitable relief in court to protect intellectual property rights. To the extent required by the California McGill rule, you may seek public injunctive relief in court.
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              c. Class Action and Jury Waiver
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>You and TrueFi waive any right to a jury trial and to participate in a class, consolidated, or representative action.</strong>
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              d. Opt Out
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may opt out of arbitration by sending written notice to the email in Section 21 within 30 days after you first accept these Terms. Your opt-out will not affect prior agreements to arbitrate.
            </p>

            <h3 className="text-[17px] font-semibold text-gray-900 mt-6 mb-3">
              e. Mass Filing Process
            </h3>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              If 25 or more similar arbitration demands are filed by the same or coordinated counsel, the parties will select 10 bellwether cases to proceed first and the remaining cases will be stayed until the bellwether cases are resolved.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              20. Termination
            </h2>
            <p className="text-[15px] text-gray-700 leading-[1.6] font-normal">
              You may stop using the Services at any time. We may suspend or terminate your access immediately for violations of these Terms or where needed for security, legal, or operational reasons. Upon termination, the following sections survive: Sections 2 and 8 through 21.
            </p>
          </section>

          <section className="mb-8 pb-8 border-b border-gray-100">
            <h2 className="text-[20px] font-semibold text-gray-900 mb-4 tracking-tight">
              21. Contact, Assignment, Waiver, Severability, Entire Agreement
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
              <div className="text-[15px] text-gray-700 leading-[1.6]">
                <p className="font-semibold mb-3">Contact Information:</p>
                <p className="text-gray-600">TrueFi AI, Inc.</p>
                <p className="text-gray-600">Attn: Legal</p>
                <p className="text-gray-600">110 Westwood Plaza</p>
                <p className="text-gray-600">Los Angeles, CA 90095-1481</p>
                <p className="mt-4 text-gray-600">
                  Email: <a href="mailto:Hello@truefi.ai" className="text-cyan-600 hover:text-cyan-700 font-medium">
                    Hello@truefi.ai
                  </a>
                </p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may not assign these Terms without our prior written consent. We may assign to an affiliate or in connection with a merger, acquisition, or similar transaction. No waiver is implied by any delay or failure to enforce. If any provision is found unenforceable, it will be limited to the minimum extent necessary and the remainder will remain in effect. These Terms, together with policies and addenda referenced, constitute the entire agreement between you and TrueFi regarding the Services.
            </p>
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