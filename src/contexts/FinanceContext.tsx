import React, { createContext, useContext, useState, useEffect, useMemo, useReducer } from 'react';
import { FinanceData, Lancamento, Category, Subcategory, Divida, Meta, Familia, MetasMensais, Parcelamento, AuditLog, SonhoProjeto, AporteSonho, Insight, Configuracoes, StatusDivida, Patrimonio, Cartao, PaymentMethod } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { addMonths, format, parseISO } from 'date-fns';
import { formatCurrency, roundCurrency, toCents, fromCents, sanitizeCurrency } from '../lib/utils';
import { calcularQuantidadeFaturasAteVencimento, calcularDatasCobranca } from '../lib/cartaoUtils';
import { getRealized as libGetRealized, getBudgeted as libGetBudgeted, calculateDivida } from '../lib/financialCalculations';
import bcrypt from 'bcryptjs';
import { validateLancamento, validateDivida, validatePatrimonio, validateCartao } from '../services/validationService';
import { syncDividas, syncSonhosProjetos } from '../lib/dataSync';
import { toCents, toDecimal } from '../lib/currency';

// Actions
export type FinanceAction = 
  | { type: 'UPDATE_DATA'; payload: FinanceData }
  | { type: 'RESET_DATA' };

const financeReducer = (state: FinanceData, action: FinanceAction): FinanceData => {
  switch (action.type) {
    case 'UPDATE_DATA':
      return action.payload;
    case 'RESET_DATA':
      return INITIAL_DATA;
    default:
      return state;
  }
};

interface FinanceContextType {
  data: FinanceData;
  updateFamilia: (familia: Familia) => void;
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'dataCriacao'>) => void;
  updateLancamento: (ano: number, mes: number, subcatId: string, catId: string, tipo: 'orcado' | 'realizado', valor: number) => void;
  updateLancamentoFull: (id: string, updates: Partial<Lancamento>) => void;
  removeLancamento: (id: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'dataCriacao' | 'dataAtualizacao' | 'ordem' | 'ativa'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  archiveCategory: (id: string) => void;
  removeCategory: (id: string, reassignToId?: string) => void;
  addSubcategory: (categoryId: string, name: string) => void;
  updateSubcategory: (categoryId: string, subcatId: string, updates: Partial<Subcategory>) => void;
  archiveSubcategory: (categoryId: string, subcatId: string) => void;
  removeSubcategory: (categoryId: string, subcatId: string) => void;
  removeAllSubcategories: () => void;
  reorderCategories: (newOrder: Category[]) => void;
  addDivida: (divida: Omit<Divida, 'id' | 'totalPago' | 'saldoRestante' | 'progresso' | 'status' | 'conquistada' | 'historicoPagamentos'>) => void;
  updateDivida: (id: string, updates: Partial<Divida>) => void;
  removeDivida: (id: string) => void;
  updateDividaParcelas: (id: string, increment: number) => void;
  addMeta: (meta: Omit<Meta, 'id'>) => void;
  updateMetaAporte: (id: string, valor: number) => void;
  addSonhoProjeto: (sonho: Omit<SonhoProjeto, 'id' | 'valorAcumulado' | 'progresso' | 'aportes' | 'subcategoriaId' | 'conquistado'>) => void;
  updateSonhoProjeto: (id: string, updates: Partial<SonhoProjeto>) => void;
  removeSonhoProjeto: (id: string) => void;
  addPatrimonio: (patrimonio: Omit<Patrimonio, 'id' | 'dataCriacao' | 'ativo'>) => void;
  updatePatrimonio: (id: string, updates: Partial<Patrimonio>) => void;
  removePatrimonio: (id: string) => void;
  markInsightAsRead: (id: string) => void;
  dismissInsight: (id: string) => void;
  updateMetaIndependencia: (valor: number) => void;
  addParcelamento: (parcelamento: Omit<Parcelamento, 'id'>, numParcelas: number) => void;
  removeParcelamento: (id: string) => void;
  updateParcelamento: (id: string, updates: Partial<Parcelamento>) => void;
  addCartao: (cartao: Omit<Cartao, 'id' | 'dataCriacao' | 'ativo'>) => void;
  updateCartao: (id: string, updates: Partial<Cartao>) => void;
  removeCartao: (id: string) => void;
  updateInstallmentIndividual: (id: string, updates: Partial<Lancamento>) => void;
  updateInstallmentsRemaining: (parcelamentoId: string, fromParcela: number, updates: Partial<Lancamento>, applyToAll: Record<string, boolean>) => void;
  removeInstallmentIndividual: (id: string) => void;
  cancelInstallmentsRemaining: (parcelamentoId: string, fromParcela: number, motivo?: string, obs?: string) => void;
  updateOrcamento: (ano: number, mes: number, categoriaId: string, subcategoriaId: string | undefined, valor: number | null) => void;
  copyOrcamentoToNextMonth: (ano: number, mes: number) => void;
  getFilteredLancamentos: (filter: { year?: number; month?: number | 'all'; categoryId?: string; subcategoryId?: string; type?: 'realizado' | 'orcado' }) => Lancamento[];
  getSummedLancamentos: (filter: { year?: number; month?: number | 'all'; categoryId?: string; subcategoryId?: string; type?: 'realizado' | 'orcado' }) => number;
  activeTimeframe: { year: number; month: number };
  setActiveTimeframe: (year: number, month: number) => void;
  dismissDividasWelcome: () => void;
  setOnboarded: (value: boolean) => void;
  resetData: () => void;
  updateConfiguracoes: (updates: Partial<Configuracoes>) => void;
  logout: () => void;
  login: (codigo: string, senha: string) => Promise<boolean>;
  isLoggedIn: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const STORAGE_KEY = 'nossa_grana_data';

const INITIAL_DATA: FinanceData = {
  familia: { id: 'default-family', nome: 'Família', moeda: 'BRL' },
  categorias: DEFAULT_CATEGORIES,
  lancamentos: [],
  cartoes: [],
  parcelamentos: [],
  orcamentosMensais: [],
  dividas: [],
  metas: [],
  sonhosProjetos: [],
  patrimonio: [],
  insights: [],
  metasMensais: {
    aporteInvestimentos: 0.20,
    doacoes: 0.10,
    gastos: 0.70
  },
  logs: [],
  onboarded: false,
  configuracoes: {
    tamanhoFonte: 'media',
    tema: 'classico',
    idioma: 'pt',
    notificacoes: true,
    ocultarValores: false,
    perfil: {
      criado: false,
      nome: '',
      codigo: '',
      senhaHash: '',
      dataCriacao: ''
    }
  }
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const syncOrcamentos = (currentData: FinanceData): FinanceData => {
  // Audit categories valid structure
  const validSubcategories = new Set<string>();
  currentData.categorias.forEach(cat => {
    cat.subcategorias.forEach(sub => {
      validSubcategories.add(sub.id);
    });
  });

  const updatedOrcamentos: any[] = [];
  const seen = new Set<string>(); // key = `${ano}-${mes}-${subcategoriaId}`
  let changed = false;

  currentData.orcamentosMensais.forEach(o => {
    // 1. Validate subcategory
    if (o.subcategoriaId && !validSubcategories.has(o.subcategoriaId)) {
        changed = true;
        return;
    }

    // 2. Check for duplicates
    const key = `${o.ano}-${o.mes}-${o.subcategoriaId}`;
    if (seen.has(key)) {
        changed = true;
        return;
    }
    seen.add(key);
    updatedOrcamentos.push(o);
  });

  const isSame = updatedOrcamentos.length === currentData.orcamentosMensais.length &&
                  updatedOrcamentos.every((o, i) => o === currentData.orcamentosMensais[i]);
  
  if (isSame) return currentData;

  return { ...currentData, orcamentosMensais: updatedOrcamentos };
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTimeframe, _setActiveTimeframe] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const setActiveTimeframe = React.useCallback((year: number, month: number) => {
    _setActiveTimeframe(prev => {
      if (prev.year === year && prev.month === month) return prev;
      return { year, month };
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [data, dispatch] = useReducer(financeReducer, INITIAL_DATA, () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_DATA;
    
    const parsed = JSON.parse(saved);
    
    // Migration: Ensure categories have the new fields and DÍVIDAS exists
    let migratedCategories = (parsed.categorias || INITIAL_DATA.categorias).map((cat: any, idx: number) => {
      const catId = cat.id || crypto.randomUUID();
      const now = new Date().toISOString();
      return {
        ...cat,
        id: catId,
        ordem: typeof cat.ordem === 'number' ? cat.ordem : idx,
        ativa: typeof cat.ativa === 'boolean' ? cat.ativa : true,
        dataCriacao: cat.dataCriacao || now,
        dataAtualizacao: cat.dataAtualizacao || now,
        subcategorias: (cat.subcategorias || []).map((sub: any, sIdx: number) => ({
          ...sub,
          id: sub.id || crypto.randomUUID(),
          ativa: typeof sub.ativa === 'boolean' ? sub.ativa : true,
          ordem: typeof sub.ordem === 'number' ? sub.ordem : sIdx,
          dataCriacao: sub.dataCriacao || now,
          categoriaPaiId: catId
        }))
      };
    });

    // Migration: Ensure lancamentos have dataCriacao
    const migratedLancamentos = (parsed.lancamentos || []).map((l: any) => {
      const category = migratedCategories.find((c: any) => c.id === l.categoriaId);
      const subcategory = category?.subcategorias.find((s: any) => s.id === l.subcategoriaId);

      return {
        ...l,
        dataCriacao: l.dataCriacao || l.dataEdicao || l.data || new Date(l.ano, l.mes, l.dia || 1).toISOString(),
        valor: roundCurrency(l.valor)
      };
    });

    // Check if DÍVIDAS exists, if not, add it from DEFAULT_CATEGORIES
    const hasDividas = migratedCategories.some((c: any) => c.nome === 'DÍVIDAS');
    let showDividasWelcome = parsed.showDividasWelcome;
    if (!hasDividas) {
      const defaultDividas = DEFAULT_CATEGORIES.find(c => c.nome === 'DÍVIDAS');
      if (defaultDividas) {
        migratedCategories.push(defaultDividas);
        showDividasWelcome = true;
      }
    }

    // Migration: Ensure SONHOS & PROJETOS has stable ID
    const catSonhos = migratedCategories.find((c: any) => c.nome.toUpperCase() === 'SONHOS & PROJETOS');
    if (catSonhos && catSonhos.id !== 'cat-sonhos-001') {
      const oldId = catSonhos.id;
      catSonhos.id = 'cat-sonhos-001';
      catSonhos.subcategorias.forEach((s: any) => s.categoriaPaiId = 'cat-sonhos-001');

      (parsed.lancamentos || []).forEach((l: any) => {
        if (l.categoriaId === oldId) l.categoriaId = 'cat-sonhos-001';
      });
      (parsed.orcamentosMensais || []).forEach((o: any) => {
        if (o.categoriaId === oldId) o.categoriaId = 'cat-sonhos-001';
      });
    }

    // Migration: Ensure PET category exists
    const hasPet = migratedCategories.some((c: any) => c.nome === 'PET');
    if (!hasPet) {
      const defaultPet = DEFAULT_CATEGORIES.find(c => c.nome === 'PET');
      if (defaultPet) {
        migratedCategories.push(defaultPet);
      }
    }

    // Migration: Ensure all fields from INITIAL_DATA exist in the loaded data
    let finalData = {
      ...INITIAL_DATA,
      ...parsed,
      categorias: applyCategoryMigration(migratedCategories),
      showDividasWelcome,
      lancamentos: migratedLancamentos,
      logs: [],
    };
    
    return syncOrcamentos({
      ...finalData,
      parcelamentos: (parsed.parcelamentos || []).map((p: any) => ({
        ...p,
        valorTotal: roundCurrency(p.valorTotal),
        valorParcela: roundCurrency(p.valorParcela)
      })),
      orcamentosMensais: (parsed.orcamentosMensais || []).map((o: any) => ({
        ...o,
        valorOrcado: o.valorOrcado !== null ? roundCurrency(o.valorOrcado) : null
      })),
      dividas: (parsed.dividas || []).map((d: any) => ({
        ...d,
        valorContratado: roundCurrency(d.valorContratado),
        valorParcela: roundCurrency(d.valorParcela),
        saldoQuitacaoVista: roundCurrency(d.saldoQuitacaoVista)
      })),
      metas: (parsed.metas || []).map((m: any) => ({
        ...m,
        valorMeta: roundCurrency(m.valorMeta),
        valorAcumulado: roundCurrency(m.valorAcumulado)
      })),
      sonhosProjetos: (parsed.sonhosProjetos || []).map((s: any) => ({
        ...s,
        valorMeta: roundCurrency(s.valorMeta),
        valorAcumulado: roundCurrency(s.valorAcumulado),
        aportes: (s.aportes || []).map((a: any) => ({ ...a, valor: roundCurrency(a.valor) }))
      })),
      configuracoes: {
        ...INITIAL_DATA.configuracoes,
        ...parsed.configuracoes,
        perfil: {
          ...INITIAL_DATA.configuracoes.perfil,
          ...(parsed.configuracoes?.perfil || {})
        }
      }
    });
  });

  function applyCategoryMigration(migratedCategories: Category[]): Category[] {
      function toTitleCase(str: string) {
          return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }

      // 1. Ensure 'GASTOS COM A CASA' exists
      const hasCasa = migratedCategories.some((c: Category) => c.nome.toUpperCase() === 'GASTOS COM A CASA');
      if (!hasCasa) {
          const defaultCasa = DEFAULT_CATEGORIES.find(c => c.nome.toUpperCase() === 'GASTOS COM A CASA');
          if (defaultCasa) migratedCategories.push(defaultCasa);
      }

      // 2. Update 'DOAÇÃO E GENEROSIDADE' subcategories
      const doacaoCat = migratedCategories.find((c: Category) => c.nome.toUpperCase() === 'DOAÇÃO E GENEROSIDADE');
      if (doacaoCat) {
          const dizimoSub = doacaoCat.subcategorias.find((s: Subcategory) => s.nome.toLowerCase() === 'dízimo');
          if (dizimoSub) dizimoSub.nome = 'Dízimo e ofertas';
          
          const hasRifas = doacaoCat.subcategorias.some((s: Subcategory) => s.nome.toLowerCase() === 'rifas');
          if (!hasRifas) {
              doacaoCat.subcategorias.push({
                  id: crypto.randomUUID(),
                  nome: 'Rifas',
                  ativa: true,
                  ordem: doacaoCat.subcategorias.length,
                  dataCriacao: new Date().toISOString(),
                  categoriaPaiId: doacaoCat.id
              });
          }
      }

      // 3. Update 'SONHOS & PROJETOS' subcategories
      const sonhosCat = migratedCategories.find((c: Category) => c.id === 'cat-sonhos-001' || c.nome.toUpperCase() === 'SONHOS & PROJETOS');
      if (sonhosCat) {
          sonhosCat.subcategorias = [
              'Viagem a Europa', 'Sítio', 'Abrir empresa', 'Troca de carro', 'Comprar casa', 'Cirurgia plástica'
          ].map((name, idx) => ({
              id: crypto.randomUUID(),
              nome: name,
              ativa: true,
              ordem: idx,
              dataCriacao: new Date().toISOString(),
              categoriaPaiId: sonhosCat.id
          }));
      }

      // 4. Update 'INVESTIMENTOS' subcategories
      const investCat = migratedCategories.find((c: Category) => c.nome.toUpperCase() === 'INVESTIMENTOS');
      if (investCat) {
          const targetSubNames = ['Tesouro Direto', 'ETFs', 'CDB', 'Ações', 'Fundos de investimentos', 'Criptomoedas', 'Moeda estrangeira', 'Ouro'];
          
          investCat.subcategorias = targetSubNames.map((name, idx) => {
              // Try to preserve existing subcategory if name matches
              const existing = investCat.subcategorias.find(s => s.nome.toLowerCase() === name.toLowerCase());
              if (existing) {
                  return { ...existing, nome: name, ordem: idx };
              }
              // Create new if doesn't exist
              return {
                  id: crypto.randomUUID(),
                  nome: name,
                  ativa: true,
                  ordem: idx,
                  dataCriacao: new Date().toISOString(),
                  categoriaPaiId: investCat.id
              };
          }).filter((sub, index, self) => 
            // Ensure no duplicates by name (if multiple matched for some reason)
            index === self.findIndex((s) => s.nome.toLowerCase() === sub.nome.toLowerCase())
          );
      }

      // 6. Remove 'Lazer Noturno' from 'DESPESAS PESSOAIS'
      const pesCat = migratedCategories.find((c: Category) => c.nome.toUpperCase() === 'DESPESAS PESSOAIS');
      if (pesCat) {
          pesCat.subcategorias = pesCat.subcategorias.filter((s: Subcategory) => s.nome.toLowerCase() !== 'lazer noturno');
      }

      // 5. Update various categories with new subcategories
      const updateSubcats = (catName: string, newSubs: string[], append: boolean = true) => {
          const cat = migratedCategories.find((c: any) => c.nome.toUpperCase() === catName.toUpperCase());
          if (cat) {
              const existingNames = cat.subcategorias.map((s: any) => s.nome.toLowerCase());
              const subsToAdd = newSubs.filter(name => !existingNames.includes(name.toLowerCase()));
              
              if (subsToAdd.length > 0) {
                  const baseOrder = append ? cat.subcategorias.length : 0;
                  const newSubObjs = subsToAdd.map((name, idx) => ({
                      id: crypto.randomUUID(),
                      nome: name,
                      ativa: true,
                      ordem: baseOrder + idx,
                      dataCriacao: new Date().toISOString(),
                      categoriaPaiId: cat.id
                  }));
                  
                  if (append) cat.subcategorias.push(...newSubObjs);
                  else cat.subcategorias = [...newSubObjs, ...cat.subcategorias];
              }
          }
      };

      updateSubcats('HABITAÇÃO', ['Condomínio', 'Detetização', 'Feira', 'Açougue', 'Mudança', 'Seguro']);
      updateSubcats('TRANSPORTE', ['Flanelinha', 'Equipamentos', 'Passagem de ônibus', 'Borracharia', 'Transferência', 'Multas']);
      updateSubcats('DESPESAS PESSOAIS', ['Anuidades de conselhos', 'Emissão de documentos']);
      updateSubcats('LAZER', ['Cafeteria/sorveteria', 'Almoços', 'Lanches', 'Cinema', 'Shows/jogos', 'Aluguel de carro']);
      updateSubcats('EDUCAÇÃO', ['Palestras']);

      // 6. Ensure 'IMPOSTOS E APOSENTADORIA' exists
      const catName = 'IMPOSTOS E APOSENTADORIA';
      let impCat = migratedCategories.find((c: any) => c.nome.toUpperCase() === catName);
      if (!impCat) {
          impCat = {
              id: crypto.randomUUID(),
              nome: catName,
              tipo: 'despesa',
              icone: '🏛️',
              cor: '#7F8C8D',
              ordem: migratedCategories.length,
              ativa: true,
              dataCriacao: new Date().toISOString(),
              dataAtualizacao: new Date().toISOString(),
              subcategorias: []
          };
          migratedCategories.push(impCat);
      }
      updateSubcats(catName, ['Contribuição à previdência', 'Imposto de renda', 'Previdência complementar']);

      const habCat = migratedCategories.find((c: any) => c.nome.toUpperCase() === 'HABITAÇÃO');
      if (habCat) {
          habCat.subcategorias = habCat.subcategorias.filter(
              (s: any) => s.nome.toLowerCase() !== 'financiamento imobiliário'
          );
      }

      // Final formatting pass to ensure title case consistency
      migratedCategories.forEach(cat => {
          cat.nome = cat.nome.toUpperCase();
          cat.subcategorias.forEach((sub: any) => {
              sub.nome = toTitleCase(sub.nome);
          });
      });

      return migratedCategories;
  }

  useEffect(() => {
    // Apply font size
    const fontSizes = {
      pequena: '13px',
      media: '15px',
      grande: '17px',
      extra: '20px'
    };
    document.documentElement.style.setProperty('--font-base', fontSizes[data.configuracoes.tamanhoFonte]);

    // Apply theme
    const themes = {
      classico: { header: '#0F1A2E', primary: '#00875A', accent: '#C9A962' },
      noturno: { header: '#1a1a2e', primary: '#7F77DD', accent: '#5DCAA5' },
      verde: { header: '#f5f5f0', primary: '#00875A', accent: '#1D9E75' },
      oceano: { header: '#042C53', primary: '#378ADD', accent: '#85B7EB' },
      ambar: { header: '#2C2C2A', primary: '#EF9F27', accent: '#FAC775' },
      rosa: { header: '#ffffff', primary: '#D4537E', accent: '#534AB7' }
    };
    const currentTheme = themes[data.configuracoes.tema];
    document.documentElement.style.setProperty('--app-header-bg', currentTheme.header);
    document.documentElement.style.setProperty('--app-primary', currentTheme.primary);
    document.documentElement.style.setProperty('--app-accent', currentTheme.accent);
  }, [data.configuracoes.tamanhoFonte, data.configuracoes.tema]);

  useEffect(() => {
    if (data.configuracoes.perfil.criado && !isLoggedIn) {
      // User needs to login
    } else if (!data.configuracoes.perfil.criado) {
      setIsLoggedIn(true);
    }
  }, [data.configuracoes.perfil.criado]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Insight Generation Engine
  useEffect(() => {
    if (!data.onboarded) return;

    const generateInsights = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const newInsights: Insight[] = [];

      // Helper to get realized value for a category/month/year
      const getRealized = (catId: string, month: number, year: number) => {
        return libGetRealized(data, catId, month, year);
      };

      // Helper to get budgeted value for a category/month/year
      const getBudgeted = (catId: string, month: number, year: number) => {
        return libGetBudgeted(data, catId, month, year);
      };

      const totalRendaMes = data.lancamentos
        .filter(l => l.mes === currentMonth && l.ano === currentYear && l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'renda')
        .reduce((acc, l) => acc + toCents(l.valor), 0);

      const totalGastoMes = data.lancamentos
        .filter(l => l.mes === currentMonth && l.ano === currentYear && l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo !== 'renda')
        .reduce((acc, l) => acc + toCents(l.valor), 0);

      // 1. Categoria que cresceu acima de 15% (CRÍTICO) ou 10-15% (ATENÇÃO)
      data.categorias.forEach(cat => {
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        const valAtualCents = toCents(getRealized(cat.id, currentMonth, currentYear));
        const valAnteriorCents = toCents(getRealized(cat.id, prevMonth, prevYear));

        if (valAnteriorCents > 0) {
          const varPercent = ((valAtualCents - valAnteriorCents) / valAnteriorCents) * 100;
          if (varPercent > 15) {
            newInsights.push({
              id: `crescimento-critico-${cat.id}-${currentMonth}-${currentYear}`,
              tipo: 'critico',
              titulo: `${cat.nome} cresceu ${varPercent.toFixed(0)}% este mês`,
              descricao: `Seus gastos com ${cat.nome} subiram de ${formatCurrency(fromCents(valAnteriorCents))} para ${formatCurrency(fromCents(valAtualCents))}.`,
              categoriaId: cat.id,
              mes: currentMonth,
              ano: currentYear,
              lido: false,
              dispensado: false,
              geradoEm: new Date().toISOString(),
              dados: { varPercentual: varPercent, valorAtual: fromCents(valAtualCents), valorAnterior: fromCents(valAnteriorCents) }
            });
          } else if (varPercent > 10) {
            newInsights.push({
              id: `crescimento-atencao-${cat.id}-${currentMonth}-${currentYear}`,
              tipo: 'atencao',
              titulo: `Atenção ao crescimento em ${cat.nome}`,
              descricao: `Houve um aumento de ${varPercent.toFixed(0)}% nos gastos desta categoria em relação ao mês passado.`,
              categoriaId: cat.id,
              mes: currentMonth,
              ano: currentYear,
              lido: false,
              dispensado: false,
              geradoEm: new Date().toISOString(),
              dados: { varPercentual: varPercent, valorAtual: fromCents(valAtualCents), valorAnterior: fromCents(valAnteriorCents) }
            });
          }
        }
      });

      // 2. Categoria consumiu mais de 30% da renda (CRÍTICO)
      if (totalRendaMes > 0) {
        data.categorias.forEach(cat => {
          if (cat.tipo === 'renda') return;
          const realizadoCents = toCents(getRealized(cat.id, currentMonth, currentYear));
          const percentRenda = (realizadoCents / totalRendaMes) * 100;
          if (percentRenda > 30) {
            newInsights.push({
              id: `consumo-renda-alto-${cat.id}-${currentMonth}-${currentYear}`,
              tipo: 'critico',
              titulo: `${cat.nome} consumiu ${percentRenda.toFixed(0)}% da sua renda`,
              descricao: `Quase um terço do que você ganhou este mês foi para ${cat.nome}. É importante avaliar se este gasto é sustentável.`,
              categoriaId: cat.id,
              mes: currentMonth,
              ano: currentYear,
              lido: false,
              dispensado: false,
              geradoEm: new Date().toISOString()
            });
          }
        });
      }

      // 3. Saldo Negativo (CRÍTICO)
      if (totalRendaMes > 0 && totalGastoMes > totalRendaMes) {
        newInsights.push({
          id: `saldo-negativo-${currentMonth}-${currentYear}`,
          tipo: 'critico',
          titulo: `Alerta: Saldo negativo este mês`,
          descricao: `Seus gastos totais (${formatCurrency(fromCents(totalGastoMes))}) superaram sua renda realizada (${formatCurrency(fromCents(totalRendaMes))}).`,
          categoriaId: null,
          mes: currentMonth,
          ano: currentYear,
          lido: false,
          dispensado: false,
          geradoEm: new Date().toISOString()
        });
      }

      // 4. Sonho sem aporte há 60 dias (ATENÇÃO)
      data.sonhosProjetos.forEach(sonho => {
        if (sonho.conquistado || !sonho.ativa) return;
        const lastAporte = sonho.aportes
          .filter(a => a.status === 'confirmado')
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
        
        if (lastAporte) {
          const daysSince = (now.getTime() - new Date(lastAporte.data).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 60) {
            newInsights.push({
              id: `sonho-parado-${sonho.id}`,
              tipo: 'atencao',
              titulo: `O sonho "${sonho.nome}" está parado`,
              descricao: `Não identificamos aportes para este objetivo nos últimos 60 dias. Que tal retomar o planejamento?`,
              categoriaId: null,
              mes: currentMonth,
              ano: currentYear,
              lido: false,
              dispensado: false,
              geradoEm: new Date().toISOString()
            });
          }
        }
      });

      // 5. Conquista: Saldo Positivo (CONQUISTA)
      if (totalRendaMes > 0 && totalGastoMes < totalRendaMes && totalGastoMes > 0) {
        newInsights.push({
          id: `conquista-saldo-positivo-${currentMonth}-${currentYear}`,
          tipo: 'conquista',
          titulo: `Mês fechado no azul!`,
          descricao: `Parabéns! Você gastou menos do que ganhou este mês, sobrando ${formatCurrency(totalRendaMes - totalGastoMes)} para seus sonhos.`,
          categoriaId: null,
          mes: currentMonth,
          ano: currentYear,
          lido: false,
          dispensado: false,
          geradoEm: new Date().toISOString()
        });
      }

      // 6. Dica: Saldo orçado não utilizado (DICA)
      data.categorias.forEach(cat => {
        const realizado = getRealized(cat.id, currentMonth, currentYear);
        const orcado = getBudgeted(cat.id, currentMonth, currentYear);
        const saldoLivre = orcado - realizado;
        if (orcado > 0 && saldoLivre >= 200) {
          newInsights.push({
            id: `dica-realocacao-${cat.id}-${currentMonth}-${currentYear}`,
            tipo: 'dica',
            titulo: `Oportunidade em ${cat.nome}`,
            descricao: `Você ainda tem ${formatCurrency(saldoLivre)} sobrando do orçado para ${cat.nome}. Que tal investir esse valor?`,
            categoriaId: cat.id,
            mes: currentMonth,
            ano: currentYear,
            lido: false,
            dispensado: false,
            geradoEm: new Date().toISOString()
          });
        }
      });

      // 7. Liberdade Financeira (LIBERDADE)
      const metaLF = toCents(data.metaIndependenciaFinanceira || 250000);
      const patrimonioLF = data.lancamentos
        .filter(l => l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'investimento')
        .reduce((acc, l) => acc + toCents(l.valor), 0);
      
      const progressoLF = (patrimonioLF / metaLF) * 100;
      
      // Média de aportes últimos 3 meses
      const getAporteMes = (m: number, y: number) => data.lancamentos
        .filter(l => l.mes === m && l.ano === y && l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'investimento')
        .reduce((acc, l) => acc + toCents(l.valor), 0);
      
      const m1 = currentMonth;
      const y1 = currentYear;
      const m2 = m1 === 0 ? 11 : m1 - 1;
      const y2 = m1 === 0 ? y1 - 1 : y1;
      const m3 = m2 === 0 ? 11 : m2 - 1;
      const y3 = m2 === 0 ? y2 - 1 : y2;

      const mediaAportes = (getAporteMes(m1, y1) + getAporteMes(m2, y2) + getAporteMes(m3, y3)) / 3;
      const mesesRestantes = mediaAportes > 0 ? (metaLF - patrimonioLF) / mediaAportes : Infinity;
      const anosRestantes = mesesRestantes !== Infinity ? Math.floor(mesesRestantes / 12) : null;
      const mesesFinais = mesesRestantes !== Infinity ? Math.round(mesesRestantes % 12) : null;

      let tempoDesc = "Defina uma média de aportes para estimar o tempo.";
      if (anosRestantes !== null) {
        tempoDesc = `Estimativa: ${anosRestantes} anos e ${mesesFinais} meses para atingir sua meta no ritmo atual.`;
      }

      newInsights.push({
        id: `liberdade-financeira-status`,
        tipo: 'liberdade',
        titulo: `Independência Financeira: ${progressoLF.toFixed(1)}%`,
        descricao: `Seu patrimônio investido é de ${formatCurrency(fromCents(patrimonioLF))}. ${tempoDesc}`,
        categoriaId: null,
        mes: currentMonth,
        ano: currentYear,
        lido: false,
        dispensado: false,
        geradoEm: new Date().toISOString()
      });

      // 8. Orçamento atingido (CRÍTICO > 90%, ATENÇÃO > 70%)
      data.categorias.forEach(cat => {
        const realizadoCents = toCents(getRealized(cat.id, currentMonth, currentYear));
        const orcadoCents = toCents(getBudgeted(cat.id, currentMonth, currentYear));
        if (orcadoCents > 0) {
          const percent = (realizadoCents / orcadoCents) * 100;
          if (percent >= 90) {
            newInsights.push({
              id: `orcamento-critico-${cat.id}-${currentMonth}-${currentYear}`,
              tipo: 'critico',
              titulo: `Orçamento de ${cat.nome} quase esgotado`,
              descricao: `Você já utilizou ${percent.toFixed(0)}% do planejado para ${cat.nome} (${formatCurrency(fromCents(realizadoCents))} de ${formatCurrency(fromCents(orcadoCents))}).`,
              categoriaId: cat.id,
              mes: currentMonth,
              ano: currentYear,
              lido: false,
              dispensado: false,
              geradoEm: new Date().toISOString()
            });
          } else if (percent >= 70) {
            newInsights.push({
              id: `orcamento-atencao-${cat.id}-${currentMonth}-${currentYear}`,
              tipo: 'atencao',
              titulo: `Atenção ao orçamento de ${cat.nome}`,
              descricao: `Você já utilizou ${percent.toFixed(0)}% do planejado para ${cat.nome}.`,
              categoriaId: cat.id,
              mes: currentMonth,
              ano: currentYear,
              lido: false,
              dispensado: false,
              geradoEm: new Date().toISOString()
            });
          }
        }
      });

      // 9. Sonho Atingido (CONQUISTA)
      data.sonhosProjetos.forEach(sonho => {
        if (sonho.conquistado && sonho.ativa) {
          newInsights.push({
            id: `conquista-sonho-${sonho.id}`,
            tipo: 'conquista',
            titulo: `Sonho Realizado: ${sonho.nome}!`,
            descricao: `Parabéns! Você atingiu 100% da meta para ${sonho.nome}. Que tal celebrar essa conquista?`,
            categoriaId: null,
            mes: currentMonth,
            ano: currentYear,
            lido: false,
            dispensado: false,
            geradoEm: new Date().toISOString()
          });
        }
      });

      // Filter out existing insights to avoid duplicates (based on ID)
      safeUpdate(prev => {
        const existingIds = new Set(prev.insights.map(i => i.id));
        const uniqueNewInsights = newInsights.filter(i => !existingIds.has(i.id));
        
        if (uniqueNewInsights.length === 0) return prev;
        
        return {
          ...prev,
          insights: [...uniqueNewInsights, ...prev.insights].slice(0, 50) // Keep last 50
        };
      });
    };

    generateInsights();
  }, [data.lancamentos, data.orcamentosMensais, data.onboarded, data.metaIndependenciaFinanceira]);

  const updateFamilia = (familia: Familia) => {
    safeUpdate(prev => ({ ...prev, familia }));
  };

  // Effect to watch for newly conquered debts
  // useEffect(() => {
  //   const newlyConquered = data.dividas.filter(d => d.status === 'quitada' && !d.conquistada);
  //   if (newlyConquered.length > 0) {
  //     newlyConquered.forEach(d => {
  //       showToast(`Dívida '${d.nome}' quitada! 🎉`, 'success');
  //       updateDivida(d.id, { conquistada: true });
  //     });
  //   }
  // }, [data.dividas]);

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp' | 'usuario'>) => {
    // Audit logging disabled as requested by user
  };

  const validateIds = (catId: string, subcatId: string, categories: Category[]) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return false;
    const sub = cat.subcategorias.find(s => s.id === subcatId);
    return !!sub;
  };

  // --- INFRAESTRUTURA DE PERSISTÊNCIA ---
  const safeUpdate = (updater: (prev: FinanceData) => FinanceData) => {
    const proximoEstadoPreSync = updater(data);
    const proximoEstadoSync = syncDividas(syncSonhosProjetos(syncOrcamentos(proximoEstadoPreSync)));
    
    // Stop the update loop by checking if state actually changed
    if (JSON.stringify(proximoEstadoSync) === JSON.stringify(data)) {
      console.log('--- SAFEUPDATE: No change ---');
      return;
    }
    console.log('--- SAFEUPDATE: Data changed ---');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proximoEstadoSync));
    dispatch({ type: 'UPDATE_DATA', payload: proximoEstadoSync });
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'dataCriacao'>) => {
    const safeLancamento = {
        ...lancamento,
        valor: typeof lancamento.valor === 'string' ? parseFloat(lancamento.valor) : lancamento.valor
    };

    if (!validateLancamento(safeLancamento)) {
       showToast('Dados de lançamento inválidos (verifique valor, descrição e categoria)!', 'error');
       return;
    }
    
    safeUpdate(prev => {
      if (!validateIds(safeLancamento.categoriaId, safeLancamento.subcategoriaId, prev.categorias)) {
        console.error("Invalid transaction: Category or Subcategory not found");
        showToast('Categoria ou subcategoria não encontrada!', 'error');
        return prev;
      }
      
      const newLancamento: Lancamento = {
        ...safeLancamento,
        id: crypto.randomUUID(),
        dataCriacao: new Date().toISOString(),
        valor: fromCents(toCents(safeLancamento.valor))
      };

      return {
        ...prev,
        lancamentos: [...prev.lancamentos, newLancamento]
      };
    });
  };

  const updateLancamento = (id: string, valor: number, tipo: 'orcado' | 'realizado') => {
    // This is a bit tricky because we might need to find by category/subcat/month/year if ID isn't known
    // But for simplicity, let's assume we have the ID or we create a new one if it doesn't exist for that slot
  };

  // Improved updateLancamento that handles the "slot" logic (month/year/subcat/type)
  const upsertLancamento = (ano: number, mes: number, subcatId: string, catId: string, tipo: 'orcado' | 'realizado', valor: number) => {
    const roundedValor = roundCurrency(valor);
    safeUpdate(prev => {
      if (!validateIds(catId, subcatId, prev.categorias)) {
        console.error("Invalid upsert: Category or Subcategory not found");
        return prev;
      }
      
      const existingIndex = prev.lancamentos.findIndex(l => 
        l.ano === ano && l.mes === mes && l.subcategoriaId === subcatId && l.tipo === tipo
      );

      const newLancamentos = [...prev.lancamentos];
      if (existingIndex >= 0) {
        newLancamentos[existingIndex] = { ...newLancamentos[existingIndex], valor: roundedValor, dataEdicao: new Date().toISOString() };
      } else {
        newLancamentos.push({
          id: crypto.randomUUID(),
          ano,
          mes,
          categoriaId: catId,
          subcategoriaId: subcatId,
          tipo,
          valor: roundedValor,
          dataCriacao: new Date().toISOString()
        });
      }
      return syncDividas(syncSonhosProjetos({ ...prev, lancamentos: newLancamentos }));
    });
  };

  const updateLancamentoFull = (id: string, updates: Partial<Lancamento>) => {
    const now = new Date().toISOString();
    safeUpdate(prev => {
      const lancamentos = prev.lancamentos || [];
      const index = lancamentos.findIndex(l => l.id === id);
      if (index === -1) return prev;

      const old = lancamentos[index];
      const updated = { 
        ...old, 
        ...updates, 
        valor: updates.valor !== undefined ? roundCurrency(updates.valor) : old.valor,
        dataEdicao: now 
      };
      
      const changedFields = Object.keys(updates).filter(key => (updates as any)[key] !== (old as any)[key]);
      
      if (changedFields.length > 0) {
        addAuditLog({
          entidade: 'lancamento',
          entidadeId: id,
          acao: 'edicao',
          detalhes: `Campos alterados: ${changedFields.join(', ')}`
        });
      }

      const newLancamentos = [...lancamentos];
      newLancamentos[index] = updated;
      return { ...prev, lancamentos: newLancamentos };
    });
  };

  const removeLancamento = (id: string) => {
    safeUpdate(prev => {
      const lancamento = (prev.lancamentos || []).find(l => l.id === id);
      if (!lancamento) return prev;

      addAuditLog({
        entidade: 'lancamento',
        entidadeId: id,
        acao: 'exclusao',
        detalhes: `Lançamento removido: ${lancamento.descricao || 'Sem descrição'}`
      });

      let newData: FinanceData = {
        ...prev,
        lancamentos: (prev.lancamentos || []).filter(l => l.id !== id)
      };

      if (lancamento.parcelamentoId) {
        const pId = lancamento.parcelamentoId;
        const parcelamento = prev.parcelamentos.find(p => p.id === pId);
        if (parcelamento) {
          const kept = newData.lancamentos.filter(l => l.parcelamentoId === pId);
          const totalCents = kept.reduce((acc, l) => acc + toCents(l.valor), 0);
          const realized = kept.filter(l => l.tipo === 'realizado').length;
          const isCancelled = kept.length === 0;

          newData.parcelamentos = prev.parcelamentos.map(p => {
            if (p.id === pId) {
              return {
                ...p,
                statusAtivo: !isCancelled,
                valorTotal: fromCents(totalCents),
                totalParcelas: kept.length,
                parcelasEfetivamentePagas: realized
              };
            }
            return p;
          });
        }
      }

      return syncDividas(syncSonhosProjetos(newData));
    });
  };

  const addCategory = (category: Omit<Category, 'id' | 'dataCriacao' | 'dataAtualizacao' | 'ordem' | 'ativa'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    safeUpdate(prev => ({
      ...prev,
      categorias: [...prev.categorias, { 
        ...category, 
        id, 
        ordem: prev.categorias.length,
        ativa: true,
        dataCriacao: now,
        dataAtualizacao: now,
        subcategorias: []
      }]
    }));
    addAuditLog({
      entidade: 'categoria',
      entidadeId: id,
      acao: 'criacao',
      detalhes: `Categoria criada: ${category.nome}`
    });
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const now = new Date().toISOString();
    safeUpdate(prev => ({
      ...prev,
      categorias: prev.categorias.map(c => 
        c.id === id ? { ...c, ...updates, dataAtualizacao: now } : c
      )
    }));
    addAuditLog({
      entidade: 'categoria',
      entidadeId: id,
      acao: 'edicao',
      detalhes: `Categoria atualizada: ${updates.nome || 'campos alterados'}`
    });
  };

  const archiveCategory = (id: string) => {
    safeUpdate(prev => ({
      ...prev,
      categorias: prev.categorias.map(c => 
        c.id === id ? { 
          ...c, 
          ativa: false, 
          subcategorias: c.subcategorias.map(s => ({ ...s, ativa: false }))
        } : c
      )
    }));
    addAuditLog({
      entidade: 'categoria',
      entidadeId: id,
      acao: 'arquivamento',
      detalhes: `Categoria e subcategorias arquivadas`
    });
  };

  const removeCategory = (id: string, reassignToId?: string) => {
    safeUpdate(prev => {
      const hasLancamentos = prev.lancamentos.some(l => l.categoriaId === id);
      
      // Validation: Migration required if transactions exist
      if (hasLancamentos && (!reassignToId || !prev.categorias.some(c => c.id === reassignToId))) {
        alert('Não é possível excluir permanentemente ou re-vincular sem uma categoria de destino válida.');
        return prev;
      }

      // 1. Process affected transactions (Reassign or Remover)
      let updatedLancamentos = prev.lancamentos;
      if (hasLancamentos && reassignToId) {
        updatedLancamentos = prev.lancamentos.map(l => 
          l.categoriaId === id ? { ...l, categoriaId: reassignToId, subcategoriaId: '' } : l
        );
      } else if (hasLancamentos) {
        updatedLancamentos = prev.lancamentos.filter(l => l.categoriaId !== id);
      }
      
      // 2. Identify dependent subcategory IDs
      const category = prev.categorias.find(c => c.id === id);
      const subcatIds = category?.subcategorias.map(s => s.id) || [];

      // 3. Filter out entities
      return {
        ...prev,
        categorias: prev.categorias.filter(c => c.id !== id),
        lancamentos: updatedLancamentos,
        orcamentosMensais: prev.orcamentosMensais.filter(o => o.categoriaId !== id),
        sonhosProjetos: prev.sonhosProjetos.filter(s => s.subcategoriaId ? !subcatIds.includes(s.subcategoriaId) : true),
        patrimonio: prev.patrimonio.filter(p => !subcatIds.includes(p.subcategoria)),
        parcelamentos: prev.parcelamentos.filter(p => !subcatIds.includes(p.subcategoriaId)),
        dividas: prev.dividas.filter(d => !subcatIds.includes(d.subcategoriaId))
      };
    });

    addAuditLog({
      entidade: 'categoria',
      entidadeId: id,
      acao: 'exclusao',
      detalhes: `Categoria removida ${reassignToId ? 'com migração de lançamentos' : 'permanentemente'}`
    });
  };

  const addSubcategory = (categoryId: string, name: string) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    safeUpdate(prev => {
      const cat = prev.categorias.find(c => c.id === categoryId);
      const isSonhos = cat?.id === 'cat-sonhos-001' || cat?.nome === 'SONHOS & PROJETOS';
      
      let updatedSonhos = prev.sonhosProjetos;
      if (isSonhos) {
        updatedSonhos = [...prev.sonhosProjetos, {
          id,
          subcategoriaId: id,
          nome: name,
          tipo: name.toLowerCase().includes('projeto') ? 'projeto' : 'sonho',
          valorMeta: 0,
          valorAcumulado: 0,
          progresso: 0,
          prazo: undefined,
          icone: '🎯',
          cor: '#3b82f6',
          ativa: true,
          conquistado: false,
          origemCriacao: 'categorias',
          aportes: []
        }];
      }

      const updatedCategorias = prev.categorias.map(c => 
        c.id === categoryId 
          ? { 
              ...c, 
              subcategorias: [
                ...c.subcategorias, 
                { 
                  id, 
                  nome: name, 
                  ativa: true, 
                  ordem: c.subcategorias.length,
                  dataCriacao: now,
                  categoriaPaiId: categoryId
                }
              ] 
            }
          : c
      );

      return { ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos };
    });

    addAuditLog({
      entidade: 'subcategoria',
      entidadeId: id,
      acao: 'criacao',
      detalhes: `Subcategoria criada: ${name}`
    });
  };

  const updateSubcategory = (categoryId: string, subcatId: string, updates: Partial<Subcategory>) => {
    safeUpdate(prev => {
      const cat = prev.categorias.find(c => c.id === categoryId);
      const isSonhos = cat?.id === 'cat-sonhos-001' || cat?.nome === 'SONHOS & PROJETOS';
      
      let updatedSonhos = prev.sonhosProjetos;
      if (isSonhos && updates.nome) {
        const sonho = prev.sonhosProjetos.find(s => s.subcategoriaId === subcatId);
        if (sonho) {
          updatedSonhos = prev.sonhosProjetos.map(s => 
            s.subcategoriaId === subcatId ? { ...s, nome: updates.nome! } : s
          );
        } else {
          // Auto-create card if renamed from default or new
          const subcat = cat?.subcategorias.find(s => s.id === subcatId);
          const isDefault = subcat?.nome.match(/^(Sonho|Projeto) \d+$/i);
          const newNameIsDefault = updates.nome.match(/^(Sonho|Projeto) \d+$/i);

          if (!isDefault || !newNameIsDefault) {
             updatedSonhos = [...prev.sonhosProjetos, {
               id: subcatId,
               subcategoriaId: subcatId,
               nome: updates.nome,
               tipo: updates.nome.toLowerCase().includes('projeto') ? 'projeto' : 'sonho',
               valorMeta: 0,
               valorAcumulado: 0,
               progresso: 0,
               prazo: undefined,
               icone: '🎯',
               cor: '#3b82f6',
               ativa: true,
               conquistado: false,
               origemCriacao: 'categorias',
               aportes: []
             }];
          }
        }
      }

      const updatedCategorias = prev.categorias.map(c => 
        c.id === categoryId 
          ? { 
              ...c, 
              subcategorias: c.subcategorias.map(s => 
                s.id === subcatId ? { ...s, ...updates } : s
              ) 
            }
          : c
      );

      return { ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos };
    });

    addAuditLog({
      entidade: 'subcategoria',
      entidadeId: subcatId,
      acao: 'edicao',
      detalhes: `Subcategoria atualizada: ${updates.nome || 'campos alterados'}`
    });
  };

  const archiveSubcategory = (categoryId: string, subcatId: string) => {
    safeUpdate(prev => {
      const cat = prev.categorias.find(c => c.id === categoryId);
      const isSonhos = cat?.id === 'cat-sonhos-001' || cat?.nome === 'SONHOS & PROJETOS';
      
      let updatedSonhos = prev.sonhosProjetos;
      if (isSonhos) {
        updatedSonhos = prev.sonhosProjetos.map(s => 
          s.subcategoriaId === subcatId ? { ...s, ativa: false } : s
        );
      }

      const updatedCategorias = prev.categorias.map(c => 
        c.id === categoryId 
          ? { 
              ...c, 
              subcategorias: c.subcategorias.map(s => 
                s.id === subcatId ? { ...s, ativa: false } : s
              ) 
            }
          : c
      );

      return { ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos };
    });

    addAuditLog({
      entidade: 'subcategoria',
      entidadeId: subcatId,
      acao: 'arquivamento',
      detalhes: `Subcategoria arquivada`
    });
  };

  const removeSubcategory = (categoryId: string, subcatId: string) => {
    setData(prev => {
      const cat = prev.categorias.find(c => c.id === categoryId);
      const hasLancamentos = prev.lancamentos.some(l => l.subcategoriaId === subcatId);

      // Branch: Soft Delete (Archive) vs Hard Delete
      if (hasLancamentos) {
        // Just archive - preserve history
        const updatedCategorias = prev.categorias.map(c => 
          c.id === categoryId 
            ? { ...c, subcategorias: c.subcategorias.map(s => s.id === subcatId ? { ...s, ativa: false } : s) }
            : c
        );
        const updatedSonhos = prev.sonhosProjetos.map(s => 
          s.subcategoriaId === subcatId ? { ...s, ativa: false } : s
        );
        return syncOrcamentos(syncSonhosProjetos({ ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos }));
      }

      // Hard Delete
      const updatedCategorias = prev.categorias.map(c => 
        c.id === categoryId 
          ? { ...c, subcategorias: c.subcategorias.filter(s => s.id !== subcatId) }
          : c
      );
      
      return syncOrcamentos(syncSonhosProjetos({
        ...prev,
        categorias: updatedCategorias,
        sonhosProjetos: prev.sonhosProjetos.filter(s => s.subcategoriaId !== subcatId),
        orcamentosMensais: prev.orcamentosMensais.filter(o => o.subcategoriaId !== subcatId),
        patrimonio: prev.patrimonio.filter(p => p.subcategoria !== subcatId),
        parcelamentos: prev.parcelamentos.filter(p => p.subcategoriaId !== subcatId),
        dividas: prev.dividas.filter(d => d.subcategoriaId !== subcatId)
      }));
    });

    addAuditLog({
      entidade: 'subcategoria',
      entidadeId: subcatId,
      acao: 'exclusao',
      detalhes: `Subcategoria removida ou arquivada`
    });
  };

  const removeAllSubcategories = () => {
    safeUpdate(prev => {
      const updatedCategorias = prev.categorias.map(c => ({
        ...c,
        subcategorias: [] 
      }));

      return { ...prev, categorias: updatedCategorias };
    });
  };

  const reorderCategories = (newOrder: Category[]) => {
    safeUpdate(prev => ({
      ...prev,
      categorias: newOrder.map((c, idx) => ({ ...c, ordem: idx }))
    }));
  };

  const addDivida = (divida: Omit<Divida, 'id' | 'totalPago' | 'saldoRestante' | 'progresso' | 'status' | 'conquistada' | 'historicoPagamentos'>) => {
    if (!validateDivida(divida)) {
        showToast('Dados de dívida inválidos!', 'error');
        return;
    }
    const id = crypto.randomUUID();
    safeUpdate(prev => {
      const newDivida: Divida = { 
        ...divida, 
        id,
        totalPago: 0,
        saldoRestante: sanitizeCurrency(divida.valorContratado),
        progresso: 0,
        status: 'em_dia',
        conquistada: false,
        historicoPagamentos: [],
        valorContratado: sanitizeCurrency(divida.valorContratado),
        valorParcela: sanitizeCurrency(divida.valorParcela),
        saldoQuitacaoVista: sanitizeCurrency(divida.saldoQuitacaoVista)
      };
      
      return {
        ...prev,
        dividas: [...prev.dividas, newDivida]
      };
    });
    addAuditLog({
      entidade: 'divida',
      entidadeId: id,
      acao: 'criacao',
      detalhes: `Dívida criada: ${divida.nome}`
    });
  };

  const updateDivida = (id: string, updates: Partial<Divida>) => {
    if (updates.valorContratado !== undefined && updates.valorContratado <= 0) {
      showToast('O valor da dívida deve ser positivo!', 'error');
      return;
    }
    
    // Ensure all numeric fields are rounded
    const roundedUpdates = {
      ...updates,
      ...(updates.valorContratado !== undefined && { valorContratado: sanitizeCurrency(updates.valorContratado) }),
      ...(updates.valorParcela !== undefined && { valorParcela: sanitizeCurrency(updates.valorParcela) }),
      ...(updates.saldoQuitacaoVista !== undefined && { saldoQuitacaoVista: sanitizeCurrency(updates.saldoQuitacaoVista) }),
    };

    safeUpdate(prev => {
      const newDividas = prev.dividas.map(d => 
        d.id === id ? { ...d, ...roundedUpdates } : d
      );
      return { ...prev, dividas: newDividas };
    });
    addAuditLog({
      entidade: 'divida',
      entidadeId: id,
      acao: 'edicao',
      detalhes: `Dívida atualizada: ${id}`
    });
  };

  const removeDivida = (id: string) => {
    safeUpdate(prev => {
      const divida = prev.dividas.find(d => d.id === id);
      if (!divida) return prev;

      addAuditLog({
        entidade: 'divida',
        entidadeId: id,
        acao: 'exclusao',
        detalhes: `Dívida removida permanentemente: ${divida.nome}`
      });

      return {
        ...prev,
        dividas: prev.dividas.filter(d => d.id !== id),
        lancamentos: prev.lancamentos.filter(l => !divida.historicoPagamentos.some(p => p.lancamentoId === l.id))
      };
    });
  };

  const updateDividaParcelas = (id: string, increment: number) => {
    safeUpdate(prev => {
      const newDividas = prev.dividas.map(d => 
        d.id === id ? { ...d, parcelasPagas: Math.min(d.quantidadeParcelas, d.parcelasPagas + increment) } : d
      );
      return { ...prev, dividas: newDividas };
    });
  };

  const addMeta = (meta: Omit<Meta, 'id'>) => {
    safeUpdate(prev => ({
      ...prev,
      metas: [...prev.metas, { 
        ...meta, 
        id: crypto.randomUUID(),
        valorMeta: roundCurrency(meta.valorMeta),
        valorAcumulado: roundCurrency(meta.valorAcumulado)
      }]
    }));
  };

  const updateMetaAporte = (id: string, valor: number) => {
    const roundedValor = roundCurrency(valor);
    safeUpdate(prev => ({
      ...prev,
      metas: prev.metas.map(m => 
        m.id === id ? { ...m, valorAcumulado: roundCurrency(m.valorAcumulado + roundedValor) } : m
      )
    }));
  };

  const addSonhoProjeto = (sonho: Omit<SonhoProjeto, 'id' | 'valorAcumulado' | 'progresso' | 'aportes' | 'subcategoriaId' | 'conquistado' | 'origemCriacao'>) => {
    const sharedId = crypto.randomUUID();
    const now = new Date().toISOString();
    const roundedMeta = roundCurrency(sonho.valorMeta);
    
    setData(prev => {
      // Find "SONHOS & PROJETOS" category
      const catSonhos = prev.categorias.find(c => c.id === 'cat-sonhos-001' || c.nome === 'SONHOS & PROJETOS');
      if (!catSonhos) return prev;

      const newSubcat: Subcategory = {
        id: sharedId,
        nome: sonho.nome,
        ativa: true,
        ordem: catSonhos.subcategorias.length,
        dataCriacao: now,
        categoriaPaiId: catSonhos.id,
        icone: sonho.icone
      };

      const newSonho: SonhoProjeto = {
        ...sonho,
        id: sharedId,
        subcategoriaId: sharedId,
        valorMeta: roundedMeta,
        valorAcumulado: 0,
        progresso: 0,
        conquistado: false,
        origemCriacao: 'abaMais',
        aportes: []
      };

      const updatedCategorias = prev.categorias.map(c => 
        c.id === catSonhos.id ? { ...c, subcategorias: [...c.subcategorias, newSubcat] } : c
      );

      const newData = {
        ...prev,
        categorias: updatedCategorias,
        sonhosProjetos: [...prev.sonhosProjetos, newSonho]
      };

      return syncSonhosProjetos(newData);
    });
  };

  const updateSonhoProjeto = (id: string, updates: Partial<SonhoProjeto>) => {
    setData(prev => {
      const sonho = prev.sonhosProjetos.find(s => s.id === id);
      if (!sonho) return prev;

      const updatedSonhos = prev.sonhosProjetos.map(s => s.id === id ? { ...s, ...updates } : s);
      
      // If name changed, update subcategory name
      let updatedCategorias = prev.categorias;
      if (updates.nome) {
        updatedCategorias = prev.categorias.map(c => ({
          ...c,
          subcategorias: c.subcategorias.map(sc => 
            sc.id === sonho.subcategoriaId ? { ...sc, nome: updates.nome! } : sc
          )
        }));
      }

      // If archived (ativa: false), archive subcategory
      if (updates.ativa === false) {
        updatedCategorias = updatedCategorias.map(c => ({
          ...c,
          subcategorias: c.subcategorias.map(sc => 
            sc.id === sonho.subcategoriaId ? { ...sc, ativa: false } : sc
          )
        }));
      }

      return syncSonhosProjetos({ ...prev, sonhosProjetos: updatedSonhos, categorias: updatedCategorias });
    });
  };

  const removeSonhoProjeto = (id: string) => {
    setData(prev => {
      const sonho = prev.sonhosProjetos.find(s => s.id === id);
      if (!sonho) return prev;

      // Check if has lancamentos
      const hasLancamentos = prev.lancamentos.some(l => l.subcategoriaId === sonho.subcategoriaId);
      if (hasLancamentos) {
        alert('Não é possível excluir um sonho com lançamentos vinculados. Use o arquivamento.');
        return prev;
      }

      const updatedSonhos = prev.sonhosProjetos.filter(s => s.id !== id);
      const updatedCategorias = prev.categorias.map(c => ({
        ...c,
        subcategorias: c.subcategorias.filter(sc => sc.id !== sonho.subcategoriaId)
      }));

      return syncSonhosProjetos({ ...prev, sonhosProjetos: updatedSonhos, categorias: updatedCategorias });
    });
  };

  const addPatrimonio = (patrimonio: Omit<Patrimonio, 'id' | 'dataCriacao' | 'ativo'>) => {
    if (!validatePatrimonio(patrimonio)) {
        showToast('Dados de patrimônio inválidos!', 'error');
        return;
    }
    const newPatrimonio: Patrimonio = {
      ...patrimonio,
      id: crypto.randomUUID(),
      dataCriacao: new Date().toISOString(),
      ativo: true
    };
    setData(prev => ({
      ...prev,
      patrimonio: [...(prev.patrimonio || []), newPatrimonio],
      logs: [{
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        entidade: 'patrimonio' as any,
        entidadeId: newPatrimonio.id,
        acao: 'criacao',
        detalhes: `Patrimônio adicionado: ${newPatrimonio.descricao}`,
        usuario: prev.configuracoes.perfil.nome || 'Usuário'
      }, ...prev.logs]
    }));
    showToast('Patrimônio adicionado com sucesso!', 'success');
  };

  const updatePatrimonio = (id: string, updates: Partial<Patrimonio>) => {
    if (updates.valorAquisicao !== undefined && updates.valorAquisicao <= 0) {
      showToast('O valor de aquisição deve ser positivo!', 'error');
      return;
    }

    // Ensure numeric fields are rounded
    const roundedUpdates = {
      ...updates,
      ...(updates.valorAquisicao !== undefined && { valorAquisicao: roundCurrency(updates.valorAquisicao) }),
    };

    setData(prev => ({
      ...prev,
      patrimonio: (prev.patrimonio || []).map(p => p.id === id ? { ...p, ...roundedUpdates } : p),
      logs: [{
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        entidade: 'patrimonio' as any,
        entidadeId: id,
        acao: 'edicao',
        detalhes: `Patrimônio editado: ${updates.descricao || 'sem alteração de nome'}`,
        usuario: prev.configuracoes.perfil.nome || 'Usuário'
      }, ...prev.logs]
    }));
    showToast('Patrimônio atualizado com sucesso!', 'success');
  };

  const removePatrimonio = (id: string) => {
    const item = data.patrimonio?.find(p => p.id === id);
    setData(prev => {
      const newData = {
        ...prev,
        patrimonio: (prev.patrimonio || []).filter(p => p.id !== id)
      };
      
      addAuditLog({
        entidade: 'patrimonio',
        entidadeId: id,
        acao: 'exclusao',
        detalhes: `Patrimônio removido: ${item?.descricao}`
      });

      return syncDividas(syncSonhosProjetos(newData));
    });
    showToast(`${item?.descricao} removido do patrimônio.`, 'success');
  };

  const markInsightAsRead = (id: string) => {
    setData(prev => ({
      ...prev,
      insights: prev.insights.map(i => i.id === id ? { ...i, lido: true } : i)
    }));
  };

  const dismissInsight = (id: string) => {
    setData(prev => ({
      ...prev,
      insights: prev.insights.map(i => i.id === id ? { ...i, dispensado: true } : i)
    }));
  };

  const updateMetaIndependencia = (valor: number) => {
    setData(prev => ({ ...prev, metaIndependenciaFinanceira: valor }));
  };

  const addParcelamento = (parcelamento: Omit<Parcelamento, 'id'>, numParcelas: number) => {
    if (!validateIds(parcelamento.categoriaId, parcelamento.subcategoriaId, data.categorias)) {
        console.error("Invalid IDs for parcelamento", parcelamento);
        showToast('Categoria ou subcategoria inválida!', 'error');
        return;
    }
    if (numParcelas <= 0 || parcelamento.valorTotal <= 0) {
      showToast('Dados do parcelamento inválidos', 'error');
      return;
    }

    const parcelamentoId = crypto.randomUUID();
    const now = new Date().toISOString();
    const totalCents = toCents(parcelamento.valorTotal);
    const baseCents = Math.floor(totalCents / numParcelas);
    const remainder = totalCents % numParcelas;
    const startDate = parseISO(parcelamento.dataInicio);
    // Set start date to the correct billing month if credit card info exists
    const cartao = (parcelamento as any).cartaoId ? data.cartoes?.find(c => c.id === (parcelamento as any).cartaoId) : null;
    let datasFatura: { mes: number, ano: number }[] = [];
    
    if (cartao) {
       datasFatura = calcularQuantidadeFaturasAteVencimento(cartao, parcelamento.dataInicio, numParcelas);
    } else if ((parcelamento as any).mes !== undefined && (parcelamento as any).ano !== undefined) {
       // fallback for old code
       const cobrancaMes = (parcelamento as any).mes;
       const cobrancaAno = (parcelamento as any).ano;
       for(let i=0; i<numParcelas; i++){
          const date = addMonths(new Date(cobrancaAno, cobrancaMes), i);
          datasFatura.push({ mes: date.getMonth(), ano: date.getFullYear() });
       }
    } else {
       for(let i=0; i<numParcelas; i++){
          const date = addMonths(startDate, i);
          datasFatura.push({ mes: date.getMonth(), ano: date.getFullYear() });
       }
    }
    
    const newParcelamento: Parcelamento = {
      ...parcelamento,
      id: parcelamentoId,
      valorTotal: fromCents(totalCents),
      valorParcela: fromCents(baseCents), // Updated to base
      totalParcelas: numParcelas,
      tipo: parcelamento.tipo || 'despesa',
      statusAtivo: true,
      parcelasEfetivamentePagas: 0
    };

    const newLancamentos: Lancamento[] = [];
    for (let i = 0; i < numParcelas; i++) {
      const { mes, ano } = datasFatura[i];                
      const currentDate = new Date(ano, mes, startDate.getDate());
      
      const valorCents = (i < remainder) ? baseCents + 1 : baseCents;
      
      newLancamentos.push({
        id: crypto.randomUUID(),
        ano: currentDate.getFullYear(),
        mes: currentDate.getMonth(),
        dia: currentDate.getDate(),
        data: currentDate.toISOString(),
        dataCriacao: now,
        descricao: `${parcelamento.descricao} (${i + 1}/${numParcelas})`,
        categoriaId: parcelamento.categoriaId,
        subcategoriaId: parcelamento.subcategoriaId,
        tipo: 'realizado',
        valor: fromCents(valorCents),
        parcelamentoId: parcelamentoId,
        numeroParcela: i + 1,
        totalParcelas: numParcelas,
        formaPagamento: parcelamento.formaPagamento,
        cartaoId: (parcelamento as any).cartaoId,
        dataCompra: (parcelamento as any).dataCompra,
        mesCobranca: currentDate.getMonth(),
        anoCobranca: currentDate.getFullYear()
      });
    }

    setData(prev => {
      const newData = {
        ...prev,
        parcelamentos: [...(prev.parcelamentos || []), newParcelamento],
        lancamentos: [...(prev.lancamentos || []), ...newLancamentos]
      };
      
      // Validação final de estado
      if (newData.parcelamentos.length <= (prev.parcelamentos?.length || 0)) {
        console.error('Falha na persistência do parcelamento');
        return prev;
      }

      return syncSonhosProjetos(newData);
    });
  };

  const removeParcelamento = (id: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        parcelamentos: (prev.parcelamentos || []).filter(p => p.id !== id),
        lancamentos: (prev.lancamentos || []).filter(l => l.parcelamentoId !== id)
      };
      
      addAuditLog({
        entidade: 'parcelamento',
        entidadeId: id,
        acao: 'exclusao',
        detalhes: 'Parcelamento completo removido'
      });
      
      return syncDividas(syncSonhosProjetos(newData));
    });
  };

  const addCartao = (cartao: Omit<Cartao, 'id' | 'dataCriacao' | 'ativo'>) => {
    if (!validateCartao(cartao)) {
        showToast('Dados de cartão inválidos!', 'error');
        return;
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      cartoes: [...(prev.cartoes || []), { ...cartao, id, dataCriacao: now, ativo: true } as Cartao]
    }));
  };

  const updateCartao = (id: string, updates: Partial<Cartao>) => {
    setData(prev => {
      const card = prev.cartoes.find(c => c.id === id);
      if (!card) return prev;

      const updatedCard = { ...card, ...updates };
      const cardChanged = updates.diaFechamento !== undefined || updates.diaVencimento !== undefined;
      
      const newCartoes = (prev.cartoes || []).map(c => c.id === id ? updatedCard : c);

      let newLancamentos = prev.lancamentos || [];
      let newParcelamentos = prev.parcelamentos || [];

      if (cardChanged) {
        // Recalculate parcelamentos linked to this card
        newParcelamentos = newParcelamentos.map(p => {
          if (p.cartaoId === id && p.dataCompra) {
             const novaData = calcularDatasCobranca(updatedCard, p.dataCompra);
             return {
               ...p,
               mesCobranca: novaData.mesLancamento,
               anoCobranca: novaData.anoLancamento
             };
          }
          return p;
        });

        // Recalculate lancamentos linked to this card's parcelamentos
        newLancamentos = newLancamentos.map(l => {
          if (l.cartaoId === id && l.parcelamentoId && l.dataCompra) {
             const p = newParcelamentos.find(parcel => parcel.id === l.parcelamentoId);
             if (p) {
               const parcelasDatas = calcularQuantidadeFaturasAteVencimento(updatedCard, p.dataCompra!, p.totalParcelas);
               const dataCobranca = parcelasDatas[(l.numeroParcela || 1) - 1];
               if (dataCobranca) {
                 return {
                   ...l,
                   mesCobranca: dataCobranca.mes,
                   anoCobranca: dataCobranca.ano
                 };
               }
             }
          }
          return l;
        });
      }

      return syncSonhosProjetos(syncDividas({
        ...prev,
        cartoes: newCartoes,
        parcelamentos: newParcelamentos,
        lancamentos: newLancamentos
      }));
    });
  };

  const removeCartao = (id: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        cartoes: (prev.cartoes || []).filter(c => c.id !== id),
        lancamentos: (prev.lancamentos || []).map(l => l.cartaoId === id ? { ...l, cartaoId: null, formaPagamento: 'Dinheiro' as PaymentMethod } : l),
        parcelamentos: (prev.parcelamentos || []).map(p => p.cartaoId === id ? { ...p, cartaoId: null } : p)
      };
      return syncSonhosProjetos(syncDividas(newData));
    });
  };

  const updateParcelamento = (id: string, updates: Partial<Parcelamento>) => {
    setData(prev => {
      const parcelamentos = prev.parcelamentos || [];
      const lancamentos = prev.lancamentos || [];
      
      const parcelamento = parcelamentos.find(p => p.id === id);
      if (!parcelamento) return prev;

      const roundedUpdates = { ...updates };
      if (updates.valorTotal !== undefined) roundedUpdates.valorTotal = roundCurrency(updates.valorTotal);
      if (updates.valorParcela !== undefined) roundedUpdates.valorParcela = roundCurrency(updates.valorParcela);

      const updatedParcelamento = { ...parcelamento, ...roundedUpdates };
      
      // If description or category changed, update all associated lancamentos
      const updatedLancamentos = lancamentos.map(l => {
        if (l.parcelamentoId === id) {
          return {
            ...l,
            descricao: updates.descricao ? `${updates.descricao} (${l.numeroParcela}/${l.totalParcelas})` : l.descricao,
            categoriaId: updates.categoriaId || l.categoriaId,
            subcategoriaId: updates.subcategoriaId || l.subcategoriaId,
          };
        }
        return l;
      });

      addAuditLog({
        entidade: 'parcelamento',
        entidadeId: id,
        acao: 'edicao',
        detalhes: `Parcelamento atualizado: ${updates.descricao || 'campos alterados'}`
      });

      return syncDividas(syncSonhosProjetos({
        ...prev,
        lancamentos: updatedLancamentos,
        parcelamentos: parcelamentos.map(p => p.id === id ? updatedParcelamento : p)
      }));
    });
  };

  const updateInstallmentIndividual = (id: string, updates: Partial<Lancamento>) => {
    const now = new Date().toISOString();
    setData(prev => {
      const index = prev.lancamentos.findIndex(l => l.id === id);
      if (index === -1) return prev;

      const old = prev.lancamentos[index];
      const roundedUpdates = { ...updates };
      if (updates.valor !== undefined) roundedUpdates.valor = fromCents(toCents(updates.valor));
      
      const updated = { ...old, ...roundedUpdates, dataEdicao: now };
      
      const newLancamentos = [...prev.lancamentos];
      newLancamentos[index] = updated;

      addAuditLog({
        entidade: 'lancamento',
        entidadeId: id,
        acao: 'edicao',
        detalhes: `Parcela individual ${old.numeroParcela}/${old.totalParcelas} atualizada`
      });

      return syncSonhosProjetos({ ...prev, lancamentos: newLancamentos });
    });
  };

  const updateInstallmentsRemaining = (parcelamentoId: string, fromParcela: number, updates: Partial<Lancamento>, applyToAll: Record<string, boolean>) => {
    const now = new Date().toISOString();
    const roundedValor = updates.valor !== undefined ? roundCurrency(updates.valor) : undefined;
    
    setData(prev => {
      const parcelamento = prev.parcelamentos.find(p => p.id === parcelamentoId);
      if (!parcelamento) return prev;

      let baseDate = updates.data ? parseISO(updates.data) : null;

      const newLancamentos = prev.lancamentos.map(l => {
        if (l.parcelamentoId === parcelamentoId && l.numeroParcela! >= fromParcela) {
          const parcelaUpdates: any = { ...updates, dataEdicao: now };
          if (roundedValor !== undefined) parcelaUpdates.valor = roundedValor;
          
          // Handle dynamic date recalculation
          if (baseDate) {
            const monthsDiff = l.numeroParcela! - fromParcela;
            const newDate = addMonths(baseDate, monthsDiff);
            parcelaUpdates.data = newDate.toISOString();
            parcelaUpdates.ano = newDate.getFullYear();
            parcelaUpdates.mes = newDate.getMonth();
            parcelaUpdates.dia = newDate.getDate();
          }

          // Apply only selected fields
          const finalUpdates: any = {};
          Object.keys(applyToAll).forEach(key => {
            if (applyToAll[key] && parcelaUpdates[key] !== undefined) {
              finalUpdates[key] = parcelaUpdates[key];
            }
          });

          return { ...l, ...finalUpdates };
        }
        return l;
      });

      // Update parent parcelamento if valorParcela changed
      const newParcelamentos = prev.parcelamentos.map(p => {
        if (p.id === parcelamentoId) {
          const updatedP = { ...p };
          if (applyToAll.valor && roundedValor !== undefined) {
            updatedP.valorParcela = fromCents(toCents(roundedValor));
            updatedP.valorTotal = fromCents(
              prev.lancamentos
              .filter(l => l.parcelamentoId === parcelamentoId)
              .reduce((acc, l) => acc + toCents(l.numeroParcela! < fromParcela ? l.valor : roundedValor), 0)
            );
          }
          return updatedP;
        }
        return p;
      });

      addAuditLog({
        entidade: 'parcelamento',
        entidadeId: parcelamentoId,
        acao: 'edicao',
        detalhes: `Parcelas ${fromParcela} em diante atualizadas`
      });

      return syncDividas(syncSonhosProjetos({ ...prev, lancamentos: newLancamentos, parcelamentos: newParcelamentos }));
    });
  };

  const removeInstallmentIndividual = (id: string) => {
    setData(prev => {
      const lancamento = prev.lancamentos.find(l => l.id === id);
      if (!lancamento || !lancamento.parcelamentoId) return prev;

      const newLancamentos = prev.lancamentos.filter(l => l.id !== id);
      const newParcelamentos = prev.parcelamentos.map(p => {
        if (p.id === lancamento.parcelamentoId) {
          return { ...p, valorTotal: fromCents(Math.max(0, toCents(p.valorTotal) - toCents(lancamento.valor))) };
        }
        return p;
      });

      addAuditLog({
        entidade: 'lancamento',
        entidadeId: id,
        acao: 'exclusao',
        detalhes: `Parcela ${lancamento.numeroParcela}/${lancamento.totalParcelas} removida individualmente`
      });

      return syncDividas(syncSonhosProjetos({ ...prev, lancamentos: newLancamentos, parcelamentos: newParcelamentos }));
    });
  };

  const cancelInstallmentsRemaining = (parcelamentoId: string, fromParcela: number, motivo?: string, obs?: string) => {
    const now = new Date().toISOString();
    setData(prev => {
      const parcelamento = prev.parcelamentos.find(p => p.id === parcelamentoId);
      if (!parcelamento) return prev;

      const keptLancamentos = prev.lancamentos.filter(l => 
        l.parcelamentoId !== parcelamentoId || l.numeroParcela! < fromParcela
      );

      const newParcelamentos = prev.parcelamentos.map(p => {
        if (p.id === parcelamentoId) {
          const totalValueCents = keptLancamentos
              .filter(l => l.parcelamentoId === parcelamentoId)
              .reduce((acc, l) => acc + toCents(l.valor), 0);
          
          const realizedCount = keptLancamentos.filter(l => l.parcelamentoId === parcelamentoId && l.tipo === 'realizado').length;
              
          // If we are canceling all future parcels, consider the possibility to mark it as inactive if no parcels remain.
          // For scenario 5, we keep it active as it still has parcels 1-4.
          const isCancelled = keptLancamentos.filter(l => l.parcelamentoId === parcelamentoId).length === 0;

          return {
            ...p,
            statusAtivo: !isCancelled,
            dataCancelamento: isCancelled ? now : null,
            motivoCancelamento: isCancelled ? (motivo || null) : null,
            observacaoCancelamento: isCancelled ? (obs || null) : null,
            parcelasEfetivamentePagas: realizedCount,
            totalParcelas: keptLancamentos.filter(l => l.parcelamentoId === parcelamentoId).length,
            valorTotal: fromCents(totalValueCents)
          };
        }
        return p;
      });

      addAuditLog({
        entidade: 'parcelamento',
        entidadeId: parcelamentoId,
        acao: 'edicao',
        detalhes: `Parcelas a partir da ${fromParcela} removidas`
      });

      return syncDividas(syncSonhosProjetos({ ...prev, lancamentos: keptLancamentos, parcelamentos: newParcelamentos }));
    });
  };

  const updateOrcamento = (ano: number, mes: number, categoriaId: string, subcategoriaId: string | undefined, valor: number | null) => {
    const now = new Date().toISOString();
    const roundedValor = valor !== null ? roundCurrency(valor) : null;
    setData(prev => {
      const orcamentos = prev.orcamentosMensais || [];
      const existingIndex = orcamentos.findIndex(o => 
        o.ano === ano && o.mes === mes && o.categoriaId === categoriaId && o.subcategoriaId === subcategoriaId
      );

      const newOrcamentos = [...orcamentos];
      if (existingIndex >= 0) {
        newOrcamentos[existingIndex] = { ...newOrcamentos[existingIndex], valorOrcado: roundedValor, dataAtualizacao: now };
      } else {
        newOrcamentos.push({
          id: crypto.randomUUID(),
          ano,
          mes,
          categoriaId,
          subcategoriaId,
          valorOrcado: roundedValor,
          dataAtualizacao: now
        });
      }
      return { ...prev, orcamentosMensais: newOrcamentos };
    });
  };

  const copyOrcamentoToNextMonth = (ano: number, mes: number) => {
    const nextDate = addMonths(new Date(ano, mes, 1), 1);
    const nextAno = nextDate.getFullYear();
    const nextMes = nextDate.getMonth();
    const now = new Date().toISOString();

    setData(prev => {
      const currentOrcamentos = prev.orcamentosMensais.filter(o => o.ano === ano && o.mes === mes);
      const nextOrcamentos = [...prev.orcamentosMensais];

      currentOrcamentos.forEach(curr => {
        const existingIndex = nextOrcamentos.findIndex(o => 
          o.ano === nextAno && o.mes === nextMes && o.categoriaId === curr.categoriaId && o.subcategoriaId === curr.subcategoriaId
        );

        if (existingIndex >= 0) {
          nextOrcamentos[existingIndex] = { ...nextOrcamentos[existingIndex], valorOrcado: curr.valorOrcado, dataAtualizacao: now };
        } else {
          nextOrcamentos.push({
            id: crypto.randomUUID(),
            ano: nextAno,
            mes: nextMes,
            categoriaId: curr.categoriaId,
            subcategoriaId: curr.subcategoriaId,
            valorOrcado: curr.valorOrcado,
            dataAtualizacao: now
          });
        }
      });

      return syncOrcamentos({ ...prev, orcamentosMensais: nextOrcamentos });
    });
  };

  const getFilteredLancamentos = (filter: { year?: number; month?: number | 'all'; categoryId?: string; subcategoryId?: string; type?: 'realizado' | 'orcado' }): Lancamento[] => {
    return data.lancamentos.filter(l => {
      const isCC = l.formaPagamento === 'Cartão de Crédito';
      const lYear = (isCC && l.anoCobranca !== undefined) ? l.anoCobranca : l.ano;
      const lMonth = (isCC && l.mesCobranca !== undefined) ? l.mesCobranca : l.mes;

      const matchYear = filter.year === undefined || lYear === filter.year;
      const matchMonth = filter.month === undefined || filter.month === 'all' || lMonth === filter.month;
      const matchCat = filter.categoryId === undefined || l.categoriaId === filter.categoryId;
      const matchSub = filter.subcategoryId === undefined || l.subcategoriaId === filter.subcategoryId;
      const matchType = filter.type === undefined || l.tipo === filter.type;

      return matchYear && matchMonth && matchCat && matchSub && matchType;
    });
  };

  const getSummedLancamentos = (filter: { year?: number; month?: number | 'all'; categoryId?: string; subcategoryId?: string; type?: 'realizado' | 'orcado' }): number => {
    const filtered = getFilteredLancamentos(filter);
    return filtered.reduce((acc, l) => acc + toCents(l.valor), 0);
  };

  const dismissDividasWelcome = () => {
    setData(prev => ({ ...prev, showDividasWelcome: false }));
  };

  const setOnboarded = (value: boolean) => {
    setData(prev => ({ ...prev, onboarded: value }));
  };

  const resetData = () => {
    setData(INITIAL_DATA);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateConfiguracoes = (updates: Partial<Configuracoes>) => {
    setData(prev => ({
      ...prev,
      configuracoes: {
        ...prev.configuracoes,
        ...updates
      }
    }));
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  const login = async (codigo: string, senha: string): Promise<boolean> => {
    if (data.configuracoes.perfil.codigo === codigo) {
      const match = await bcrypt.compare(senha, data.configuracoes.perfil.senhaHash);
      if (match) {
        setIsLoggedIn(true);
        return true;
      }
    }
    return false;
  };

  return (
    <FinanceContext.Provider value={{ 
      data, 
      updateFamilia, 
      addLancamento, 
      updateLancamento: upsertLancamento as any, // Overriding for the slot logic
      updateLancamentoFull,
      removeLancamento,
      addCategory, 
      updateCategory,
      archiveCategory,
      removeCategory,
      addSubcategory, 
      updateSubcategory,
      archiveSubcategory,
      removeSubcategory,
      removeAllSubcategories,
      reorderCategories,
      addDivida, 
      updateDivida,
      removeDivida,
      updateDividaParcelas, 
      addMeta, 
      updateMetaAporte,
      addSonhoProjeto,
      updateSonhoProjeto,
      removeSonhoProjeto,
      addPatrimonio,
      updatePatrimonio,
      removePatrimonio,
      markInsightAsRead,
      dismissInsight,
      updateMetaIndependencia,
      addParcelamento,
      removeParcelamento,
      updateParcelamento,
      addCartao,
      updateCartao,
      removeCartao,
      updateInstallmentIndividual,
      updateInstallmentsRemaining,
      removeInstallmentIndividual,
      cancelInstallmentsRemaining,
      updateOrcamento,
      copyOrcamentoToNextMonth,
      getFilteredLancamentos,
      getSummedLancamentos,
      activeTimeframe,
      setActiveTimeframe,
      dismissDividasWelcome,
      setOnboarded,
      resetData,
      updateConfiguracoes,
      logout,
      login,
      isLoggedIn,
      toast,
      showToast
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
