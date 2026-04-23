import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Category, Subcategory, CategoryType } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { 
  Plus, Search, ChevronDown, Edit2, Archive, Trash2, 
  Check, X, Package, Info, Clock, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Categories: React.FC = () => {
  const { 
    data, addCategory, updateCategory, archiveCategory, removeCategory,
    addSubcategory, updateSubcategory, archiveSubcategory, removeSubcategory
  } = useFinance();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addingSubcatTo, setAddingSubcatTo] = useState<Category | null>(null);
  const [editingSubcat, setEditingSubcat] = useState<{ cat: Category, sub: Subcategory } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deletingSubcat, setDeletingSubcat] = useState<{ cat: Category, sub: Subcategory } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredCategories = useMemo(() => {
    return data.categorias
      .map(c => ({
        ...c,
        subcategorias: Array.from(
          new Map(c.subcategorias.map(s => [s.nome.toLowerCase().trim(), s])).values()
        )
      }))
      .filter(c => {
        const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
          c.subcategorias.some(s => s.nome.toLowerCase().includes(search.toLowerCase()));
        
        const matchesFilter = filter === 'all' ? true :
          filter === 'active' ? c.ativa : !c.ativa;
        
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => a.ordem - b.ordem);
  }, [data.categorias, search, filter]);

  return (
    <div className="p-6 space-y-6 pb-24 bg-white-off min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('categories.title')}</h1>
        <button 
          onClick={() => setIsAddingCategory(true)}
          className="p-3 bg-gold-principal text-navy-principal rounded-2xl shadow-lg shadow-gold-principal/10 hover:bg-gold-dark transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          <span className="hidden sm:inline font-bold">{t('categories.newCategory')}</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-light" size={18} />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('categories.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-4 bg-white-pure border border-gray-soft rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gold-principal shadow-sm transition-all text-navy-principal"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['active', 'archived', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border",
                filter === f 
                  ? "bg-navy-principal text-white-pure border-navy-principal" 
                  : "bg-white-pure text-gray-medium border-gray-soft hover:border-gray-ice"
              )}
            >
              {f === 'active' ? t('categories.filter.active') : f === 'archived' ? t('categories.filter.archived') : t('categories.filter.all')}
            </button>
          ))}
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {filteredCategories.map((category) => (
          <CategoryAccordion 
            key={category.id}
            category={category}
            isExpanded={expandedId === category.id}
            onToggle={() => setExpandedId(expandedId === category.id ? null : category.id)}
            onEdit={() => setEditingCategory(category)}
            onAddSubcat={() => setAddingSubcatTo(category)}
            onArchive={() => archiveCategory(category.id)}
            onRemove={() => setDeletingCategory(category)}
            onEditSubcat={(sub) => setEditingSubcat({ cat: category, sub })}
            onArchiveSubcat={(subId) => archiveSubcategory(category.id, subId)}
            onRemoveSubcat={(subId) => {
              const sub = category.subcategorias.find(s => s.id === subId);
              if (sub?.padraoSistema) {
                showToast('Subcategorias padrão não podem ser excluídas.', 'error');
                return;
              }
              setDeletingSubcat({ cat: category, sub: sub! });
            }}
          />
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-20 h-20 bg-white-pure rounded-full flex items-center justify-center mx-auto border border-gray-soft shadow-inner">
              <Package size={40} className="text-gray-ice" />
            </div>
            <div className="space-y-1">
              <p className="text-navy-principal font-bold">{t('categories.noCategoriesFound')}</p>
              <p className="text-sm text-gray-light">{t('categories.adjustFilters')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {deletingCategory && (
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
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('categories.deleteCategoryTitle')}</h3>
                <p className="text-sm text-gray-medium leading-relaxed">
                  {t('categories.deleteCategoryConfirm', deletingCategory.nome)}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    removeCategory(deletingCategory.id);
                    setDeletingCategory(null);
                    showToast(t('categories.toast.categoryDeleted'));
                  }}
                  className="w-full py-4 bg-red-brick text-white-pure rounded-2xl font-bold shadow-lg shadow-red-brick/20"
                >
                  {t('categories.confirmDelete')}
                </button>
                <button 
                  onClick={() => setDeletingCategory(null)}
                  className="w-full py-2 text-gray-light font-bold text-sm"
                >
                  {t('categories.cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deletingSubcat && (
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
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('categories.deleteSubcategoryTitle')}</h3>
                <p className="text-sm text-gray-medium leading-relaxed">
                  {t('categories.deleteSubcategoryConfirm', deletingSubcat.sub.nome)}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    removeSubcategory(deletingSubcat.cat.id, deletingSubcat.sub.id);
                    setDeletingSubcat(null);
                    showToast(t('categories.toast.subcategoryDeleted'));
                  }}
                  className="w-full py-4 bg-red-brick text-white-pure rounded-2xl font-bold shadow-lg shadow-red-brick/20"
                >
                  {t('categories.confirmDelete')}
                </button>
                <button 
                  onClick={() => setDeletingSubcat(null)}
                  className="w-full py-2 text-gray-light font-bold text-sm"
                >
                  {t('categories.cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
        {(isAddingCategory || editingCategory) && (
          <CategoryModal 
            category={editingCategory}
            onClose={() => {
              setIsAddingCategory(false);
              setEditingCategory(null);
            }}
            onSave={(val) => {
              if (editingCategory) {
                updateCategory(editingCategory.id, val);
              } else {
                addCategory(val as any);
              }
              setIsAddingCategory(false);
              setEditingCategory(null);
            }}
          />
        )}

        {(addingSubcatTo || editingSubcat) && (
          <SubcategoryModal 
            subcat={editingSubcat?.sub}
            parentCategory={addingSubcatTo || editingSubcat?.cat}
            onClose={() => {
              setAddingSubcatTo(null);
              setEditingSubcat(null);
            }}
            onSave={(val: any) => {
              if (editingSubcat) {
                updateSubcategory(editingSubcat.cat.id, editingSubcat.sub.id, typeof val === 'string' ? { nome: val } : val);
              } else if (addingSubcatTo) {
                if (typeof val === 'string') {
                  addSubcategory(addingSubcatTo.id, val);
                } else {
                  // Handle complex debt subcategory creation
                  const id = crypto.randomUUID();
                  const now = new Date().toISOString();
                  updateCategory(addingSubcatTo.id, {
                    subcategorias: [
                      ...addingSubcatTo.subcategorias,
                      {
                        id,
                        ativa: true,
                        ordem: addingSubcatTo.subcategorias.length,
                        dataCriacao: now,
                        categoriaPaiId: addingSubcatTo.id,
                        ...val
                      }
                    ]
                  });
                }
              }
              setAddingSubcatTo(null);
              setEditingSubcat(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const CategoryAccordion = ({ 
  category, isExpanded, onToggle, onEdit, onAddSubcat, onArchive, onRemove,
  onEditSubcat, onArchiveSubcat, onRemoveSubcat
}: any) => {
  const { t } = useTranslation();
  const activeSubcats = category.subcategorias.filter((s: any) => s.ativa);
  
  return (
    <div className={cn(
      "bg-white-pure rounded-[32px] border transition-all overflow-hidden",
      isExpanded ? "border-gold-light shadow-xl shadow-navy-principal/5" : "border-gray-soft shadow-sm"
    )}>
      {/* Header */}
      <div 
        onClick={onToggle}
        className="p-5 flex items-center gap-4 cursor-pointer hover:bg-white-off/50 transition-colors"
      >
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
          style={{ backgroundColor: `${category.cor}15`, color: category.cor }}
        >
          {category.icone}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-navy-principal truncate">{category.nome}</h3>
            {!category.ativa && <Package size={14} className="text-gray-light" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md",
              category.tipo === 'renda' ? "bg-green-soft text-green-forest" :
              category.tipo === 'despesa' ? "bg-red-soft text-red-brick" : "bg-blue-soft text-blue-dark"
            )}>
              {t(`category.type.${category.tipo}` as any)}
            </span>
            <span className="text-[10px] text-gray-light font-medium">
              {activeSubcats.length} {t('categories.subcategories')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 text-gray-light hover:bg-white-off rounded-xl transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="p-2 text-gray-ice"
          >
            <ChevronDown size={20} />
          </motion.div>
        </div>
      </div>

      {/* Subcategories */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-soft bg-white-off/30"
          >
            <div className="p-4 space-y-2">
              {category.subcategorias.map((sub: any) => (
                <div 
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-white-pure rounded-2xl border border-gray-soft group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full", sub.ativa ? "bg-green-forest" : "bg-gray-ice")} />
                    <span className={cn("text-sm font-medium", sub.ativa ? "text-navy-principal" : "text-gray-light italic")}>
                      {sub.nome}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditSubcat(sub)}
                      className="p-2 text-gray-light hover:text-blue-dark hover:bg-blue-soft rounded-lg transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    {sub.ativa ? (
                      <button 
                        onClick={() => onArchiveSubcat(sub.id)}
                        className="p-2 text-gray-light hover:text-amber-dark hover:bg-amber-soft rounded-lg transition-all"
                      >
                        <Archive size={14} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => onRemoveSubcat(sub.id)}
                        className="p-2 text-gray-light hover:text-red-dark hover:bg-red-soft rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={onAddSubcat}
                className="w-full p-3 border-2 border-dashed border-gray-soft rounded-2xl text-gray-light text-sm font-bold flex items-center justify-center gap-2 hover:border-gold-light hover:text-gold-principal hover:bg-gold-soft/30 transition-all"
              >
                <Plus size={16} />
                {t('categories.addSubcategory')}
              </button>

              <div className="pt-4 flex justify-end gap-2">
                {category.ativa ? (
                  <button 
                    onClick={onArchive}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-dark hover:bg-amber-soft rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Archive size={14} />
                    {t('categories.archiveCategory')}
                  </button>
                ) : (
                  <button 
                    onClick={onRemove}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-red-brick hover:bg-red-soft rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    {t('categories.deletePermanently')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CategoryModal = ({ category, onClose, onSave }: any) => {
  const { t } = useTranslation();
  const [nome, setNome] = useState(category?.nome || '');
  const [tipo, setTipo] = useState<CategoryType>(category?.tipo || 'despesa');
  const [icone, setIcone] = useState(category?.icone || '💰');
  const [cor, setCor] = useState(category?.cor || '#00875A');

  const EMOJIS = ['💰', '🏠', '🚗', '🏥', '📚', '🎭', '🎉', '👶', '💳', '📈', '🤝', '👤', '⭐', '🛒', '🍔', '✈️', '💻', '🎁'];
  const COLORS = ['#00875A', '#FF9500', '#5856D6', '#4A90D9', '#FF3B30', '#FFCC00', '#AF52DE', '#FF2D55', '#5AC8FA', '#8E8E93', '#1D1D1F', '#FFD60A'];

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white-pure w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-soft flex justify-between items-center bg-white-off/50">
          <h2 className="text-xl font-serif font-bold text-navy-principal">{category ? t('categories.editCategory') : t('categories.newCategory')}</h2>
          <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-pure hover:text-gray-medium rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.form.name')}</label>
            <input 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={t('categories.form.namePlaceholder')}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-gold-principal transition-all text-navy-principal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.form.type')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['renda', 'despesa', 'investimento'] as const).map((t_key) => (
                <button
                  key={t_key}
                  disabled={!!category}
                  onClick={() => setTipo(t_key)}
                  className={cn(
                    "py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                    tipo === t_key 
                      ? "bg-navy-principal text-white-pure border-navy-principal" 
                      : "bg-white-pure text-gray-light border-gray-soft hover:border-gray-ice",
                    category && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {t(`category.type.${t_key}` as any)}
                </button>
              ))}
            </div>
            {category && <p className="text-[10px] text-gray-light italic">{t('categories.form.typeImmutable')}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.form.icon')}</label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setIcone(e)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                    icone === e ? "bg-gold-soft border-2 border-gold-principal" : "bg-white-off border border-transparent hover:bg-white-ice"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.form.color')}</label>
            <div className="grid grid-cols-6 gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all relative",
                    cor === c ? "ring-2 ring-offset-2 ring-navy-principal" : ""
                  )}
                  style={{ backgroundColor: c }}
                >
                  {cor === c && <Check size={16} className="text-white-pure absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-white-off/50 border-t border-gray-soft">
          <button 
            onClick={() => onSave({ nome, tipo, icone, cor })}
            disabled={!nome || nome.length < 3}
            className="w-full p-4 bg-navy-principal text-white-pure rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-navy-dark transition-colors shadow-lg shadow-navy-principal/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={20} />
            {category ? t('categories.form.saveChanges') : t('categories.form.create')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SubcategoryModal = ({ subcat, parentCategory, onClose, onSave }: any) => {
  const { t } = useTranslation();
  const [nome, setNome] = useState(subcat?.nome || '');
  const [icone, setIcone] = useState(subcat?.icone || '📄');
  const [tipoDivida, setTipoDivida] = useState(subcat?.tipoDivida || 'bancaria');
  const [status, setStatus] = useState(subcat?.ativa !== false ? 'active' : 'archived');

  const isDebt = parentCategory?.nome === 'DÍVIDAS';

  const DEBT_SUGGESTIONS = [
    { nome: t('categories.debt.suggestions.overdraft'), icone: '💳' },
    { nome: t('categories.debt.suggestions.payroll'), icone: '🏛️' },
    { nome: t('categories.debt.suggestions.family'), icone: '👨‍👩‍👧' },
    { nome: t('categories.debt.suggestions.retail'), icone: '🏪' },
    { nome: t('categories.debt.suggestions.phone'), icone: '📱' },
    { nome: t('categories.debt.suggestions.student'), icone: '🎓' },
  ];

  const handleSave = () => {
    if (isDebt) {
      onSave({
        nome,
        icone,
        tipoDivida,
        ativa: status === 'active'
      });
    } else {
      onSave(nome);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[160] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white-pure w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-serif font-bold text-navy-principal">
            {isDebt ? (subcat ? t('categories.debt.edit') : t('categories.debt.new')) : (subcat ? t('categories.subcategory.edit') : t('categories.subcategory.new'))}
          </h3>
          <p className="text-sm text-gray-medium">
            {isDebt ? t('categories.debt.description') : t('categories.subcategory.description')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.form.name')} *</label>
            <input 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={isDebt ? t('categories.debt.placeholder') : t('categories.subcategory.placeholder')}
              autoFocus
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-gold-principal transition-all text-navy-principal"
            />
          </div>

          {isDebt && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.form.icon')}</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {['📄', '🚗', '🏠', '💰', '📋', '💳', '🏛️', '👨‍👩‍👧', '🏪', '📱', '🎓'].map(e => (
                    <button
                      key={e}
                      onClick={() => setIcone(e)}
                      className={cn(
                        "w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center text-xl transition-all border",
                        icone === e ? "bg-gold-soft border-gold-principal" : "bg-white-off border-transparent"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.debt.type')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bancaria', label: t('categories.debt.types.bank') },
                    { id: 'pessoal', label: t('categories.debt.types.personal') },
                    { id: 'imobiliaria', label: t('categories.debt.types.realEstate') },
                    { id: 'veiculos', label: t('categories.debt.types.vehicle') },
                    { id: 'outra', label: t('categories.debt.types.other') }
                  ].map(t_item => (
                    <button
                      key={t_item.id}
                      onClick={() => setTipoDivida(t_item.id as any)}
                      className={cn(
                        "py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                        tipoDivida === t_item.id ? "bg-navy-principal text-white-pure border-navy-principal" : "bg-white-off text-gray-light border-transparent"
                      )}
                    >
                      {t_item.label}
                    </button>
                  ))}
                </div>
              </div>

              {!subcat && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.debt.quickSuggestions')}</label>
                  <div className="flex flex-wrap gap-2">
                    {DEBT_SUGGESTIONS.map(s => (
                      <button
                        key={s.nome}
                        onClick={() => {
                          setNome(s.nome);
                          setIcone(s.icone);
                        }}
                        className="px-3 py-1.5 bg-gold-soft text-gold-dark rounded-lg text-xs font-bold border border-gold-light hover:bg-gold-light/20 transition-colors"
                      >
                        {s.icone} {s.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {subcat && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-light uppercase tracking-widest">{t('categories.form.status')}</label>
              <div className="flex gap-2">
                {['active', 'archived'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                      status === s ? "bg-navy-principal text-white-pure border-navy-principal" : "bg-white-off text-gray-light border-transparent"
                    )}
                  >
                    {s === 'active' ? t('categories.filter.active') : t('categories.filter.archived')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 p-4 bg-white-off text-gray-medium rounded-2xl font-bold">{t('categories.cancel')}</button>
          <button 
            onClick={handleSave}
            disabled={!nome || nome.length < 3}
            className="flex-[2] p-4 bg-navy-principal text-white-pure rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-navy-principal/10"
          >
            {subcat ? t('categories.save') : t('categories.create')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
