'use client';
import { useState, useEffect } from 'react';
import CurrencyToggle from './Currencytoggle';
import AIChatbot from './AIChatbot';

export default function FloatingButtons() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
      style={{ visibility: mounted ? 'visible' : 'hidden' }}
    >
      <CurrencyToggle />
      <AIChatbot />
    </div>
  );
}