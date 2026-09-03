"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll-reveal engine: watches every element with the `reveal` class and
 * adds `is-visible` when it scrolls into view, so CSS can animate it in.
 * Elements may set `data-reveal-delay` (ms) for a staggered effect.
 * Runs again on route changes so newly rendered pages animate too.
 */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.revealDelay || 0);
          if (delay > 0) el.style.transitionDelay = `${delay}ms`;
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    for (const el of elements) {
      // If it's already in view (e.g. above the fold), show it immediately.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const delay = Number(el.dataset.revealDelay || 0);
        if (delay > 0) el.style.transitionDelay = `${delay}ms`;
        // Two frames so the browser paints the hidden state first.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => el.classList.add("is-visible"))
        );
      } else {
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
