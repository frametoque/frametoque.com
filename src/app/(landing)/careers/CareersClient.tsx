"use client";

import { motion } from "framer-motion";
import { Mail, Briefcase } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CONTACT } from "@/config/contact";
import type { CareerItem } from "@/app/(dashboard)/admin/actions/careersActions";
import CareerRoleCard from "./CareerRoleCard";

export default function CareersClient({ openRoles }: { openRoles: CareerItem[] }) {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-brand-500 selection:text-white">
      <Navbar scrolled={true} />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28 px-6 lg:px-16 overflow-hidden">
        {/* Ambient Glow Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[400px] bg-brand-500/15 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,159,228,0.2),rgba(0,0,0,0))]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
            <span className="bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent">
              Join Our{" "}
            </span>
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
              Crew.
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Build the future of digital media, high-performance web engineering, and cinematic productions with us.
          </p>
        </motion.div>
      </section>

      {/* Open Positions Section */}
      <section className="py-20 px-6 lg:px-16 border-t border-white/5 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Open Positions</h2>
            <p className="text-gray-400 text-base">
              Explore currently open roles across our Digital and Productions arms.
            </p>
          </motion.div>

          {openRoles.length > 0 ? (
            <div className="space-y-6">
              {openRoles.map((role, idx) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CareerRoleCard role={role} />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-8 sm:p-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-brand-400">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Specific Roles Open Right Now</h3>
              <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
                We frequently hire for contract, project-based, and permanent roles across web engineering, video editing, and cinematography. Send us your CV and portfolio link anytime.
              </p>

              <a
                href={`mailto:${CONTACT.emails.careers}?subject=Career%20Application%20-%20Frametoque`}
                className="inline-flex items-center px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/20"
              >
                <Mail className="mr-2 w-4 h-4" />
                <span>Send Your Portfolio to {CONTACT.emails.careers}</span>
              </a>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
