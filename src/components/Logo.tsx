import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showTagline?: boolean;
  layout?: 'vertical' | 'horizontal';
  color?: 'white' | 'navy' | 'gold';
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  className, 
  showTagline = false,
  layout = 'vertical',
  color = 'white'
}) => {
  const isLarge = size === 'large';
  const isSmall = size === 'small';
  const isHorizontal = layout === 'horizontal';

  const crownSize = isLarge ? 48 : isSmall ? 14 : 16;
  const fontSize = isLarge ? 'text-[36px]' : isSmall ? 'text-[12px]' : 'text-[18px]';
  const dollarSize = isLarge ? 'text-[36px]' : isSmall ? 'text-[14px]' : 'text-[18px]';

  const textColorClass = 
    color === 'white' ? 'text-white-pure' : 
    color === 'navy' ? 'text-navy-principal' : 
    'text-gold-principal';

  return (
    <div className={cn(
      "flex items-center",
      isHorizontal ? "flex-row gap-2" : "flex-col",
      className
    )}>
      <div className="flex items-center gap-2 relative">
        {isLarge && !isHorizontal && (
          <div className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-12 h-[1px] bg-gold-principal opacity-50" />
        )}
        
        <svg 
          width={crownSize} 
          height={crownSize} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          className="text-gold-principal"
        >
          <path d="M2 18L4 7L9 11L12 4L15 11L20 7L22 18H2Z" fill="currentColor" />
        </svg>

        {isLarge && !isHorizontal && (
          <div className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-12 h-[1px] bg-gold-principal opacity-50" />
        )}
      </div>

      <div className={cn(
        "flex items-center gap-1 font-serif",
        isLarge ? "mt-4 font-bold" : "font-semibold",
        textColorClass,
        isHorizontal && "mt-0",
        fontSize
      )}>
        <span>Nossa</span>
        <span className={cn("text-gold-principal font-bold", dollarSize)}>$</span>
        <span>Grana</span>
      </div>

      {showTagline && isLarge && !isHorizontal && (
        <p className="mt-2 text-[13px] text-gold-light uppercase tracking-[2px] font-normal">
          Finanças em família, crescendo juntos
        </p>
      )}
    </div>
  );
};
