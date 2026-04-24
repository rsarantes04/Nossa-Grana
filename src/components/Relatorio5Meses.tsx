import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';
import { 
  ArrowLeft, ArrowUp, ArrowDown, Minus, 
  ChevronDown, ChevronUp, Download, Filter,
  BarChart3, PieChart as PieChartIcon, TrendingUp,
  LayoutList, Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Relatorio5MesesProps {
  onBack: () => void;
}

interface SubcategoriaData {
  nome: string;
  valores: number[];
}

interface CategoriaData {
  id: string;
  nome: string;
  icone: string;
  totais: number[];
  variacoes: ('alta' | 'baixa' | 'neutro')[];
  subcategorias: SubcategoriaData[];
}

interface ReportData {
  meses: string[];
  categorias: CategoriaData[];
}

export const Relatorio5Meses = ({ onBack }: Relatorio5MesesProps) => {
  const { data: financeData } = useFinance();
  const { t, lang } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSubcategories, setShowSubcategories] = useState(true);
  const [viewMode, setViewMode] = useState<'absolute' | 'percent'>('absolute');
  const [exporting, setExporting] = useState(false);
  const [periodOption, setPeriodOption] = useState<'last5' | 'current2before' | 'current4after'>('last5');

  const reportData = useMemo(() => {
    const months: { month: number; year: number; label: string }[] = [];
    const now = new Date();
    
    let startMonth = 0;
    let startYear = 0;
    let numMonths = 5;

    if (periodOption === 'last5') {
        // 5 últimos meses (incluindo o atual)
        for (let i = -4; i <= 0; i++) {
        let m = now.getMonth() + i;
        let y = now.getFullYear();
        while (m < 0) { m += 12; y -= 1; }
        while (m > 11) { m -= 12; y += 1; }
        months.push({ month: m, year: y, label: `${y}-${String(m + 1).padStart(2, '0')}` });
        }
    } else if (periodOption === 'current2before') {
        // Atual, 2 meses antes, 2 meses depois
        for (let i = -2; i <= 2; i++) {
            let m = now.getMonth() + i;
            let y = now.getFullYear();
            while (m < 0) { m += 12; y -= 1; }
            while (m > 11) { m -= 12; y += 1; }
            months.push({ month: m, year: y, label: `${y}-${String(m + 1).padStart(2, '0')}` });
        }
    } else if (periodOption === 'current4after') {
        // Atual e os 4 subsequentes
        for (let i = 0; i <= 4; i++) {
            let m = now.getMonth() + i;
            let y = now.getFullYear();
            while (m < 0) { m += 12; y -= 1; }
            while (m > 11) { m -= 12; y += 1; }
            months.push({ month: m, year: y, label: `${y}-${String(m + 1).padStart(2, '0')}` });
        }
    }

    const categories: CategoriaData[] = financeData.categorias
      .filter(c => c.ativa)
      .map(cat => {
        const subcategorias: SubcategoriaData[] = cat.subcategorias
          .filter(s => s.ativa)
          .map(sub => {
            const valores = months.map(m => {
              return financeData.lancamentos
                .filter(l => 
                  l.tipo === 'realizado' && 
                  l.categoriaId === cat.id && 
                  l.subcategoriaId === sub.id && 
                  l.mes === m.month && 
                  l.ano === m.year
                )
                .reduce((sum, l) => sum + l.valor, 0);
            });
            return { nome: sub.nome, valores };
          });

        const totais = months.map(m => {
          return financeData.lancamentos
            .filter(l => 
              l.tipo === 'realizado' && 
              l.categoriaId === cat.id && 
              l.mes === m.month && 
              l.ano === m.year
            )
            .reduce((sum, l) => sum + l.valor, 0);
        });

        const variacoes = totais.map((total, i) => {
          if (i === 0) return 'neutro';
          const prev = totais[i - 1];
          if (prev === 0) return total > 0 ? 'alta' : 'neutro';
          const diff = (total - prev) / prev;
          if (diff > 0.05) return 'alta';
          if (diff < -0.05) return 'baixa';
          return 'neutro';
        });

        return {
          id: cat.id,
          nome: cat.nome,
          icone: cat.icone,
          totais,
          variacoes,
          subcategorias
        };
      });

    return {
      meses: months.map(m => m.label),
      categorias: categories
    };
  }, [financeData, periodOption]);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  useEffect(() => {
    if (reportData) {
      setLoading(false);
    }
  }, [reportData]);

  const filteredCategories = useMemo(() => {
    if (!reportData) return [];
    if (selectedCategory === 'all') return reportData.categorias;
    return reportData.categorias.filter(c => c.id === selectedCategory);
  }, [reportData, selectedCategory]);

  const chartData = useMemo(() => {
    if (!reportData) return [];
    return reportData.meses.map((month, index) => {
      const entry: any = { name: month };
      reportData.categorias.forEach(cat => {
        entry[cat.nome] = cat.totais[index];
      });
      return entry;
    });
  }, [reportData]);

  const handleExportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element || exporting) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8F9FA',
        onclone: (clonedDoc) => {
          const reportElement = clonedDoc.getElementById('report-content');
          if (reportElement) {
            // Remove shadows and other problematic TW4 features
            const problematic = reportElement.querySelectorAll('.shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl, .shadow-inner');
            problematic.forEach(el => {
              (el as HTMLElement).style.boxShadow = 'none';
            });

            // Force mobile-like layout
            reportElement.style.width = '100%';
            reportElement.style.maxWidth = '400px'; // Force mobile width
            reportElement.style.margin = '0 auto';
            
            const table = reportElement.querySelector('table');
            if (table) {
                table.style.minWidth = '0';
                table.style.width = '100%';
                
                // Reduce padding for dense mobile look
                const cells = table.querySelectorAll('th, td');
                cells.forEach(el => {
                    (el as HTMLElement).style.padding = '4px 2px';
                    (el as HTMLElement).style.fontSize = '8px';
                });
            }
          }

          // Force replace any oklch/oklab in the document stylesheets to prevent html2canvas parser crash
          try {
            for (let i = 0; i < clonedDoc.styleSheets.length; i++) {
              const sheet = clonedDoc.styleSheets[i];
              if (!sheet) continue;
              const rules = (sheet as any).cssRules || (sheet as any).rules;
              if (!rules) continue;
              
              for (let j = rules.length - 1; j >= 0; j--) {
                const rule = rules[j] as CSSStyleRule;
                if (rule.cssText && (rule.cssText.includes('oklch') || rule.cssText.includes('oklab'))) {
                  try {
                    sheet.deleteRule(j);
                  } catch (e) {
                    // Skip if can't delete
                  }
                }
              }
            }
          } catch (e) {
            // Ignore cross-origin errors
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Add multiple pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`relatorio-5-meses-${financeData.familia.nome}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatMonth = React.useCallback((monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMM/yy', { locale: ptBR }).toUpperCase();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-white-off min-h-full flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-principal border-t-transparent rounded-full animate-spin" />
        <p className="text-navy-principal font-bold">{t('common.loading')}</p>
      </div>
    );
  }

  if (!reportData) return null;

  return (
    <div className="p-6 space-y-6 bg-white-off min-h-full pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white-pure rounded-full text-navy-principal transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('more.report5Months.title' as any) || 'Comparativo 5 Meses'}</h1>
        </div>
        <button 
          onClick={handleExportPDF}
          disabled={exporting}
          className={cn(
            "p-3 rounded-2xl shadow-lg transition-all flex items-center gap-2",
            exporting ? "bg-gray-soft text-gray-medium cursor-not-allowed" : "bg-navy-principal text-white-pure hover:bg-navy-dark"
          )}
        >
          {exporting ? (
            <div className="w-5 h-5 border-2 border-navy-principal border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={18} />
          )}
          <span className="text-xs font-bold uppercase hidden sm:inline">
            {exporting ? t('common.loading') : t('dashboard.export')}
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white-pure p-6 rounded-[32px] border border-gray-soft shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-light font-bold uppercase tracking-widest flex items-center gap-1">
              <Filter size={10} /> Período
            </label>
            <select 
              value={periodOption}
              onChange={(e) => setPeriodOption(e.target.value as any)}
              className="w-full p-3 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
            >
              <option value="last5">5 Últimos</option>
              <option value="current2before">Atual +/- 2 meses</option>
              <option value="current4after">Atual + 4 meses</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-light font-bold uppercase tracking-widest flex items-center gap-1">
              <Filter size={10} /> {t('dashboard.category')}
            </label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 bg-white-off border border-gray-soft rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
            >
              <option value="all">{t('dashboard.allCategories')}</option>
              {reportData.categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button 
              onClick={() => setShowSubcategories(!showSubcategories)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all border",
                showSubcategories ? "bg-navy-principal text-white-pure border-navy-principal" : "bg-white-off text-gray-medium border-gray-soft"
              )}
            >
              <LayoutList size={16} />
              {showSubcategories ? 'Ocultar Sub' : 'Mostrar Sub'}
            </button>
            <button 
              onClick={() => setViewMode(viewMode === 'absolute' ? 'percent' : 'absolute')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all border",
                viewMode === 'percent' ? "bg-gold-principal text-navy-principal border-gold-principal" : "bg-white-off text-gray-medium border-gray-soft"
              )}
            >
              <Percent size={16} />
              {viewMode === 'absolute' ? 'Absoluto' : 'Percentual'}
            </button>
          </div>
        </div>
      </div>

      <div id="report-content" className="space-y-8">
        {/* Table */}
        <div className="bg-white-pure rounded-[32px] border border-gray-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-white-off">
                  <th className="p-4 text-[10px] font-bold text-gray-light uppercase tracking-widest sticky left-0 bg-white-off z-10 w-48">{t('dashboard.category')}</th>
                  {reportData.meses.map((month, i) => (
                    <th 
                      key={month} 
                      className={cn(
                        "p-4 text-[10px] font-bold text-gray-light uppercase tracking-widest text-right",
                        i === 4 && "bg-[#F9F6EF] text-gold-dark"
                      )}
                    >
                      {formatMonth(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <React.Fragment key={cat.id}>
                    <tr 
                      className="border-t border-white-off hover:bg-white-off/30 transition-colors cursor-pointer"
                      onClick={() => toggleCat(cat.id)}
                    >
                      <td className="p-4 sticky left-0 bg-white-pure z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat.icone}</span>
                          <span className="text-sm font-bold text-navy-principal truncate">{cat.nome}</span>
                          {cat.subcategorias.length > 0 && (
                            expandedCats.includes(cat.id) ? <ChevronUp size={14} className="text-gray-light" /> : <ChevronDown size={14} className="text-gray-light" />
                          )}
                        </div>
                      </td>
                      {cat.totais.map((total, i) => (
                        <td key={i} className={cn("p-4 text-sm text-right font-bold", i === 4 ? "bg-[#FCFAF7] text-navy-principal" : "text-gray-medium")}>
                          <div className="flex flex-col items-end">
                            <span>{formatCurrency(total, lang)}</span>
                            <div className="flex items-center gap-1 mt-1">
                              {cat.variacoes[i] === 'alta' && <ArrowUp size={10} className="text-red-brick" />}
                              {cat.variacoes[i] === 'baixa' && <ArrowDown size={10} className="text-green-forest" />}
                              {cat.variacoes[i] === 'neutro' && <Minus size={10} className="text-gray-light" />}
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                    
                    <AnimatePresence>
                      {expandedCats.includes(cat.id) && showSubcategories && cat.subcategorias.map((sub) => (
                        <motion.tr 
                          key={sub.nome}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-[#F1F3F5] border-t border-white-off"
                        >
                          <td className="p-4 pl-10 sticky left-0 bg-[#F1F3F5] z-10">
                            <span className="text-xs text-gray-medium">└─ {sub.nome}</span>
                          </td>
                          {sub.valores.map((val, i) => (
                            <td key={i} className={cn("p-4 text-xs text-right text-gray-light font-medium", i === 4 && "bg-[#FCFAF7]")}>
                              {formatCurrency(val, lang)}
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white-pure p-6 rounded-[32px] border border-gray-soft space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-navy-principal flex items-center gap-2">
              <BarChart3 size={20} className="text-gold-principal" />
              {t('dashboard.visualAnalysis')}
            </h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                <XAxis 
                  dataKey="name" 
                  tickFormatter={formatMonth}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#8A9AA8' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#8A9AA8' }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(27,43,68,0.1)', padding: '12px 20px' }}
                  formatter={(value: number) => formatCurrency(value, lang)}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                {reportData.categorias.slice(0, 5).map((cat, index) => (
                  <Bar 
                    key={cat.id} 
                    dataKey={cat.nome} 
                    fill={financeData.categorias.find(c => c.id === cat.id)?.cor || '#CAD5E0'} 
                    radius={[4, 4, 0, 0]} 
                    stackId="a"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
