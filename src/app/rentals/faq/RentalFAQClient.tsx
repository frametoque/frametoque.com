"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronDown, HelpCircle, Phone } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

interface Section {
  title: string;
  items: FAQItem[];
}

const FAQ_SECTIONS: Section[] = [
  {
    title: "Booking & Availability",
    items: [
      {
        q: "How do I check equipment availability and make a reservation?",
        a: "Browse our catalog on /rentals, select the gear you need, pick your shoot date(s) using the live date checker, and click 'Book via WhatsApp'. Our rental team will instantly confirm availability, reserve the gear, and guide you through the pickup process.",
      },
      {
        q: "How far in advance should I reserve equipment?",
        a: "We recommend reserving at least 2 to 4 days ahead, particularly for weekends and commercial shoot dates when high-demand cameras (e.g. Sony FX3) and cinema prime lenses book out quickly.",
      },
      {
        q: "Can I extend my rental while on shoot?",
        a: "Yes, provided the gear has not already been reserved by another client for the subsequent days. Please notify us via WhatsApp as early as possible so we can confirm the extension and adjust your booking.",
      },
      {
        q: "What is your cancellation policy?",
        a: "Cancellations made at least 24 hours prior to the scheduled pickup time incur no cancellation fees. For late cancellations, please message our desk so we can reschedule your booking for an alternative shoot date.",
      },
    ],
  },
  {
    title: "Registration & Verification Requirements",
    items: [
      {
        q: "What details and documents are required for registration?",
        a: "Please provide the following details for registration: 1. Both sides of NIC, 2. Personal Facebook Profile, 3. Home contact number, 4. Home address and location, 5. Utility bill (Electricity or Telephone) to confirm address, 6. Facebook page (Need to see your works).",
      },
      {
        q: "Do I need to pay an advance payment to confirm my booking?",
        a: "Yes. You must pay half (50%) amount of advance payment to confirm the booking. Note: Advance payment is non-refundable and that advance payment is not valid for another booking.",
      },
      {
        q: "Can registered production companies or agencies rent on corporate terms?",
        a: "Yes. Registered media agencies, corporate production houses, and repeat clients in good standing can be approved for official Purchase Order (PO) or corporate agreement terms.",
      },
    ],
  },
  {
    title: "Pickup, Return & Operating Hours",
    items: [
      {
        q: "Where is pickup and return located?",
        a: "Equipment is collected and returned at 35, Kopiwaththa Road, Piliyandala. Our rental desk operates daily from 8:00 AM to 9:00 PM by appointment.",
      },
      {
        q: "Can I inspect and test the gear before leaving?",
        a: "Absolutely. We encourage all clients to test cameras, sensors, lenses, batteries, and accessories prior to sign-off to ensure complete readiness for your shoot.",
      },
      {
        q: "What defines a 24-hour rental day?",
        a: "A standard 1-day rental covers 24 hours from pickup to return (for example, checkout at 9:00 AM today and return by 9:00 AM the following morning). Flexible pickup windows can be coordinated via WhatsApp.",
      },
      {
        q: "Do you offer location delivery in Colombo?",
        a: "Yes, courier or delivery across Colombo and greater suburbs can be arranged upon request for an additional transit fee.",
      },
    ],
  },
  {
    title: "Gear Condition & Technical Support",
    items: [
      {
        q: "What condition is the equipment in?",
        a: "All equipment is maintained to professional standards. Optical elements are pristine, sensors are cleaned, firmware is updated, and batteries are fully charged prior to handover.",
      },
      {
        q: "What happens if I experience technical issues on set?",
        a: "Our technical team is on standby during your shoot. Message or call our hotline (+94 70 277 1361) and our camera technicians will troubleshoot with you immediately.",
      },
      {
        q: "What happens in case of accidental damage or theft?",
        a: "The renter is responsible for the equipment while in their possession. In the rare event of damage, repair costs evaluated by an authorized service center will be charged. Full terms are outlined in our Rental Agreement.",
      },
    ],
  },
];

export default function RentalFAQClient() {
  // Store expanded item keys as `${sectionIdx}-${itemIdx}`
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({
    "0-0": true,
    "1-0": true,
  });

  const toggleItem = (key: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center max-w-2xl mx-auto space-y-3"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
          <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
          <span>Help &amp; Knowledge Base</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-base text-slate-600 leading-relaxed">
          Clear answers about equipment hire, shoot date availability, verification requirements, security deposits, and gear pickups.
        </p>
      </motion.div>

      {/* FAQ Sections */}
      <div className="space-y-10">
        {FAQ_SECTIONS.map((section, sIdx) => (
          <motion.div
            key={sIdx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.45, delay: sIdx * 0.08 }}
            className="space-y-4"
          >
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-600" />
                <span>{section.title}</span>
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {section.items.length} questions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.map((item, idx) => {
                const key = `${sIdx}-${idx}`;
                const isOpen = expandedKeys[key] ?? false;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.04 }}
                    className={`rounded-2xl border transition-all cursor-pointer bg-white overflow-hidden shadow-xs hover:shadow-md ${
                      isOpen ? "border-brand-300 ring-2 ring-brand-500/10" : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(key)}
                      className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3"
                    >
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-start gap-2 leading-snug">
                        <span className="text-brand-600 font-extrabold text-xs mt-0.5">Q.</span>
                        <span>{item.q}</span>
                      </h3>
                      <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-brand-600 bg-brand-50" : ""}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pl-8 sm:pl-9">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* WhatsApp Help Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-slate-900 to-brand-950 rounded-3xl p-6 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl"
      >
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold">Have a question not covered here?</h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Our camera technicians and rental desk are ready to assist you on WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <a
            href="https://wa.me/94702771361?text=Hi%20Frametoque%2C%20I%20have%20a%20question%20about%20equipment%20rentals."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Ask on WhatsApp</span>
          </a>
          <Link
            href="/rentals/contact"
            className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            Contact Desk
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
