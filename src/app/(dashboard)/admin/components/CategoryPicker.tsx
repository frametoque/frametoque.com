"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

interface CategoryPickerProps {
  categories: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CategoryPicker({
  categories,
  value,
  onChange,
  disabled = false,
  placeholder = "Select categories...",
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position the portal dropdown under the trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(categories.length * 44 + 60, 600);

    if (spaceBelow >= dropdownHeight) {
      // Open downward
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      // Open upward
      setDropdownStyle({
        top: rect.top + window.scrollY - dropdownHeight - 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setOpen((o) => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  const toggle = (cat: string) => {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]);
  };

  const remove = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((c) => c !== cat));
  };

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ ...dropdownStyle, position: "absolute", zIndex: 9999 }}
      className="bg-[#0d0d12] border border-white/15 rounded-xl shadow-2xl overflow-y-auto max-h-[600px]"
    >
      <div className="p-2 border-b border-white/10 flex gap-2">
        <input
          type="text"
          placeholder="New category..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 text-white"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const val = e.currentTarget.value.trim();
              if (val && !value.includes(val)) {
                onChange([...value, val]);
                e.currentTarget.value = "";
              }
            }
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            const val = input.value.trim();
            if (val && !value.includes(val)) {
              onChange([...value, val]);
              input.value = "";
            }
          }}
          className="px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>
      {Array.from(new Set([...categories, ...value])).sort((a, b) => a.localeCompare(b)).map((cat) => {
        const selected = value.includes(cat);
        return (
          <button
            key={cat}
            type="button"
            onMouseDown={(e) => e.preventDefault()} 
            onClick={() => toggle(cat)}
            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors hover:bg-white/10 ${
              selected ? "text-brand-300" : "text-gray-300"
            }`}
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                selected ? "bg-brand-500 border-brand-500" : "border-white/25 bg-white/5"
              }`}
            >
              {selected && (
                <svg viewBox="0 0 10 8" className="w-2.5 h-2.5">
                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {cat}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="w-full min-h-[42px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-brand-500 transition-colors disabled:opacity-50 flex items-center gap-2 flex-wrap text-left"
      >
        {value.length === 0 ? (
          <span className="text-gray-500 text-sm">{placeholder}</span>
        ) : (
          value.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-medium"
            >
              {cat}
              {!disabled && (
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={(e) => remove(cat, e)} />
              )}
            </span>
          ))
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Portal: renders outside any overflow:hidden parent */}
      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </>
  );
}