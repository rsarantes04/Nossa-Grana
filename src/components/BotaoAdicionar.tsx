import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';

interface BotaoAdicionarProps {
  onClick: () => void;
  className?: string;
}

/**
 * BotaoAdicionar Component
 * 
 * A Floating Action Button (FAB) positioned at the bottom-left of the screen.
 * Used to trigger the "Add Transaction" modal.
 */
export const BotaoAdicionar: React.FC<BotaoAdicionarProps> = ({ onClick, className }) => {
  const { t } = useTranslation();
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={t('common.addTransaction')}
      aria-label={t('common.addTransaction')}
      className={cn(
        // Position: fixed, bottom-left
        // Using bottom-[80px] instead of 20px to stay above the bottom navigation bar (60px)
        // while maintaining the requested 20px distance from the navigation bar.
        "fixed left-5 bottom-20 w-14 h-14 bg-gold-principal text-navy-principal rounded-full shadow-[0_8px_16px_rgba(201,169,98,0.3)] flex items-center justify-center z-[1000] border-4 border-white transition-all",
        className
      )}
    >
      <Plus size={32} />
    </motion.button>
  );
};
