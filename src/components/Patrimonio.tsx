import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useTranslation } from '../i18n/useTranslation';
import { formatCurrency, cn } from '../lib/utils';
import { Patrimonio, PatrimonioCategory } from '../types';
import { 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2, 
  Home, 
  Car, 
  TrendingUp, 
  X,
  Calendar,
  Info,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PatrimonioProps {
  onBack: () => void;
}

const CATEGORIES: { id: PatrimonioCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'imovel', label: 'patrimonio.imoveis', icon: <Home size={18} /> },
  { id: 'veiculo', label: 'patrimonio.veiculos', icon: <Car size={18} /> },
  { id: 'investimento', label: 'patrimonio.investimentos', icon: <TrendingUp size={18} /> },
];

const SUBCATEGORIES: Record<PatrimonioCategory, { id: string; label: string; icon: string; bg: string }[]> = {
  imovel: [
    { id: 'Terreno', label: 'patrimonio.sub.terreno', icon: '🌿', bg: '#FAEEDA' },
    { id: 'Casa', label: 'patrimonio.sub.casa', icon: '🏠', bg: '#E1F5EE' },
    { id: 'Apartamento', label: 'patrimonio.sub.apartamento', icon: '🏢', bg: '#E6F1FB' },
    { id: 'Sítio', label: 'patrimonio.sub.sitio', icon: '🌾', bg: '#EAF3DE' },
    { id: 'Imóvel para locação', label: 'patrimonio.sub.locacao', icon: '🔑', bg: '#EEEDFE' },
  ],
  veiculo: [
    { id: 'Carro', label: 'patrimonio.sub.carro', icon: '🚗', bg: '#E6F1FB' },
    { id: 'Moto', label: 'patrimonio.sub.moto', icon: '🏍', bg: '#FAEEDA' },
  ],
  investimento: [
    { id: 'Ouro', label: 'patrimonio.sub.ouro', icon: '🥇', bg: '#FAEEDA' },
    { id: 'Criptomoeda', label: 'patrimonio.sub.cripto', icon: '₿', bg: '#FAECE7' },
    { id: 'Ações em bolsa', label: 'patrimonio.sub.acoes', icon: '📊', bg: '#EAF3DE' },
    { id: 'ETFs', label: 'patrimonio.sub.etfs', icon: '📦', bg: '#EEEDFE' },
    { id: 'Fundos de Investimentos', label: 'patrimonio.sub.fundos', icon: '💼', bg: '#E1F5EE' },
    { id: 'CDB', label: 'patrimonio.sub.cdb', icon: '🏦', bg: '#E6F1FB' },
    { id: 'LCI / LCA', label: 'patrimonio.sub.lci', icon: '🌱', bg: '#EAF3DE' },
    { id: 'Tesouro', label: 'patrimonio.sub.tesouro', icon: '🏛', bg: '#FAEEDA' },
    { id: 'Ações fora da bolsa', label: 'patrimonio.sub.acoes_fora', icon: '📋', bg: '#EEEDFE' },
    { id: 'Debêntures', label: 'patrimonio.sub.debentures', icon: '📄', bg: '#E6F1FB' },
    { id: 'Mercado futuro', label: 'patrimonio.sub.futuro', icon: '📉', bg: '#FAECE7' },
    { id: 'Derivativo', label: 'patrimonio.sub.derivativo', icon: '🔁', bg: '#FBEAF0' },
  ]
};

export const PatrimonioScreen: React.FC<PatrimonioProps> = ({ onBack }) => {
  const { data, addPatrimonio, updatePatrimonio, removePatrimonio } = useFinance();
  const { t, lang } = useTranslation();
  const [filter, setFilter] = useState<'all' | PatrimonioCategory>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Patrimonio | null>(null);
  const [deletingItem, setDeletingItem] = useState<Patrimonio | null>(null);

  const patrimonio = data.patrimonio || [];

  const totals = useMemo(() => {
    const total = patrimonio.reduce((acc, item) => acc + item.valorAquisicao, 0);
    const imoveis = patrimonio.filter(i => i.categoria === 'imovel').reduce((acc, item) => acc + item.valorAquisicao, 0);
    const veiculos = patrimonio.filter(i => i.categoria === 'veiculo').reduce((acc, item) => acc + item.valorAquisicao, 0);
    const investimentos = patrimonio.filter(i => i.categoria === 'investimento').reduce((acc, item) => acc + item.valorAquisicao, 0);
    return { total, imoveis, veiculos, investimentos };
  }, [patrimonio]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return patrimonio;
    return patrimonio.filter(i => i.categoria === filter);
  }, [patrimonio, filter]);

  const groupedItems = useMemo(() => {
    const groups: Record<PatrimonioCategory, Patrimonio[]> = {
      imovel: [],
      veiculo: [],
      investimento: []
    };
    filteredItems.forEach(item => {
      groups[item.categoria].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleSave = (formData: any) => {
    if (editingItem) {
      updatePatrimonio(editingItem.id, formData);
    } else {
      addPatrimonio(formData);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const getSubcategoryInfo = (category: PatrimonioCategory, subId: string) => {
    return SUBCATEGORIES[category].find(s => s.id === subId) || { icon: '❓', bg: '#F5F5F5', label: subId };
  };

  return (
    <div className="p-6 space-y-6 bg-white-off min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white-pure rounded-full text-navy-principal transition-colors">
            <ChevronRight className="rotate-180" />
          </button>
          <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('more.patrimonio.title')}</h1>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="p-3 bg-gold-principal text-navy-principal rounded-2xl shadow-lg shadow-gold-principal/20 hover:bg-gold-dark transition-all flex items-center gap-2 font-bold text-sm"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">{t('patrimonio.add')}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        <div className="bg-[#0F1A2E] p-8 rounded-[32px] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-principal/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-gold-principal/20 transition-all" />
          <p className="text-gray-ice/60 text-xs font-bold uppercase tracking-widest mb-2">{t('patrimonio.total')}</p>
          <h2 className="text-4xl font-serif font-bold text-gold-principal">
            {formatCurrency(totals.total, lang)}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <SummaryCard 
            icon={<Home size={16} />} 
            label={t('patrimonio.imoveis')} 
            value={totals.imoveis} 
            lang={lang}
          />
          <SummaryCard 
            icon={<Car size={16} />} 
            label={t('patrimonio.veiculos')} 
            value={totals.veiculos} 
            lang={lang}
          />
          <SummaryCard 
            icon={<TrendingUp size={16} />} 
            label={t('patrimonio.investimentos')} 
            value={totals.investimentos} 
            lang={lang}
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Chip 
          active={filter === 'all'} 
          onClick={() => setFilter('all')} 
          label={t('patrimonio.filter.all')} 
        />
        {CATEGORIES.map(cat => (
          <Chip 
            key={cat.id}
            active={filter === cat.id} 
            onClick={() => setFilter(cat.id)} 
            label={t(cat.label as any)} 
            icon={cat.icon}
          />
        ))}
      </div>

      {/* List Grouped by Category */}
      <div className="space-y-8">
        {CATEGORIES.map(cat => {
          const items = groupedItems[cat.id];
          if (items.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em]">
                  {t(cat.label as any)} · {items.length} {t('patrimonio.items')}
                </h3>
                <div className="h-px flex-1 bg-gray-soft mx-4" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {items.map(item => {
                  const subInfo = getSubcategoryInfo(item.categoria, item.subcategoria);
                  return (
                    <div key={item.id} className="bg-white-pure p-5 rounded-[32px] border border-gray-soft shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner"
                          style={{ backgroundColor: subInfo.bg }}
                        >
                          {subInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-serif font-bold text-navy-principal truncate">{item.descricao}</h4>
                              <p className="text-[10px] font-bold text-gray-medium uppercase tracking-wider">
                                {t(`patrimonio.${item.categoria}s` as any)} · {t(subInfo.label as any)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-serif font-bold text-gold-principal">
                                {formatCurrency(item.valorAquisicao, lang)}
                              </p>
                            </div>
                          </div>
                          
                          {item.observacao && (
                            <p className="text-xs text-gray-light mt-2 truncate italic">
                              {item.observacao}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-soft/50">
                            <button 
                              onClick={() => {
                                setEditingItem(item);
                                setIsModalOpen(true);
                              }}
                              className="flex-1 py-2 px-4 bg-white-off text-navy-principal rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gold-soft hover:text-gold-dark transition-all flex items-center justify-center gap-2"
                            >
                              <Edit2 size={12} />
                              {t('common.edit')}
                            </button>
                            <button 
                              onClick={() => setDeletingItem(item)}
                              className="py-2 px-4 text-red-brick hover:bg-red-soft rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-white-pure rounded-full flex items-center justify-center mx-auto shadow-inner text-gray-ice">
              <TrendingUp size={40} />
            </div>
            <div className="space-y-1">
              <p className="font-serif font-bold text-navy-principal text-lg">Nenhum patrimônio cadastrado</p>
              <p className="text-sm text-gray-medium">Comece a registrar seus bens e investimentos.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <PatrimonioModal 
            item={editingItem} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSave}
            t={t}
            lang={lang}
          />
        )}
        {deletingItem && (
          <DeleteModal 
            item={deletingItem} 
            onClose={() => setDeletingItem(null)} 
            onConfirm={() => {
              removePatrimonio(deletingItem.id);
              setDeletingItem(null);
            }}
            t={t}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, lang }: any) => (
  <div className="bg-white-pure p-4 rounded-3xl border border-gray-soft shadow-sm space-y-1">
    <div className="flex items-center gap-2 text-gray-medium">
      <div className="p-1.5 bg-white-off rounded-lg text-navy-principal">
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
    </div>
    <p className="text-sm font-serif font-bold text-navy-principal truncate">
      {formatCurrency(value, lang)}
    </p>
  </div>
);

const Chip = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap border",
      active 
        ? "bg-navy-principal text-white-pure border-navy-principal shadow-lg shadow-navy-principal/20" 
        : "bg-white-pure text-gray-medium border-gray-soft hover:border-gold-light hover:text-gold-dark"
    )}
  >
    {icon}
    {label}
  </button>
);

const PatrimonioModal = ({ item, onClose, onSave, t, lang }: any) => {
  const [categoria, setCategoria] = useState<PatrimonioCategory>(item?.categoria || 'imovel');
  const [subcategoria, setSubcategoria] = useState(item?.subcategoria || '');
  const [descricao, setDescricao] = useState(item?.descricao || '');
  const [valor, setValor] = useState(item?.valorAquisicao?.toString() || '');
  const [data, setData] = useState(item?.dataAquisicao || new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState(item?.observacao || '');

  const subOptions = SUBCATEGORIES[categoria];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoria || !descricao || !valor || !data) return;

    onSave({
      categoria,
      subcategoria,
      descricao,
      valorAquisicao: parseFloat(valor),
      dataAquisicao: data,
      observacao
    });
  };

  const selectedSubInfo = subOptions.find(s => s.id === subcategoria);

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white-pure w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-serif font-bold text-navy-principal">
            {item ? t('patrimonio.edit') : t('patrimonio.new')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white-off rounded-full transition-colors">
            <X size={24} className="text-gray-medium" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em]">{t('patrimonio.form.category')}</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoria(cat.id);
                    setSubcategoria('');
                  }}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all",
                    categoria === cat.id 
                      ? "bg-navy-principal border-navy-principal text-white-pure shadow-lg shadow-navy-principal/20" 
                      : "bg-white-off border-gray-soft text-gray-medium hover:border-gold-light"
                  )}
                >
                  {cat.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t(cat.label)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em]">{t('patrimonio.form.subcategory')}</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {subOptions.map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubcategoria(sub.id)}
                  className={cn(
                    "px-4 py-3 rounded-2xl border flex items-center gap-2 transition-all whitespace-nowrap",
                    subcategoria === sub.id 
                      ? "bg-gold-principal border-gold-principal text-navy-principal shadow-lg shadow-gold-principal/20" 
                      : "bg-white-pure border-gray-soft text-gray-medium hover:border-gold-light"
                  )}
                >
                  <span>{sub.icon}</span>
                  <span className="text-xs font-bold">{t(sub.label as any)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Card */}
          {subcategoria && (
            <div className="bg-[#0F1A2E] p-4 rounded-2xl flex items-center gap-4 border border-gold-principal/20">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: selectedSubInfo?.bg }}
              >
                {selectedSubInfo?.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gold-principal/60 uppercase tracking-widest">
                  {t(`patrimonio.${categoria}s` as any)}
                </p>
                <p className="text-sm font-bold text-white-pure">{t(selectedSubInfo?.label as any)}</p>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em]">{t('patrimonio.form.description')}</label>
              <input 
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Casa Rua das Flores, Corolla 2022..."
                required
                className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em]">{t('patrimonio.form.value')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-medium font-bold text-sm">R$</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    required
                    className="w-full p-4 pl-10 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em]">{t('patrimonio.form.date')}</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-medium" size={18} />
                  <input 
                    type="date"
                    value={data}
                    onChange={e => setData(e.target.value)}
                    required
                    className="w-full p-4 pl-12 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em]">{t('patrimonio.form.observation')}</label>
              <textarea 
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex: Matrícula, placa, corretora, vencimento..."
                rows={3}
                className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-medium resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              type="submit"
              disabled={!subcategoria || !descricao || !valor || !data}
              className="w-full py-5 bg-gold-principal text-navy-principal rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-gold-principal/20 hover:bg-gold-dark transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {t('patrimonio.form.save')}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-3 text-gray-light font-bold text-xs uppercase tracking-widest"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const DeleteModal = ({ item, onClose, onConfirm, t, lang }: any) => (
  <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[210] flex items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white-pure w-full max-w-xs rounded-[40px] p-8 space-y-6 text-center shadow-2xl"
    >
      <div className="w-20 h-20 bg-red-soft rounded-full flex items-center justify-center mx-auto text-red-brick shadow-inner">
        <Trash2 size={40} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-serif font-bold text-navy-principal">{t('patrimonio.delete.title')}</h3>
        <p className="text-sm text-gray-medium leading-relaxed">
          {t('patrimonio.delete.confirm')}
        </p>
        <div className="bg-white-off p-4 rounded-2xl mt-4">
          <p className="text-sm font-bold text-navy-principal">{item.descricao}</p>
          <p className="text-xs text-gold-dark font-bold">{formatCurrency(item.valorAquisicao, lang)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <button 
          onClick={onConfirm}
          className="w-full py-4 bg-red-brick text-white-pure rounded-2xl font-bold shadow-lg shadow-red-brick/20"
        >
          {t('common.delete')}
        </button>
        <button 
          onClick={onClose}
          className="w-full py-2 text-gray-light font-bold text-sm"
        >
          {t('common.cancel')}
        </button>
      </div>
    </motion.div>
  </div>
);
