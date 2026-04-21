import React from 'react';
import { Logo } from './Logo';
import { cn } from '../lib/utils';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  logoSize?: 'small' | 'medium' | 'large';
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  title, 
  subtitle, 
  showLogo = true,
  logoSize = 'medium',
  className 
}) => {
  return (
    <header className={cn(
      "h-14 bg-navy-principal flex items-center px-6 justify-between z-50 shrink-0 shadow-[0_4px_6px_rgba(27,43,68,0.3)]",
      className
    )}>
      <div className="flex items-center gap-3">
        {showLogo ? (
          <div className="flex items-center gap-2">
            <Logo size={logoSize} layout="horizontal" />
          </div>
        ) : (
          <h1 className="text-white-pure font-serif font-semibold text-base">{title}</h1>
        )}
      </div>

      {showLogo && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-white-pure font-serif font-semibold text-[15px]">{title}</h1>
        </div>
      )}

      {subtitle && (
        <div className="text-right">
          <p className="text-gold-principal font-sans text-[10px] font-medium uppercase tracking-wider">
            {subtitle}
          </p>
        </div>
      )}
    </header>
  );
};
