import React from "react";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  className?: string;
}

export function StatCard({ title, value, sub, icon, iconBgColor = "bg-white/5", iconTextColor = "text-white", className = "" }: StatCardProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors min-w-0 ${className}`}>
      {icon && (
        <div className={`p-4 rounded-2xl flex-shrink-0 ${iconBgColor} ${iconTextColor}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-xl font-semibold truncate text-white">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
