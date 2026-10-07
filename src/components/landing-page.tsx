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
      // With the preview removed, we just alert or do nothing if unconfigured.
      // But we can just open sign-in anyway to show the error, or do an alert.
      alert("Sign-in is unavailable in this test build. Please configure the Supabase URL.");
    } else {
      setSignInOpen(true);
    }
  };

  return (
    <div className="w-full bg-background flex flex-col items-center">
      
      {/* HERO SECTION */}
      <section className="relative w-full bg-[#051429] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2545]/90 via-[#0B2545]/80 to-transparent" />
        
        <div className="relative z-10 mx-auto w-full max-w-[90rem] px-6 lg:px-12 pt-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col gap-8 text-left"
            >
              <div>
                <h1 className="font-heading text-4xl lg:text-6xl font-medium tracking-tight text-white mb-6">
                  Capital Markets Portal (CMP) Kenya
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                  A structured Listing Readiness Diagnostic tool that helps you know exactly where you stand before the listing process begins.
                </p>
              </div>

              {/* Main Action High Up */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Button 
                  size="lg" 
                  className="h-14 px-10 text-lg bg-[#C9962B] hover:bg-[#b08223] text-[#0B2545] font-semibold border-none" 
                  onClick={handleStartAssessment}
                >
                  Start the Assessment
                </Button>
                <p className="text-sm text-gray-400 max-w-xs">
                  A 10-item sample diagnostic ({expectedSampleVersion}) for IBUKA Phase 1.
                </p>
              </div>

              {/* Who it helps / Short explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-white/10 mt-4">
                <div>
                  <h3 className="text-[#5CC49A] font-heading text-xl font-medium mb-3">Who It Helps</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Companies planning to list on the Nairobi Securities Exchange. Early preparation is the highest-ROI step in any listing journey, resolving issues upstream to save time and capital.
                  </p>
                </div>
                <div>
                  <h3 className="text-[#5CC49A] font-heading text-xl font-medium mb-3">What It Is</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    A benchmarked assessment mapping your current position against POLD 2023 & NSE requirements to sequence your listing timeline with clarity.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Product Screenshot */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#051429] via-transparent to-transparent opacity-20 z-10" />
              <img 
                src={`${import.meta.env.BASE_URL}product-screenshot.png`}
                alt="CMP Assessment Interface"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"; // Fallback
                }}
              />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ASSESSMENT AREAS */}
      <section className="w-full max-w-[90rem] px-6 lg:px-12 py-24 border-b border-border bg-[#f8f9fa]">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[#0B2545] font-heading text-3xl md:text-4xl font-medium mb-4 tracking-tight">
              Assessment Areas
            </h2>
            <p className="text-lg text-muted-foreground">
              We assess critical listing elements across 4 core domains, tailored to your specific filing pathway.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
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
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
                }}
                className="bg-white p-8 rounded-2xl shadow-sm border border-border transition-all hover:shadow-md"
              >
                <h3 className="font-heading text-xl font-semibold text-[#0B2545] mb-3">
                  {domain.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {domain.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS & WHAT YOU RECEIVE */}
      <section className="w-full max-w-[90rem] px-6 lg:px-12 py-24 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[#0B2545] font-heading text-3xl font-medium mb-6">How It Works</h2>
            <ul className="space-y-6 text-gray-600 leading-relaxed">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#5CC49A]/20 text-[#0B2545] flex items-center justify-center font-bold">1</span>
                <div>
                  <strong className="block text-[#0B2545] mb-1">Create your workspace</strong>
                  Sign in to access your secure, private assessment dashboard.
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#5CC49A]/20 text-[#0B2545] flex items-center justify-center font-bold">2</span>
                <div>
                  <strong className="block text-[#0B2545] mb-1">Complete the domains</strong>
                  Work through structured diagnostic questions benchmarked against regulatory standards.
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#5CC49A]/20 text-[#0B2545] flex items-center justify-center font-bold">3</span>
                <div>
                  <strong className="block text-[#0B2545] mb-1">Track progress instantly</strong>
                  Your entries autosave, and your readiness score updates in real time.
                </div>
              </li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#051429] p-10 rounded-2xl text-white shadow-xl"
          >
            <h2 className="text-white font-heading text-3xl font-medium mb-6">What You Receive</h2>
            {/* Note to Trevor: Please confirm the claims in this section regarding independent review and heatmaps */}
            <p className="text-gray-300 leading-relaxed mb-6">
              The output is a structured independent review indicating your listing readiness position.
            </p>
            <ul className="space-y-4 text-gray-300">
              <li className="flex gap-3 items-center">
                <svg className="w-5 h-5 text-[#C9962B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                A scored readiness assessment
              </li>
              <li className="flex gap-3 items-center">
                <svg className="w-5 h-5 text-[#C9962B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                A visual heatmap of your position by workstream
              </li>
              <li className="flex gap-3 items-center">
                <svg className="w-5 h-5 text-[#C9962B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                A phased implementation roadmap
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA & DISCLAIMER */}
      <section className="w-full bg-[#eef1f5] py-20 border-t border-border">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 text-center">
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl bg-[#0B2545] hover:bg-[#0a1f3a] text-white font-medium mb-10 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1" 
            onClick={handleStartAssessment}
          >
            Start the Assessment Workspace
          </Button>
          
          <div className="max-w-3xl mx-auto text-sm leading-relaxed text-muted-foreground space-y-4">
            <p>
              <strong>Important Disclaimer:</strong> This page previews a sample proof of concept for review.
              The prompts, controls, and progress rules are proposals and are not validated regulatory content.
            </p>
            <p>
              The progress figure is a self-reported metric and does not constitute a regulatory pass/fail result, an official determination of listing eligibility, or formal approval.
            </p>
          </div>
        </div>
      </section>

      {authPhase === "unconfigured" && (
        <div className="w-full bg-destructive/10 text-destructive text-center py-3 text-sm font-medium">
          Note: Magic-link sign-in and saved assessments are unavailable (Supabase not configured).
        </div>
      )}
    </div>
  );
}
