import type { Metadata } from "next";
import Link from "next/link";
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  MessageCircle, 
  Clock, 
  Lock, 
  RotateCcw 
} from "lucide-react";

export const metadata: Metadata = {
  title: "Equipment Rental Terms & Conditions | Frametoque Digital Media",
  description: "Standard terms and conditions for equipment hire from Frametoque Digital Media in Sri Lanka. Rental period, security deposit, inspection, liability, and care policies.",
};

export default function RentalsTermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-200 pb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Equipment Rental Terms &amp; Conditions
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          Effective as of November 2026. These terms govern the hire of cameras, lenses, lighting, audio equipment, and production accessories from Frametoque Digital Media.
        </p>
      </div>

      {/* Content Blocks */}
      <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
        
        {/* Section 1 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs">01</span>
            <h2>Agreement &amp; Parties</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            This Equipment Rental Agreement is entered into between <strong>Frametoque Digital Media</strong> (&quot;Owner&quot;) and the individual or entity specified in the rental checkout confirmation (&quot;Renter&quot;). By receiving and signing out any equipment, the Renter agrees to be bound by these terms in full.
          </p>
        </div>

        {/* Section 2 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs">02</span>
            <h2>Rental Period &amp; Rates</h2>
          </div>
          <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc list-inside">
            <li><strong>24-Hour Day Rate:</strong> The daily rate covers a 24-hour window from the scheduled pickup time. Any fraction of a 24-hour period beyond the agreed grace period will be billed as an additional rental day.</li>
            <li><strong>Timely Return:</strong> Equipment must be returned to Frametoque by the designated return time. If a delay is anticipated, the Renter must inform Frametoque at least 4 hours in advance.</li>
            <li><strong>Late Charges:</strong> Unauthorized late returns will incur a late fee equivalent to the full daily rate for each day or portion thereof until returned.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs">03</span>
            <h2>Registration Requirements &amp; Advance Payment</h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-600">
            <p className="font-semibold text-slate-800">
              Please provide below details for Registration prior to equipment sign-out:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Both sides of NIC</li>
              <li>Personal Facebook Profile</li>
              <li>Home contact number</li>
              <li>Home address and location</li>
              <li>Utility bill (Electricity or Telephone) to confirm address</li>
              <li>Facebook page (Need to see your works)</li>
            </ol>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-2 text-xs sm:text-sm">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Advance Payment Policy (Mandatory)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-900/90 pl-1">
              <li><strong>Advance Amount:</strong> You must pay half (50%) amount of advance payment to confirm the booking.</li>
              <li><strong>Non-Refundable:</strong> Advance payment is strictly non-refundable and that advance payment is not valid or transferable for another booking.</li>
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            Frametoque reserves the right to decline rental service if identity or address verification cannot be satisfactorily completed.
          </p>
        </div>

        {/* Section 4 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs">04</span>
            <h2>Inspection &amp; Condition of Equipment</h2>
          </div>
          <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc list-inside">
            <li><strong>Pre-Handover Check:</strong> The Renter acknowledges receipt of the equipment in good, operational condition with all included accessories (batteries, caps, chargers, cables, and cases) as documented on the checkout form.</li>
            <li><strong>Testing Opportunity:</strong> The Renter has the right and responsibility to test all cameras, sensors, and optical elements before sign-off.</li>
          </ul>
        </div>

        {/* Section 5 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs">05</span>
            <h2>Loss, Damage &amp; Liability</h2>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs sm:text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Renter Responsibility</span>
            </div>
            <p>
              The Renter assumes full financial responsibility for any loss, theft, water damage, sand/dust ingress, or physical breakage occurring between checkout and return.
            </p>
          </div>
          <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc list-inside pt-2">
            <li><strong>Repair Costs:</strong> If equipment is damaged, the Renter agrees to reimburse the Owner for authorized repair costs, replacement parts, and rental revenue lost during repair downtime.</li>
            <li><strong>Total Loss:</strong> In the event of total destruction or theft, the Renter will pay the prevailing market replacement value of equivalent new equipment.</li>
            <li><strong>Prohibited Environments:</strong> Equipment must not be used underwater without certified waterproof housings, in active chemical zones, or subjected to extreme weather without adequate protective rain covers.</li>
          </ul>
        </div>

        {/* Section 6 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs">06</span>
            <h2>Subleasing &amp; Transfer</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            The Renter shall not sublease, loan, or surrender possession of any equipment to any third party without explicit prior written authorization from Frametoque. The gear remains the exclusive property of Frametoque Digital Media at all times.
          </p>
        </div>

        {/* Section 7 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
            <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs">07</span>
            <h2>Governing Law &amp; Jurisdiction</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            This agreement is governed by the laws of the Democratic Socialist Republic of Sri Lanka. Any disputes arising in connection with this agreement shall be subject to the exclusive jurisdiction of the courts of Colombo.
          </p>
        </div>

      </div>

      {/* Support Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-100 border border-slate-200 text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 mb-1">Need clarification on any rental terms?</h3>
          <p className="text-xs text-slate-500">Contact our rental desk prior to booking your gear.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://wa.me/94702771361?text=Hi%20Frametoque%2C%20I%20have%20a%20question%20regarding%20rental%20terms."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Us</span>
          </a>
          <Link
            href="/rentals/contact"
            className="px-4 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            Contact Desk
          </Link>
        </div>
      </div>

    </div>
  );
}
