import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatPercent, formatDate } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  TrendingUp, TrendingDown, Wallet, AlertCircle, ChevronLeft, ChevronRight, 
  PieChart as PieChartIcon, Calendar, Info, Trash2, Check, MessageSquare,
  Filter, BarChart3, List, Download, Copy, Share2, Search, X, ChevronDown,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles, Trophy
} from 'lucide-react';
import { InsightCard, Insight } from './InsightCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lancamento, Parcelamento } from '../types';
import { EditTransactionModal } from './EditTransactionModal';
import { InstallmentManager } from './InstallmentManager';
import { DeleteTransactionModal } from './DeleteTransactionModal';

const SummaryCard = ({ title, value, icon, color, isBold }: any) => {
  const { lang } = useTranslation();
  return (
    <div className={cn("p-5 rounded-3xl border border-gray-soft shadow-sm flex items-center gap-4 bg-white-pure")}>
      <div className={cn("p-3 rounded-2xl", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-medium uppercase tracking-wider">{title}</p>
        <p className={cn("text-lg font-serif font-bold", isBold ? "text-navy-principal" : "text-gray-bluish")}>{formatCurrency(value, lang)}</p>
      </div>
    </div>
  );
};

const SyntheticCategoryCard = ({ item, isExpanded, onToggle }: any) => {
  const { t, lang } = useTranslation();
  const status = item.percent <= 90 ? 'safe' : item.percent <= 100 ? 'warning' : 'danger';
  const isRenda = item.tipo === 'renda';
  const isSonho = item.tipo === 'sonho';
  const isInvestimento = item.tipo === 'investimento';
  const isSpecial = isRenda || isSonho || isInvestimento;

  const getStatusLabel = () => {
    if (isSpecial) {
      if (item.percent >= 100) return t('dashboard.status.aboveBudgeted' as any) || 'Acima do orçado';
      return t('dashboard.status.notReached' as any) || 'Orçamento não alcançado';
    }
    
    if (status === 'safe') return t('dashboard.status.safe');
    if (status === 'warning') return t('dashboard.status.warning');
    return t('dashboard.status.danger');
  };

  return (
    <div className={cn(
      "bg-white-pure rounded-[32px] border transition-all overflow-hidden",
      isExpanded ? "border-gold-light shadow-xl shadow-navy-principal/5" : "border-gray-soft shadow-sm"
    )}>
      <div className="p-5 flex items-center gap-4">
        <div 
          onClick={onToggle}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner cursor-pointer"
          style={{ backgroundColor: `${item.cor}15`, color: item.cor }}
        >
          {item.icone}
        </div>
        
        <div className="flex-1 min-w-0" onClick={onToggle}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif font-bold text-navy-principal truncate">{item.nome}</h3>
            <p className={cn("font-bold text-sm", isRenda ? "text-gold-principal" : "text-gray-bluish")}>
              {isRenda ? '+' : '–'} {formatCurrency(item.realized, lang)}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-light uppercase tracking-widest">
              <span>{formatPercent(item.percent / 100, lang)} {t('dashboard.ofBudgeted')}</span>
              <span className={cn(
                "flex items-center gap-1",
                status === 'safe' ? "text-green-forest" : status === 'warning' ? "text-amber-principal" : "text-red-brick"
              )}>
                {status === 'safe' ? <Check size={10} /> : <AlertCircle size={10} />}
                {getStatusLabel()}
              </span>
            </div>
            <div className="h-1.5 bg-gray-soft rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, item.percent)}%` }}
                className={cn(
                  "h-full transition-all",
                  status === 'safe' ? "bg-green-forest" : status === 'warning' ? "bg-amber-principal" : "bg-red-brick"
                )}
              />
            </div>
          </div>
        </div>

        <button 
          onClick={onToggle}
          className="p-2 text-gray-ice hover:text-gray-light transition-colors"
        >
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
            <ChevronDown size={20} />
          </motion.div>
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-soft bg-white-off"
          >
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="p-3 bg-white-pure rounded-2xl border border-gray-soft">
                  <p className="text-[8px] text-gray-light font-bold uppercase tracking-widest mb-1">{t('dashboard.budgeted')}</p>
                  <p className="text-xs font-bold text-navy-principal">{formatCurrency(item.budgeted, lang)}</p>
                </div>
                <div className="p-3 bg-white-pure rounded-2xl border border-gray-soft">
                  <p className="text-[8px] text-gray-light font-bold uppercase tracking-widest mb-1">{t('dashboard.available')}</p>
                  <p className={cn("text-xs font-bold", item.budgeted - item.realized >= 0 ? "text-green-forest" : "text-red-brick")}>
                    {formatCurrency(item.budgeted - item.realized, lang)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-gray-light font-bold uppercase tracking-widest px-1">{t('dashboard.subcategories')}</p>
                {item.subcategories.map((sub: any) => (
                  <div key={sub.id} className="bg-white-pure p-3 rounded-2xl border border-gray-soft flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-bluish truncate">{sub.nome}</span>
                        <span className="text-xs font-bold text-navy-principal">{formatCurrency(sub.realized, lang)}</span>
                      </div>
                      <div className="h-1 bg-gray-soft rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            sub.percent <= 90 ? "bg-green-forest/70" : sub.percent <= 100 ? "bg-amber-principal/70" : "bg-red-brick/70"
                          )}
                          style={{ width: `${Math.min(100, sub.percent)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-gray-light font-bold uppercase tracking-widest">{t('dashboard.budgetShort')}</p>
                      <p className="text-[10px] font-bold text-gray-medium">{formatCurrency(sub.budgeted, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full py-3 text-navy-principal text-xs font-bold uppercase tracking-widest hover:bg-gold-soft rounded-2xl transition-colors">
                {t('dashboard.viewTransactions')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface DashboardProps {}

export const Dashboard: React.FC<DashboardProps> = () => {
  const { data, removeLancamento, updateLancamentoFull, removeParcelamento, dismissDividasWelcome } = useFinance();
  const { t, lang } = useTranslation();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [year, setYear] = useState(currentYear);
  
  // Synthetic View Filters State
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterSubcategory, setFilterSubcategory] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'lista' | 'grafico'>('lista');
  const [chartType, setChartType] = useState<'pizza' | 'donut' | 'barras'>('pizza');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [expandedSyntheticCats, setExpandedSyntheticCats] = useState<string[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [monthlyInsights, setMonthlyInsights] = useState<Insight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const syntheticViewRef = React.useRef<HTMLDivElement>(null);

  // Recent Transactions State
  const [selectedMonth, setSelectedMonth] = useState(new Date(currentYear, currentMonth, 1));
  const [itemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedLancamentoId, setSelectedLancamentoId] = useState<string | null>(null);
  const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);
  const [viewYear, setViewYear] = useState(currentYear);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const transactionsListRef = React.useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [managingInstallment, setManagingInstallment] = useState<Lancamento | null>(null);
  const [deletingLancamento, setDeletingLancamento] = useState<Lancamento | null>(null);

  const yearLancamentos = data.lancamentos.filter(l => l.ano === year);
  
  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoadingInsights(true);
      try {
        const familiaId = data.familia.id;
        const response = await fetch(`/api/alertas-e-conquistas?familiaId=${familiaId}&mes=${selectedMonth.getMonth()}&ano=${selectedMonth.getFullYear()}`);
        if (response.ok) {
          const result = await response.json();
          setMonthlyInsights(result);
        }
      } catch (error) {
        console.error("Error fetching insights:", error);
      } finally {
        setIsLoadingInsights(false);
      }
    };

    fetchInsights();
  }, [selectedMonth, data.familia.id]);

  const totalRecebido = yearLancamentos
    .filter(l => l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'renda')
    .filter(l => {
      const isFuture = l.ano > currentYear || (l.ano === currentYear && l.mes > currentMonth);
      return !isFuture;
    })
    .reduce((acc, l) => acc + l.valor, 0);

  const totalGasto = yearLancamentos
    .filter(l => l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'despesa')
    .filter(l => {
      const isFuture = l.ano > currentYear || (l.ano === currentYear && l.mes > currentMonth);
      return !isFuture;
    })
    .reduce((acc, l) => acc + l.valor, 0);

  const totalInvestido = yearLancamentos
    .filter(l => l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'investimento')
    .filter(l => {
      const isFuture = l.ano > currentYear || (l.ano === currentYear && l.mes > currentMonth);
      return !isFuture;
    })
    .reduce((acc, l) => acc + l.valor, 0);

  const saldoAnual = totalRecebido - totalGasto - totalInvestido;

  // Chart data
  const categoryTotals = data.categorias
    .filter(c => c.tipo === 'despesa')
    .map(c => {
      const total = yearLancamentos
        .filter(l => l.categoriaId === c.id && l.tipo === 'realizado')
        .reduce((acc, l) => acc + l.valor, 0);
      return { name: c.nome, value: total, color: c.cor };
    })
    .filter(c => c.value > 0);

  const budgetUsage = totalRecebido > 0 ? (totalGasto / totalRecebido) : 0;

  // Recent Transactions Logic
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // 1. Current month
    const now = new Date();
    monthsSet.add(format(now, 'yyyy-MM'));
    
    // 2. Months with lancamentos
    data.lancamentos.forEach(l => {
      monthsSet.add(`${l.ano}-${String(l.mes + 1).padStart(2, '0')}`);
    });
    
    // Sort and convert back to Date objects
    return Array.from(monthsSet)
      .sort()
      .map(m => parseISO(`${m}-01`));
  }, [data.lancamentos]);

  const monthScrollRef = React.useRef<HTMLDivElement>(null);
  const activeMonthRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeMonthRef.current && monthScrollRef.current) {
      const container = monthScrollRef.current;
      const active = activeMonthRef.current;
      const scrollLeft = active.offsetLeft - (container.offsetWidth / 2) + (active.offsetWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedMonth]);

  const filteredLancamentos = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    
    return data.lancamentos
      .filter(l => {
        const isCC = l.formaPagamento === 'Cartão de Crédito';
        const targetYear = isCC && l.anoCobranca !== undefined ? l.anoCobranca : l.ano;
        const targetMonth = isCC && l.mesCobranca !== undefined ? l.mesCobranca : l.mes;
        
        const lDate = new Date(targetYear, targetMonth, l.dia || 1);
        return isWithinInterval(lDate, { start, end });
      })
      .sort((a, b) => {
        const getEffectiveDate = (l: Lancamento) => {
          const isCC = l.formaPagamento === 'Cartão de Crédito';
          const targetYear = isCC && l.anoCobranca !== undefined ? l.anoCobranca : l.ano;
          const targetMonth = isCC && l.mesCobranca !== undefined ? l.mesCobranca : l.mes;
          return new Date(targetYear, targetMonth, l.dia || 1).getTime();
        };

        const dateA = getEffectiveDate(a);
        const dateB = getEffectiveDate(b);
        
        if (dateB !== dateA) return dateB - dateA;
        
        // Secondary sort: creation time desc
        return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
      });
  }, [data.lancamentos, selectedMonth]);

  const totalPages = Math.ceil(filteredLancamentos.length / itemsPerPage);
  const paginatedLancamentos = filteredLancamentos.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleMonthChange = (m: Date) => {
    setSelectedMonth(m);
    setPage(1);
    setSelectedLancamentoId(null);
    setIsMonthFilterOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedLancamentoId(null);
    if (transactionsListRef.current) {
      transactionsListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Synthetic View Logic
  const syntheticData = useMemo(() => {
    const activeCats = data.categorias.filter(c => c.ativa);
    const filteredCats = filterCategories.length > 0 
      ? activeCats.filter(c => filterCategories.includes(c.id))
      : activeCats;

    const results = filteredCats.map(cat => {
      // Calculate Realized
      const realized = data.lancamentos
        .filter(l => {
          const isCC = l.formaPagamento === 'Cartão de Crédito';
          const lYear = isCC && l.anoCobranca !== undefined ? l.anoCobranca : l.ano;
          const lMonth = isCC && l.mesCobranca !== undefined ? l.mesCobranca : l.mes;
          
          const matchYear = lYear === filterYear;
          const matchMonth = filterMonth === 'all' ? true : lMonth === filterMonth;
          const matchCat = l.categoriaId === cat.id;
          const matchSub = filterSubcategory === 'all' ? true : l.subcategoriaId === filterSubcategory;
          
          return matchYear && matchMonth && matchCat && matchSub && l.tipo === 'realizado';
        })
        .reduce((acc, l) => acc + l.valor, 0);

      // Calculate Budgeted
      let budgeted = 0;
      if (filterSubcategory !== 'all') {
        // Subcategoria específica
        if (filterMonth === 'all') {
          budgeted = data.orcamentosMensais
            .filter(o => o.ano === filterYear && o.subcategoriaId === filterSubcategory)
            .reduce((acc, o) => acc + (o.valorOrcado || 0), 0);
        } else {
          budgeted = data.orcamentosMensais.find(o => 
            o.ano === filterYear && o.mes === filterMonth && o.subcategoriaId === filterSubcategory
          )?.valorOrcado || 0;
        }
      } else {
        // Soma de todas as subcategorias da categoria
        if (filterMonth === 'all') {
          budgeted = data.orcamentosMensais
            .filter(o => o.ano === filterYear && o.categoriaId === cat.id && o.subcategoriaId)
            .reduce((acc, o) => acc + (o.valorOrcado || 0), 0);
        } else {
          budgeted = data.orcamentosMensais
            .filter(o => o.ano === filterYear && o.mes === filterMonth && o.categoriaId === cat.id && o.subcategoriaId)
            .reduce((acc, o) => acc + (o.valorOrcado || 0), 0);
        }
      }

      // Subcategories breakdown
      const subResults = cat.subcategorias
        .filter(s => s.ativa && (filterSubcategory === 'all' ? true : s.id === filterSubcategory))
        .map(sub => {
          const subRealized = data.lancamentos
            .filter(l => {
              const isCC = l.formaPagamento === 'Cartão de Crédito';
              const lYear = isCC && l.anoCobranca !== undefined ? l.anoCobranca : l.ano;
              const lMonth = isCC && l.mesCobranca !== undefined ? l.mesCobranca : l.mes;
              
              const matchYear = lYear === filterYear;
              const matchMonth = filterMonth === 'all' ? true : lMonth === filterMonth;
              return matchYear && matchMonth && l.subcategoriaId === sub.id && l.tipo === 'realizado';
            })
            .reduce((acc, l) => acc + l.valor, 0);

          let subBudgeted = 0;
          if (filterMonth === 'all') {
            subBudgeted = data.orcamentosMensais
              .filter(o => o.ano === filterYear && o.subcategoriaId === sub.id)
              .reduce((acc, o) => acc + (o.valorOrcado || 0), 0);
          } else {
            subBudgeted = data.orcamentosMensais.find(o => 
              o.ano === filterYear && o.mes === filterMonth && o.subcategoriaId === sub.id
            )?.valorOrcado || 0;
          }

          return {
            id: sub.id,
            nome: sub.nome,
            realized: subRealized,
            budgeted: subBudgeted,
            percent: subBudgeted > 0 ? (subRealized / subBudgeted) * 100 : 0
          };
        })
        .sort((a, b) => b.realized - a.realized);

      return {
        id: cat.id,
        nome: cat.nome,
        icone: cat.icone,
        cor: cat.cor,
        tipo: cat.tipo,
        realized,
        budgeted,
        percent: budgeted > 0 ? (realized / budgeted) * 100 : 0,
        subcategories: subResults
      };
    }).sort((a, b) => b.realized - a.realized);

    const totalOrcado = results.reduce((acc, r) => acc + r.budgeted, 0);
    const totalRealizado = results.reduce((acc, r) => acc + r.realized, 0);

    return {
      items: results,
      totalOrcado,
      totalRealizado,
      saldo: totalOrcado - totalRealizado,
      percentTotal: totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0
    };
  }, [data, filterYear, filterMonth, filterCategories, filterSubcategory]);

  const toggleSyntheticCat = (id: string) => {
    setExpandedSyntheticCats(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExportPDF = async () => {
    if (!syntheticViewRef.current) return;
    
    try {
      const canvas = await html2canvas(syntheticViewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`nossa-grana-resumo-${filterYear}-${filterMonth}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const handleCopyData = () => {
    const periodText = filterMonth === 'all' ? t('dashboard.allYear') : `${t(`month.${filterMonth}` as any)} ${filterYear}`;
    const text = `
${t('dashboard.copyResumo')}
${t('dashboard.copyPeriodo')}: ${periodText}
${t('dashboard.budgeted')}: ${formatCurrency(syntheticData.totalOrcado, lang)}
${t('dashboard.realized')}: ${formatCurrency(syntheticData.totalRealizado, lang)}
${t('dashboard.available')}: ${formatCurrency(syntheticData.saldo, lang)}
${t('dashboard.execution')}: ${formatPercent(syntheticData.percentTotal / 100, lang)}
    `.trim();

    navigator.clipboard.writeText(text);
    alert(t('dashboard.dataCopied'));
  };

  const criticalInsight = useMemo(() => 
    data.insights.find(i => i.tipo === 'critico' && !i.dispensado),
  [data.insights]);

  const recentConquest = useMemo(() => 
    data.insights.find(i => i.tipo === 'conquista' && !i.dispensado),
  [data.insights]);

  const unreadCount = data.insights.filter(i => !i.lido && !i.dispensado).length;

  // Recent Transactions Section
  const minYear = useMemo(() => {
    if (data.lancamentos.length === 0) return currentYear;
    return Math.min(...data.lancamentos.map(l => l.ano));
  }, [data.lancamentos, currentYear]);

  const maxYear = useMemo(() => {
    if (data.lancamentos.length === 0) return currentYear;
    return Math.max(...data.lancamentos.map(l => l.ano));
  }, [data.lancamentos, currentYear]);

  const monthsWithData = useMemo(() => {
    const set = new Set<string>();
    data.lancamentos.forEach(l => set.add(`${l.ano}-${l.mes}`));
    return set;
  }, [data.lancamentos]);

  const monthAbbreviations = {
    pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dic']
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('dashboard.hello')}, {data.familia.nome}!</h1>
          <p className="text-sm text-gray-medium">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-white-pure p-1 rounded-xl border border-gray-soft shadow-sm">
          <button onClick={() => setYear(year - 1)} className="p-1 hover:bg-white-off rounded-lg text-gray-medium"><ChevronLeft size={20} /></button>
          <span className="font-sans font-bold px-2 text-navy-principal">{year}</span>
          <button onClick={() => setYear(year + 1)} className="p-1 hover:bg-white-off rounded-lg text-gray-medium"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title={t('dashboard.received')} 
          value={totalRecebido} 
          icon={<TrendingUp className="text-gold-principal" />} 
          color="bg-gold-soft"
        />
        <SummaryCard 
          title={t('dashboard.spent')} 
          value={totalGasto} 
          icon={<TrendingDown className="text-red-brick" />} 
          color="bg-red-soft"
        />
        <SummaryCard 
          title={t('dashboard.balance')} 
          value={saldoAnual} 
          icon={<Wallet className={cn(saldoAnual >= 0 ? "text-gold-principal" : "text-red-brick")} />} 
          color={cn(saldoAnual >= 0 ? "bg-gold-soft" : "bg-red-soft")}
          isBold
        />
      </div>

      {/* Alertas & Conquistas (Insights) */}
      {(monthlyInsights.length > 0 || isLoadingInsights) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gold-soft rounded-xl flex items-center justify-center text-gold-principal">
                <Sparkles size={18} />
              </div>
              <h2 className="text-xl font-serif font-bold text-navy-principal">Alertas & Conquistas</h2>
            </div>
            {monthlyInsights.length > 3 && (
              <button className="text-[10px] font-black uppercase tracking-widest text-gray-medium hover:text-navy-principal transition-colors">
                Ver todos
              </button>
            )}
          </div>
          
          {isLoadingInsights ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white-pure rounded-[28px] border border-gray-soft animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyInsights.slice(0, 3).map((insight) => (
                <InsightCard 
                  key={insight.id} 
                  insight={insight} 
                  onViewDetails={(catId) => {
                    setFilterCategories([catId]);
                    setIsFilterExpanded(true);
                    transactionsListRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }} 
                />
              ))}
            </div>
          )}
          
          {monthlyInsights.length === 0 && !isLoadingInsights && (
            <div className="p-8 bg-white-pure rounded-[32px] border border-dashed border-gray-soft flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-soft rounded-full flex items-center justify-center text-green-forest mb-3">
                <Check size={24} />
              </div>
              <p className="font-bold text-navy-principal">Tudo certo!</p>
              <p className="text-xs text-gray-medium">Mês dentro do planejado.</p>
            </div>
          )}
        </div>
      )}

      {/* Visão Sintética Section */}
      <div className="space-y-4">
        <div className="sticky top-0 z-20 bg-white-off pt-2 pb-4 -mx-6 px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-navy-principal">{t('dashboard.syntheticView')}</h2>
            <button 
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={cn(
                "p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                isFilterExpanded ? "bg-navy-principal text-white-pure border-navy-principal" : "bg-white-pure text-gray-medium border-gray-soft shadow-sm"
              )}
            >
              <Filter size={16} />
              {t('dashboard.filters')}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white-pure p-6 rounded-[32px] border border-gray-soft shadow-xl space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Ano */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-light font-bold uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={10} /> {t('dashboard.year')}
                    </label>
                    <select 
                      value={filterYear}
                      onChange={(e) => setFilterYear(Number(e.target.value))}
                      className="w-full p-3 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                    >
                      {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-light font-bold uppercase tracking-widest flex items-center gap-1">
                      <List size={10} /> {t('dashboard.category')}
                    </label>
                    <select 
                      value={filterCategories[0] || 'all'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterCategories(val === 'all' ? [] : [val]);
                        setFilterSubcategory('all');
                      }}
                      className="w-full p-3 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                    >
                      <option value="all">{t('dashboard.allCategories')}</option>
                      {data.categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mês */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] text-gray-light font-bold uppercase tracking-widest">{t('dashboard.month')}</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      <button
                        onClick={() => setFilterMonth('all')}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                          filterMonth === 'all' ? "bg-navy-principal text-white-pure border-navy-principal" : "bg-white-off text-gray-medium border-gray-soft"
                        )}
                      >
                        {t('dashboard.all')}
                      </button>
                      {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
                        const isFuture = filterYear > currentYear || (filterYear === currentYear && i > currentMonth);
                        const isActive = filterMonth === i;
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setFilterMonth(i)}
                            className={cn(
                              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                              isActive 
                                ? (isFuture ? "bg-gold-principal text-white-pure border-gold-principal" : "bg-navy-principal text-white-pure border-navy-principal")
                                : (isFuture ? "bg-gold-soft text-gold-dark border-gold-light" : "bg-white-off text-gray-medium border-gray-soft")
                            )}
                          >
                            {t(`month.${i}` as any)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subcategoria */}
                  {filterCategories.length === 1 && (
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-[10px] text-gray-light font-bold uppercase tracking-widest flex items-center gap-1">
                        <Search size={10} /> {t('dashboard.subcategory')}
                      </label>
                      <select 
                        value={filterSubcategory}
                        onChange={(e) => setFilterSubcategory(e.target.value)}
                        className="w-full p-3 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                      >
                        <option value="all">{t('dashboard.allSubcategories')}</option>
                        {data.categorias.find(c => c.id === filterCategories[0])?.subcategorias.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-soft">
                  <button 
                    onClick={() => {
                      setFilterYear(currentYear);
                      setFilterMonth('all');
                      setFilterCategories([]);
                      setFilterSubcategory('all');
                    }}
                    className="text-xs font-bold text-gray-light uppercase tracking-widest hover:text-red-brick transition-colors"
                  >
                    {t('dashboard.clearFilters')}
                  </button>
                  <button 
                    onClick={() => setIsFilterExpanded(false)}
                    className="px-8 py-3 bg-navy-principal text-white-pure rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-navy-principal/10"
                  >
                    {t('dashboard.apply')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Toggle */}
        <div className="flex items-center justify-between bg-white-pure p-1 rounded-2xl border border-gray-soft shadow-sm">
          <button 
            onClick={() => setViewMode('lista')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
              viewMode === 'lista' ? "bg-navy-principal text-white-pure shadow-md" : "text-gray-light hover:bg-white-off"
            )}
          >
            <List size={16} /> {t('dashboard.list')}
          </button>
          <button 
            onClick={() => setViewMode('grafico')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
              viewMode === 'grafico' ? "bg-navy-principal text-white-pure shadow-md" : "text-gray-light hover:bg-white-off"
            )}
          >
            <BarChart3 size={16} /> {t('dashboard.chart')}
          </button>
        </div>

        {/* Main Content Area */}
        <div ref={syntheticViewRef} className="min-h-[300px]">
          {viewMode === 'lista' ? (
            <div className="space-y-4">
              {syntheticData.items.filter(i => i.realized > 0 || i.budgeted > 0).map((item) => (
                <SyntheticCategoryCard 
                  key={item.id}
                  item={item}
                  isExpanded={expandedSyntheticCats.includes(item.id)}
                  onToggle={() => toggleSyntheticCat(item.id)}
                />
              ))}
              {syntheticData.items.filter(i => i.realized > 0 || i.budgeted > 0).length === 0 && (
                <div className="bg-white-pure rounded-[32px] p-12 text-center border border-gray-soft border-dashed">
                  <div className="w-16 h-16 bg-white-off rounded-full flex items-center justify-center mx-auto text-gray-ice mb-4">
                    <Search size={32} />
                  </div>
                  <h3 className="font-serif font-bold text-navy-principal">{t('dashboard.noDataFound')}</h3>
                  <p className="text-xs text-gray-light mt-1">{t('dashboard.adjustFilters')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white-pure rounded-[32px] border border-gray-soft p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-navy-principal">{t('dashboard.visualAnalysis')}</h3>
                <div className="flex gap-1 bg-white-off p-1 rounded-xl">
                  <button 
                    onClick={() => setChartType('pizza')}
                    className={cn("p-2 rounded-lg transition-all", chartType === 'pizza' ? "bg-white-pure shadow-sm text-gold-principal" : "text-gray-light")}
                  >
                    <PieChartIcon size={18} />
                  </button>
                  <button 
                    onClick={() => setChartType('barras')}
                    className={cn("p-2 rounded-lg transition-all", chartType === 'barras' ? "bg-white-pure shadow-sm text-gold-principal" : "text-gray-light")}
                  >
                    <BarChart3 size={18} />
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pizza' ? (
                    <PieChart>
                      <Pie
                        data={syntheticData.items.filter(i => i.realized > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="realized"
                        nameKey="nome"
                      >
                        {syntheticData.items.filter(i => i.realized > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value, lang)}
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(27,43,68,0.1)', padding: '12px 20px', fontFamily: 'Inter, sans-serif' }}
                      />
                    </PieChart>
                  ) : (
                    <BarChart data={syntheticData.items.filter(i => i.realized > 0 || i.budgeted > 0).slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="nome" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#8A9AA8' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#8A9AA8' }}
                        tickFormatter={(val) => lang === 'pt' ? `R$ ${val}` : lang === 'en' ? `$ ${val}` : `€ ${val}`}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: '#F8F9FA' }}
                        formatter={(value: number) => formatCurrency(value, lang)}
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(27,43,68,0.1)', padding: '12px 20px', fontFamily: 'Inter, sans-serif' }}
                      />
                      <Bar dataKey="budgeted" name={t('dashboard.budgeted')} fill="#CAD5E0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="realized" name={t('dashboard.realized')} fill="#C9A962" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {syntheticData.items.filter(i => i.realized > 0).slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-3 bg-white-off rounded-2xl">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.cor }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-navy-principal truncate">{item.nome}</p>
                      <p className="text-[10px] text-gray-medium">{formatCurrency(item.realized, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-4 relative" ref={transactionsListRef}>
        {/* Summary Panel - Positioned above transactions */}
        <div className="bg-navy-principal rounded-[32px] p-6 text-white-pure shadow-2xl shadow-navy-principal/40 mb-6">
          <button 
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white-pure/10 rounded-2xl flex items-center justify-center">
                <BarChart3 size={20} className="text-gold-principal" />
              </div>
              <div className="text-left">
                <h3 className="font-serif font-bold text-sm">{t('dashboard.filterSummary')}</h3>
                <p className="text-[10px] text-gold-light uppercase tracking-widest">
                  {filterMonth === 'all' ? t('dashboard.allYear') : t(`month.${filterMonth}` as any)} {filterYear}
                </p>
              </div>
            </div>
            <ChevronDown size={20} className={cn("text-gold-light transition-transform", isSummaryExpanded && "rotate-180")} />
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white-pure/5 rounded-2xl border border-white-pure/5">
              <p className="text-[10px] text-gold-light font-bold uppercase tracking-widest mb-1">{t('dashboard.budgeted')}</p>
              <p className="text-lg font-serif font-bold">{formatCurrency(syntheticData.totalOrcado, lang)}</p>
            </div>
            <div className="p-4 bg-white-pure/5 rounded-2xl border border-white-pure/5">
              <p className="text-[10px] text-gold-light font-bold uppercase tracking-widest mb-1">
                {(filterMonth !== 'all' && (filterYear > currentYear || (filterYear === currentYear && filterMonth > currentMonth))) ? t('dashboard.predicted') : t('dashboard.realized')}
              </p>
              <p className="text-lg font-serif font-bold">{formatCurrency(syntheticData.totalRealizado, lang)}</p>
            </div>
          </div>

          <AnimatePresence>
            {isSummaryExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6 space-y-4 border-t border-white-pure/5 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center",
                        syntheticData.saldo >= 0 ? "bg-gold-soft text-gold-principal" : "bg-red-brick/20 text-red-soft"
                      )}>
                        {syntheticData.saldo >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>
                      <div>
                        <p className="text-[10px] text-gold-light font-bold uppercase tracking-widest">{t('dashboard.periodBalance')}</p>
                        <p className={cn("text-sm font-bold", syntheticData.saldo >= 0 ? "text-gold-light" : "text-red-soft")}>
                          {syntheticData.saldo >= 0 ? '+' : ''}{formatCurrency(syntheticData.saldo, lang)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gold-light font-bold uppercase tracking-widest">{t('dashboard.execution')}</p>
                      <p className="text-sm font-bold text-white-pure">{formatPercent(syntheticData.percentTotal / 100, lang)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={handleExportPDF}
                      className="flex flex-col items-center gap-2 p-3 bg-white-pure/5 rounded-2xl hover:bg-white-pure/10 transition-colors"
                    >
                      <Download size={16} className="text-gold-light" />
                      <span className="text-[8px] font-bold uppercase">{t('dashboard.export')}</span>
                    </button>
                    <button 
                      onClick={handleCopyData}
                      className="flex flex-col items-center gap-2 p-3 bg-white-pure/5 rounded-2xl hover:bg-white-pure/10 transition-colors"
                    >
                      <Copy size={16} className="text-gold-light" />
                      <span className="text-[8px] font-bold uppercase">{t('dashboard.copy')}</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-3 bg-white-pure/5 rounded-2xl hover:bg-white-pure/10 transition-colors">
                      <Share2 size={16} className="text-gold-light" />
                      <span className="text-[8px] font-bold uppercase">{t('dashboard.share')}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif font-bold text-navy-principal">{t('dashboard.recentTransactions')}</h3>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-medium">
              {filteredLancamentos.length} {filteredLancamentos.length === 1 ? t('dashboard.transaction' as any) || 'lançamento' : t('dashboard.transactions' as any) || 'lançamentos'}
            </span>
            
            <div className="relative">
              <button
                onClick={() => {
                  setIsMonthFilterOpen(!isMonthFilterOpen);
                  if (!isMonthFilterOpen) setViewYear(selectedMonth.getFullYear());
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold",
                  isMonthFilterOpen 
                    ? "bg-[#E1F5EE] border-green-forest text-green-forest" 
                    : "bg-white-pure border-gray-soft text-navy-principal shadow-sm"
                )}
              >
                <Calendar size={14} />
                {t(`month.short.${selectedMonth.getMonth()}` as any)} / {selectedMonth.getFullYear()}
                <motion.div animate={{ rotate: isMonthFilterOpen ? 180 : 0 }}>
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isMonthFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full z-50 w-72 bg-white-off rounded-[32px] border border-gray-soft shadow-2xl p-6 space-y-6"
                  >
                    {/* Year Navigation */}
                    <div className="flex items-center justify-between px-2">
                      <button 
                        disabled={viewYear <= minYear}
                        onClick={() => setViewYear(viewYear - 1)}
                        className="p-2 hover:bg-white-pure rounded-xl text-navy-principal disabled:opacity-30 transition-all"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="font-serif font-bold text-lg text-navy-principal">{viewYear}</span>
                      <button 
                        disabled={viewYear >= maxYear}
                        onClick={() => setViewYear(viewYear + 1)}
                        className="p-2 hover:bg-white-pure rounded-xl text-navy-principal disabled:opacity-30 transition-all"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>

                    {/* Month Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {monthAbbreviations[lang as keyof typeof monthAbbreviations].map((abbr, i) => {
                        const isSelected = selectedMonth.getMonth() === i && selectedMonth.getFullYear() === viewYear;
                        const hasData = monthsWithData.has(`${viewYear}-${i}`);
                        const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === viewYear;

                        return (
                          <button
                            key={i}
                            onClick={() => handleMonthChange(new Date(viewYear, i, 1))}
                            className={cn(
                              "relative h-12 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1",
                              isSelected 
                                ? "bg-green-forest text-white-pure shadow-lg shadow-green-forest/20" 
                                : "bg-white-pure text-navy-principal hover:bg-white-ice border border-transparent",
                              isCurrentMonth && !isSelected && "border-green-forest border-dashed"
                            )}
                          >
                            {abbr}
                            {hasData && (
                              <div className={cn(
                                "w-1 h-1 rounded-full",
                                isSelected ? "bg-white-pure/50" : "bg-green-forest"
                              )} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {paginatedLancamentos.map((l) => {
            const category = data.categorias.find(c => c.id === l.categoriaId);
            const subcategory = category?.subcategorias.find(s => s.id === l.subcategoriaId);
            const isRenda = category?.tipo === 'renda';
            const lDate = l.data ? parseISO(l.data) : new Date(l.ano, l.mes, l.dia || 1);
            const isSelected = selectedLancamentoId === l.id;
            const isFuture = l.ano > currentYear || (l.ano === currentYear && l.mes > currentMonth);

            return (
              <div key={l.id} className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedLancamentoId(isSelected ? null : l.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer shadow-sm",
                    isSelected 
                      ? "bg-gold-soft border-gold-light ring-2 ring-gold-principal/20" 
                      : "bg-white-pure border-gray-soft hover:bg-white-off"
                  )}
                >
                  <div className="p-3 rounded-xl" style={{ backgroundColor: isFuture ? 'var(--color-gold-soft)' : `${category?.cor}15` }}>
                    <span className="text-xl">{category?.icone}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-navy-principal truncate">{l.descricao || subcategory?.nome}</h4>
                      {l.parcelamentoId && (
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full",
                          isFuture ? "bg-gold-soft text-gold-dark" : "bg-blue-soft text-blue-dark"
                        )}>
                          {l.numeroParcela}/{l.totalParcelas} {isFuture && `· ${t('dashboard.prev')}`}
                        </span>
                      )}
                      {l.tipo === 'orcado' && (
                        <span className="px-2 py-0.5 bg-gray-soft text-gray-medium text-[10px] font-bold rounded-full">
                          {t('dashboard.budgeted')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-light truncate">
                      {category?.nome} • {formatDate(lDate, lang)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold", isFuture ? "text-gold-principal" : (isRenda ? "text-gold-principal" : "text-red-brick"))}>
                      {isRenda ? '+' : '–'} {formatCurrency(l.valor, lang)}
                    </p>
                  </div>
                </motion.div>

                {/* Action Bar */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between shadow-lg">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-xs font-bold text-gray-900 truncate">{l.descricao || subcategory?.nome}</p>
                          <p className="text-[10px] font-bold text-gray-400">{formatCurrency(l.valor, lang)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (l.parcelamentoId) {
                                setManagingInstallment(l);
                              } else {
                                setEditingLancamento(l);
                              }
                            }}
                            className="px-4 py-2 bg-navy-principal text-white-pure rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm"
                          >
                            {t('dashboard.edit')}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingLancamento(l);
                            }}
                            className="px-4 py-2 bg-red-brick text-white-pure rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm"
                          >
                            {t('dashboard.delete')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {filteredLancamentos.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('dashboard.noTransactions')}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-6 border-t border-gray-soft">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-gray-light uppercase tracking-widest">
                  {((page - 1) * itemsPerPage) + 1}–{Math.min(page * itemsPerPage, filteredLancamentos.length)} {t('dashboard.of')} {filteredLancamentos.length} {t('dashboard.transactions')}
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => handlePageChange(1)}
                    className="p-2 bg-white-pure border border-gray-soft rounded-xl text-navy-principal disabled:opacity-30 transition-all shadow-sm hover:bg-white-off"
                    title={t('dashboard.first')}
                  >
                    <ChevronLeft size={16} className="-mr-2" />
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="p-2 bg-white-pure border border-gray-soft rounded-xl text-navy-principal disabled:opacity-30 transition-all shadow-sm hover:bg-white-off"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={cn(
                            "w-8 h-8 rounded-xl text-xs font-bold transition-all",
                            page === pageNum 
                              ? "bg-navy-principal text-white-pure shadow-md" 
                              : "text-gray-medium hover:bg-white-off"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="p-2 bg-white-pure border border-gray-soft rounded-xl text-navy-principal disabled:opacity-30 transition-all shadow-sm hover:bg-white-off"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(totalPages)}
                    className="p-2 bg-white-pure border border-gray-soft rounded-xl text-navy-principal disabled:opacity-30 transition-all shadow-sm hover:bg-white-off"
                    title={t('dashboard.last')}
                  >
                    <ChevronRight size={16} />
                    <ChevronRight size={16} className="-ml-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingLancamento && (
          <EditTransactionModal 
            lancamento={editingLancamento} 
            onClose={() => setEditingLancamento(null)} 
          />
        )}

        {managingInstallment && (
          <InstallmentManager 
            lancamento={managingInstallment} 
            onClose={() => setManagingInstallment(null)} 
          />
        )}

        {deletingLancamento && (
          <DeleteTransactionModal
            lancamento={deletingLancamento}
            onClose={() => setDeletingLancamento(null)}
            onDeleted={() => {
              // If current page becomes empty, go back
              const newFiltered = data.lancamentos.filter(l => {
                const lDate = l.data ? parseISO(l.data) : new Date(l.ano, l.mes, l.dia || 1);
                const start = startOfMonth(selectedMonth);
                const end = endOfMonth(selectedMonth);
                return isWithinInterval(lDate, { start, end }) && l.id !== deletingLancamento.id;
              });
              const newTotalPages = Math.ceil(newFiltered.length / itemsPerPage);
              if (page > newTotalPages && page > 1) {
                setPage(page - 1);
              }
              setSelectedLancamentoId(null);
              showToast(t('dashboard.transactionDeleted'));
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {data.showDividasWelcome && (
          <DividasWelcomeModal 
            onClose={dismissDividasWelcome} 
            onViewCategories={() => {
              dismissDividasWelcome();
              // In a real app we'd navigate to Categories tab
              // For now we just close
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] min-w-[320px]"
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
              <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DividasWelcomeModal = ({ onClose, onViewCategories }: { onClose: () => void, onViewCategories: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white-pure w-full max-w-sm rounded-[40px] shadow-2xl p-8 space-y-8 text-center"
      >
        <div className="w-20 h-20 bg-red-soft rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
          💳
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-serif font-bold text-navy-principal">{t('dashboard.dividasWelcome.title')}</h2>
          <p className="text-sm text-gray-medium leading-relaxed">
            {t('dashboard.dividasWelcome.description')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icone: '🚗', nome: t('category.carro') },
            { icone: '🏠', nome: t('category.casa') },
            { icone: '💰', nome: t('category.emprestimo') },
            { icone: '📋', nome: t('category.serasa') }
          ].map(item => (
            <div key={item.nome} className="p-3 bg-white-off rounded-2xl border border-gray-soft flex items-center gap-2">
              <span className="text-xl">{item.icone}</span>
              <span className="text-[10px] font-bold text-gray-medium uppercase truncate">{item.nome}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-light italic">
          {t('dashboard.dividasWelcome.footer')}
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-navy-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-navy-principal/10"
          >
            {t('dashboard.dividasWelcome.start')}
          </button>
          <button 
            onClick={onViewCategories}
            className="w-full py-4 text-gray-medium font-bold text-sm"
          >
            {t('dashboard.dividasWelcome.viewCategories')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

