"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type HeroSlideshowProps = {
  variant?: "background" | "panel";
};

const slides = [
  {
    src: "/images/hero.jpg",
    alt: "Fluffy'n'Yummy Mall cookware collection",
  },
  {
    src: "/images/hero-slide-1.jpeg",
    alt: "Cookware collection at Fluffy'n'Yummy Mall",
  },
  {
    src: "/images/hero-slide-2.jpeg",
    alt: "Colourful cast iron cookware at Fluffy'n'Yummy Mall",
  },
];

export default function HeroSlideshow({
  variant = "background",
}: HeroSlideshowProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isPanel = variant === "panel";

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlide(
        (current) => (current + 1) % slides.length
      );
    }, 5500);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPaused]);

  function previousSlide() {
    setActiveSlide(
      (current) =>
        (current - 1 + slides.length) %
        slides.length
    );
  }

  function nextSlide() {
    setActiveSlide(
      (current) => (current + 1) % slides.length
    );
  }

  return (
    <div
      className={
        isPanel
          ? "relative h-full min-h-[360px] overflow-hidden bg-cocoa-900 sm:min-h-[480px] lg:min-h-[560px]"
          : "absolute inset-0 overflow-hidden bg-cocoa-900"
      }
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === activeSlide
              ? "opacity-100"
              : "opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            quality={100}
            sizes={
              isPanel
                ? "(min-width: 1024px) 55vw, 100vw"
                : "100vw"
            }
            className={
              isPanel
                ? "object-cover object-center"
                : "object-cover object-[center_28%]"
            }
          />
        </div>
      ))}

      {/* Keep the previous dark overlay on mobile. */}
      {!isPanel && (
        <div className="absolute inset-0 bg-gradient-to-r from-cocoa-900/80 via-cocoa-900/50 to-cocoa-900/20" />
      )}

      {/* Controls are shown on the desktop image panel only. */}
      {isPanel && (
        <>
          <button
            type="button"
            onClick={previousSlide}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-cocoa-800 shadow-md transition hover:bg-white sm:left-5 sm:h-11 sm:w-11"
          >
            <ChevronLeft size={21} />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-cocoa-800 shadow-md transition hover:bg-white sm:right-5 sm:h-11 sm:w-11"
          >
            <ChevronRight size={21} />
          </button>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/35 px-3 py-2 backdrop-blur-sm">
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={
                  index === activeSlide
                    ? "true"
                    : undefined
                }
                className={`h-2.5 rounded-full transition-all ${
                  index === activeSlide
                    ? "w-7 bg-white"
                    : "w-2.5 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}