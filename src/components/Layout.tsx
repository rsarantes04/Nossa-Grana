import React from 'react';
import { Calendar, Grid, Menu, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppHeader } from './AppHeader';
import { Footer } from './Footer';
import { useFinance } from '../contexts/FinanceContext';
import { useTranslation } from '../i18n/useTranslation';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenChat: () => void;
}

const CrownIcon = ({ className, size = 20 }: { className?: string, size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    className={className}
  >
    <path d="M2 18L4 7L9 11L12 4L15 11L20 7L22 18H2Z" fill="currentColor" />
  </svg>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onOpenChat }) => {
  const { data } = useFinance();
  const { t, lang } = useTranslation();
  const currentYear = new Date().getFullYear();

  const tabs = [
    { id: 'inicio', label: t('nav.inicio'), icon: CrownIcon },
    { id: 'orcamento', label: t('nav.orcamento'), icon: Calendar },
    { id: 'categorias', label: t('nav.categorias'), icon: Grid },
    { id: 'mais', label: t('nav.mais'), icon: Menu },
  ];

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'inicio': return t('nav.inicio');
      case 'orcamento': return t('nav.orcamento');
      case 'categorias': return t('nav.categorias');
      case 'mais': return t('nav.mais');
      default: return '';
    }
  };

  const getSubtitle = () => {
    if (activeTab === 'inicio') {
      return `${data.familia.nome} · ${currentYear}`;
    }
    const now = new Date();
    const monthName = t(`month.short.${now.getMonth()}` as any);
    return `${monthName}/${now.getFullYear()}`;
  };

  return (
    <div className="flex flex-col h-screen bg-white-off text-gray-bluish font-sans overflow-hidden">
      <AppHeader 
        title={getHeaderTitle()} 
        subtitle={getSubtitle()}
        showLogo={true}
        logoSize={activeTab === 'inicio' ? 'medium' : 'small'}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col [overscroll-behavior-y:none]">
        <div className="flex-1 pb-8">
          {children}
        </div>
        <Footer />
        {/* Spacer for Bottom Navigation */}
        <div className="h-[60px] shrink-0" />
      </main>

      {/* Floating Chat Button */}
      <button
        onClick={onOpenChat}
        className="fixed right-6 bottom-24 p-4 bg-navy-principal text-white rounded-full shadow-lg hover:scale-110 transition-transform z-40"
      >
        <MessageCircle size={24} />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white-pure border-t border-gray-soft px-4 h-[60px] flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(27,43,68,0.05)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center relative transition-all",
                isActive ? "text-navy-principal" : "text-gray-light hover:text-gray-bluish"
              )}
            >
              {isActive && (
                <div className="absolute -top-1 w-1.5 h-1.5 bg-gold-principal rounded-full" />
              )}
              <div className="p-1 transition-colors">
                <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={cn(
                "text-[10px] uppercase tracking-wider",
                isActive ? "font-bold" : "font-medium"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
