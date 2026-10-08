import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

const TYPEWRITER_PHRASES = [
  "list on the Nairobi Securities Exchange.",
  "transition to the public markets.",
  "meet NSE regulatory requirements.",
  "attract institutional investors."
];

function TypewriterEffect({ texts }: { texts: string[] }) {
  const [textIndex, setTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const typingSpeed = 60;
    const deletingSpeed = 30;
    const pauseBeforeDelete = 2500;
    const pauseBeforeType = 400;

    const currentFullText = texts[textIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayedText === currentFullText) {
      timer = setTimeout(() => setIsDeleting(true), pauseBeforeDelete);
    } else if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % texts.length);
      timer = setTimeout(() => {}, pauseBeforeType);
    } else {
      const nextText = isDeleting 
        ? currentFullText.substring(0, displayedText.length - 1)
        : currentFullText.substring(0, displayedText.length + 1);

      timer = setTimeout(() => {
        setDisplayedText(nextText);
      }, isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, textIndex, texts]);

  return (
    <span className="text-[#0A7A53]">
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className="inline-block w-[3px] h-[0.9em] bg-[#C9962B] ml-1 align-middle -translate-y-[2px]"
      />
    </span>
  );
}

interface LandingPageProps {
  authPhase?: string;
  setSignInOpen?: (open: boolean) => void;
  expectedSampleVersion?: string;
}

export function LandingPage(_props: LandingPageProps) {
  const handleStartAssessment = () => {
    window.location.href = "https://cmpkenya.co.ke/workspace";
  };

  return (
    <div className="w-full bg-[#F3F6F9] flex flex-col items-center">
      
      {/* 1. WHAT CMP IS (HERO SECTION) */}
      <section className="relative w-full overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-32 bg-white border-b border-border">
        {/* Subtle decorative accent */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#E8F3EF] to-transparent rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 mx-auto w-full max-w-[90rem] px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Column */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col gap-8 text-left max-w-2xl"
            >
              <div className="min-h-[14rem] sm:min-h-[12rem] lg:min-h-[16rem]">
                <h1 className="font-heading text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-[#0B2545] mb-6 leading-[1.15]">
                  Check how ready your company is to <br className="hidden sm:block" />
                  <TypewriterEffect texts={TYPEWRITER_PHRASES} />
                </h1>
                
                <p className="text-lg lg:text-xl text-[#4A5568] leading-relaxed">
                  Complete a short self-assessment and see where your company stands against the listing requirements.
                </p>
              </div>

              {/* Main Action High Up */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
                <Button 
                  size="lg" 
                  className="h-14 px-8 text-lg bg-[#0A7A53] hover:bg-[#086244] text-white font-semibold transition-all hover:-translate-y-0.5 shadow-lg shadow-[#0A7A53]/20 w-full sm:w-auto" 
                  onClick={handleStartAssessment}
                >
                  Start Assessment
                </Button>
              </div>
            </motion.div>

            {/* Right Column: Clearly Labelled Product Mock */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* "Example only" label over the mockup */}
              <div className="absolute -top-4 -right-4 bg-[#C9962B] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full z-30 shadow-md">
                Example only
              </div>

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
                      { name: "Company details", status: "Complete", color: "bg-[#0A7A53]", text: "text-[#0A7A53]", bg: "bg-[#E8F3EF]" },
                      { name: "Financial position", status: "In Progress", color: "bg-[#C9962B]", text: "text-[#C9962B]", bg: "bg-[#FCF7EB]" },
                      { name: "Business model", status: "Review", color: "bg-[#5CC49A]", text: "text-[#5CC49A]", bg: "bg-[#EEF9F5]" },
                      { name: "Risks & governance", status: "Not Started", color: "bg-[#4A5568]", text: "text-[#4A5568]", bg: "bg-[#F3F6F9]" }
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
              </div>
              
              {/* Decorative overlay indicator */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-border flex items-center gap-3 z-20"
              >
                <div className="w-8 h-8 rounded-full bg-[#EEF9F5] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#5CC49A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-sm font-medium text-[#0B2545]">
                  Track readiness in real-time
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. WHO IT HELPS */}
      <section className="w-full max-w-[90rem] mx-auto px-6 lg:px-12 py-24 bg-[#F3F6F9] flex justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-50px" }}
          className="bg-white p-10 rounded-2xl shadow-sm border border-border flex flex-col max-w-4xl text-center items-center"
        >
          <div className="w-14 h-14 rounded-xl bg-[#0B2545] text-white flex items-center justify-center mb-6">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h2 className="font-heading text-2xl font-bold text-[#0B2545] mb-4">Who this helps</h2>
          <p className="text-[#4A5568] leading-relaxed text-lg">
            This toolkit serves founders, boards, and finance teams considering a listing on the Nairobi Securities Exchange (NSE) through the Main Investment Market Segment (MIMS) or the Growth Enterprise Market Segment (GEMS).
          </p>
          <div className="mt-6 px-4 py-2 bg-[#F3F6F9] rounded border border-border">
            <p className="text-xs text-[#4A5568] italic">
              * Note for review: Audience description is subject to confirmation with Trevor.
            </p>
          </div>
        </motion.div>
      </section>

      {/* 3. ASSESSMENT AREAS */}
      <section className="w-full bg-white border-y border-border py-24">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[#0B2545] font-heading text-3xl lg:text-4xl font-bold mb-4 tracking-tight">
              Assessment areas
            </h2>
          </div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
          >
            {[
              {
                title: "Company details",
                desc: "Review your corporate structure, incorporation status, and foundational details."
              },
              {
                title: "Financial position and history",
                desc: "Evaluate your financial health, historical audits, and reporting capabilities."
              },
              {
                title: "Business model and revenue",
                desc: "Assess your operational metrics, market position, and revenue generation."
              },
              {
                title: "Risks, outlook and governance",
                desc: "Identify key risks, forward-looking strategies, and board compliance."
              }
            ].map((domain, i) => (
              <motion.div 
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                }}
                className="bg-[#F3F6F9] p-8 rounded-2xl border border-transparent hover:border-border transition-colors flex flex-col justify-center"
              >
                <h3 className="font-heading text-xl font-bold text-[#0B2545] mb-2">
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

      {/* 4. HOW IT WORKS */}
      <section className="w-full bg-[#0B2545] text-white py-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>

        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 relative z-10">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-12 tracking-tight">How it works</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: "1", title: "Answer Questions", desc: "Work systematically through structured diagnostic questions based on listing requirements." },
              { step: "2", title: "Track Progress", desc: "Your entries autosave. Collaborate with your team as you gather documentation." },
              { step: "3", title: "See Your Status", desc: "View an instantly updated readiness score as you complete each core domain." }
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

      {/* 5. WHAT USERS RECEIVE */}
      <section className="w-full bg-white py-24">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#C9962B] text-white flex items-center justify-center mb-8 shadow-lg shadow-[#C9962B]/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <h2 className="text-[#0B2545] font-heading text-3xl lg:text-4xl font-bold mb-6 tracking-tight">
            What you receive
          </h2>
          <p className="text-lg md:text-xl text-[#4A5568] leading-relaxed max-w-3xl mb-8">
            Upon completing the diagnostic, you receive a clear view of your listing readiness. You will see an overall completion score alongside a status breakdown for each of the four assessment domains, helping you identify areas requiring attention before formal underwriter engagement.
          </p>
        </div>
      </section>

      {/* 6. START ASSESSMENT & DISCLAIMER */}
      <section className="w-full bg-[#F3F6F9] py-24 border-t border-border">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 text-center flex flex-col items-center">
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl bg-[#0A7A53] hover:bg-[#086244] text-white font-bold mb-6 shadow-xl shadow-[#0A7A53]/20 transition-all hover:-translate-y-1" 
            onClick={handleStartAssessment}
          >
            Start Assessment
          </Button>
          
          <div className="max-w-2xl mx-auto p-5 bg-white rounded-xl border border-border text-sm leading-relaxed text-[#4A5568] text-center shadow-sm">
            <strong>Important:</strong> This tool provides an indicative self-assessment. The progress figure is a self-reported metric and does not constitute an approval, a regulatory opinion, or a guarantee of listing.
          </div>
        </div>
      </section>

      {/* 7. FOOTER & FAQS */}
      <footer className="w-full bg-[#0B2545] text-white pt-20 pb-10 border-t border-[#1a3a60]">
        <div className="max-w-[90rem] mx-auto px-6 lg:px-12">
          {/* FAQs section within footer area */}
          <div className="mb-16 border-b border-[#1a3a60] pb-16">
            <h3 className="font-heading text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h3>
            <div className="grid md:grid-cols-3 gap-8 text-sm">
              <div>
                <h4 className="font-bold mb-2 text-[#C9962B]">Who should fill this out?</h4>
                <p className="text-gray-300">It is best completed collaboratively by the company's founders, board members, and executive finance team.</p>
              </div>
              <div>
                <h4 className="font-bold mb-2 text-[#C9962B]">Is my data secure?</h4>
                <p className="text-gray-300">Yes, the assessment runs in a secure, private workspace dedicated solely to your organization.</p>
              </div>
              <div>
                <h4 className="font-bold mb-2 text-[#C9962B]">What happens after I finish?</h4>
                <p className="text-gray-300">You can use your resulting score and domain breakdown to guide your internal preparation and conversations with advisors.</p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Data Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Support Contact</a>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Nairobi Securities Exchange (NSE)</a>
              <a href="#" className="hover:text-white transition-colors">Capital Markets Authority (CMA)</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
