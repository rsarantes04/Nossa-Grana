import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, X, Info } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { Lancamento } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';

interface DeleteTransactionModalProps {
  lancamento: Lancamento;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteTransactionModal: React.FC<DeleteTransactionModalProps> = ({ lancamento, onClose, onDeleted }) => {
  const { removeLancamento, removeParcelamento, removeInstallmentIndividual, cancelInstallmentsRemaining } = useFinance();
  const { t, lang } = useTranslation();
  const [deleteMode, setDeleteMode] = useState<'single' | 'remaining' | 'all'>(lancamento.parcelamentoId ? 'single' : 'single');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (lancamento.parcelamentoId) {
      if (deleteMode === 'single') {
        removeInstallmentIndividual(lancamento.id);
      } else if (deleteMode === 'remaining') {
        cancelInstallmentsRemaining(lancamento.parcelamentoId, lancamento.numeroParcela!, 'Exclusão em massa', 'Removido via dashboard');
      } else if (deleteMode === 'all') {
        removeParcelamento(lancamento.parcelamentoId);
      }
    } else {
      removeLancamento(lancamento.id);
    }
    onDeleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white-pure p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-2xl"
      >
        <div className="w-16 h-16 bg-red-soft text-red-brick rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        
        <div>
          <h3 className="text-xl font-serif font-bold text-navy-principal">{t('deleteTransaction.title')}</h3>
          <p className="text-sm text-gray-medium mt-2 leading-relaxed">
            {t('deleteTransaction.description')}
          </p>
        </div>

        <div className="p-4 bg-white-off rounded-2xl text-left space-y-2 border border-gray-soft">
          <p className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('deleteTransaction.details')}</p>
          <p className="text-sm font-bold text-navy-principal truncate">{lancamento.descricao}</p>
          <p className="text-xs font-bold text-red-brick">{formatCurrency(lancamento.valor, lang)}</p>
        </div>

        {lancamento.parcelamentoId && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-gold-dark justify-center">
              <Info size={14} />
              <p className="text-[10px] font-bold uppercase tracking-wider">{t('editTransaction.parcela', lancamento.numeroParcela, lancamento.totalParcelas)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setDeleteMode('single')}
                className={cn(
                  "w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  deleteMode === 'single' ? "bg-red-brick text-white-pure border-red-brick" : "bg-white-pure text-red-brick border-red-soft hover:bg-red-soft"
                )}
              >
                {t('deleteTransaction.onlyThis')}
              </button>
              <button 
                onClick={() => setDeleteMode('remaining')}
                className={cn(
                  "w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  deleteMode === 'remaining' ? "bg-red-brick text-white-pure border-red-brick" : "bg-white-pure text-red-brick border-red-soft hover:bg-red-soft"
                )}
              >
                {t('deleteTransaction.thisAndNext')}
              </button>
              <button 
                onClick={() => setDeleteMode('all')}
                className={cn(
                  "w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  deleteMode === 'all' ? "bg-red-brick text-white-pure border-red-brick" : "bg-white-pure text-red-brick border-red-soft hover:bg-red-soft"
                )}
              >
                {t('deleteTransaction.all')}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          <button onClick={handleDelete} className="w-full p-4 bg-red-brick text-white-pure rounded-2xl font-bold shadow-lg shadow-red-brick/20 hover:bg-red-dark transition-all">{t('deleteTransaction.confirm')}</button>
          <button onClick={onClose} className="w-full py-2 text-gray-light font-bold text-sm">{t('deleteTransaction.back')}</button>
        </div>
      </motion.div>
    </div>
  );
};
