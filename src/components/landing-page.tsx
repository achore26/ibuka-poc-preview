import { motion } from "framer-motion";
import { Button } from "./ui/button";

interface LandingPageProps {
  authPhase: string;
  setSignInOpen: (open: boolean) => void;
  expectedSampleVersion: string;
}

export function LandingPage({ authPhase, setSignInOpen, expectedSampleVersion }: LandingPageProps) {
  const handleStartAssessment = () => {
    if (authPhase === "unconfigured") {
      alert("Sign-in is unavailable in this test build. Please configure the Supabase URL.");
    } else {
      setSignInOpen(true);
    }
  };

  return (
    <div className="w-full bg-[#F3F6F9] flex flex-col items-center">
      
      {/* HERO SECTION - CLEAN, CONCISE, DISTINCT CMP IDENTITY */}
      <section className="relative w-full overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-32 bg-white border-b border-border">
        {/* Subtle decorative accent */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#E8F3EF] to-transparent rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 mx-auto w-full max-w-[90rem] px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Column: Shortened Opening, Main Action High Up */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col gap-8 text-left max-w-2xl"
            >
              <div>

                
                <h1 className="font-heading text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-[#0B2545] mb-6 leading-[1.15]">
                  Know exactly where you stand before the listing process begins.
                </h1>
                
                <p className="text-lg lg:text-xl text-[#4A5568] leading-relaxed">
                  Capital Markets Portal (CMP) offers a structured Listing Readiness Diagnostic. Map your position against regulatory requirements, resolve issues upstream, and sequence your timeline with clarity.
                </p>
              </div>

              {/* Main Action High Up */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
                <Button 
                  size="lg" 
                  className="h-14 px-8 text-lg bg-[#0A7A53] hover:bg-[#086244] text-white font-semibold transition-all hover:-translate-y-0.5 shadow-lg shadow-[#0A7A53]/20 w-full sm:w-auto" 
                  onClick={handleStartAssessment}
                >
                  Start the Assessment
                </Button>
                <p className="text-sm text-[#4A5568]">
                  Secure, private workspace.
                </p>
              </div>
            </motion.div>

            {/* Right Column: Clearly Labelled Product Mock (Give product prominence) */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* Product Mock Container */}
              <div className="relative bg-white rounded-2xl shadow-[0_20px_60px_rgba(11,37,69,0.08)] border border-border overflow-hidden">
                {/* Mock Header */}
                <div className="bg-[#F3F6F9] border-b border-border px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs font-mono text-[#4A5568] ml-2 font-medium">cmp-kenya.app/workspace</span>
                  </div>
                </div>
                
                {/* Mock Content */}
                <div className="p-8 flex flex-col gap-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="font-heading text-xl font-bold text-[#0B2545] mb-2">Listing Readiness</h3>
                      <p className="text-sm text-[#4A5568]">Overall completion status</p>
                    </div>
                    <div className="text-3xl font-heading font-bold text-[#0A7A53]">65%</div>
                  </div>
                  
                  <div className="w-full bg-[#F3F6F9] h-3 rounded-full overflow-hidden">
                    <div className="bg-[#0A7A53] h-full rounded-full" style={{ width: '65%' }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {[
                      { name: "Governance", status: "Complete", color: "bg-[#0A7A53]", text: "text-[#0A7A53]", bg: "bg-[#E8F3EF]" },
                      { name: "Financial Reporting", status: "In Progress", color: "bg-[#C9962B]", text: "text-[#C9962B]", bg: "bg-[#FCF7EB]" },
                      { name: "Business Operations", status: "Review", color: "bg-[#5CC49A]", text: "text-[#5CC49A]", bg: "bg-[#EEF9F5]" },
                      { name: "Risk & Compliance", status: "Not Started", color: "bg-[#4A5568]", text: "text-[#4A5568]", bg: "bg-[#F3F6F9]" }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-border flex flex-col gap-3">
                        <span className="font-medium text-[#0B2545] text-sm">{item.name}</span>
                        <div className={`inline-flex self-start px-2.5 py-1 rounded-md text-xs font-semibold ${item.bg} ${item.text}`}>
                          {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Decorative overlay indicator */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="absolute bottom-6 right-6 bg-white p-4 rounded-xl shadow-lg border border-border flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-[#EEF9F5] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#5CC49A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="text-sm font-medium text-[#0B2545]">
                    Track readiness in real-time
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHAT IT IS & WHO IT HELPS (Expanded scannable sections) */}
      <section className="w-full max-w-[90rem] mx-auto px-6 lg:px-12 py-24 bg-[#F3F6F9]">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
          className="grid md:grid-cols-2 gap-12 lg:gap-16"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white p-10 rounded-2xl shadow-sm border border-border flex flex-col h-full">
            <div className="w-14 h-14 rounded-xl bg-[#0B2545] text-white flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h3 className="font-heading text-2xl font-bold text-[#0B2545] mb-4">What is CMP?</h3>
            <p className="text-[#4A5568] leading-relaxed text-lg flex-grow">
              The Capital Markets Portal (CMP) is a secure, interactive platform designed to help companies navigate the complex preparation required for a public listing. 
              <br/><br/>
              It provides a structured diagnostic framework that translates complex regulatory standards (such as POLD 2023 and NSE requirements) into an accessible, step-by-step self-assessment. By demystifying the pre-listing phase, CMP enables companies to identify gaps early and allocate resources efficiently before formal engagement.
            </p>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white p-10 rounded-2xl shadow-sm border border-border flex flex-col h-full">
            <div className="w-14 h-14 rounded-xl bg-[#0A7A53] text-white flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="font-heading text-2xl font-bold text-[#0B2545] mb-4">Who It Helps</h3>
            <p className="text-[#4A5568] leading-relaxed text-lg flex-grow">
              This diagnostic tool is built for executive leadership teams, boards of directors, and financial controllers of privately held companies considering a transition to public markets.
              <br/><br/>
              Whether you are actively planning an IPO within the next 12-24 months or simply evaluating long-term strategic options, CMP provides the foundational baseline needed to inform your capital markets strategy and ensure compliance before the formal process begins.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ASSESSMENT AREAS */}
      <section className="w-full bg-white border-y border-border py-24">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[#0B2545] font-heading text-3xl lg:text-4xl font-bold mb-4 tracking-tight">
              The 4 Diagnostic Domains
            </h2>
            <p className="text-lg text-[#4A5568]">
              We evaluate critical listing elements across 4 core domains, specifically tailored to your regulatory pathway.
            </p>
          </div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="grid md:grid-cols-2 gap-8"
          >
            {[
              {
                title: "1. Company Details & Governance",
                desc: "Corporate structure, entity rationalization, articles & by-laws, IP ownership, independence & committee composition, governance policies."
              },
              {
                title: "2. Financial Position & Reporting",
                desc: "Audit-ready financials, capital table integrity, complex accounting, internal controls, CFO capability, and compliance framework."
              },
              {
                title: "3. Business & Operations",
                desc: "Operations, human capital, KPIs, ESG materiality, ERP capability for public-company close cycles, and business continuity."
              },
              {
                title: "4. Risk & Compliance",
                desc: "Cybersecurity risk disclosure, ITGC assessment, privacy compliance, board-level ESG oversight, and anti-bribery compliance."
              }
            ].map((domain, i) => (
              <motion.div 
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                }}
                className="bg-[#F3F6F9] p-8 rounded-2xl border border-transparent hover:border-border transition-colors"
              >
                <h3 className="font-heading text-xl font-bold text-[#0B2545] mb-3">
                  {domain.title}
                </h3>
                <p className="text-[#4A5568] leading-relaxed">
                  {domain.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="w-full bg-[#0B2545] text-white py-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>

        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 relative z-10">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-12 tracking-tight">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: "1", title: "Create Workspace", desc: "Sign in to access your secure, private assessment dashboard dedicated to your company." },
              { step: "2", title: "Complete Domains", desc: "Work systematically through structured diagnostic questions benchmarked against regulatory standards." },
              { step: "3", title: "Review & Refine", desc: "Your entries autosave. Collaborate with your team and update your answers as your readiness evolves." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="flex flex-col gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-[#C9962B] text-[#0B2545] flex items-center justify-center font-bold text-2xl font-heading shadow-lg shadow-[#C9962B]/20">
                  {item.step}
                </div>
                <h4 className="text-xl font-bold mt-2">{item.title}</h4>
                <p className="text-gray-300 leading-relaxed max-w-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU RECEIVE */}
      <section className="w-full bg-white py-24">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#C9962B] text-white flex items-center justify-center mb-8 shadow-lg shadow-[#C9962B]/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <h2 className="text-[#0B2545] font-heading text-3xl lg:text-4xl font-bold mb-6 tracking-tight">
            What You Receive
          </h2>
          <p className="text-lg md:text-xl text-[#4A5568] leading-relaxed max-w-4xl">
            Upon completing the diagnostic, you generate a comprehensive readiness profile. This includes a clear gap analysis highlighting areas requiring immediate attention, a visual readiness heatmap, and a foundational implementation roadmap sequenced to help you prioritize remediation efforts ahead of formal auditor or underwriter engagement.*
          </p>
          <div className="mt-8 px-6 py-4 bg-[#F3F6F9] rounded-lg border border-border max-w-3xl">
            <p className="text-sm text-[#4A5568] italic text-left">
              * Note for review: Claims regarding heatmaps and implementation roadmaps are pending final confirmation based on platform scope.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA & DISCLAIMER */}
      <section className="w-full bg-[#F3F6F9] py-24 border-t border-border">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 text-center">
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl bg-[#0A7A53] hover:bg-[#086244] text-white font-bold mb-10 shadow-xl shadow-[#0A7A53]/20 transition-all hover:-translate-y-1" 
            onClick={handleStartAssessment}
          >
            Start the Assessment Workspace
          </Button>
          
          <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl border border-border text-sm leading-relaxed text-[#4A5568] space-y-4 shadow-sm text-left">
            <h4 className="text-[#0B2545] font-bold uppercase tracking-widest text-xs">Important Disclaimer</h4>
            <p>
              This page previews a sample proof of concept for review. The prompts, controls, and progress rules are proposals and are not validated regulatory content.
            </p>
            <p>
              The progress figure is a self-reported metric and does not constitute a regulatory pass/fail result, an official determination of listing eligibility, or formal approval.
            </p>
          </div>
        </div>
      </section>

      {authPhase === "unconfigured" && (
        <div className="w-full bg-destructive text-destructive-foreground text-center py-3 text-sm font-medium sticky bottom-0 z-50">
          Note: Magic-link sign-in and saved assessments are unavailable (Supabase not configured).
        </div>
      )}
    </div>
  );
}
