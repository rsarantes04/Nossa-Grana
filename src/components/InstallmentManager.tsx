import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Edit2, Trash2, Ban, BarChart3, ChevronRight, 
  Check, AlertTriangle, Calendar, Tag, Info, MessageSquare
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { Lancamento, Parcelamento, PaymentMethod } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { CurrencyInput } from './CurrencyInput';
import { useTranslation } from '../i18n/useTranslation';

interface InstallmentManagerProps {
  lancamento: Lancamento;
  onClose: () => void;
}

export const InstallmentManager: React.FC<InstallmentManagerProps> = ({ lancamento, onClose }) => {
  const { data, updateInstallmentIndividual, updateInstallmentsRemaining, removeInstallmentIndividual, cancelInstallmentsRemaining } = useFinance();
  const [view, setView] = useState<'actions' | 'edit-single' | 'edit-remaining' | 'summary' | 'confirm-delete' | 'confirm-cancel'>('actions');

  const parcelamento = useMemo(() => 
    data.parcelamentos.find(p => p.id === lancamento.parcelamentoId),
    [data.parcelamentos, lancamento.parcelamentoId]
  );

  if (!parcelamento) return null;

  const renderView = () => {
    switch (view) {
      case 'actions':
        return (
          <ActionsView 
            lancamento={lancamento} 
            parcelamento={parcelamento} 
            onSelect={setView} 
            onClose={onClose} 
          />
        );
      case 'edit-single':
        return (
          <EditSingleView 
            lancamento={lancamento} 
            onClose={() => setView('actions')} 
            onSave={(updates) => {
              updateInstallmentIndividual(lancamento.id, updates);
              onClose();
            }} 
          />
        );
      case 'edit-remaining':
        return (
          <EditRemainingView 
            lancamento={lancamento} 
            parcelamento={parcelamento}
            onClose={() => setView('actions')} 
            onSave={(updates, applyToAll) => {
              updateInstallmentsRemaining(parcelamento.id, lancamento.numeroParcela!, updates, applyToAll);
              onClose();
            }} 
          />
        );
      case 'summary':
        return (
          <SummaryView 
            parcelamento={parcelamento} 
            lancamentos={data.lancamentos.filter(l => l.parcelamentoId === parcelamento.id)}
            onClose={() => setView('actions')} 
          />
        );
      case 'confirm-delete':
        return (
          <ConfirmDeleteView 
            lancamento={lancamento} 
            onClose={() => setView('actions')} 
            onConfirm={() => {
              removeInstallmentIndividual(lancamento.id);
              onClose();
            }} 
          />
        );
      case 'confirm-cancel':
        return (
          <ConfirmCancelView 
            lancamento={lancamento} 
            parcelamento={parcelamento}
            onClose={() => setView('actions')} 
            onConfirm={(motivo, obs) => {
              cancelInstallmentsRemaining(parcelamento.id, lancamento.numeroParcela!, motivo, obs);
              onClose();
            }} 
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white-pure w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {renderView()}
      </motion.div>
    </div>
  );
};

const ActionsView = ({ lancamento, parcelamento, onSelect, onClose }: any) => {
  const { t, lang } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="p-6 border-b border-gray-soft bg-white-off/50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-navy-principal">{lancamento.descricao}</h2>
            <p className="text-sm text-gray-medium font-medium">{t('installment.parcela', lancamento.numeroParcela, lancamento.totalParcelas)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-pure rounded-full transition-all">
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1.5 bg-white-pure border border-gray-soft rounded-xl text-xs font-bold text-navy-principal flex items-center gap-2 shadow-sm">
            <Tag size={14} className="text-gold-principal" />
            {formatCurrency(lancamento.valor, lang)}
          </div>
          <div className="px-3 py-1.5 bg-white-pure border border-gray-soft rounded-xl text-xs font-bold text-navy-principal flex items-center gap-2 shadow-sm">
            <Calendar size={14} className="text-blue-dark" />
            {lancamento.data ? formatDate(lancamento.data, lang) : '-'}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2 overflow-y-auto no-scrollbar">
        <ActionButton 
          icon={<Edit2 size={20} className="text-blue-dark" />}
          title={t('installment.editSingle', lancamento.numeroParcela, lancamento.totalParcelas)}
          subtitle={t('installment.editSingleSub')}
          onClick={() => onSelect('edit-single')}
        />
        <ActionButton 
          icon={<BarChart3 size={20} className="text-gold-principal" />}
          title={t('installment.editRemaining', lancamento.numeroParcela, lancamento.totalParcelas)}
          subtitle={t('installment.editRemainingSub', lancamento.numeroParcela)}
          onClick={() => onSelect('edit-remaining')}
        />
        <ActionButton 
          icon={<Trash2 size={20} className="text-red-brick" />}
          title={t('installment.deleteSingle')}
          subtitle={t('installment.deleteSingleSub', lancamento.numeroParcela, lancamento.totalParcelas)}
          onClick={() => onSelect('confirm-delete')}
        />
        <ActionButton 
          icon={<Ban size={20} className="text-amber-principal" />}
          title={t('installment.cancelRemaining')}
          subtitle={t('installment.cancelRemainingSub', lancamento.numeroParcela)}
          onClick={() => onSelect('confirm-cancel')}
        />
        <ActionButton 
          icon={<Info size={20} className="text-gray-medium" />}
          title={t('installment.summary')}
          subtitle={t('installment.summarySub')}
          onClick={() => onSelect('summary')}
        />
      </div>

      <div className="p-6 bg-white-off/50 border-t border-gray-soft">
        <button onClick={onClose} className="w-full py-4 text-gray-medium font-bold hover:text-navy-principal transition-colors">
          {t('installment.close')}
        </button>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, title, subtitle, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 hover:bg-white-off rounded-2xl transition-all group text-left"
  >
    <div className="w-12 h-12 rounded-xl bg-white-pure border border-gray-soft flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-navy-principal text-sm">{title}</h4>
      <p className="text-xs text-gray-medium truncate">{subtitle}</p>
    </div>
    <ChevronRight size={18} className="text-gray-ice group-hover:text-gold-principal transition-colors" />
  </button>
);

const EditSingleView = ({ lancamento, onClose, onSave }: any) => {
  const { data } = useFinance();
  const { t } = useTranslation();
  const [valor, setValor] = useState(lancamento.valor.toString());
  const [dataVenc, setDataVenc] = useState(lancamento.data?.split('T')[0] || '');
  const [catId, setCatId] = useState(lancamento.categoriaId);
  const [subcatId, setSubcatId] = useState(lancamento.subcategoriaId);
  const [tipo, setTipo] = useState(lancamento.tipo);
  const [obs, setObs] = useState(lancamento.observacao || '');

  const category = data.categorias.find(c => c.id === catId);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-soft flex justify-between items-center bg-white-off/50">
        <h2 className="text-xl font-serif font-bold text-navy-principal">{t('installment.edit.singleTitle', lancamento.numeroParcela, lancamento.totalParcelas)}</h2>
        <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-pure rounded-full transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('installment.edit.descriptionRead')}</label>
          <div className="p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-gray-medium flex items-center gap-2">
            <Info size={14} />
            {lancamento.descricao}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('editTransaction.category')}</label>
            <select 
              value={catId}
              onChange={(e) => {
                setCatId(e.target.value);
                setSubcatId('');
              }}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal"
            >
              {data.categorias.filter(c => c.ativa).map(c => (
                <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('editTransaction.subcategory')}</label>
            <select 
              value={subcatId}
              onChange={(e) => setSubcatId(e.target.value)}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal"
            >
              <option value="">{t('quick.select_subcategory')}</option>
              {category?.subcategorias.filter(s => s.ativa).map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('installment.edit.value')}</label>
            <CurrencyInput 
              value={valor}
              onChange={setValor}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('installment.edit.date')}</label>
            <input 
              type="date"
              value={dataVenc}
              onChange={(e) => setDataVenc(e.target.value)}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal"
            />
          </div>
        </div>

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

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('quick.observation')}</label>
          <textarea 
            value={obs}
            onChange={(e) => setObs(e.target.value.slice(0, 200))}
            placeholder={t('quick.description_placeholder')}
            className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal h-24 resize-none"
          />
          <div className="text-[10px] text-gray-light text-right">{obs.length}/200</div>
        </div>
      </div>

      <div className="p-6 bg-white-off/50 border-t border-gray-soft flex gap-3">
        <button onClick={onClose} className="flex-1 py-4 text-gray-medium font-bold hover:text-navy-principal transition-colors">{t('installment.edit.cancel')}</button>
        <button 
          onClick={() => onSave({ 
            valor: parseFloat(valor), 
            data: dataVenc ? new Date(dataVenc + 'T12:00:00Z').toISOString() : lancamento.data,
            categoriaId: catId,
            subcategoriaId: subcatId,
            tipo,
            observacao: obs
          })}
          className="flex-[2] py-4 bg-navy-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-navy-principal/10 hover:bg-navy-dark transition-all"
        >
          {t('installment.edit.save')}
        </button>
      </div>
    </div>
  );
};

const EditRemainingView = ({ lancamento, parcelamento, onClose, onSave }: any) => {
  const { data } = useFinance();
  const { t } = useTranslation();
  const [valor, setValor] = useState(lancamento.valor.toString());
  const [dataVenc, setDataVenc] = useState(lancamento.data?.split('T')[0] || '');
  const [catId, setCatId] = useState(lancamento.categoriaId);
  const [subcatId, setSubcatId] = useState(lancamento.subcategoriaId);
  const [tipo, setTipo] = useState(lancamento.tipo);
  const [obs, setObs] = useState(lancamento.observacao || '');
  const [applyToAll, setApplyToAll] = useState<Record<string, boolean>>({
    valor: true,
    categoriaId: true,
    subcategoriaId: true,
    tipo: true,
    observacao: true,
    data: true
  });

  const category = data.categorias.find(c => c.id === catId);

  const toggleApply = (key: string) => setApplyToAll(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-soft flex justify-between items-center bg-white-off/50">
        <div>
          <h2 className="text-xl font-serif font-bold text-navy-principal">{t('installment.edit.remainingTitle', lancamento.numeroParcela, lancamento.totalParcelas)}</h2>
          <p className="text-xs text-gray-medium">{t('installment.edit.remainingSub', lancamento.numeroParcela, lancamento.totalParcelas)}</p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-pure rounded-full transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('installment.edit.value')}</label>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gold-dark cursor-pointer">
                <input type="checkbox" checked={applyToAll.valor} onChange={() => toggleApply('valor')} className="rounded text-gold-principal focus:ring-gold-principal" />
                {t('installment.edit.applyToAll')}
              </label>
            </div>
            <CurrencyInput 
              value={valor}
              onChange={setValor}
              disabled={!applyToAll.valor}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('editTransaction.category')} & {t('editTransaction.subcategory')}</label>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gold-dark cursor-pointer">
                <input type="checkbox" checked={applyToAll.categoriaId} onChange={() => {
                  toggleApply('categoriaId');
                  toggleApply('subcategoriaId');
                }} className="rounded text-gold-principal focus:ring-gold-principal" />
                {t('installment.edit.applyToAll')}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select 
                value={catId}
                disabled={!applyToAll.categoriaId}
                onChange={(e) => {
                  setCatId(e.target.value);
                  setSubcatId('');
                }}
                className={cn(
                  "w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal",
                  !applyToAll.categoriaId && "opacity-50 cursor-not-allowed"
                )}
              >
                {data.categorias.filter(c => c.ativa).map(c => (
                  <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                ))}
              </select>
              <select 
                value={subcatId}
                disabled={!applyToAll.subcategoriaId}
                onChange={(e) => setSubcatId(e.target.value)}
                className={cn(
                  "w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal",
                  !applyToAll.subcategoriaId && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">{t('quick.select_subcategory')}</option>
                {category?.subcategorias.filter(s => s.ativa).map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('installment.edit.nextDate')}</label>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gold-dark cursor-pointer">
                <input type="checkbox" checked={applyToAll.data} onChange={() => toggleApply('data')} className="rounded text-gold-principal focus:ring-gold-principal" />
                {t('installment.edit.recalculate')}
              </label>
            </div>
            <input 
              type="date"
              disabled={!applyToAll.data}
              value={dataVenc}
              onChange={(e) => setDataVenc(e.target.value)}
              className={cn(
                "w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal",
                !applyToAll.data && "opacity-50 cursor-not-allowed"
              )}
            />
            {applyToAll.data && (
              <p className="text-[10px] text-gray-medium italic flex items-center gap-1">
                <Info size={10} /> {t('installment.edit.recalculateInfo')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('editTransaction.type')} & {t('quick.observation')}</label>
              <label className="flex items-center gap-2 text-[10px] font-bold text-gold-dark cursor-pointer">
                <input type="checkbox" checked={applyToAll.tipo} onChange={() => {
                  toggleApply('tipo');
                  toggleApply('observacao');
                }} className="rounded text-gold-principal focus:ring-gold-principal" />
                {t('installment.edit.applyToAll')}
              </label>
            </div>
            <div className="flex gap-4 mb-2">
              <label className={cn("flex items-center gap-2 cursor-pointer", !applyToAll.tipo && "opacity-50")}>
                <input type="radio" disabled={!applyToAll.tipo} checked={tipo === 'realizado'} onChange={() => setTipo('realizado')} className="w-4 h-4 text-gold-principal focus:ring-gold-principal" />
                <span className="text-sm font-bold text-navy-principal">{t('quick.type_realized')}</span>
              </label>
              <label className={cn("flex items-center gap-2 cursor-pointer", !applyToAll.tipo && "opacity-50")}>
                <input type="radio" disabled={!applyToAll.tipo} checked={tipo === 'orcado'} onChange={() => setTipo('orcado')} className="w-4 h-4 text-gold-principal focus:ring-gold-principal" />
                <span className="text-sm font-bold text-navy-principal">{t('quick.type_budgeted')}</span>
              </label>
            </div>
            <textarea 
              value={obs}
              disabled={!applyToAll.observacao}
              onChange={(e) => setObs(e.target.value.slice(0, 200))}
              placeholder={t('quick.description_placeholder')}
              className={cn(
                "w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal h-24 resize-none",
                !applyToAll.observacao && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-white-off/50 border-t border-gray-soft flex gap-3">
        <button onClick={onClose} className="flex-1 py-4 text-gray-medium font-bold hover:text-navy-principal transition-colors">{t('installment.edit.cancel')}</button>
        <button 
          onClick={() => onSave({ 
            valor: parseFloat(valor), 
            data: dataVenc ? new Date(dataVenc + 'T12:00:00Z').toISOString() : lancamento.data,
            categoriaId: catId,
            subcategoriaId: subcatId,
            tipo,
            observacao: obs
          }, applyToAll)}
          className="flex-[2] py-4 bg-navy-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-navy-principal/10 hover:bg-navy-dark transition-all"
        >
          {t('installment.edit.save')}
        </button>
      </div>
    </div>
  );
};

const ConfirmDeleteView = ({ lancamento, onClose, onConfirm }: any) => {
  const { t, lang } = useTranslation();
  return (
    <div className="p-8 space-y-6">
      <div className="w-16 h-16 bg-red-soft rounded-full flex items-center justify-center mx-auto text-red-brick">
        <AlertTriangle size={32} />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-serif font-bold text-navy-principal">{t('installment.confirmDelete.title', lancamento.numeroParcela, lancamento.totalParcelas)}</h2>
        <p className="text-sm text-gray-medium leading-relaxed">
          {t('installment.confirmDelete.description', lancamento.numeroParcela)}
        </p>
      </div>
      <div className="p-4 bg-white-off rounded-2xl space-y-2 border border-gray-soft">
        <div className="flex justify-between text-sm">
          <span className="text-gray-light font-bold uppercase tracking-widest text-[10px]">{t('editTransaction.description')}:</span>
          <span className="font-bold text-navy-principal">{lancamento.descricao}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-light font-bold uppercase tracking-widest text-[10px]">{t('editTransaction.value')}:</span>
          <span className="font-bold text-red-brick">{formatCurrency(lancamento.valor, lang)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="w-full py-4 bg-red-brick text-white-pure rounded-2xl font-bold shadow-lg shadow-red-brick/20 hover:bg-red-dark transition-all">{t('installment.confirmDelete.confirm')}</button>
        <button onClick={onClose} className="w-full py-2 text-gray-light font-bold text-sm">{t('installment.confirmDelete.cancel')}</button>
      </div>
    </div>
  );
};

const ConfirmCancelView = ({ lancamento, parcelamento, onClose, onConfirm }: any) => {
  const { t } = useTranslation();
  const [motivo, setMotivo] = useState('');
  const [obs, setObs] = useState('');

  const remainingCount = parcelamento.totalParcelas - lancamento.numeroParcela + 1;

  return (
    <div className="flex flex-col h-full">
      <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
        <div className="w-16 h-16 bg-amber-soft rounded-full flex items-center justify-center mx-auto text-amber-principal">
          <Ban size={32} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-serif font-bold text-navy-principal">{t('installment.confirmCancel.title')}</h2>
          <p className="text-sm text-gray-medium leading-relaxed">
            {t('installment.confirmCancel.description', lancamento.numeroParcela, parcelamento.totalParcelas)}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('installment.confirmCancel.motivo')}</label>
            <select 
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none focus:ring-2 focus:ring-gold-principal"
            >
              <option value="">{t('installment.confirmCancel.motivoPlaceholder')}</option>
              <option value="Devolução">{t('installment.confirmCancel.motivos.Devolução')}</option>
              <option value="Desistência">{t('installment.confirmCancel.motivos.Desistência')}</option>
              <option value="Erro">{t('installment.confirmCancel.motivos.Erro')}</option>
              <option value="Outro">{t('installment.confirmCancel.motivos.Outro')}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('installment.confirmCancel.obs')}</label>
            <textarea 
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold text-navy-principal outline-none h-20 resize-none focus:ring-2 focus:ring-gold-principal"
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-white-off/50 border-t border-gray-soft flex flex-col gap-3">
        <button onClick={() => onConfirm(motivo, obs)} className="w-full py-4 bg-amber-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-amber-principal/20 hover:bg-amber-dark transition-all">{t('installment.confirmCancel.confirm')}</button>
        <button onClick={onClose} className="w-full py-2 text-gray-light font-bold text-sm">{t('installment.confirmCancel.cancel')}</button>
      </div>
    </div>
  );
};

const SummaryView = ({ parcelamento, lancamentos, onClose }: any) => {
  const { t, lang } = useTranslation();
  const paidCount = lancamentos.filter((l: any) => {
    const date = parseISO(l.data);
    return date <= new Date();
  }).length;
  
  const progress = (paidCount / parcelamento.totalParcelas) * 100;
  const totalPaid = lancamentos.filter((l: any) => parseISO(l.data) <= new Date()).reduce((acc: number, l: any) => acc + l.valor, 0);
  const totalRemaining = parcelamento.valorTotal - totalPaid;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-soft flex items-center gap-4 bg-white-off/50">
        <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-pure rounded-full transition-all">
          <X size={24} />
        </button>
        <h2 className="text-xl font-serif font-bold text-navy-principal">{t('installment.summaryView.title')}</h2>
      </div>

      <div className="p-6 overflow-y-auto space-y-8 flex-1 no-scrollbar">
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-serif font-bold text-navy-principal">{parcelamento.descricao}</h3>
          <p className="text-sm text-gray-medium">{t('installment.summaryView.created', formatDate(parcelamento.dataInicio, lang))}</p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-light">
            <span>{t('installment.summaryView.progress')}</span>
            <span className="text-navy-principal">{t('installment.summaryView.paidStatus', paidCount, parcelamento.totalParcelas, Math.round(progress))}</span>
          </div>
          <div className="h-4 bg-white-off rounded-full overflow-hidden border border-gray-soft shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gold-principal"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SummaryCard label={t('installment.summaryView.totalValue')} value={formatCurrency(parcelamento.valorTotal, lang)} />
          <SummaryCard label={t('installment.summaryView.installmentValue')} value={formatCurrency(parcelamento.valorParcela, lang)} />
          <SummaryCard label={t('installment.summaryView.totalPaid')} value={formatCurrency(totalPaid, lang)} color="text-green-forest" />
          <SummaryCard label={t('installment.summaryView.remaining')} value={formatCurrency(totalRemaining, lang)} color="text-red-brick" />
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-gray-light uppercase tracking-widest flex items-center gap-2">
            <Calendar size={12} /> {t('installment.summaryView.nextInstallments')}
          </h4>
          <div className="space-y-2">
            {lancamentos
              .filter((l: any) => parseISO(l.data) > new Date())
              .slice(0, 3)
              .map((l: any) => (
                <div key={l.id} className="flex justify-between items-center p-4 bg-white-off rounded-2xl border border-gray-soft hover:bg-white-ice transition-colors">
                  <span className="text-sm font-bold text-navy-principal">{t('installment.parcela', l.numeroParcela, l.totalParcelas)}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-navy-principal">{formatCurrency(l.valor, lang)}</p>
                    <p className="text-[10px] text-gray-medium font-mono">{formatDate(l.data, lang)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-white-off/50 border-t border-gray-soft flex gap-3">
        <button className="flex-1 py-4 bg-white-pure border border-gray-soft text-navy-principal rounded-2xl font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-white-ice transition-colors">
          <BarChart3 size={18} /> {t('installment.summaryView.export')}
        </button>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, color = "text-navy-principal" }: any) => (
  <div className="p-4 bg-white-off rounded-2xl space-y-1 border border-gray-soft shadow-sm">
    <p className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{label}</p>
    <p className={cn("text-lg font-serif font-bold", color)}>{value}</p>
  </div>
);
