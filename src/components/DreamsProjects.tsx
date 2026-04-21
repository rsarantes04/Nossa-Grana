import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatPercent, cn, formatDate } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';
import { Target, Plus, ChevronRight, ChevronDown, Calendar, CheckCircle2, Trophy, Trash2, Archive, Edit2, History, Info, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';

interface DreamsProjectsProps {
  onBack: () => void;
}

export const DreamsProjects: React.FC<DreamsProjectsProps> = ({ onBack }) => {
  const { data, addSonhoProjeto, updateSonhoProjeto, removeSonhoProjeto } = useFinance();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingSonho, setEditingSonho] = useState<any>(null);
  const [expandedAportes, setExpandedAportes] = useState<Record<string, boolean>>({});

  const activeSonhos = useMemo(() => 
    data.sonhosProjetos.filter(s => s.ativa && !s.conquistado), 
  [data.sonhosProjetos]);

  const conqueredSonhos = useMemo(() => 
    data.sonhosProjetos.filter(s => s.ativa && s.conquistado), 
  [data.sonhosProjetos]);

  const archivedSonhos = useMemo(() => 
    data.sonhosProjetos.filter(s => !s.ativa), 
  [data.sonhosProjetos]);

  const toggleAportes = (id: string) => {
    setExpandedAportes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCelebrate = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#00875A', '#5856D6']
    });
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight className="rotate-180 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{t('more.dreams.title')}</h1>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-gold-principal text-navy-principal rounded-2xl shadow-lg shadow-gold-principal/10 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Ativos */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">{t('more.dreams.inProgress')}</h2>
        {activeSonhos.map((sonho) => (
          <SonhoCard 
            key={sonho.id} 
            sonho={sonho} 
            onToggleAportes={() => toggleAportes(sonho.id)}
            isExpanded={expandedAportes[sonho.id]}
            onEdit={() => setEditingSonho(sonho)}
          />
        ))}

        {activeSonhos.length === 0 && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full p-8 border-2 border-dashed border-gray-200 rounded-[32px] text-gray-400 font-bold flex flex-col items-center justify-center gap-2 hover:border-[#00875A] hover:text-[#00875A] transition-all bg-white/50"
          >
            <Target size={32} className="opacity-20" />
            <span>{t('more.dreams.startNew')}</span>
          </button>
        )}
      </div>

      {/* Conquistados */}
      {conqueredSonhos.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xs font-bold text-gold-principal uppercase tracking-wider px-2 flex items-center gap-2">
            <Trophy size={14} />
            {t('more.dreams.conquered')}
          </h2>
          {conqueredSonhos.map((sonho) => (
            <SonhoCard 
              key={sonho.id} 
              sonho={sonho} 
              onToggleAportes={() => toggleAportes(sonho.id)}
              isExpanded={expandedAportes[sonho.id]}
              onEdit={() => setEditingSonho(sonho)}
              isConquered
            />
          ))}
        </div>
      )}

      {/* Arquivados / Inativos */}
      {archivedSonhos.length > 0 && (
        <div className="space-y-4 pt-4 opacity-60">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">{t('more.dreams.inactive')}</h2>
          {archivedSonhos.map((sonho) => (
            <SonhoCard 
              key={sonho.id} 
              sonho={sonho} 
              onToggleAportes={() => toggleAportes(sonho.id)}
              isExpanded={expandedAportes[sonho.id]}
              onEdit={() => setEditingSonho(sonho)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {(isAdding || editingSonho) && (
          <SonhoModal 
            sonho={editingSonho}
            onClose={() => {
              setIsAdding(false);
              setEditingSonho(null);
            }}
            onSave={(data) => {
              if (editingSonho) {
                updateSonhoProjeto(editingSonho.id, data);
              } else {
                addSonhoProjeto(data as any);
              }
              setIsAdding(false);
              setEditingSonho(null);
            }}
            onArchive={(id) => {
              updateSonhoProjeto(id, { ativa: false });
              setEditingSonho(null);
            }}
            onRemove={(id) => {
              removeSonhoProjeto(id);
              setEditingSonho(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SonhoCard = ({ sonho, onToggleAportes, isExpanded, onEdit, isConquered }: any) => {
  const { t, lang } = useTranslation();
  const progress = Math.min(1, sonho.progresso);
  const isGold = progress >= 1;

  return (
    <div className={cn(
      "bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all",
      isConquered && "border-emerald-100 bg-emerald-50/30"
    )}>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              style={{ backgroundColor: `${sonho.cor}15`, color: sonho.cor }}
            >
              {sonho.icone}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900">{sonho.nome}</h3>
                {isConquered && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">🎉 {t('more.dreams.conquered')}</span>}
                {sonho.origemCriacao === 'categorias' && sonho.valorMeta === 0 && (
                  <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border border-blue-100">
                    {t('more.dreams.createdViaCategories')}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 capitalize">{t(`more.dreams.type.${sonho.tipo}` as any)}</p>
            </div>
          </div>
          <button 
            onClick={onEdit}
            className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Edit2 size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('more.dreams.progress')}</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(sonho.valorAcumulado, lang)} 
                {sonho.valorMeta > 0 ? (
                  <span className="text-gray-400 font-medium"> / {formatCurrency(sonho.valorMeta, lang)}</span>
                ) : (
                  <span className="text-gray-400 font-medium italic"> ({t('more.dreams.noMeta')})</span>
                )}
              </p>
            </div>
            <span className={cn(
              "text-lg font-black italic",
              isGold ? "text-yellow-500" : "text-emerald-600"
            )}>
              {sonho.valorMeta > 0 ? formatPercent(sonho.progresso, lang) : '–'}
            </span>
          </div>
          
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
            {sonho.valorMeta > 0 ? (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                className={cn(
                  "h-full rounded-full transition-colors duration-1000",
                  isGold ? "bg-gradient-to-r from-gold-principal to-gold-dark" : "bg-gold-principal"
                )}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={onEdit}
                  className="text-[8px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                >
                  {t('more.dreams.setMeta')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-2 pt-2 border-t border-gray-50">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {sonho.prazo && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                <Calendar size={12} />
                <span>{t('more.dreams.until')} {formatDate(parseISO(sonho.prazo), lang)}</span>
              </div>
            )}
            {sonho.estimativaConclusao && !isConquered && (
              <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold uppercase">
                <Clock size={12} />
                <span>{t('more.dreams.est')} {t(`month.short.${new Date(sonho.estimativaConclusao).getMonth()}` as any)}/{new Date(sonho.estimativaConclusao).getFullYear()}</span>
              </div>
            )}
          </div>
          <button 
            onClick={onToggleAportes}
            className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
          >
            <History size={12} />
            <span>{t('more.dreams.contributions')}</span>
            <ChevronDown size={12} className={cn("transition-transform", isExpanded && "rotate-180")} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50/50 border-t border-gray-50 overflow-hidden"
          >
            <div className="p-6 space-y-3">
              <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('more.dreams.history')}</h4>
              <div className="space-y-2">
                {sonho.aportes.map((aporte: any, idx: number) => (
                  <div key={aporte.lancamentoId || idx} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        aporte.status === 'confirmado' ? "bg-emerald-500" : "bg-gray-300"
                      )} />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{formatCurrency(aporte.valor, lang)}</p>
                        <p className="text-[10px] text-gray-400">
                          {formatDate(parseISO(aporte.data), lang)}
                          {aporte.parcelamentoId && ` • ${t('dashboard.installment')} ${aporte.numeroParcela}/${aporte.totalParcelas}`}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md",
                      aporte.status === 'confirmado' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                    )}>
                      {t(`more.dreams.status.${aporte.status}` as any)}
                    </span>
                  </div>
                ))}
                {sonho.aportes.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4 italic">{t('more.dreams.noContributions')}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SonhoModal = ({ sonho, onClose, onSave, onArchive, onRemove }: any) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    nome: sonho?.nome || '',
    tipo: sonho?.tipo || 'sonho',
    valorMeta: sonho?.valorMeta || '',
    prazo: sonho?.prazo || '',
    icone: sonho?.icone || '⭐',
    cor: sonho?.cor || '#00875A',
    ativa: sonho?.ativa ?? true
  });

  const icons = ['⭐', '🚗', '🏠', '✈️', '🎓', '💍', '💻', '🚲', '🎸', '🏖️', '📱', '🎮'];
  const colors = ['#00875A', '#5856D6', '#FF9500', '#FF3B30', '#AF52DE', '#4A90D9', '#FF2D55', '#FFCC00'];

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{sonho ? t('more.dreams.edit') : t('more.dreams.new')} {t('more.dreams.dream')}</h2>
          {sonho && (
            <div className="flex gap-2">
              <button 
                onClick={() => onArchive(sonho.id)}
                className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"
                title={t('more.dreams.archive') as string}
              >
                <Archive size={20} />
              </button>
              <button 
                onClick={() => {
                  if (confirm(t('more.dreams.confirmDelete') as string)) {
                    onRemove(sonho.id);
                  }
                }}
                className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                title={t('more.dreams.delete') as string}
              >
                <Trash2 size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg border-4 border-white"
              style={{ backgroundColor: `${formData.cor}15`, color: formData.cor }}
            >
              {formData.icone}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{t('more.dreams.form.name')}</label>
              <input 
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder={t('more.dreams.form.namePlaceholder')}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{t('more.dreams.form.type')}</label>
                <select 
                  value={formData.tipo}
                  onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium appearance-none"
                >
                  <option value="sonho">{t('more.dreams.type.sonho')}</option>
                  <option value="projeto">{t('more.dreams.type.projeto')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{t('more.dreams.form.meta')}</label>
                <input 
                  type="number"
                  value={formData.valorMeta}
                  onChange={e => setFormData({ ...formData, valorMeta: e.target.value })}
                  placeholder="0,00"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{t('more.dreams.form.prazo')}</label>
              <input 
                type="date"
                value={formData.prazo}
                onChange={e => setFormData({ ...formData, prazo: e.target.value })}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{t('more.dreams.form.icon')}</label>
              <div className="flex flex-wrap gap-2">
                {icons.map(icon => (
                  <button 
                    key={icon}
                    onClick={() => setFormData({ ...formData, icone: icon })}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                      formData.icone === icon ? "bg-emerald-100 scale-110 shadow-sm" : "bg-gray-50 hover:bg-gray-100"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{t('more.dreams.form.color')}</label>
              <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                  <button 
                    key={color}
                    onClick={() => setFormData({ ...formData, cor: color })}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      formData.cor === color ? "ring-4 ring-emerald-500/20 scale-110" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button 
              onClick={() => onSave({ ...formData, valorMeta: Number(formData.valorMeta) })}
              disabled={!formData.nome || !formData.valorMeta}
              className="w-full p-5 bg-gold-principal text-navy-principal rounded-2xl font-bold shadow-lg shadow-gold-principal/20 disabled:opacity-50 disabled:shadow-none transition-all"
            >
              {sonho ? t('more.dreams.form.saveChanges') : t('more.dreams.form.create')}
            </button>
            <button 
              onClick={onClose}
              className="w-full p-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
            >
              {t('more.dreams.form.cancel')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
