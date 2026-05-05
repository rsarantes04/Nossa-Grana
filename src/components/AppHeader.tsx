import React from 'react';
import { Logo } from './Logo';
import { cn } from '../lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  logoSize?: 'small' | 'medium' | 'large';
  className?: string;
  isOnline: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  title, 
  subtitle, 
  showLogo = true,
  logoSize = 'medium',
  className,
  isOnline
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

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        {showLogo && (
          <h1 className="text-white-pure font-serif font-semibold text-[15px]">{title}</h1>
        )}
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
            isOnline ? "bg-green-500" : "bg-red-500"
          )}
          title={isOnline ? "Online: Assistente IA ativo" : "Sem conexão: Assistente IA indisponível"}
        />
      </div>

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
