"use client";

import { useState } from "react";
import { ArrowRight, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { CONTACT } from "@/config/contact";
import type { CareerItem } from "@/app/(dashboard)/admin/actions/careersActions";

export default function CareerRoleCard({ role }: { role: CareerItem }) {
  const [expanded, setExpanded] = useState(false);

  // Compact skill tags (first 3 concise items)
  const skillPills = role.requirements?.slice(0, 3) || [];

  return (
    <div className="group bg-[#0c0c0e] border border-white/10 hover:border-brand-500/40 rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          {/* Metadata Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/10 border border-brand-500/20 text-brand-400">
              {role.department}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-400">
              {role.employment_type}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-1">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              {role.location}
            </span>
          </div>

          {/* Role Title */}
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">
            {role.title}
          </h3>

          {/* Simple, Readable Description */}
          <p className="text-gray-400 text-sm leading-relaxed max-w-2xl mb-4">
            {role.description}
          </p>

          {/* Compact Quick Skills */}
          {skillPills.length > 0 && !expanded && (
            <div className="flex flex-wrap gap-2">
              {skillPills.map((req, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-gray-300 truncate max-w-xs"
                >
                  {req}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Apply CTA Button */}
        <div className="shrink-0 flex items-center md:self-center">
          <a
            href={
              role.apply_url ||
              `mailto:${role.apply_email || CONTACT.emails.careers}?subject=Application%20for%20${encodeURIComponent(
                role.title
              )}%20-%20Frametoque`
            }
            target={role.apply_url ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/20"
          >
            <span>Apply Now</span>
            <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Expandable Section for Detailed Responsibilities & Requirements */}
      {((role.responsibilities && role.responsibilities.length > 0) ||
        (role.requirements && role.requirements.length > 0)) && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
          >
            <span>{expanded ? "Show Less" : "View Full Responsibilities & Skills"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="mt-5 space-y-5 animate-in fade-in duration-200">
              {role.responsibilities && role.responsibilities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-400">
                    Key Responsibilities
                  </p>
                  <div className="space-y-1.5">
                    {role.responsibilities.map((resp, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                        <span className="leading-relaxed">{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {role.requirements && role.requirements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Requirements & Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {role.requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-gray-300"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
