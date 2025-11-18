'use client';

import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  maxStars?: number;
  className?: string;
}

export function StarRating({ 
  value, 
  onChange, 
  maxStars = 10,
  className = '' 
}: StarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [animatingStar, setAnimatingStar] = useState<number | null>(null);

  const handleStarClick = (starIndex: number) => {
    onChange(starIndex);
    setAnimatingStar(starIndex);
    setTimeout(() => setAnimatingStar(null), 300);
  };

  const handleStarHover = (starIndex: number) => {
    setHoveredStar(starIndex);
  };

  const handleMouseLeave = () => {
    setHoveredStar(null);
  };

  const displayValue = hoveredStar !== null ? hoveredStar : value;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className="flex items-center gap-1"
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxStars }, (_, index) => {
          const starIndex = index + 1;
          const isFilled = starIndex <= displayValue;
          const isHovered = hoveredStar !== null && starIndex <= hoveredStar;
          const isAnimating = animatingStar === starIndex;

          return (
            <button
              key={starIndex}
              type="button"
              onClick={() => handleStarClick(starIndex)}
              onMouseEnter={() => handleStarHover(starIndex)}
              className={`
                transition-all duration-200 ease-out
                ${isFilled ? 'text-yellow-400' : 'text-zinc-600'}
                ${isHovered ? 'scale-125' : 'scale-100'}
                ${isAnimating ? 'animate-bounce' : ''}
                hover:scale-125
                focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded
              `}
              style={{
                transform: isAnimating 
                  ? 'scale(1.3) translateY(-2px)' 
                  : isHovered 
                    ? 'scale(1.25)' 
                    : 'scale(1)',
                transition: 'transform 0.2s ease-out, color 0.2s ease-out',
              }}
            >
              <svg
                className="w-8 h-8 md:w-10 md:h-10"
                fill={isFilled ? 'currentColor' : 'none'}
                stroke={isFilled ? 'currentColor' : 'currentColor'}
                strokeWidth={isFilled ? 0 : 1.5}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          );
        })}
      </div>
      <div className="text-2xl font-bold text-cyan-400 w-12 text-center">
        {displayValue}
      </div>
    </div>
  );
}

