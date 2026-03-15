'use client';

import { useState, useEffect } from 'react';

export default function CurrencyToggle() {
  const [currency, setCurrency] = useState('LKR');
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('preferred_currency');
    if (saved === 'USD' || saved === 'LKR') {
      setCurrency(saved);
    }
  }, []);

  const select = (selected) => {
    setCurrency(selected);
    setOpen(false);
    localStorage.setItem('preferred_currency', selected);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency: selected } }));
  };

  if (!mounted) {
    return (
      <div className="w-[65px] h-[65px] rounded-lg invisible" />
    );
  }

  return (
    <div className="relative">
      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 flex flex-col gap-1 rounded-xl px-2 py-2 shadow-xl min-w-full bg-[rgba(12,25,55,0.95)] border border-brand-500/20 [box-shadow:0_8px_32px_rgba(2,12,45,0.4),0_0_0_1px_rgba(255,255,255,0.08),0_0_25px_rgba(59,130,246,0.15)]"
        >
          {['USD', 'LKR'].map((c) => (
            <button
              key={c}
              onClick={() => select(c)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-left whitespace-nowrap ${
                currency === c
                  ? 'text-white bg-white/10'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {c === 'USD' ? '$ USD' : '₨ LKR'}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-[65px] h-[65px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-xl bg-[rgba(12,25,55,0.8)] border border-brand-500/20 [box-shadow:0_8px_32px_rgba(2,12,45,0.4),0_0_0_1px_rgba(255,255,255,0.08),0_0_25px_rgba(59,130,246,0.15)]"
      >
        <span className="text-brand-500 text-base font-bold leading-none">
          {currency === 'USD' ? '$' : '₨'}
        </span>
      </button>
    </div>
  );
}