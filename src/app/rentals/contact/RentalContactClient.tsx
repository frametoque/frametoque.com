"use client";

import { motion } from "framer-motion";
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Clock, 
  AlertTriangle 
} from "lucide-react";

export default function RentalContactClient() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mx-auto"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Contact Us
        </h1>
      </motion.div>

      {/* Grid: Direct Contacts & Registration Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* COLUMN 1: Direct Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Quick Contact Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Rental Hotlines &amp; Desk
            </h2>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">WhatsApp</h3>
                  <a
                    href="https://wa.me/94702771361?text=Hi%20Frametoque%20Team%2C%20I'm%20inquiring%20about%20gear%20rental."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-900 hover:text-blue-600 hover:underline text-sm font-semibold"
                  >
                    +94 70 277 1361
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Hotlines</h3>
                  <div className="space-y-0.5 text-xs text-slate-700">
                    <p>+94 70 277 1361</p>
                    <p>+94 75 860 9356</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Email</h3>
                  <a href="mailto:info@frametoque.com" className="text-slate-900 hover:text-blue-600 hover:underline text-xs">
                    info@frametoque.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Operating Hours</h3>
                  <p className="text-xs text-slate-700">
                    Monday – Sunday: 8:00 AM – 9:00 PM
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Pickup Location</h3>
                  <p className="text-xs text-slate-700">
                    35, Kopiwaththa Road, Piliyandala
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="https://wa.me/94702771361?text=Hi%20Frametoque%2C%20I'd%20like%20to%20speak%20to%20a%20camera%20technician."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message on WhatsApp</span>
              </a>
            </div>
          </div>
        </motion.div>

        {/* COLUMN 2: Registration Details & Notes Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
              Details Required for Registration
            </h3>
            <p className="text-xs text-slate-500">
              Please provide below details for Registration before collecting equipment:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 text-xs font-medium pl-0.5">
              <li className="p-2 rounded-xl bg-slate-50 border border-slate-100">Both sides of NIC</li>
              <li className="p-2 rounded-xl bg-slate-50 border border-slate-100">Personal Facebook Profile</li>
              <li className="p-2 rounded-xl bg-slate-50 border border-slate-100">Home contact number</li>
              <li className="p-2 rounded-xl bg-slate-50 border border-slate-100">Home address and location</li>
              <li className="p-2 rounded-xl bg-slate-50 border border-slate-100">Utility bill (Electricity or Telephone) to confirm address</li>
              <li className="p-2 rounded-xl bg-slate-50 border border-slate-100">Facebook page (Need to see your works)</li>
            </ol>
          </div>
        </motion.div>

      </div>

      {/* Important Note (After Cards) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-1.5 text-left max-w-2xl mx-auto shadow-2xs"
      >
        <div className="font-bold text-amber-900 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">Important Note:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-amber-900/90 pl-1">
          <li>You must pay half amount of advance payment to confirm the booking</li>
          <li>Advance payment is non-refundable and that advance payment is not valid for another booking</li>
        </ul>
      </motion.div>

    </div>
  );
}
