import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Lock, 
  Info, Copy, Calendar, CheckCircle2, AlertCircle,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Budget: React.FC = () => {
  const { data, updateOrcamento, copyOrcamentoToNextMonth } = useFinance();
  const { t, lang } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(startOfMonth(new Date()));
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showTooltip, setShowTooltip] = useState<{ id: string, type: 'cat' | 'sub' } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // Check if it's the first access to this month (no budgets defined)
  useEffect(() => {
    const hasBudgets = data.orcamentosMensais.some(o => o.ano === year && o.mes === month);
    const hasLancamentos = data.lancamentos.some(l => l.ano === year && l.mes === month);
    if (!hasBudgets && !hasLancamentos) {
      setShowWelcome(true);
    } else {
      setShowWelcome(false);
    }
  }, [year, month, data.orcamentosMensais, data.lancamentos]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getOrcado = React.useCallback((catId: string, subcatId?: string) => {
    return data.orcamentosMensais.find(o => 
      o.ano === year && o.mes === month && o.categoriaId === catId && o.subcategoriaId === subcatId
    )?.valorOrcado ?? null;
  }, [data.orcamentosMensais, year, month]);

  const getRealizado = React.useCallback((catId: string, subcatId?: string) => {
    return data.lancamentos
      .filter(l => 
        l.ano === year && 
        l.mes === month && 
        l.categoriaId === catId && 
        (subcatId ? l.subcategoriaId === subcatId : true) &&
        l.tipo === 'realizado'
      )
      .reduce((acc, l) => acc + l.valor, 0);
  }, [data.lancamentos, year, month]);

  const totals = useMemo(() => {
    const activeCats = data.categorias.filter(c => c.ativa);
    let totalOrcado = 0;
    let totalRealizado = 0;

    activeCats.forEach(cat => {
      // Somar orçado das subcategorias para compor o total da categoria
      const catOrcado = cat.subcategorias
        .filter(s => s.ativa)
        .reduce((acc, s) => acc + (getOrcado(cat.id, s.id) || 0), 0);
      
      totalOrcado += catOrcado;
      totalRealizado += getRealizado(cat.id);
    });

    return { totalOrcado, totalRealizado, saldo: totalOrcado - totalRealizado };
  }, [data.categorias, data.orcamentosMensais, data.lancamentos, year, month, getOrcado]);

  const handleCopyBudget = () => {
    copyOrcamentoToNextMonth(year, month);
    setShowCopyConfirm(false);
    showToast(t('budget.copySuccess'));
  };

  return (
    <div className="flex flex-col h-full bg-white-off">
      {/* Header & Month Selector */}
      <div className="bg-white-pure border-b border-gray-soft sticky top-0 z-30 shadow-sm">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('budget.title')}</h1>
            <p className="text-sm text-gray-medium font-medium capitalize">
              {t(`month.long.${selectedDate.getMonth()}` as any)} {selectedDate.getFullYear()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSelectedDate(prev => addMonths(prev, -1))}
              className="p-2 hover:bg-white-off rounded-xl transition-colors text-gray-light"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
              className="p-2 hover:bg-white-off rounded-xl transition-colors text-gray-light"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Month Chips */}
        <div className="px-6 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
            const isSelected = month === i;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(new Date(year, i, 1))}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shrink-0",
                  isSelected 
                    ? "bg-navy-principal text-white-pure border-navy-principal shadow-lg shadow-navy-principal/10" 
                    : "bg-white-pure text-gray-medium border-gray-soft hover:border-gray-ice"
                )}
              >
                {t(`month.short.${i}` as any)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        <AnimatePresence mode="wait">
          {showWelcome && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gold-soft border border-gold-principal/20 rounded-[32px] p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-principal rounded-full flex items-center justify-center text-navy-principal shadow-lg shadow-gold-principal/20">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="font-serif font-bold text-gold-dark">{t('budget.welcome.title', t(`month.long.${selectedDate.getMonth()}` as any))}!</h3>
              </div>
              <p className="text-sm text-gold-dark leading-relaxed">
                {t('budget.welcome.description')}
              </p>
              <button 
                onClick={() => setShowWelcome(false)}
                className="px-6 py-2 bg-gold-principal text-navy-principal rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gold-dark transition-colors shadow-md"
              >
                {t('budget.welcome.button')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {data.categorias.filter(c => c.ativa).map((category) => (
          <BudgetCategoryItem 
            key={category.id}
            category={category}
            year={year}
            month={month}
            isExpanded={expandedCategories.includes(category.id)}
            onToggle={() => toggleCategory(category.id)}
            getOrcado={getOrcado}
            getRealizado={getRealizado}
            updateOrcamento={updateOrcamento}
            onShowTooltip={(type) => setShowTooltip({ id: category.id, type })}
          />
        ))}

        {data.categorias.filter(c => c.ativa).length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-white-pure rounded-full flex items-center justify-center mx-auto text-gray-ice shadow-inner border border-gray-soft">
              <Calendar size={40} />
            </div>
            <p className="text-gray-medium font-medium">{t('budget.noCategories')}</p>
          </div>
        )}

        {/* Totals Summary Panel - Now Static below categories */}
        <div className="bg-navy-principal rounded-[32px] p-6 text-white-pure shadow-2xl shadow-navy-principal/40 mt-8 mb-12">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-[10px] text-gold-light font-bold uppercase tracking-widest">{t('budget.totalBudgeted')}</p>
              <p className="text-lg font-serif font-bold">{formatCurrency(totals.totalOrcado, lang)}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] text-gold-light font-bold uppercase tracking-widest flex items-center justify-end gap-1">
                {t('budget.totalRealized')} <Lock size={10} />
              </p>
              <p className="text-lg font-serif font-bold">{formatCurrency(totals.totalRealizado, lang)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white-pure/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-xl",
                totals.saldo > 0 ? "bg-gold-soft text-gold-principal" : 
                totals.saldo < 0 ? "bg-red-soft text-red-brick" : "bg-white-pure/10 text-gray-light"
              )}>
                {totals.saldo > 0 ? <TrendingUp size={20} /> : 
                 totals.saldo < 0 ? <TrendingDown size={20} /> : <Minus size={20} />}
              </div>
              <div>
                <p className="text-[10px] text-gold-light font-bold uppercase tracking-widest">{t('budget.generalBalance')}</p>
                <p className={cn(
                  "text-sm font-bold",
                  totals.saldo > 0 ? "text-gold-light" : 
                  totals.saldo < 0 ? "text-red-soft" : "text-gray-light"
                )}>
                  {totals.saldo > 0 ? '+' : ''}{formatCurrency(totals.saldo, lang)}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowCopyConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-gold-light hover:text-white-pure hover:bg-white-pure/10 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Copy size={16} />
              <span className="hidden sm:inline">{t('budget.copy')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tooltip Modal */}
      <AnimatePresence>
        {showTooltip && (
          <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white-pure w-full max-w-xs rounded-[32px] p-8 space-y-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-soft rounded-full flex items-center justify-center mx-auto text-blue-dark">
                <Info size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('budget.tooltip.title')}</h3>
                <p className="text-sm text-gray-medium leading-relaxed">
                  {t('budget.tooltip.description', t(`month.long.${selectedDate.getMonth()}` as any), selectedDate.getFullYear())}
                </p>
                <p className="text-xs text-gray-light italic">
                  {t('budget.tooltip.footer')}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setShowTooltip(null)}
                  className="w-full py-4 bg-navy-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-navy-principal/20"
                >
                  {t('budget.tooltip.button')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copy Confirmation Modal */}
      <AnimatePresence>
        {showCopyConfirm && (
          <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white-pure w-full max-w-xs rounded-[32px] p-8 space-y-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-gold-soft rounded-full flex items-center justify-center mx-auto text-gold-principal">
                <Copy size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('budget.copyConfirm.title')}</h3>
                <p className="text-sm text-gray-medium leading-relaxed">
                  {t('budget.copyConfirm.description', t(`month.long.${selectedDate.getMonth()}` as any), selectedDate.getFullYear())}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCopyBudget}
                  className="w-full py-4 bg-navy-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-navy-principal/20"
                >
                  {t('budget.copyConfirm.yes')}
                </button>
                <button 
                  onClick={() => setShowCopyConfirm(false)}
                  className="w-full py-2 text-gray-light font-bold text-sm"
                >
                  {t('budget.copyConfirm.cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] min-w-[320px]"
          >
            <div className={cn(
              "p-4 rounded-xl shadow-2xl flex items-center gap-3 border-l-[3px]",
              toast.type === 'success' 
                ? "bg-navy-principal text-white-pure border-gold-principal" 
                : "bg-red-soft text-red-dark border-red-brick"
            )}>
              {toast.type === 'success' && (
                <div className="text-gold-principal shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 18L4 7L9 11L12 4L15 11L20 7L22 18H2Z" />
                  </svg>
                </div>
              )}
              <p className="text-sm font-bold flex-1">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BudgetCategoryItem = ({ 
  category, year, month, isExpanded, onToggle, 
  getOrcado, getRealizado, updateOrcamento, onShowTooltip 
}: any) => {
  const { t, lang } = useTranslation();
  
  // O orçado da categoria agora é a soma automática das suas subcategorias
  const orcado = useMemo(() => {
    return category.subcategorias
      .filter((s: any) => s.ativa)
      .reduce((acc: number, sub: any) => acc + (getOrcado(category.id, sub.id) || 0), 0);
  }, [category.subcategorias, getOrcado, category.id]);

  const realizado = getRealizado(category.id);
  const saldo = orcado !== null ? orcado - realizado : null;

  return (
    <div className={cn(
      "bg-white-pure rounded-[32px] border transition-all overflow-hidden",
      isExpanded ? "border-gold-light shadow-xl shadow-navy-principal/5" : "border-gray-soft shadow-sm"
    )}>
      <div className="p-5 flex items-center gap-4">
        <div 
          onClick={onToggle}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner cursor-pointer"
          style={{ backgroundColor: `${category.cor}15`, color: category.cor }}
        >
          {category.icone}
        </div>
        
        <div className="flex-1 min-w-0" onClick={onToggle}>
          <h3 className="font-serif font-bold text-navy-principal truncate">{category.nome}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md",
              category.tipo === 'renda' ? "bg-green-soft text-green-forest" :
              category.tipo === 'despesa' ? "bg-red-soft text-red-brick" : "bg-blue-soft text-blue-dark"
            )}>
              {t(`category.type.${category.tipo}` as any)}
            </span>
            {saldo !== null && (
              <span className={cn(
                "text-[10px] font-bold",
                saldo >= 0 ? "text-green-forest" : "text-red-brick"
              )}>
                {saldo >= 0 ? `🟢 ${t('budget.status.safe')}` : `🔴 ${t('budget.status.danger')}`}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={onToggle}
          className="p-2 text-gray-light hover:text-gray-medium transition-colors"
        >
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
            <ChevronDown size={20} />
          </motion.div>
        </button>
      </div>

      <div className="px-5 pb-5 grid grid-cols-2 gap-4">
        <BudgetField 
          label={t('budget.budgeted')}
          value={orcado}
          locked
        />
        <BudgetField 
          label={t('budget.realized')}
          value={realizado}
          onClick={() => onShowTooltip('cat')}
          locked
        />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-soft bg-white-off/30"
          >
            <div className="p-4 space-y-6">
              <div className="flex items-center gap-2 px-2">
                <div className="h-px flex-1 bg-gray-soft" />
                <span className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('budget.subcategories')}</span>
                <div className="h-px flex-1 bg-gray-soft" />
              </div>

              {category.subcategorias.filter((s: any) => s.ativa).map((sub: any) => (
                <div key={sub.id} className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-bold text-navy-principal">{sub.nome}</span>
                    {getOrcado(category.id, sub.id) !== null && (
                      <span className={cn(
                        "text-[10px] font-bold",
                        (getOrcado(category.id, sub.id)! - getRealizado(category.id, sub.id)) >= 0 ? "text-green-forest" : "text-red-brick"
                      )}>
                        {formatCurrency(getOrcado(category.id, sub.id)! - getRealizado(category.id, sub.id), lang)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <BudgetField 
                      label={t('budget.budgeted')}
                      value={getOrcado(category.id, sub.id)}
                      onChange={(val: number | null) => updateOrcamento(year, month, category.id, sub.id, val)}
                      editable
                      small
                    />
                    <BudgetField 
                      label={t('budget.realized')}
                      value={getRealizado(category.id, sub.id)}
                      onClick={() => onShowTooltip('sub')}
                      locked
                      small
                    />
                  </div>
                </div>
              ))}

              {category.subcategorias.filter((s: any) => s.ativa).length === 0 && (
                <p className="text-center text-xs text-gray-light italic py-2">{t('budget.noSubcategories')}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BudgetField = ({ label, value, onChange, editable, locked, onClick, small }: any) => {
  const { t, lang } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value?.toString() || '');
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const numericValue = localValue === '' ? null : parseFloat(localValue.replace(',', '.')) || 0;
    onChange?.(numericValue);
  };

  const displayValue = value === null ? '' : formatCurrency(value, lang);
  const isEmpty = value === null;
  const isZero = value === 0;

  return (
    <div className="space-y-1">
      <label className={cn(
        "text-[9px] font-bold uppercase tracking-widest flex items-center gap-1",
        locked ? "text-gray-light" : "text-gray-medium"
      )}>
        {label} {locked && <Lock size={8} />}
      </label>
      
      <div 
        onClick={() => {
          if (locked) onClick?.();
          else setIsEditing(true);
        }}
        className={cn(
          "relative rounded-2xl transition-all border flex items-center px-4",
          small ? "h-12" : "h-14",
          locked ? "bg-white-off border-gray-soft cursor-help" : "bg-white-pure border-gray-soft cursor-text hover:border-gold-light",
          isEditing && "ring-2 ring-gold-principal border-gold-principal"
        )}
      >
        {isEditing ? (
          <input 
            autoFocus
            type="number"
            step="0.01"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-transparent outline-none text-sm font-bold text-navy-principal"
            placeholder="0,00"
          />
        ) : (
          <div className="flex flex-col w-full">
            <span className={cn(
              "text-sm font-bold truncate",
              isEmpty ? "text-gray-ice" : 
              isZero ? "text-amber-principal" :
              locked ? "text-gray-medium" : "text-navy-principal"
            )}>
              {isEmpty ? formatCurrency(0, lang) : displayValue}
            </span>
            {!locked && (
              <span className="text-[8px] text-gray-light font-medium truncate">
                {isEmpty ? t('budget.field.empty') : isZero ? t('budget.field.zero') : t('budget.field.defined')}
              </span>
            )}
          </div>
        )}
        {!locked && !isEditing && <div className="absolute right-3 text-gray-ice"><ChevronDown size={14} /></div>}
      </div>
    </div>
  );
};
