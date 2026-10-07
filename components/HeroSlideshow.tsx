"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
          {/* Blurred background fills the entire desktop area. */}
          <Image
            src={slide.src}
            alt=""
            aria-hidden="true"
            fill
            priority={index === 0}
            quality={90}
            sizes="100vw"
            className="scale-110 object-cover object-center opacity-50 blur-2xl"
          />

          {/* Main image stays fully visible on desktop. */}
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            quality={100}
            sizes="100vw"
            className="object-cover object-center md:object-contain"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-cocoa-900/75 via-cocoa-900/35 to-cocoa-900/10" />
    </div>
  );
}