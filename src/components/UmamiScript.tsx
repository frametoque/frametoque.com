"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export default function UmamiScript() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <Script
      src="/stats/script.js"
      data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
      data-host-url="/stats"
      strategy="afterInteractive"
    />
  );
}