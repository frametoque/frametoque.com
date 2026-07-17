'use client';

import { useState, useEffect } from 'react';

export default function CurrencyToggle() {
  const [currency, setCurrency] = useState('LKR');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('preferred_currency');
    if (saved === 'USD' || saved === 'LKR') setCurrency(saved);
  }, []);

  const toggle = () => {
    const next = currency === 'USD' ? 'LKR' : 'USD';
    setCurrency(next);
    localStorage.setItem('preferred_currency', next);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency: next } }));
  };

  if (!mounted) return <div className="w-12 h-12 rounded-full invisible" />;

  return (
    <div className="relative">
      {/* Orb Button */}
      <button
        onClick={toggle}
        className="relative w-12 h-12 rounded-full outline-none group
          bg-gradient-to-br from-brand-400 to-brand-700
          border border-white/20
          [box-shadow:0_0_20px_rgba(22,159,228,0.4)]
          flex items-center justify-center overflow-hidden
          transition-transform duration-300 hover:scale-110 active:scale-95"
        title="Toggle currency (LKR / USD)"
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