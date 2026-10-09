import { useState, useEffect } from "react";
import { ArrowRight, ShieldCheck, Building2, MapPin, Sparkles, Quote } from "lucide-react";

interface LandingPageProps {
  onStartCitizen: () => void;
  onStartAdmin: () => void;
}

// 100% Reliable, verified Indian civic, Swachh Bharat & smart infrastructure imagery
const SWACHH_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1920&q=80",
    tagline: "Swachh Bharat Urban Mission",
    quote: "“Swachhata Hi Seva — Ek Kadam Swachhata Ki Ore. Har gali, har mohalla saaf aur surakshit.”",
    author: "Swachh Bharat Mission (Urban)",
  },
  {
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1920&q=80",
    tagline: "PWD Pothole-Free Smart Roads",
    quote: "“Pothole-free road network aur suvidhajanak aavagaman — Desh ki pragati ki buniyad.”",
    author: "Public Works Department (PWD)",
  },
  {
    image: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1920&q=80",
    tagline: "National Pride & Clean Public Monuments",
    quote: "“Humara Shahar, Humari Zimmedari — Public heritage aur nagar nigam kshetra ki niyamit safai.”",
    author: "Ministry of Housing and Urban Affairs",
  },
  {
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80",
    tagline: "Green Urban Spaces & Waste Segregation",
    quote: "“Zero-waste city aur swachh vatavaran — Jan-Bhagidari se Jan-Kalyan ki ore naya sankalp.”",
    author: "Nagar Nigam Swachhata Grid",
  },
  {
    image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1920&q=80",
    tagline: "24x7 Municipal Water & Drainage Maintenance",
    quote: "“Har Ghar Jal aur tatkal drain grievance redressal — Har nagrik tak pahunche behtar civic suvidha.”",
    author: "Jal Kal Vibhag & Civil Drainage",
  },
];

export default function LandingPage({ onStartCitizen, onStartAdmin }: LandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Automatic Continuous Autoplay Loop (Har 4 seconds me bina rukawat change hoga)
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prevIndex) => (prevIndex + 1) % SWACHH_SLIDES.length);
    }, 4000);

    return () => clearInterval(slideInterval);
  }, []);

  return (
    <div className="space-y-12 pb-8">
      {/* HERO SECTION WITH SMOOTH AUTOPLAY SLIDER */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/70 min-h-[580px] flex items-center justify-center">
        
        {/* Full Frame Background Autoplay Carousel */}
        {SWACHH_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              idx === currentSlide
                ? "opacity-100 scale-100 z-10"
                : "opacity-0 scale-105 pointer-events-none z-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.tagline}
              className="h-full w-full object-cover object-center filter brightness-[0.78] contrast-[1.1]"
              loading={idx === 0 ? "eager" : "lazy"}
            />
            {/* Cinematic Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a111a]/95 via-[#0e1a2b]/60 to-[#0a111a]/40 backdrop-blur-[0.5px]" />
          </div>
        ))}

        {/* Ambient Tiranga Glow Highlights */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#FF9933]/30 blur-3xl pointer-events-none z-20" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#138808]/30 blur-3xl pointer-events-none z-20" />

        {/* Hero Interactive Card Content */}
        <div className="relative z-20 max-w-4xl mx-auto px-6 py-12 text-center text-white space-y-7">
          
          {/* Autoplay Status Indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-[11px] font-extrabold uppercase tracking-widest text-emerald-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Swachh Bharat &amp; Autonomous Municipal Triage Grid</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-white drop-shadow-md">
            Every Civic Issue. <br />
            <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-emerald-300 bg-clip-text text-transparent">
              Understood. Prioritised. Resolved.
            </span>
          </h1>

          {/* Descriptive Content */}
          <p className="text-sm sm:text-base text-slate-200/90 font-medium max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            JANDrishti bridges citizens and municipal authorities. Multimodal AI, spatial boundary matching, aur deterministic safety models ke dwara grievances direct verified field officers ko route hoti hain.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onStartCitizen}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center gap-2 group"
            >
              <span>Report Civic Infrastructure Issue</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={onStartAdmin}
              className="px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-bold text-xs sm:text-sm shadow-md transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Access Municipal Command Hub</span>
            </button>
          </div>

          {/* Dynamic Swachhata Quotes Box synced with current slide */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-left flex items-start gap-3 shadow-lg transition-all duration-500">
              <Quote className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm italic font-semibold text-slate-100">
                  {SWACHH_SLIDES[currentSlide].quote}
                </p>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 mt-1">
                  — {SWACHH_SLIDES[currentSlide].author}
                </p>
              </div>
            </div>
          </div>

          {/* Clean Progress Dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {SWACHH_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentSlide ? "w-8 bg-blue-400" : "w-2 bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* THREE VALUE PROPOSITIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] space-y-2 hover:-translate-y-1 transition duration-200">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm">Multimodal AI Triage</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Free-form Hindi, Hinglish, text aur photo evidence se instant category aur deterministic priority calculation.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] space-y-2 hover:-translate-y-1 transition duration-200">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <MapPin className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm">PostGIS Boundary Routing</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bina kisi jurisdictional confusion ke Nagar Nigam, PWD, ya Cantonment borders ka automatic geospatial mapping.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] space-y-2 hover:-translate-y-1 transition duration-200">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Building2 className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm">Auditable Lifecycle</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Grievance ingestion se lekar junior officer assignment aur verified geotagged resolution tak transparent tracking.
          </p>
        </div>
      </div>
    </div>
  );
}