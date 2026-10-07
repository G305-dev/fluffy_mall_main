"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPaused]);

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

      {!isPanel && (
        <div className="absolute inset-0 bg-gradient-to-r from-cocoa-900/80 via-cocoa-900/50 to-cocoa-900/20" />
      )}
    </div>
  );
}