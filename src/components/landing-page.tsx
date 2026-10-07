import { motion } from "framer-motion";
import { Button } from "./ui/button";


interface LandingPageProps {
  authPhase: string;
  setSignInOpen: (open: boolean) => void;
  expectedSampleVersion: string;
}

export function LandingPage({ authPhase, setSignInOpen, expectedSampleVersion }: LandingPageProps) {
  return (
    <div className="w-full bg-background flex flex-col items-center">
      
      {/* 
        HERO SECTION
        Restored the premium dark blue background, skyscraper abstract, and gold banner,
        but brought the CTA higher up and introduced a product-forward collage.
      */}
      <section className="relative w-full min-h-[90vh] bg-[#051429] text-white flex flex-col justify-center overflow-hidden pt-24 pb-20">
        
        {/* Background Texture/Image (Abstract Corporate Blue) */}
        <div 
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2545]/95 via-[#0B2545]/85 to-[#0B2545]/40" />

        <div className="relative z-10 mx-auto w-full max-w-[90rem] px-6 lg:px-12">
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-12 text-center lg:text-left"
          >
            <h1 className="font-heading text-5xl lg:text-7xl font-medium tracking-tight text-white mb-8 transition-all duration-700 hover:text-white/90 hover:drop-shadow-[0_0_20px_rgba(201,150,43,0.35)] cursor-default">
              Listing Readiness Assessment
            </h1>
            
            {/* Gold Bordered Banner Box */}
            <div className="mx-auto lg:mx-0 w-full lg:w-auto inline-block border border-[#C9962B]/60 bg-[#C9962B]/5 px-8 py-5 transition-all duration-500 hover:bg-[#C9962B]/15 hover:border-[#C9962B] hover:shadow-[0_0_25px_rgba(201,150,43,0.15)] cursor-default">
              <p className="font-heading text-[#C9962B] text-xl font-medium tracking-wide">
                Know Where You Stand. List With Confidence
              </p>
              <p className="text-[#C9962B]/80 italic mt-2 text-lg">
                A structured diagnostic determining your company's listing readiness position.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-16 items-center">
            
            {/* Left Column: Shortened Content + CTA High Up */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="xl:col-span-5 flex flex-col gap-6 text-[17px] leading-relaxed text-gray-200"
            >
              <p className="text-xl text-white font-light">
                Early preparation is the highest-ROI step in any listing journey. Issues resolved upstream save significant time and capital.
              </p>
              
              <div className="flex flex-col gap-4 mt-2">
                <Button 
                  size="lg" 
                  className="h-16 px-10 text-xl bg-[#C9962B] hover:bg-[#b08223] text-[#0B2545] font-semibold border-none shadow-[0_0_20px_rgba(201,150,43,0.3)] transition-transform hover:-translate-y-1 w-full sm:w-auto" 
                  onClick={() => setSignInOpen(true)}
                >
                  Start the Assessment Workspace
                </Button>
                <p className="text-sm text-[#C9962B]/70 ml-2">
                  10-item diagnostic sample ({expectedSampleVersion})
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-white/10 mt-6">
                <div>
                  <h3 className="text-[#5CC49A] font-heading text-lg font-medium mb-2">What is CMP?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    A benchmarked assessment mapping your position against POLD 2023 & NSE requirements.
                  </p>
                </div>
                <div>
                  <h3 className="text-[#5CC49A] font-heading text-lg font-medium mb-2">Who It Helps</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Companies seeking to list on the Nairobi Securities Exchange with clarity and confidence.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Stacked Sharp-Edged Photos */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="xl:col-span-7 flex flex-col gap-6"
            >
              {/* Top Photo */}
              <div className="w-full h-[350px] lg:h-[400px] overflow-hidden shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1573164574511-73c773193279?auto=format&fit=crop&w=1200&q=80" 
                  alt="Black corporate professionals reviewing strategy"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              {/* Bottom Photo */}
              <div className="w-full h-[300px] lg:h-[350px] overflow-hidden shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1573496130141-209d200cebd8?auto=format&fit=crop&w=1200&q=80" 
                  alt="Black business woman in modern office"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DOMAINS SECTION */}
      <section className="w-full max-w-[90rem] px-6 lg:px-12 py-24 overflow-hidden bg-white">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.h2 
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
            }}
            className="text-[#0B2545] font-heading text-3xl md:text-4xl font-medium mb-16 tracking-tight"
          >
            What We Assess: The 4 Diagnostic Domains
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
            {[
              {
                title: "1. Company Details & Governance:",
                desc: "Corporate structure, entity rationalization, articles & by-laws, IP ownership, independence & committee composition, governance policies."
              },
              {
                title: "2. Financial Position & Reporting:",
                desc: "Audit-ready financials, capital table integrity, complex accounting, internal controls, CFO capability, and compliance framework."
              },
              {
                title: "3. Business & Operations:",
                desc: "Operations, human capital, KPIs, ESG materiality, ERP capability for public-company close cycles, and business continuity."
              },
              {
                title: "4. Risk & Compliance:",
                desc: "Cybersecurity risk disclosure, ITGC assessment, privacy compliance, board-level ESG oversight, and anti-bribery compliance."
              }
            ].map((domain, i) => (
              <motion.div 
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.96 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
                }}
                className="flex flex-col gap-3 p-8 -m-8 rounded-2xl transition-all duration-500 hover:bg-[#f8f9fa] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 cursor-default border border-transparent hover:border-gray-100"
              >
                <h3 className="font-heading text-xl font-semibold text-[#0B2545]">
                  {domain.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-[17px]">
                  {domain.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS & WHAT YOU RECEIVE */}
      <section className="w-full bg-[#f8f9fa] border-t border-border overflow-hidden">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-50px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-[#0B2545] font-heading text-3xl font-medium mb-8">How It Works</h2>
              <div className="flex flex-col gap-8">
                {[
                  { step: "1", title: "Create your workspace", desc: "Sign in to access your secure, private assessment dashboard." },
                  { step: "2", title: "Complete the domains", desc: "Work through structured diagnostic questions benchmarked against regulatory standards." },
                  { step: "3", title: "Track progress instantly", desc: "Your entries autosave, and your readiness score updates in real time." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-white shadow-sm border border-[#5CC49A]/30 text-[#0B2545] font-heading text-xl font-semibold flex items-center justify-center">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-[#0B2545] mb-1">{item.title}</h4>
                      <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#0B2545] p-10 lg:p-14 rounded-2xl text-white shadow-xl relative overflow-hidden"
            >
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#C9962B] opacity-10 blur-3xl rounded-full" />
              
              <h2 className="text-white font-heading text-3xl font-medium mb-6 relative z-10">What You Receive</h2>
              <p className="text-gray-300 leading-relaxed mb-8 relative z-10">
                The output is a structured independent review indicating your listing readiness position.
              </p>
              
              <ul className="space-y-6 text-gray-200 relative z-10">
                <li className="flex gap-4 items-start">
                  <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-[#C9962B]/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#C9962B]" />
                  </div>
                  <span className="text-lg">A scored readiness assessment</span>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-[#C9962B]/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#C9962B]" />
                  </div>
                  <span className="text-lg">A visual heatmap of your position by workstream</span>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-[#C9962B]/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#C9962B]" />
                  </div>
                  <span className="text-lg">A phased implementation roadmap</span>
                </li>
              </ul>
            </motion.div>
            
          </div>
        </div>
      </section>

      {/* FINAL CTA & DISCLAIMER */}
      <section className="w-full bg-[#051429] py-24 border-t border-white/10 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1573496130141-209d200cebd8?auto=format&fit=crop&w=2000&q=80')] opacity-5 mix-blend-luminosity bg-cover bg-center" />
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[90rem] mx-auto px-6 lg:px-12 text-center relative z-10"
        >
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl bg-[#C9962B] hover:bg-[#b08223] text-[#0B2545] font-semibold mb-12 shadow-[0_0_20px_rgba(201,150,43,0.2)] transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(201,150,43,0.4)]" 
            onClick={() => setSignInOpen(true)}
          >
            Start the Assessment Workspace
          </Button>
          
          <div className="max-w-4xl mx-auto p-6 lg:p-8 border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl text-sm leading-relaxed text-gray-400 space-y-4 text-left shadow-2xl">
            <h4 className="text-white font-medium mb-2 uppercase tracking-widest text-xs">Important Disclaimer</h4>
            <p>
              This page previews a sample proof of concept for review. The prompts, controls, and progress rules are proposals and are not validated regulatory content.
            </p>
            <p>
              The progress figure is a self-reported metric and does not constitute a regulatory pass/fail result, an official determination of listing eligibility, or formal approval.
            </p>
          </div>
        </motion.div>
      </section>

      {authPhase === "unconfigured" && (
        <div className="w-full bg-destructive text-destructive-foreground text-center py-3 text-sm font-medium sticky bottom-0 z-50">
          Note: Magic-link sign-in and saved assessments are unavailable (Supabase not configured).
        </div>
      )}
    </div>
  );
}
