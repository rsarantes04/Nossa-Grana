import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatPercent, cn, formatDate } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';
import { CreditCard, Target, ChevronRight, Plus, Trash2, CheckCircle2, TrendingUp, Calendar, List, Info, Clock, User as UserIcon, Sparkles, ArrowLeft, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addMonths } from 'date-fns';

import { DreamsProjects } from './DreamsProjects';
import { Settings } from './Settings';
import { Relatorio5Meses } from './Relatorio5Meses';
import { PatrimonioScreen } from './Patrimonio';
import { CardManager } from './CardManager';

interface MoreProps {
  initialView?: 'menu';
  onResetView?: () => void;
}

export const More: React.FC<MoreProps> = ({ initialView = 'menu', onResetView }) => {
  const { data } = useFinance();
  const { t } = useTranslation();
  const [view, setView] = useState<'menu' | 'sonhos' | 'relatorio' | 'relatorio5' | 'parcelamentos' | 'settings' | 'patrimonio'>(initialView);
  const [showCards, setShowCards] = useState(false);

  const handleBack = () => {
    setView('menu');
    onResetView?.();
  };

  if (view === 'sonhos') return <DreamsProjects onBack={handleBack} />;
  if (view === 'relatorio') return <AnnualReport onBack={handleBack} />;
  if (view === 'relatorio5') return <Relatorio5Meses onBack={handleBack} />;
  if (view === 'parcelamentos') return <Installments onBack={handleBack} />;
  if (view === 'settings') return <Settings onBack={handleBack} />;
  if (view === 'patrimonio') return <PatrimonioScreen onBack={handleBack} />;

  return (
    <div className="p-6 space-y-6 bg-white-off min-h-full">
      <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('more.title')}</h1>

      <div className="grid grid-cols-1 gap-4">
        <MenuButton 
          icon={<CreditCard className="text-navy-principal" />} 
          title="Cartões de Crédito" 
          description="Gerencie seus cartões e faturas"
          onClick={() => setShowCards(true)}
        />
        <MenuButton 
          icon={<List className="text-blue-dark" />} 
          title={t('more.installments.title')} 
          description={t('more.installments.description')}
          onClick={() => setView('parcelamentos')}
        />
        {showCards && <CardManager onClose={() => setShowCards(false)} />}
        <MenuButton 
          icon={<Target className="text-gold-dark" />} 
          title={t('more.dreams.title')} 
          description={t('more.dreams.description')}
          onClick={() => setView('sonhos')}
        />
        <MenuButton 
          icon={<TrendingUp className="text-navy-principal" />} 
          title={t('more.patrimonio.title')} 
          description={t('more.patrimonio.description')}
          onClick={() => setView('patrimonio')}
        />
        <MenuButton 
          icon={<TrendingUp className="text-green-forest" />} 
          title={t('more.report.title')} 
          description={t('more.report.description')}
          onClick={() => setView('relatorio')}
        />
        <MenuButton 
          icon={<BarChart3 className="text-gold-principal" />} 
          title={t('more.report5Months.title' as any) || 'Comparativo 5 Meses'} 
          description={t('more.report5Months.description' as any) || 'Análise detalhada de despesas por categoria nos últimos 5 meses.'}
          onClick={() => setView('relatorio5')}
        />
        <MenuButton 
          icon={<SettingsIcon className="text-navy-principal" />} 
          title={t('more.settings.title')} 
          description={t('more.settings.description')}
          onClick={() => setView('settings')}
        />
      </div>
    </div>
  );
};

const Installments = ({ onBack }: { onBack: () => void }) => {
  const { data, removeParcelamento } = useFinance();
  const { t, lang } = useTranslation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6 bg-white-off min-h-full">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white-pure rounded-full text-navy-principal transition-colors"><ChevronRight className="rotate-180" /></button>
        <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('more.installments.title')}</h1>
      </div>

      <div className="space-y-4">
        {data.parcelamentos.map((p) => {
          const associatedLancamentos = data.lancamentos.filter(l => l.parcelamentoId === p.id);
          const paidLancamentos = associatedLancamentos.filter(l => {
            const lDate = new Date(l.ano, l.mes, l.dia || 1);
            return lDate <= new Date();
          });
          const progress = (paidLancamentos.length / associatedLancamentos.length) * 100;

          return (
            <div key={p.id} className="bg-white-pure p-6 rounded-[32px] border border-gray-soft shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif font-bold text-navy-principal">{p.descricao}</h3>
                  <p className="text-xs text-gray-medium">{t('dashboard.total')}: {formatCurrency(p.valorTotal, lang)}</p>
                </div>
                <button 
                  onClick={() => setDeletingId(p.id)}
                  className="p-2 text-red-brick hover:bg-red-soft rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-medium">{t('more.installments.installments')}: {paidLancamentos.length}/{associatedLancamentos.length}</span>
                  <span className="text-navy-principal">{formatPercent(progress / 100, lang)}</span>
                </div>
                <div className="h-2 bg-white-off rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gold-principal"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-gray-light font-bold uppercase tracking-widest">
                <Calendar size={12} />
                <span>{t('more.installments.dueDay', p.diaVencimento)} • {t('more.installments.start', `${t(`month.short.${new Date(p.dataInicio).getMonth()}` as any)}/${new Date(p.dataInicio).getFullYear()}`)}</span>
              </div>
            </div>
          );
        })}

        {data.parcelamentos.length === 0 && (
          <div className="text-center py-12 text-gray-ice">
            <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold text-navy-principal">{t('more.installments.noInstallments')}</p>
            <p className="text-sm">{t('more.installments.useQuickLaunch')}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white-pure w-full max-w-xs rounded-[32px] p-8 space-y-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-soft rounded-full flex items-center justify-center mx-auto text-red-brick">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('more.installments.cancelTitle')}</h3>
                <p className="text-sm text-gray-medium leading-relaxed">
                  {t('more.installments.cancelDescription')}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    removeParcelamento(deletingId);
                    setDeletingId(null);
                  }}
                  className="w-full py-4 bg-red-brick text-white-pure rounded-2xl font-bold shadow-lg shadow-red-brick/20"
                >
                  {t('more.installments.confirmCancel')}
                </button>
                <button 
                  onClick={() => setDeletingId(null)}
                  className="w-full py-2 text-gray-light font-bold text-sm"
                >
                  {t('more.installments.keepInstallment')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnnualReport = ({ onBack }: { onBack: () => void }) => {
  const { data } = useFinance();
  const { t, lang } = useTranslation();
  const year = new Date().getFullYear();
  
  const categoriesSummary = data.categorias.map(cat => {
    const orcado = data.lancamentos
      .filter(l => l.ano === year && l.categoriaId === cat.id && l.tipo === 'orcado')
      .reduce((acc, l) => acc + l.valor, 0);
    const realizado = data.lancamentos
      .filter(l => l.ano === year && l.categoriaId === cat.id && l.tipo === 'realizado')
      .reduce((acc, l) => acc + l.valor, 0);
    return { ...cat, orcado, realizado };
  });

  const totalRenda = categoriesSummary
    .filter(c => c.tipo === 'renda')
    .reduce((acc, c) => acc + c.realizado, 0);

  return (
    <div className="p-6 space-y-6 bg-white-off min-h-full">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white-pure rounded-full text-navy-principal transition-colors"><ChevronRight className="rotate-180" /></button>
        <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('more.report.title')} {year}</h1>
      </div>

      <div className="bg-white-pure rounded-[32px] border border-gray-soft shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white-off">
              <th className="p-4 text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('dashboard.category')}</th>
              <th className="p-4 text-[10px] font-bold text-gray-light uppercase tracking-widest text-right">{t('dashboard.budgeted')}</th>
              <th className="p-4 text-[10px] font-bold text-gray-light uppercase tracking-widest text-right">{t('dashboard.realized')}</th>
              <th className="p-4 text-[10px] font-bold text-gray-light uppercase tracking-widest text-right">% {t('category.type.renda')}</th>
            </tr>
          </thead>
          <tbody>
            {categoriesSummary.map(cat => (
              <tr key={cat.id} className="border-t border-white-off hover:bg-white-off/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icone}</span>
                    <span className="text-sm font-bold text-navy-principal truncate max-w-[80px]">{cat.nome}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-right text-gray-medium">{formatCurrency(cat.orcado, lang)}</td>
                <td className="p-4 text-sm text-right font-bold text-navy-principal">{formatCurrency(cat.realizado, lang)}</td>
                <td className="p-4 text-sm text-right text-gray-light font-mono">
                  {totalRenda > 0 ? formatPercent(cat.realizado / totalRenda, lang) : '0%'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MenuButton = ({ icon, title, description, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className="w-full p-6 bg-white-pure rounded-[32px] border border-gray-soft shadow-sm flex items-center gap-5 hover:bg-white-off transition-colors text-left relative group"
  >
    <div className="p-4 bg-white-off rounded-2xl group-hover:bg-white-pure transition-colors shadow-inner">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="font-serif font-bold text-navy-principal">{title}</h3>
        {badge !== undefined && (
          <span className="bg-gold-principal text-navy-principal text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-medium">{description}</p>
    </div>
    <ChevronRight className="text-gray-ice group-hover:text-gold-principal transition-colors" />
  </button>
);
