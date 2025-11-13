'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const carouselImages = [
  'https://i.etsystatic.com/23049683/r/il/9ac57d/7243100890/il_600x600.7243100890_k1oh.jpg',
  'https://i.etsystatic.com/17284209/r/il/05e52e/5432621207/il_600x600.5432621207_cnuf.jpg',
  'https://i.etsystatic.com/39147792/c/1587/1587/196/121/il/af301e/4436496659/il_600x600.4436496659_ok9v.jpg',
];

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % carouselImages.length);
  };

  return (
    <div 
      className={`relative w-full overflow-hidden h-screen ${
        isMobile ? 'md:h-screen' : ''
      }`}
      style={isMobile ? {
        width: '100vh',
        height: '100vw',
        transform: 'rotate(90deg)',
        transformOrigin: 'center center',
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: '-50vw',
        marginLeft: '-50vh',
      } : {}}
    >
      {/* Carousel Images */}
      <div className="relative w-full h-full">
        {carouselImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`Carousel image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Commented out for now */}
      {/* <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
        aria-label="Previous image"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
        aria-label="Next image"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button> */}

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {carouselImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? 'w-8 bg-cyan-400' : 'w-2 bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

