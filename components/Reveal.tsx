"use client";

import { useEffect } from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

/**
 * Scroll-reveal engine.
 *
 * It reruns when either the pathname or the
 * query string changes, so category filters and
 * subcategory navigation reveal newly rendered
 * product cards without requiring a refresh.
 */
export default function Reveal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".reveal"
      )
    );

    if (elements.length === 0) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            const element =
              entry.target as HTMLElement;

            const delay = Number(
              element.dataset.revealDelay || 0
            );

            if (delay > 0) {
              element.style.transitionDelay = `${delay}ms`;
            }

            element.classList.add(
              "is-visible"
            );

            observer.unobserve(element);
          }
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -40px 0px",
        }
      );

    for (const element of elements) {
      const rect =
        element.getBoundingClientRect();

      const delay = Number(
        element.dataset.revealDelay || 0
      );

      if (delay > 0) {
        element.style.transitionDelay = `${delay}ms`;
      }

      /*
       * Show cards already visible on screen
       * immediately after the route changes.
       */
      if (
        rect.top < window.innerHeight &&
        rect.bottom > 0
      ) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.classList.add(
              "is-visible"
            );
          });
        });
      } else {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [routeKey]);

  return null;
}