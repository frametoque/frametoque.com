"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export default function UmamiScript() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <Script
      src="/stats/script.js"
      data-website-id="5866b6ab-7d7e-438d-b64c-177737566967"
      data-host-url="/stats"
      strategy="afterInteractive"
    />
  );
}