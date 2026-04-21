import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';

export const Onboarding: React.FC = () => {
  const { updateFamilia, setOnboarded } = useFinance();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState('');

  const steps = [
    {
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.description'),
      icon: Heart,
      color: "text-gold-principal"
    },
    {
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.description'),
      icon: Sparkles,
      color: "text-gold-principal"
    },
    {
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.description'),
      icon: ShieldCheck,
      color: "text-gold-principal"
    }
  ];

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      if (familyName.trim()) {
        updateFamilia({ id: crypto.randomUUID(), nome: familyName, moeda: 'BRL' });
        setOnboarded(true);
      }
    }
  };

  const isNameStep = step === steps.length;

  return (
    <div className={cn(
      "h-screen flex flex-col transition-colors duration-500",
      isNameStep ? "bg-navy-dark" : "bg-white-pure"
    )}>
      {!isNameStep && (
        <header className="bg-navy-principal h-24 flex items-center justify-center shrink-0 shadow-lg">
          <Logo size="medium" />
        </header>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AnimatePresence mode="wait">
          {!isNameStep ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 max-w-sm"
            >
              <div className={cn("p-6 rounded-full bg-white-off shadow-inner", steps[step].color)}>
                {React.createElement(steps[step].icon, { size: 48 })}
              </div>
              <h1 className="text-2xl font-serif font-bold text-navy-principal">{steps[step].title}</h1>
              <p className="text-gray-medium leading-relaxed">{steps[step].description}</p>
              
              <div className="flex gap-2 mt-4">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === step ? 'w-8 bg-gold-principal' : 'w-2 bg-gray-soft'
                    )} 
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="name-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-8 w-full max-w-sm"
            >
              <Logo size="large" />
              
              <div className="space-y-4 w-full">
                <h1 className="text-2xl font-serif font-bold text-white-pure">{t('onboarding.family_name.title')}</h1>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder={t('onboarding.family_name.placeholder')}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-center text-lg text-white-pure placeholder:text-white/20 focus:outline-none focus:border-gold-principal focus:ring-1 focus:ring-gold-principal transition-all"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm mt-12 space-y-4">
          <button
            onClick={handleNext}
            disabled={isNameStep && !familyName.trim()}
            className={cn(
              "w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
              isNameStep 
                ? "bg-gold-principal text-navy-dark hover:bg-gold-dark" 
                : "bg-navy-principal text-white-pure hover:bg-navy-dark",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {!isNameStep ? t('onboarding.next') : t('onboarding.start_button')}
            <ChevronRight size={20} />
          </button>

          {isNameStep && (
            <p className="text-gold-light text-xs uppercase tracking-[2px]">
              {t('header.tagline')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
