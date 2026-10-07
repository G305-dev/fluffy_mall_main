"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

export default function HeroSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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
      className="absolute inset-0 overflow-hidden bg-cocoa-900"
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
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ))}

      {/* Light overlay for readability of the homepage text */}
      <div className="absolute inset-0 bg-gradient-to-r from-cocoa-900/75 via-cocoa-900/35 to-transparent" />

      <button
        type="button"
        onClick={previousSlide}
        aria-label="Previous slide"
        className="absolute left-0 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-r-full bg-white/90 text-cocoa-800 shadow-sm transition hover:bg-white sm:h-12 sm:w-12"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-0 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-l-full bg-white/90 text-cocoa-800 shadow-sm transition hover:bg-white sm:h-12 sm:w-12"
      >
        <ChevronRight size={22} />
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
    </div>
  );
}