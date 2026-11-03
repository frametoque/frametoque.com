'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import CurrencyToggle from './Currencytoggle';
import AIChatbot from './AIChatbot';

export default function FloatingButtons() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const hideAll = ['/login', '/register', '/404', ].includes(pathname) || pathname.startsWith('/projects/');

  const showCurrency = pathname === '/services' || pathname.startsWith('/services/') || pathname === '/cart' || pathname.startsWith('/cart/');
  const showAIChatbot = !pathname.startsWith('/admin') && !pathname.startsWith('/dashboard/planner');

  if (hideAll || (!showCurrency && !showAIChatbot)) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
      style={{ visibility: mounted ? 'visible' : 'hidden' }}
    >
      {showCurrency && <CurrencyToggle />}
      {showAIChatbot && <AIChatbot />}
    </div>
  );
}