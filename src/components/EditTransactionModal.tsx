import React, { useState, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Lancamento, PaymentMethod } from '../types';
import { X, Check, Trash2, Calendar, Tag, CreditCard, AlignLeft, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { CurrencyInput } from './CurrencyInput';
import { useTranslation } from '../i18n/useTranslation';

interface EditTransactionModalProps {
  lancamento: Lancamento;
  onClose: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto'];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ lancamento, onClose }) => {
  const { data, updateLancamentoFull, updateInstallmentIndividual, updateInstallmentsRemaining } = useFinance();
  const { t, lang } = useTranslation();
  
  const [valor, setValor] = useState(lancamento.valor.toString());
  const [descricao, setDescricao] = useState(lancamento.descricao || '');
  const [dataStr, setDataStr] = useState(lancamento.data ? format(parseISO(lancamento.data), 'yyyy-MM-dd') : format(new Date(lancamento.ano, lancamento.mes, lancamento.dia || 1), 'yyyy-MM-dd'));
  const [categoriaId, setCategoriaId] = useState(lancamento.categoriaId);
  const [subcategoriaId, setSubcategoriaId] = useState(lancamento.subcategoriaId);
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>(lancamento.formaPagamento || 'Dinheiro');
  const [tipo, setTipo] = useState<'orcado' | 'realizado'>(lancamento.tipo || 'realizado');
  
  const [editMode, setEditMode] = useState<'single' | 'remaining'>(lancamento.parcelamentoId ? 'single' : 'single');
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  const selectedCategory = data.categorias.find(c => c.id === categoriaId);
  const subcategories = selectedCategory?.subcategorias || [];

  useEffect(() => {
    if (selectedCategory && !selectedCategory.subcategorias.find(s => s.id === subcategoriaId)) {
      setSubcategoriaId(selectedCategory.subcategorias[0]?.id || '');
    }
  }, [categoriaId]);

  const handleSave = () => {
    const date = parseISO(dataStr);
    const numValor = parseFloat(valor);

    if (lancamento.parcelamentoId) {
      if (editMode === 'single') {
        updateInstallmentIndividual(lancamento.id, {
          valor: numValor,
          descricao,
          data: date.toISOString(),
          ano: date.getFullYear(),
          mes: date.getMonth(),
          dia: date.getDate(),
          categoriaId,
          subcategoriaId,
          formaPagamento,
          tipo
        });
      } else {
        // Apply to remaining
        const applyToAll = {
          valor: true,
          descricao: true,
          categoriaId: true,
          subcategoriaId: true,
          formaPagamento: true,
          tipo: true,
          data: true
        };
        updateInstallmentsRemaining(lancamento.parcelamentoId, lancamento.numeroParcela!, {
          valor: numValor,
          descricao,
          data: date.toISOString(),
          categoriaId,
          subcategoriaId,
          formaPagamento,
          tipo
        }, applyToAll);
      }
    } else {
      updateLancamentoFull(lancamento.id, {
        valor: numValor,
        descricao,
        data: date.toISOString(),
        ano: date.getFullYear(),
        mes: date.getMonth(),
        dia: date.getDate(),
        categoriaId,
        subcategoriaId,
        formaPagamento,
        tipo
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white-pure w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-soft flex justify-between items-center bg-white-off/50">
          <div>
            <h2 className="text-xl font-serif font-bold text-navy-principal">{t('editTransaction.title')}</h2>
            {lancamento.parcelamentoId && (
              <p className="text-xs text-gold-dark font-bold uppercase tracking-wider">{t('editTransaction.parcela', lancamento.numeroParcela, lancamento.totalParcelas)}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-pure hover:text-navy-principal rounded-full transition-all shadow-sm border border-transparent hover:border-gray-soft">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-6 no-scrollbar">
          {lancamento.parcelamentoId && (
            <div className="p-4 bg-gold-soft/20 border border-gold-light/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-gold-dark">
                <Info size={18} />
                <p className="text-xs font-bold uppercase tracking-wider">{t('editTransaction.installmentInfo')}</p>
              </div>
              
              <div className="p-3 bg-white-pure/50 rounded-xl border border-gold-light/20">
                <p className="text-[10px] text-navy-principal/80 leading-relaxed">
                  {t('editTransaction.installmentWarning')}
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setEditMode('single')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                    editMode === 'single' ? "bg-gold-principal text-navy-principal border-gold-principal" : "bg-white-pure text-gold-dark border-gold-light/30"
                  )}
                >
                  {t('editTransaction.onlyThis')}
                </button>
                <button 
                  onClick={() => setEditMode('remaining')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                    editMode === 'remaining' ? "bg-gold-principal text-navy-principal border-gold-principal" : "bg-white-pure text-gold-dark border-gold-light/30"
                  )}
                >
                  {t('editTransaction.thisAndNext')}
                </button>
              </div>
            </div>
          )}

          {/* Value Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={12} /> {t('editTransaction.value')}
            </label>
            <CurrencyInput 
              value={valor}
              onChange={setValor}
              placeholder="0,00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> {t('editTransaction.date')}
              </label>
              <input 
                type="date"
                value={dataStr}
                onChange={(e) => setDataStr(e.target.value)}
                className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal transition-all"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={12} /> {t('editTransaction.paymentMethod')}
              </label>
              <select 
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal transition-all appearance-none"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest flex items-center gap-2">
              <AlignLeft size={12} /> {t('editTransaction.description')}
            </label>
            <input 
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={t('editTransaction.descriptionPlaceholder')}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal transition-all"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('editTransaction.type')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={tipo === 'realizado'} onChange={() => setTipo('realizado')} className="w-4 h-4 text-gold-principal focus:ring-gold-principal" />
                <span className="text-sm font-bold text-navy-principal">{t('quick.type_realized')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={tipo === 'orcado'} onChange={() => setTipo('orcado')} className="w-4 h-4 text-gold-principal focus:ring-gold-principal" />
                <span className="text-sm font-bold text-navy-principal">{t('quick.type_budgeted')}</span>
              </label>
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest flex items-center gap-2">
                <Tag size={12} /> {t('editTransaction.category')}
              </label>
              <select 
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal transition-all appearance-none"
              >
                {data.categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest flex items-center gap-2">
                <Tag size={12} /> {t('editTransaction.subcategory')}
              </label>
              <select 
                value={subcategoriaId}
                onChange={(e) => setSubcategoriaId(e.target.value)}
                className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal transition-all appearance-none"
              >
                {subcategories.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-white-off/50 border-t border-gray-soft flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 p-4 bg-white-pure border border-gray-soft text-gray-medium rounded-2xl font-bold hover:bg-white-ice transition-colors"
          >
            {t('editTransaction.cancel')}
          </button>
          <button 
            onClick={() => setShowConfirmSave(true)}
            className="flex-[2] p-4 bg-navy-principal text-white-pure rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-navy-dark transition-all shadow-lg shadow-navy-principal/10"
          >
            <Check size={20} />
            {t('editTransaction.save')}
          </button>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmSave && (
          <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white-pure p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-gold-soft/30 text-gold-dark rounded-full flex items-center justify-center mx-auto">
                <Check size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('editTransaction.confirm.title')}</h3>
                <p className="text-sm text-gray-medium mt-2 leading-relaxed">
                  {editMode === 'remaining' 
                    ? t('editTransaction.confirm.descriptionRemaining')
                    : t('editTransaction.confirm.descriptionSingle')}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleSave} className="w-full p-4 bg-navy-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-navy-principal/10 hover:bg-navy-dark transition-all">{t('editTransaction.confirm.confirm')}</button>
                <button onClick={() => setShowConfirmSave(false)} className="w-full py-2 text-gray-light font-bold text-sm">{t('editTransaction.confirm.review')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
