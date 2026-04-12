'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import CurrencyToggle from './Currencytoggle';
import AIChatbot from './AIChatbot';

export default function FloatingButtons() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const hideAll = ['/login', '/register', '/404', '/projects/photography'].includes(pathname);

  const showCurrency = pathname === '/services' || pathname.startsWith('/dashboard/');

  if (hideAll) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
      style={{ visibility: mounted ? 'visible' : 'hidden' }}
    >
      {showCurrency && <CurrencyToggle />}
      <AIChatbot />
    </div>
  );
}