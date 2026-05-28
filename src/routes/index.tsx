import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { 
  Sun, Moon, Search, SlidersHorizontal, Check, HelpCircle, Star, 
  Github, Linkedin, Mail, ArrowRight, Building2, Shield, Users, 
  Layers, Zap, CheckCircle2, Phone, Calendar, IndianRupee, Sparkles, MessageSquare
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gharpayy Arena — Smart Co-Living & Rental Operations" },
      { name: "description", content: "Experience next-generation rental housing. Explore live locations, schedule visits, and experience the power of the Arena operational dashboard." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { properties, addLead } = useApp();
  
  // Theme state & toggler (runs purely in client-side effect to avoid hydration mismatch)
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const activeDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
      setIsDark(activeDark);
      if (activeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof window !== "undefined") {
      if (nextDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    }
  };

  // Property filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("All");
  const [maxPrice, setMaxPrice] = useState(16000);

  // Areas extraction
  const areas = useMemo(() => {
    const list = new Set(properties.map((p) => p.area));
    return ["All", ...Array.from(list)];
  }, [properties]);

  // Filtered properties list
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.area.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea = selectedArea === "All" || p.area.toLowerCase() === selectedArea.toLowerCase();
      const matchesPrice = p.pricePerBed <= maxPrice;
      return matchesSearch && matchesArea && matchesPrice;
    });
  }, [properties, searchQuery, selectedArea, maxPrice]);

  // Form states
  const contactFormRef = useRef<HTMLDivElement>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredArea: "",
    preferredProperty: "",
    moveInDate: "",
    budget: 13000,
  });

  // Filter properties in form dropdown based on selected area
  const formPropertiesList = useMemo(() => {
    if (!formData.preferredArea) return [];
    return properties.filter((p) => p.area.toLowerCase() === formData.preferredArea.toLowerCase());
  }, [properties, formData.preferredArea]);

  // Autofill preferred area and property from property cards
  const handleInquireProperty = (propName: string, propArea: string, propPrice: number) => {
    setFormData((prev) => ({
      ...prev,
      preferredArea: propArea,
      preferredProperty: propName,
      budget: propPrice,
    }));
    
    // Smooth scroll to form
    contactFormRef.current?.scrollIntoView({ behavior: "smooth" });
    toast.info(`Pre-filled form for ${propName}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Reset preferred property if area changes
      if (name === "preferredArea") {
        next.preferredProperty = "";
      }
      return next;
    });
    
    // Clear field error
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters.";
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formData.phone.trim() || !/^\+?[0-9]{10,12}$/.test(formData.phone.replace(/[\s-]/g, ""))) {
      errors.phone = "Enter a valid phone number (10-12 digits).";
    }
    if (!formData.preferredArea) {
      errors.preferredArea = "Please select an area.";
    }
    if (!formData.preferredProperty) {
      errors.preferredProperty = "Please select a property.";
    }
    if (!formData.moveInDate) {
      errors.moveInDate = "Select a preferred move-in date.";
    } else {
      const selectedDate = new Date(formData.moveInDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.moveInDate = "Move-in date cannot be in the past.";
      }
    }
    if (!formData.budget || formData.budget <= 5000) {
      errors.budget = "Monthly budget must be greater than ₹5,000.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsFormLoading(true);
    // Simulate API registration delay
    setTimeout(() => {
      addLead({
        name: formData.name,
        phone: formData.phone,
        budget: Number(formData.budget),
        preferredArea: formData.preferredArea,
        moveInDate: formData.moveInDate,
        source: "Public Landing Page",
        tags: ["landing-page-lead", formData.preferredArea.toLowerCase()],
      });

      setIsFormLoading(false);
      setFormSubmitted(true);
      toast.success("Visit scheduled! Check the Arena Dashboard to see your live lead.", {
        duration: 5000,
      });
    }, 1200);
  };

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: "What is the Gharpayy Arena Platform?",
      a: "Gharpayy Arena is our proprietary, real-time operating command center that integrates lead management, tour scheduling, tenant follow-ups, and property owner feedback into a single fluid pipeline. It ensures lead response times remain under 12 minutes.",
    },
    {
      q: "What amenities are included in the monthly rent?",
      a: "Our fully managed rental rooms include high-speed Wi-Fi, daily housekeeping, 24/7 power backup, professional security, hot water, and access to dynamic community common spaces. Utilities like gas and water are fully managed.",
    },
    {
      q: "How does the tour scheduling system work?",
      a: "When you request a visit via the form, our Flow Ops team immediately validates the request and routes it to the designated Tenant Closing Manager (TCM) in your area. They will coordinate a WhatsApp-confirmed walk-through within hours.",
    },
    {
      q: "Are the property status updates real-time?",
      a: "Yes. Every room's availability, vacant beds, and inventory pressure metrics are synced live between property owners and the ops team. Clicking 'Launch Dashboard' lets you view this active tracking dashboard.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">Gharpayy</span>
              <span className="ml-1.5 rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent uppercase tracking-wider">Arena</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#locations" className="hover:text-foreground transition-colors">Live Locations</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
          </nav>

          <div className="flex items-center gap-3">
            {mounted && (
              <button 
                onClick={toggleTheme}
                className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            <Link 
              to="/dashboard" 
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity gap-1.5 shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Launch Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent font-display">
                <Sparkles className="h-3.5 w-3.5" />
                Next-Gen Co-living Operating System
              </div>
              
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1]">
                Find your perfect home in <span className="bg-gradient-to-r from-accent to-orange-500 bg-clip-text text-transparent">Bangalore</span>
              </h1>
              
              <p className="max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-muted-foreground font-sans">
                Experience premium, fully managed rental spaces built around transparency. Book tours instantly, get matched in seconds, and track real-time occupancy updates.
              </p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <a 
                  href="#locations"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity shadow-lg shadow-accent/25"
                >
                  Explore Rooms
                </a>
                <Link 
                  to="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-sm font-semibold hover:bg-muted transition-colors gap-2"
                >
                  Enter Command Center
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Glassmorphic Mockup Container */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-lg lg:max-w-none rounded-2xl border border-border/80 bg-card/60 p-4 shadow-2xl backdrop-blur-md group hover:border-accent/40 transition-colors duration-500">
                <div className="absolute -top-3 -right-3 rounded-lg bg-accent p-2 text-accent-foreground shadow-md animate-bounce">
                  <Zap className="h-4 w-4" />
                </div>
                
                <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-destructive" />
                    <span className="h-3 w-3 rounded-full bg-warning" />
                    <span className="h-3 w-3 rounded-full bg-success" />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">arena-metrics-live</span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border/50 bg-background/50 p-4 hover:bg-background/80 transition-colors">
                    <div className="text-xs text-muted-foreground">Closed MRR Growth</div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div className="font-display text-2xl font-bold text-foreground">₹52,40,000</div>
                      <div className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success font-mono">+18% MoM</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Response</div>
                      <div className="font-display text-lg font-bold text-foreground mt-0.5">4.2 Minutes</div>
                      <div className="text-[9px] text-accent mt-0.5">TCM Team Limit</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Occupancy</div>
                      <div className="font-display text-lg font-bold text-foreground mt-0.5">91.2%</div>
                      <div className="text-[9px] text-success mt-0.5">High Demand</div>
                    </div>
                  </div>

                  {/* Micro list preview */}
                  <div className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>Active Operations Queue</span>
                      <span className="font-mono text-accent">live tracking</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs rounded-md bg-card/80 p-2 border border-border/30">
                        <span className="font-medium">Karthik R.</span>
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] text-accent font-semibold">TCM Assigned</span>
                      </div>
                      <div className="flex items-center justify-between text-xs rounded-md bg-card/80 p-2 border border-border/30">
                        <span className="font-medium">Ananya G.</span>
                        <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[9px] text-warning-foreground font-semibold">Negotiating</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust & Stats Section */}
      <section id="features" className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            
            <div className="text-center md:text-left space-y-1">
              <div className="font-display text-3xl font-bold text-accent sm:text-4xl">3.4x</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tour Conversion Rate</div>
            </div>

            <div className="text-center md:text-left space-y-1">
              <div className="font-display text-3xl font-bold text-accent sm:text-4xl">₹52L+</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closed MRR</div>
            </div>

            <div className="text-center md:text-left space-y-1">
              <div className="font-display text-3xl font-bold text-accent sm:text-4xl">&lt; 12m</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Response Time</div>
            </div>

            <div className="text-center md:text-left space-y-1">
              <div className="font-display text-3xl font-bold text-accent sm:text-4xl">98.4%</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tour SLA Compliance</div>
            </div>

          </div>
        </div>
      </section>

      {/* Properties Filter Section */}
      <section id="locations" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Explore Available Properties
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Search by area or browse available co-living slots. Fill details on the card to pre-fill our tour inquiry form instantly.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search areas or locations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-accent"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Area pills */}
              <div className="flex flex-wrap gap-1.5">
                {areas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      (area === "All" && selectedArea === "All") || selectedArea.toLowerCase() === area.toLowerCase()
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              {/* Price slider */}
              <div className="flex items-center gap-2 border-l border-border pl-3 min-w-[200px]">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Budget: ₹{maxPrice.toLocaleString()}</span>
                <input 
                  type="range" 
                  min="9000" 
                  max="16000" 
                  step="500" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((p) => {
              const bedsPercent = Math.round(((p.totalBeds - p.vacantBeds) / p.totalBeds) * 100);
              const pressureColor = p.vacantBeds <= 3 ? "text-destructive" : "text-success";
              const pressureBg = p.vacantBeds <= 3 ? "bg-destructive/10" : "bg-success/10";
              return (
                <div 
                  key={p.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl hover:border-accent/40 transition-all duration-300 group"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {p.area}
                        </span>
                        <h3 className="font-display font-bold text-lg mt-2 text-foreground group-hover:text-accent transition-colors duration-300">
                          {p.name}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-extrabold text-accent text-lg">₹{p.pricePerBed.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">/bed/mo</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Availability Status</span>
                        <span className="font-semibold">{p.vacantBeds} vacant of {p.totalBeds} beds</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-accent transition-all duration-500" 
                          style={{ width: `${bedsPercent}%` }} 
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Occupancy Rate</span>
                      <span className="font-mono font-medium">{bedsPercent}% filled</span>
                    </div>
                  </div>

                  <div className="border-t border-border bg-muted/20 px-5 py-4 flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-[10px] font-semibold ${pressureBg} ${pressureColor}`}>
                      {p.vacantBeds <= 3 ? "High Demand" : "Rooms Available"}
                    </span>
                    <button
                      onClick={() => handleInquireProperty(p.name, p.area, p.pricePerBed)}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-accent px-4 text-xs font-semibold text-accent-foreground hover:opacity-90 transition-opacity gap-1"
                    >
                      Inquire Now
                    </button>
                  </div>
                </div>
              );
            })}
            
            {filteredProperties.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                No properties found matching your filters. Try resetting the filters.
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Inquiry Form Section */}
      <section ref={contactFormRef} className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-10 shadow-xl space-y-8">
            
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent mb-2">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Schedule a Visit</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Fill out the details below. Submitting this form instantly routes a lead into our operations dashboard.
              </p>
            </div>

            {formSubmitted ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-success/20 p-3 text-success">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">Inquiry Registered Successfully!</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  A new lead was successfully injected into the Zustand store and assigned to a TCM agent. Click "Launch Dashboard" to see it in real-time.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button 
                    onClick={() => setFormSubmitted(false)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold hover:bg-muted transition-colors"
                  >
                    Register another lead
                  </button>
                  <Link 
                    to="/dashboard" 
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-xs font-semibold text-accent-foreground hover:opacity-90 transition-opacity gap-1"
                  >
                    View in Dashboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Full Name</label>
                    <input 
                      type="text" 
                      id="name"
                      name="name" 
                      placeholder="e.g. Abhishek Kumar"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${formErrors.name ? 'border-destructive' : 'border-border'} bg-background p-2.5 text-sm outline-none focus:border-accent`}
                    />
                    {formErrors.name && <p className="text-[10px] text-destructive">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email Address</label>
                    <input 
                      type="email" 
                      id="email"
                      name="email" 
                      placeholder="abhishek@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${formErrors.email ? 'border-destructive' : 'border-border'} bg-background p-2.5 text-sm outline-none focus:border-accent`}
                    />
                    {formErrors.email && <p className="text-[10px] text-destructive">{formErrors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="tel" 
                        id="phone"
                        name="phone" 
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.phone ? 'border-destructive' : 'border-border'} bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent`}
                      />
                    </div>
                    {formErrors.phone && <p className="text-[10px] text-destructive">{formErrors.phone}</p>}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="preferredArea" className="text-xs font-semibold text-muted-foreground">Preferred Area</label>
                    <select 
                      id="preferredArea"
                      name="preferredArea"
                      value={formData.preferredArea}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${formErrors.preferredArea ? 'border-destructive' : 'border-border'} bg-background p-2.5 text-sm outline-none focus:border-accent`}
                    >
                      <option value="">Select location...</option>
                      {areas.filter((a) => a !== "All").map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                    {formErrors.preferredArea && <p className="text-[10px] text-destructive">{formErrors.preferredArea}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="preferredProperty" className="text-xs font-semibold text-muted-foreground">Preferred Property</label>
                    <select 
                      id="preferredProperty"
                      name="preferredProperty"
                      value={formData.preferredProperty}
                      disabled={!formData.preferredArea}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${formErrors.preferredProperty ? 'border-destructive' : 'border-border'} bg-background p-2.5 text-sm outline-none focus:border-accent disabled:opacity-50`}
                    >
                      <option value="">Select property...</option>
                      {formPropertiesList.map((p) => (
                        <option key={p.id} value={p.name}>{p.name} (₹{p.pricePerBed.toLocaleString()}/bed)</option>
                      ))}
                    </select>
                    {formErrors.preferredProperty && <p className="text-[10px] text-destructive">{formErrors.preferredProperty}</p>}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="moveInDate" className="text-xs font-semibold text-muted-foreground">Move-in Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input 
                        type="date" 
                        id="moveInDate"
                        name="moveInDate" 
                        value={formData.moveInDate}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border ${formErrors.moveInDate ? 'border-destructive' : 'border-border'} bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent`}
                      />
                    </div>
                    {formErrors.moveInDate && <p className="text-[10px] text-destructive">{formErrors.moveInDate}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="budget" className="text-xs font-semibold text-muted-foreground flex justify-between">
                    <span>Monthly Rent Budget (₹)</span>
                    <span className="font-mono text-accent font-semibold">₹{formData.budget.toLocaleString()}</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="number" 
                      id="budget"
                      name="budget" 
                      min="5000"
                      max="20000"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border ${formErrors.budget ? 'border-destructive' : 'border-border'} bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent`}
                    />
                  </div>
                  {formErrors.budget && <p className="text-[10px] text-destructive">{formErrors.budget}</p>}
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isFormLoading}
                    className="w-full inline-flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
                  >
                    {isFormLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                    ) : (
                      "Register Visit Request"
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faq" className="py-20 border-t border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
            <p className="text-sm text-muted-foreground">Everything you need to know about the Gharpayy housing network.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
            {faqData.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="group">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left font-medium text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-display font-semibold group-hover:text-accent transition-colors">{faq.q}</span>
                    <HelpCircle className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="border-t border-border bg-muted/10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">What Our Operators & Residents Say</h2>
            <p className="text-sm text-muted-foreground">Hear how the Arena Command Center changes the rental experience.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex gap-0.5 text-accent">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "Finding a managed rental room in Koramangala was incredibly easy. I registered on the site and within 10 minutes a TCM scheduled a walkthrough. Moved in 3 days later!"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent text-xs">
                  KR
                </div>
                <div>
                  <h4 className="text-xs font-semibold">Karthik R.</h4>
                  <span className="text-[10px] text-muted-foreground">Koramangala Resident</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex gap-0.5 text-accent">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "Arena solved all our routing bottlenecks. We assign and contact leads in under 3 minutes now. It's a game-changer for student and professional co-living operations."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-info/20 flex items-center justify-center font-bold text-info text-xs">
                  FO
                </div>
                <div>
                  <h4 className="text-xs font-semibold">Sarah Jenkins</h4>
                  <span className="text-[10px] text-muted-foreground">Flow Ops Lead</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex gap-0.5 text-accent">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "The mobile post-visit checklist and real-time block approvals are incredibly useful. I can coordinate with property owners directly from my phone while showing the rooms."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-success/20 flex items-center justify-center font-bold text-success text-xs">
                  AM
                </div>
                <div>
                  <h4 className="text-xs font-semibold">Aarav Mehta</h4>
                  <span className="text-[10px] text-muted-foreground">Tenant Closing Manager</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-md">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <span className="font-display font-bold text-foreground">Gharpayy</span>
                <span className="ml-1.5 rounded bg-accent/15 px-1 py-0.5 font-mono text-[9px] font-semibold text-accent uppercase tracking-wider">Arena</span>
              </div>
            </div>
            
            {/* Personal Branding Block */}
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 max-w-sm space-y-1.5 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enhanced Assignment Submission</div>
              <p className="text-xs font-medium text-foreground">
                Assignment enhanced and submitted by <span className="text-accent font-semibold">Abhishek Kumar</span>
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
                  <Github className="h-4 w-4" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="mailto:abhishek@example.com" className="text-muted-foreground hover:text-foreground transition-colors" title="Email">
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/80 pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Gharpayy Tech. Co-Living Platform Assignment Demo.</p>
            <div className="flex justify-center gap-4">
              <Link to="/dashboard" className="hover:text-accent font-semibold transition-colors">Launch Admin Portal</Link>
              <span>&middot;</span>
              <a href="#locations" className="hover:text-foreground transition-colors">Browse Rooms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
