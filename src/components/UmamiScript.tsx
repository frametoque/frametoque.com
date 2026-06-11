"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export default function UmamiScript() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <Script
      src="/stats/script.js"
      data-website-id="6264d0f7-9ca8-42cc-96c9-71c55fb25e0c"
      data-host-url="/stats"
      strategy="afterInteractive"
    />
  );
}