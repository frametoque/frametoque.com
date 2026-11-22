"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export default function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    // Skip scrolling on initial mount
    if (!prev) return;

    // Do NOT scroll to top when switching tabs within the same portfolio section
    const isDigitalTabChange =
      (prev === "/digital" || prev.startsWith("/digital/")) &&
      (pathname === "/digital" || pathname.startsWith("/digital/")) &&
      !prev.includes("/services") &&
      !pathname.includes("/services");

    const isProductionsTabChange =
      (prev === "/productions" || prev.startsWith("/productions/")) &&
      (pathname === "/productions" || pathname.startsWith("/productions/")) &&
      !prev.includes("/services") &&
      !pathname.includes("/services");

    const isProjectsTabChange =
      (prev === "/projects" || prev.startsWith("/projects/")) &&
      (pathname === "/projects" || pathname.startsWith("/projects/"));

    if (isDigitalTabChange || isProductionsTabChange || isProjectsTabChange) {
      return;
    }

    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
