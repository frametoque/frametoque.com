import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Equipment Rental FAQ | Frametoque Digital Media",
  description: "Frequently asked questions about hiring cinema cameras, lenses, lighting, and audio equipment from Frametoque in Sri Lanka. Booking, verification, and deposit info.",
};

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_SECTIONS: { title: string; items: FAQItem[] }[] = [
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

export default function RentalsFAQPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Clear answers about equipment hire, shoot date availability, verification requirements, security deposits, and equipment pickups.
        </p>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-10">
        {FAQ_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="space-y-4">
            <div className="pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2 hover:border-brand-300 transition-colors"
                  >
                    <h3 className="text-sm font-bold text-slate-900 flex items-start gap-2">
                      <span className="text-brand-600 text-xs mt-0.5">Q.</span>
                      <span>{item.q}</span>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed pl-5">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* WhatsApp Help Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-brand-950 rounded-3xl p-8 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-xl font-bold">Have a question not covered here?</h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Our camera technicians and rental desk are ready to assist you on WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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
      </div>

    </div>
  );
}
