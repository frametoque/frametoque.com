"use client";

import { useRef, useState, useEffect } from "react";
import {
  Check,
  TrendingUp,
  FileText,
  FileCheck,
  ArrowDownLeft,
  Landmark,
  Users,
  Package,
  UserCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  bullets: string[];
}

export const FRAMEBOOKS_MODULES: FeatureItem[] = [
  {
    icon: TrendingUp,
    title: "Dashboard",
    bullets: [
      "Monitor KPI cards like Total Income and Net Profit.",
      "Visualize Income vs Expenses over time.",
      "Quickly access recent invoices and quotations.",
    ],
  },
  {
    icon: FileText,
    title: "Invoices",
    bullets: [
      "Create, send, and download invoices in seconds.",
      "Track payment statuses like Fully Paid or Overdue.",
      "Highlight overdue dates automatically.",
    ],
  },
  {
    icon: FileCheck,
    title: "Quotations",
    bullets: [
      "Draft and send quotes to potential clients.",
      "Filter by service categories like Web dev or Photography.",
      "Convert accepted quotes into invoices instantly.",
    ],
  },
  {
    icon: ArrowDownLeft,
    title: "Income & Expenses",
    bullets: [
      "Record transactions against clients and accounts.",
      "Tag entries with categories for accurate reporting.",
      "Compare this month to last month at a glance.",
    ],
  },
  {
    icon: Landmark,
    title: "Accounts",
    bullets: [
      "Maintain multiple bank and cash accounts.",
      "Track real-time inflow, outflow, and balances.",
      "Transfer cash between accounts securely.",
    ],
  },
  {
    icon: Users,
    title: "Clients",
    bullets: [
      "Store contact details and track lifetime revenue.",
      "See who your top clients are instantly.",
      "Manage active and inactive client statuses.",
    ],
  },
  {
    icon: Package,
    title: "Inventory",
    bullets: [
      "Maintain an itemized list of your products.",
      "Track available quantities and estimated value.",
      "Exclusive to our Pro Plus plan.",
    ],
  },
  {
    icon: UserCheck,
    title: "Team & Roles",
    bullets: [
      "Invite unlimited team members on higher plans.",
      "Assign fine-grained custom roles and permissions.",
      "Collaborate without sharing passwords.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Security & Logs",
    bullets: [
      "Review comprehensive system audit logs.",
      "Protect accounts with two-factor authentication.",
      "Data is secured with TLS in transit and AES-256 encryption at rest.",
    ],
  },
];

export default function FramebooksFeaturesSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  // Auto-slide effect (cycles smoothly, pauses on hover or user touch)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let timer: NodeJS.Timeout | null = null;
    let isPaused = false;

    const stepSlide = () => {
      if (!el || isPaused) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 15) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const card = el.firstElementChild as HTMLElement;
        const step = card ? card.offsetWidth + 24 : 320;
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    };

    const startTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(stepSlide, 3500);
    };

    const pause = () => {
      isPaused = true;
      if (timer) clearInterval(timer);
    };

    const resume = () => {
      isPaused = false;
      startTimer();
    };

    startTimer();

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });

    return () => {
      if (timer) clearInterval(timer);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, []);

  return (
    <div className="relative group/slider">
      {/* Edge Fades for Clean Visual Integration */}
      <div
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black via-black/60 to-transparent z-10 transition-opacity duration-300 ${
          canScrollLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black via-black/60 to-transparent z-10 transition-opacity duration-300 ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* One Row Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none no-scrollbar cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {FRAMEBOOKS_MODULES.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="w-[280px] sm:w-[320px] min-w-[280px] sm:min-w-[320px] shrink-0 snap-start bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:bg-white/[0.04] group/card flex flex-col justify-between"
            >
              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover/card:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-4 tracking-tight">
                  {feat.title}
                </h4>
                <ul className="space-y-3">
                  {feat.bullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-300 leading-relaxed"
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
