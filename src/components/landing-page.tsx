import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ReviewPreview } from "./review-preview";

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
        Full-width dark blue background with abstract vertical lighting overlay to mimic 
        the skyscraper/glass reflection in the reference screenshot.
      */}
      <section className="relative w-full min-h-[85vh] bg-[#051429] text-white flex flex-col justify-center overflow-hidden">
        
        {/* Background Texture/Image (Abstract Corporate Blue) */}
        <div 
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Deep blue gradient overlay to ensure text readability and exact brand color blending */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2545]/90 via-[#0B2545]/80 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-[90rem] px-6 lg:px-12 py-20 lg:py-32">
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-12 text-center lg:text-left"
          >
            <h1 className="font-heading text-5xl lg:text-7xl font-medium tracking-tight text-white mb-8 transition-all duration-700 hover:text-white/90 hover:drop-shadow-[0_0_20px_rgba(201,150,43,0.35)] cursor-default">
              Listing Readiness Assessment
            </h1>
            
            {/* Gold Bordered Banner Box (Exact match to reference) */}
            <div className="mx-auto lg:mx-0 w-full lg:w-auto inline-block border border-[#C9962B]/60 bg-[#C9962B]/5 px-8 py-5 transition-all duration-500 hover:bg-[#C9962B]/15 hover:border-[#C9962B] hover:shadow-[0_0_25px_rgba(201,150,43,0.15)] cursor-default">
              <p className="font-heading text-[#C9962B] text-xl font-medium tracking-wide">
                Know Where You Stand. List With Confidence
              </p>
              <p className="text-[#C9962B]/80 italic mt-2 text-lg">
                A 10-item, 4-domain diagnostic that determines whether your company is ready to list & what it will take to be ready.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            
            {/* Left Column: Text Content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col gap-6 text-[17px] leading-relaxed text-gray-200"
            >
              <p>
                The companies that list successfully (on time, on budget, with board & investor confidence intact) share one thing in common: they knew exactly where they stood before the process began.
              </p>
              <p>
                Our Listing Readiness Diagnostic maps your current position against the requirements of POLD 2023 & the Nairobi Securities Exchange, identifies precisely what needs to be done & sequences every workstream against your listing timeline - so you can move forward with clarity & confidence.
              </p>
              <p>
                Early preparation is the highest-ROI step in any listing journey. Issues resolved upstream cost a fraction of what they cost later. Workstreams started concurrently compress timelines materially.
              </p>

              <h3 className="text-[#5CC49A] font-heading text-2xl font-medium mt-6">
                What is the Listing Readiness Diagnostic?
              </h3>
              
              <h4 className="text-white font-heading font-medium text-xl">A Structured Independent Review</h4>
              <p>
                Capital Markets Portal (CMP) Kenya is a structured assessment. We assess critical listing elements across 4 domains, tailored to your specific filing pathway & target exchange.
              </p>
              <p>
                Every assessment item is benchmarked against applicable regulatory requirements. The output is a scored readiness assessment, a visual heatmap of your position by workstream, & a phased implementation roadmap - sequenced to your target listing timeline & ready to act on immediately.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button 
                  size="lg" 
                  className="h-14 px-10 text-lg bg-[#C9962B] hover:bg-[#b08223] text-[#0B2545] font-semibold border-none" 
                  onClick={() => {
                    if (authPhase === "unconfigured") {
                      document.getElementById("preview-start")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      setSignInOpen(true);
                    }
                  }}
                >
                  Start the Assessment
                </Button>
                <Button variant="outline" size="lg" className="h-14 px-10 text-lg border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => document.getElementById("preview-start")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  Explore the Preview
                </Button>
              </div>
            </motion.div>

            {/* Right Column: Stacked Sharp-Edged Photos */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col gap-6"
            >
              {/* Top Photo */}
              <div className="w-full h-[400px] overflow-hidden shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1573164574511-73c773193279?auto=format&fit=crop&w=1200&q=80" 
                  alt="Black corporate professionals reviewing strategy"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              {/* Bottom Photo */}
              <div className="w-full h-[350px] overflow-hidden shadow-2xl relative">
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

      {/* 
        DOMAINS SECTION 
        Replicating the lower section structure
      */}
      <section className="w-full max-w-[90rem] px-6 lg:px-12 py-24 overflow-hidden">
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

      {/* Unconfigured state notice */}
      {authPhase === "unconfigured" ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[90rem] px-6 lg:px-12 mb-12"
        >
          <Card className="shadow-none ring-1 ring-border" size="sm">
            <CardHeader>
              <CardTitle className="text-base text-[#0B2545]">Sign-in unavailable</CardTitle>
              <CardDescription className="max-w-[46em] leading-relaxed">
                The public Supabase URL or publishable key is not configured for an approved test target. Magic-link sign-in and the saved assessment are unavailable in this build. The preview below still works.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      ) : null}

      {/* Interactive Preview Section */}
      <section id="preview-start" className="w-full bg-[#f3f6f9] border-t border-border py-24 overflow-hidden">
        <div className="mx-auto max-w-[1000px] px-6 lg:px-12">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-14 text-center"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-medium tracking-tight text-[#0B2545]">Interactive Preview</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">Experience a sample of the listing readiness diagnostic live in your browser.</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl shadow-2xl bg-white border border-border/50 p-6 sm:p-10 lg:p-14"
          >
            <ReviewPreview />
          </motion.div>

          <motion.details 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="panel mt-16 text-sm bg-white shadow-sm border border-border rounded-lg overflow-hidden"
          >
            <summary className="cursor-pointer px-6 py-4 font-medium text-[#0B2545] hover:bg-gray-50 transition-colors">
              About this preview
            </summary>
            <div className="flex flex-col gap-4 border-t px-6 py-5 text-sm leading-relaxed text-muted-foreground bg-gray-50/50">
              <p className="max-w-[52em]">
                This page previews the selected ten-item sample
                ({expectedSampleVersion}) for the IBUKA Phase 1
                proof of concept. The selection, prompts, typed
                controls and progress rule are proposals shown for
                review — they are not validated regulatory content,
                and nothing here has been approved.
              </p>
              <p className="max-w-[52em]">
                The sample grew from an earlier four-item preview to
                the current ten items, so progress figures are not
                comparable across that change.
              </p>
              <p className="max-w-[52em]">
                The signed-out preview holds entries in memory only; signed-in
                entries autosave to the assessment database for the
                account&rsquo;s single synthetic company. The progress figure
                is self-reported and is not a regulatory pass/fail result, listing
                eligibility, or approval.
              </p>
            </div>
          </motion.details>
        </div>
      </section>
    </div>
  );
}
