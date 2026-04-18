'use client';

import { useState, useEffect, useRef } from 'react';

export default function CurrencyToggle() {
  const [currency, setCurrency] = useState('LKR');
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('preferred_currency');
    if (saved === 'USD' || saved === 'LKR') setCurrency(saved);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (selected: string) => {
    setCurrency(selected);
    setOpen(false);
    localStorage.setItem('preferred_currency', selected);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency: selected } }));
  };

  if (!mounted) return <div className="w-12 h-12 rounded-full invisible" />;

  return (
    <div className="relative" ref={wrapRef}>
      {/* Dropdown */}
      <div
        className={`absolute bottom-full mb-2 right-0 flex flex-col gap-0.5 rounded-3xl p-1.5 min-w-[90px]
          border border-white/10 bg-black/40 backdrop-blur-[60px] shadow-[0_30px_100px_rgba(0,0,0,0.8)]
          transition-all duration-200 origin-bottom-right
          ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {['USD', 'LKR'].map((c) => (
          <button
            key={c}
            onClick={() => select(c)}
            className={`px-3.5 py-2 rounded-3xl text-[13px] font-semibold transition-all duration-150 text-left whitespace-nowrap
              ${currency === c ? 'text-white bg-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            {c === 'USD' ? '$ USD' : '₨ LKR'}
          </button>
        ))}
      </div>

      {/* Orb Button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative w-12 h-12 rounded-full outline-none group
          bg-gradient-to-br from-brand-400 to-brand-700
          border border-white/20
          [box-shadow:0_0_20px_rgba(22,159,228,0.4)]
          flex items-center justify-center overflow-hidden
          transition-transform duration-300 hover:scale-110 active:scale-95"
        title="Toggle currency"
      >
        {/* Scanline effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
        <span className="relative z-10 text-white font-bold text-base leading-none">
          {currency === 'USD' ? '$' : '₨'}
        </span>
      </button>
    </div>
  );
}