"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/images/hero.jpg", alt: "Fluffy'n'Yummy Mall cookware collection" },
  { src: "/images/hero-slide-1.jpeg", alt: "Cookware collection at Fluffy'n'Yummy Mall" },
  { src: "/images/hero-slide-2.jpeg", alt: "Colourful cast iron cookware at Fluffy'n'Yummy Mall" },
];

export default function HeroSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  return (
    <div
      className="absolute inset-0 animate-hero-bg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          priority={index === 0}
          quality={100}
          sizes="100vw"
          className={`object-cover object-[center_28%] transition-opacity duration-1000 ${index === activeSlide ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-cocoa-900/80 via-cocoa-900/50 to-cocoa-900/20" />
    </div>
  );
}