import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { FinanceData, Lancamento, Category, Subcategory, Divida, Meta, Familia, MetasMensais, Parcelamento, AuditLog, SonhoProjeto, AporteSonho, Insight, Configuracoes, StatusDivida, Patrimonio } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { addMonths, format, parseISO } from 'date-fns';
import { formatCurrency, roundCurrency } from '../lib/utils';
import bcrypt from 'bcryptjs';

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
  removeCategory: (id: string) => void;
  addSubcategory: (categoryId: string, name: string) => void;
  updateSubcategory: (categoryId: string, subcatId: string, updates: Partial<Subcategory>) => void;
  archiveSubcategory: (categoryId: string, subcatId: string) => void;
  removeSubcategory: (categoryId: string, subcatId: string) => void;
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
  addPatrimonio: (patrimonio: Omit<Patrimonio, 'id' | 'criadoEm' | 'ativo'>) => void;
  updatePatrimonio: (id: string, updates: Partial<Patrimonio>) => void;
  removePatrimonio: (id: string) => void;
  markInsightAsRead: (id: string) => void;
  dismissInsight: (id: string) => void;
  updateMetaIndependencia: (valor: number) => void;
  addParcelamento: (parcelamento: Omit<Parcelamento, 'id'>, numParcelas: number) => void;
  removeParcelamento: (id: string) => void;
  updateParcelamento: (id: string, updates: Partial<Parcelamento>) => void;
  addCartao: (cartao: Omit<Cartao, 'id' | 'criadoEm' | 'ativo'>) => void;
  updateCartao: (id: string, updates: Partial<Cartao>) => void;
  removeCartao: (id: string) => void;
  updateInstallmentIndividual: (id: string, updates: Partial<Lancamento>) => void;
  updateInstallmentsRemaining: (parcelamentoId: string, fromParcela: number, updates: Partial<Lancamento>, applyToAll: Record<string, boolean>) => void;
  removeInstallmentIndividual: (id: string) => void;
  cancelInstallmentsRemaining: (parcelamentoId: string, fromParcela: number, motivo?: string, obs?: string) => void;
  updateOrcamento: (ano: number, mes: number, categoriaId: string, subcategoriaId: string | undefined, valor: number | null) => void;
  copyOrcamentoToNextMonth: (ano: number, mes: number) => void;
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
      criadoEm: ''
    }
  }
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [data, setData] = useState<FinanceData>(() => {
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
    const migratedLancamentos = (parsed.lancamentos || []).map((l: any) => ({
      ...l,
      dataCriacao: l.dataCriacao || l.dataEdicao || l.data || new Date(l.ano, l.mes, l.dia || 1).toISOString(),
      valor: roundCurrency(l.valor)
    }));

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

    // Migration: Ensure PET category exists
    const hasPet = migratedCategories.some((c: any) => c.nome === 'PET');
    if (!hasPet) {
      const defaultPet = DEFAULT_CATEGORIES.find(c => c.nome === 'PET');
      if (defaultPet) {
        migratedCategories.push(defaultPet);
      }
    }

    // Migration: Ensure all fields from INITIAL_DATA exist in the loaded data
    return {
      ...INITIAL_DATA,
      ...parsed,
      categorias: applyCategoryMigration(migratedCategories),
      showDividasWelcome,
      lancamentos: migratedLancamentos,
      logs: [],
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
    };
  });

  function applyCategoryMigration(migratedCategories: any[]) {
      function toTitleCase(str: string) {
          return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }

      // 1. Ensure 'GASTOS COM A CASA' exists
      const hasCasa = migratedCategories.some((c: any) => c.nome.toUpperCase() === 'GASTOS COM A CASA');
      if (!hasCasa) {
          const defaultCasa = DEFAULT_CATEGORIES.find(c => c.nome.toUpperCase() === 'GASTOS COM A CASA');
          if (defaultCasa) migratedCategories.push(defaultCasa);
      }

      // 2. Update 'DOAÇÃO E GENEROSIDADE' subcategories
      const doacaoCat = migratedCategories.find((c: any) => c.nome.toUpperCase() === 'DOAÇÃO E GENEROSIDADE');
      if (doacaoCat) {
          const dizimoSub = doacaoCat.subcategorias.find((s: any) => s.nome.toLowerCase() === 'dízimo');
          if (dizimoSub) dizimoSub.nome = 'Dízimo e ofertas';
          
          const hasRifas = doacaoCat.subcategorias.some((s: any) => s.nome.toLowerCase() === 'rifas');
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
      const sonhosCat = migratedCategories.find((c: any) => c.nome.toUpperCase() === 'SONHOS & PROJETOS');
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
      const investCat = migratedCategories.find((c: any) => c.nome.toUpperCase() === 'INVESTIMENTOS');
      if (investCat) {
          const keepSubcats = investCat.subcategorias.filter((s: any) => s.nome.toLowerCase() !== 'cdi');
          const newSubs = ['ETFs', 'Criptomoedas', 'Moeda estrangeira', 'Ouro'];
          investCat.subcategorias = [
            ...keepSubcats.map((s: any, idx: number) => ({ ...s, ordem: idx })),
            ...newSubs.map((name, idx) => ({
                id: crypto.randomUUID(),
                nome: name,
                ativa: true,
                ordem: keepSubcats.length + idx,
                dataCriacao: new Date().toISOString(),
                categoriaPaiId: investCat.id
            }))
          ];
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
        return data.lancamentos
          .filter(l => l.categoriaId === catId && l.mes === month && l.ano === year && l.tipo === 'realizado')
          .reduce((acc, l) => acc + l.valor, 0);
      };

      // Helper to get budgeted value for a category/month/year
      const getBudgeted = (catId: string, month: number, year: number) => {
        return data.orcamentosMensais
          .filter(o => o.categoriaId === catId && o.mes === month && o.ano === year)
          .reduce((acc, o) => acc + (o.valorOrcado || 0), 0);
      };

      const totalRendaMes = data.lancamentos
        .filter(l => l.mes === currentMonth && l.ano === currentYear && l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'renda')
        .reduce((acc, l) => acc + l.valor, 0);

      const totalGastoMes = data.lancamentos
        .filter(l => l.mes === currentMonth && l.ano === currentYear && l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo !== 'renda')
        .reduce((acc, l) => acc + l.valor, 0);

      // 1. Categoria que cresceu acima de 15% (CRÍTICO) ou 10-15% (ATENÇÃO)
      data.categorias.forEach(cat => {
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        const valAtual = getRealized(cat.id, currentMonth, currentYear);
        const valAnterior = getRealized(cat.id, prevMonth, prevYear);

        if (valAnterior > 0) {
          const varPercent = ((valAtual - valAnterior) / valAnterior) * 100;
          if (varPercent > 15) {
            newInsights.push({
              id: `crescimento-critico-${cat.id}-${currentMonth}-${currentYear}`,
              tipo: 'critico',
              titulo: `${cat.nome} cresceu ${varPercent.toFixed(0)}% este mês`,
              descricao: `Seus gastos com ${cat.nome} subiram de ${formatCurrency(valAnterior)} para ${formatCurrency(valAtual)}.`,
              categoriaId: cat.id,
              mes: currentMonth,
              ano: currentYear,
              lido: false,
              dispensado: false,
              geradoEm: new Date().toISOString(),
              dados: { varPercentual: varPercent, valorAtual: valAtual, valorAnterior: valAnterior }
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
              dados: { varPercentual: varPercent, valorAtual: valAtual, valorAnterior: valAnterior }
            });
          }
        }
      });

      // 2. Categoria consumiu mais de 30% da renda (CRÍTICO)
      if (totalRendaMes > 0) {
        data.categorias.forEach(cat => {
          if (cat.tipo === 'renda') return;
          const realizado = getRealized(cat.id, currentMonth, currentYear);
          const percentRenda = (realizado / totalRendaMes) * 100;
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
          descricao: `Seus gastos totais (${formatCurrency(totalGastoMes)}) superaram sua renda realizada (${formatCurrency(totalRendaMes)}).`,
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
      const metaLF = data.metaIndependenciaFinanceira || 250000;
      const patrimonioLF = data.lancamentos
        .filter(l => l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'investimento')
        .reduce((acc, l) => acc + l.valor, 0);
      
      const progressoLF = (patrimonioLF / metaLF) * 100;
      
      // Média de aportes últimos 3 meses
      const getAporteMes = (m: number, y: number) => data.lancamentos
        .filter(l => l.mes === m && l.ano === y && l.tipo === 'realizado' && data.categorias.find(c => c.id === l.categoriaId)?.tipo === 'investimento')
        .reduce((acc, l) => acc + l.valor, 0);
      
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
        descricao: `Seu patrimônio investido é de ${formatCurrency(patrimonioLF)}. ${tempoDesc}`,
        categoriaId: null,
        mes: currentMonth,
        ano: currentYear,
        lido: false,
        dispensado: false,
        geradoEm: new Date().toISOString()
      });

      // 8. Orçamento atingido (CRÍTICO > 90%, ATENÇÃO > 70%)
      data.categorias.forEach(cat => {
        const realizado = getRealized(cat.id, currentMonth, currentYear);
        const orcado = getBudgeted(cat.id, currentMonth, currentYear);
        if (orcado > 0) {
          const percent = (realizado / orcado) * 100;
          if (percent >= 90) {
            newInsights.push({
              id: `orcamento-critico-${cat.id}-${currentMonth}-${currentYear}`,
              tipo: 'critico',
              titulo: `Orçamento de ${cat.nome} quase esgotado`,
              descricao: `Você já utilizou ${percent.toFixed(0)}% do planejado para ${cat.nome} (${formatCurrency(realizado)} de ${formatCurrency(orcado)}).`,
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
      setData(prev => {
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
    setData(prev => ({ ...prev, familia }));
  };

  // Effect to watch for newly conquered debts
  useEffect(() => {
    const newlyConquered = data.dividas.filter(d => d.status === 'quitada' && !d.conquistada);
    if (newlyConquered.length > 0) {
      newlyConquered.forEach(d => {
        showToast(`Dívida '${d.nome}' quitada! 🎉`, 'success');
        // Mark as conquered in state to avoid multiple toasts
        updateDivida(d.id, { conquistada: true });
      });
    }
  }, [data.dividas]);

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp' | 'usuario'>) => {
    // Audit logging disabled as requested by user
  };

  const addLancamento = (lancamento: Omit<Lancamento, 'id' | 'dataCriacao'>) => {
    const newLancamento: Lancamento = {
      ...lancamento,
      id: crypto.randomUUID(),
      dataCriacao: new Date().toISOString(),
      valor: roundCurrency(lancamento.valor)
    };
    setData(prev => {
      const newData = {
        ...prev,
        lancamentos: [...(prev.lancamentos || []), newLancamento]
      };
      return syncSonhosProjetos(newData);
    });
    addAuditLog({
      entidade: 'lancamento',
      entidadeId: newLancamento.id,
      acao: 'criacao',
      detalhes: `Lançamento criado: ${newLancamento.descricao || 'Sem descrição'} - ${newLancamento.valor}`
    });
  };

  const updateLancamento = (id: string, valor: number, tipo: 'orcado' | 'realizado') => {
    // This is a bit tricky because we might need to find by category/subcat/month/year if ID isn't known
    // But for simplicity, let's assume we have the ID or we create a new one if it doesn't exist for that slot
  };

  // Improved updateLancamento that handles the "slot" logic (month/year/subcat/type)
  const upsertLancamento = (ano: number, mes: number, subcatId: string, catId: string, tipo: 'orcado' | 'realizado', valor: number) => {
    const roundedValor = roundCurrency(valor);
    setData(prev => {
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
    setData(prev => {
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
      return syncDividas(syncSonhosProjetos({ ...prev, lancamentos: newLancamentos }));
    });
  };

  const removeLancamento = (id: string) => {
    setData(prev => {
      const lancamento = (prev.lancamentos || []).find(l => l.id === id);
      if (lancamento) {
        addAuditLog({
          entidade: 'lancamento',
          entidadeId: id,
          acao: 'exclusao',
          detalhes: `Lançamento removido: ${lancamento.descricao || 'Sem descrição'}`
        });
      }
      const newData = {
        ...prev,
        lancamentos: (prev.lancamentos || []).filter(l => l.id !== id)
      };
      return syncDividas(syncSonhosProjetos(newData));
    });
  };

  const addCategory = (category: Omit<Category, 'id' | 'dataCriacao' | 'dataAtualizacao' | 'ordem' | 'ativa'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    setData(prev => ({
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
    setData(prev => ({
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
    setData(prev => ({
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

  const removeCategory = (id: string) => {
    setData(prev => {
      const hasLancamentos = prev.lancamentos.some(l => l.categoriaId === id);
      if (hasLancamentos) {
        alert('Não é possível excluir permanentemente uma categoria com lançamentos vinculados. Use o arquivamento.');
        return prev;
      }
      return {
        ...prev,
        categorias: prev.categorias.filter(c => c.id !== id)
      };
    });
    addAuditLog({
      entidade: 'categoria',
      entidadeId: id,
      acao: 'exclusao',
      detalhes: `Categoria removida permanentemente`
    });
  };

  const addSubcategory = (categoryId: string, name: string) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    setData(prev => {
      const cat = prev.categorias.find(c => c.id === categoryId);
      const isSonhos = cat?.nome === 'SONHOS & PROJETOS';
      
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

      return syncSonhosProjetos({ ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos });
    });

    addAuditLog({
      entidade: 'subcategoria',
      entidadeId: id,
      acao: 'criacao',
      detalhes: `Subcategoria criada: ${name}`
    });
  };

  const updateSubcategory = (categoryId: string, subcatId: string, updates: Partial<Subcategory>) => {
    setData(prev => {
      const cat = prev.categorias.find(c => c.id === categoryId);
      const isSonhos = cat?.nome === 'SONHOS & PROJETOS';
      
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

      return syncSonhosProjetos({ ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos });
    });

    addAuditLog({
      entidade: 'subcategoria',
      entidadeId: subcatId,
      acao: 'edicao',
      detalhes: `Subcategoria atualizada: ${updates.nome || 'campos alterados'}`
    });
  };

  const archiveSubcategory = (categoryId: string, subcatId: string) => {
    setData(prev => {
      const cat = prev.categorias.find(c => c.id === categoryId);
      const isSonhos = cat?.nome === 'SONHOS & PROJETOS';
      
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

      return syncSonhosProjetos({ ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos });
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
      const isSonhos = cat?.nome === 'SONHOS & PROJETOS';
      
      let updatedSonhos = prev.sonhosProjetos;
      if (isSonhos) {
        updatedSonhos = prev.sonhosProjetos.map(s => 
          s.subcategoriaId === subcatId ? { ...s, ativa: false } : s
        );
      }

      const hasLancamentos = prev.lancamentos.some(l => l.subcategoriaId === subcatId);
      if (hasLancamentos) {
        // If it has lancamentos, we just archive the subcategory and the dream
        const updatedCategorias = prev.categorias.map(c => 
          c.id === categoryId 
            ? { ...c, subcategorias: c.subcategorias.map(s => s.id === subcatId ? { ...s, ativa: false } : s) }
            : c
        );
        return syncSonhosProjetos({ ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos });
      }

      // If no lancamentos, we can remove subcategory but we still archive the dream as per request
      const updatedCategorias = prev.categorias.map(c => 
        c.id === categoryId 
          ? { ...c, subcategorias: c.subcategorias.filter(s => s.id !== subcatId) }
          : c
      );
      return syncSonhosProjetos({ ...prev, categorias: updatedCategorias, sonhosProjetos: updatedSonhos });
    });

    addAuditLog({
      entidade: 'subcategoria',
      entidadeId: subcatId,
      acao: 'exclusao',
      detalhes: `Subcategoria removida ou arquivada`
    });
  };

  const reorderCategories = (newOrder: Category[]) => {
    setData(prev => ({
      ...prev,
      categorias: newOrder.map((c, idx) => ({ ...c, ordem: idx }))
    }));
  };

  const addDivida = (divida: Omit<Divida, 'id' | 'totalPago' | 'saldoRestante' | 'progresso' | 'status' | 'conquistada' | 'historicoPagamentos'>) => {
    const id = crypto.randomUUID();
    setData(prev => {
      const newDivida: Divida = { 
        ...divida, 
        id,
        totalPago: 0,
        saldoRestante: divida.valorContratado,
        progresso: 0,
        status: 'em_dia',
        conquistada: false,
        historicoPagamentos: [],
        valorContratado: roundCurrency(divida.valorContratado),
        valorParcela: roundCurrency(divida.valorParcela),
        saldoQuitacaoVista: roundCurrency(divida.saldoQuitacaoVista)
      };
      return syncDividas({
        ...prev,
        dividas: [...prev.dividas, newDivida]
      });
    });
    addAuditLog({
      entidade: 'divida',
      entidadeId: id,
      acao: 'criacao',
      detalhes: `Dívida criada: ${divida.nome}`
    });
  };

  const updateDivida = (id: string, updates: Partial<Divida>) => {
    setData(prev => {
      const newDividas = prev.dividas.map(d => 
        d.id === id ? { ...d, ...updates } : d
      );
      return syncDividas({ ...prev, dividas: newDividas });
    });
    addAuditLog({
      entidade: 'divida',
      entidadeId: id,
      acao: 'edicao',
      detalhes: `Dívida atualizada: ${id}`
    });
  };

  const removeDivida = (id: string) => {
    setData(prev => {
      const divida = prev.dividas.find(d => d.id === id);
      if (divida) {
        addAuditLog({
          entidade: 'divida',
          entidadeId: id,
          acao: 'exclusao',
          detalhes: `Dívida removida: ${divida.nome}`
        });
      }
      return {
        ...prev,
        dividas: prev.dividas.filter(d => d.id !== id)
      };
    });
  };

  const updateDividaParcelas = (id: string, increment: number) => {
    setData(prev => {
      const newDividas = prev.dividas.map(d => 
        d.id === id ? { ...d, parcelasPagas: Math.min(d.quantidadeParcelas, d.parcelasPagas + increment) } : d
      );
      return syncDividas({ ...prev, dividas: newDividas });
    });
  };

  const addMeta = (meta: Omit<Meta, 'id'>) => {
    setData(prev => ({
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
    setData(prev => ({
      ...prev,
      metas: prev.metas.map(m => 
        m.id === id ? { ...m, valorAcumulado: roundCurrency(m.valorAcumulado + roundedValor) } : m
      )
    }));
  };

  const syncDividas = (currentData: FinanceData): FinanceData => {
    const now = new Date();
    
    const updatedDividas = currentData.dividas.map(divida => {
      const relatedLancamentos = currentData.lancamentos.filter(l => 
        l.subcategoriaId === divida.subcategoriaId && l.tipo === 'realizado'
      );

      const historicoPagamentos = relatedLancamentos.map(l => ({
        lancamentoId: l.id,
        data: l.data || new Date(l.ano, l.mes, l.dia || 1).toISOString(),
        valor: l.valor,
        numeroParcela: l.numeroParcela || 0,
        totalParcelas: l.totalParcelas || divida.quantidadeParcelas,
        origem: "via lançamento"
      })).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const totalPago = roundCurrency(historicoPagamentos.reduce((acc, p) => acc + p.valor, 0));
      const parcelasPagas = historicoPagamentos.length;
      const saldoRestante = roundCurrency(divida.valorContratado - totalPago);
      const progresso = divida.quantidadeParcelas > 0 ? parcelasPagas / divida.quantidadeParcelas : 0;
      
      const startDate = parseISO(divida.dataInicio);
      const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
      const parcelasEsperadasAteHoje = Math.min(Math.max(0, monthsDiff + 1), divida.quantidadeParcelas);

      let status: StatusDivida = 'em_dia';
      if (parcelasPagas >= divida.quantidadeParcelas) {
        status = 'quitada';
      } else if (parcelasPagas < parcelasEsperadasAteHoje - 1) {
        status = 'atrasado';
      } else if (parcelasPagas === parcelasEsperadasAteHoje - 1) {
        status = 'atencao';
      }

      const conquistada = status === 'quitada';

      // Generate insight if just paid off
      if (conquistada && !divida.conquistada) {
        const insightId = `divida-quitada-${divida.id}`;
        const existingInsight = currentData.insights.find(i => i.id === insightId);
        if (!existingInsight) {
          currentData.insights.unshift({
            id: insightId,
            tipo: 'conquista',
            titulo: `Dívida Quitada: ${divida.nome}!`,
            descricao: `Parabéns! Você finalizou o pagamento de ${divida.nome}. Menos uma preocupação no seu orçamento! 🎉`,
            categoriaId: null,
            mes: now.getMonth(),
            ano: now.getFullYear(),
            lido: false,
            dispensado: false,
            geradoEm: now.toISOString()
          });
        }
      }

      return {
        ...divida,
        totalPago,
        parcelasPagas,
        saldoRestante,
        progresso,
        status,
        conquistada,
        historicoPagamentos
      };
    });

    return { ...currentData, dividas: updatedDividas };
  };

  const syncSonhosProjetos = (currentData: FinanceData): FinanceData => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const updatedSonhos = currentData.sonhosProjetos.map(sonho => {
      const relatedLancamentos = currentData.lancamentos.filter(l => l.subcategoriaId === sonho.subcategoriaId);
      
      const aportes = relatedLancamentos.map(l => {
        const isFuture = l.ano > currentYear || (l.ano === currentYear && l.mes > currentMonth);
        const status = l.tipo === 'realizado' ? (isFuture ? 'previsto' : 'confirmado') : 'previsto';
        
        return {
          lancamentoId: l.id,
          data: l.data || new Date(l.ano, l.mes, l.dia || 1).toISOString(),
          valor: l.valor,
          status: status as any,
          parcelamentoId: l.parcelamentoId,
          numeroParcela: l.numeroParcela,
          totalParcelas: l.totalParcelas
        };
      }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const valorAcumulado = aportes
        .filter(a => a.status === 'confirmado')
        .reduce((acc, a) => acc + a.valor, 0);

      const progresso = sonho.valorMeta > 0 ? valorAcumulado / sonho.valorMeta : 0;
      const conquistado = progresso >= 1;

      // Estimativa de conclusão baseada na média dos últimos 3 aportes confirmados
      const ultimosAportes = aportes.filter(a => a.status === 'confirmado').slice(0, 3);
      const mediaAporte = ultimosAportes.length > 0 
        ? ultimosAportes.reduce((acc, a) => acc + a.valor, 0) / ultimosAportes.length 
        : 0;
      
      let estimativaConclusao = undefined;
      if (mediaAporte > 0 && !conquistado && sonho.valorMeta > 0) {
        const restante = sonho.valorMeta - valorAcumulado;
        const mesesRestantes = Math.ceil(restante / mediaAporte);
        estimativaConclusao = addMonths(now, mesesRestantes).toISOString();
      }

      return {
        ...sonho,
        valorAcumulado,
        progresso,
        conquistado,
        aportes,
        estimativaConclusao
      };
    });

    return { ...currentData, sonhosProjetos: updatedSonhos };
  };

  const addSonhoProjeto = (sonho: Omit<SonhoProjeto, 'id' | 'valorAcumulado' | 'progresso' | 'aportes' | 'subcategoriaId' | 'conquistado' | 'origemCriacao'>) => {
    const sharedId = crypto.randomUUID();
    const now = new Date().toISOString();
    const roundedMeta = roundCurrency(sonho.valorMeta);
    
    setData(prev => {
      // Find "SONHOS & PROJETOS" category
      const catSonhos = prev.categorias.find(c => c.nome === 'SONHOS & PROJETOS');
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

      return { ...prev, sonhosProjetos: updatedSonhos, categorias: updatedCategorias };
    });
  };

  const addPatrimonio = (patrimonio: Omit<Patrimonio, 'id' | 'criadoEm' | 'ativo'>) => {
    const newPatrimonio: Patrimonio = {
      ...patrimonio,
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
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
    setData(prev => ({
      ...prev,
      patrimonio: (prev.patrimonio || []).map(p => p.id === id ? { ...p, ...updates } : p),
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
    setData(prev => ({
      ...prev,
      patrimonio: (prev.patrimonio || []).filter(p => p.id !== id),
      logs: [{
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        entidade: 'patrimonio' as any,
        entidadeId: id,
        acao: 'exclusao',
        detalhes: `Patrimônio removido: ${item?.descricao}`,
        usuario: prev.configuracoes.perfil.nome || 'Usuário'
      }, ...prev.logs]
    }));
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
    const parcelamentoId = crypto.randomUUID();
    const now = new Date().toISOString();
    const roundedTotal = roundCurrency(parcelamento.valorTotal);
    const valorParcela = roundCurrency(roundedTotal / numParcelas);
    const startDate = parseISO(parcelamento.dataInicio);
    
    // Check if parcelamento carries credit card billing info
    const cobrancaMes = (parcelamento as any).mes;
    const cobrancaAno = (parcelamento as any).ano;
    
    // Set start date to the correct billing month if credit card info exists
    const effectiveStartDate = (cobrancaMes !== undefined && cobrancaAno !== undefined) 
      ? new Date(cobrancaAno, cobrancaMes, startDate.getDate())
      : startDate;

    const newParcelamento: Parcelamento = {
      ...parcelamento,
      id: parcelamentoId,
      valorTotal: roundedTotal,
      valorParcela,
      totalParcelas: numParcelas,
      tipo: parcelamento.tipo || 'despesa',
      statusAtivo: true,
      parcelasEfetivamentePagas: 0
    };

    const newLancamentos: Lancamento[] = [];
    for (let i = 0; i < numParcelas; i++) {
      const currentDate = addMonths(effectiveStartDate, i);
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
        valor: valorParcela,
        parcelamentoId: parcelamentoId,
        numeroParcela: i + 1,
        totalParcelas: numParcelas,
        formaPagamento: parcelamento.formaPagamento,
        cartaoId: (parcelamento as any).cartaoId,
        dataCompra: (parcelamento as any).dataCompra,
        mesCobranca: (parcelamento as any).mes,
        anoCobranca: (parcelamento as any).ano
      });
    }

    setData(prev => {
      const newData = {
        ...prev,
        parcelamentos: [...(prev.parcelamentos || []), newParcelamento],
        lancamentos: [...(prev.lancamentos || []), ...newLancamentos]
      };
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
      return syncSonhosProjetos(newData);
    });
  };

  const addCartao = (cartao: Omit<Cartao, 'id' | 'criadoEm' | 'ativo'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      cartoes: [...(prev.cartoes || []), { ...cartao, id, criadoEm: now, ativo: true }]
    }));
  };

  const updateCartao = (id: string, updates: Partial<Cartao>) => {
    setData(prev => ({
      ...prev,
      cartoes: (prev.cartoes || []).map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const removeCartao = (id: string) => {
    setData(prev => ({
      ...prev,
      cartoes: (prev.cartoes || []).filter(c => c.id !== id)
    }));
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

      return {
        ...prev,
        parcelamentos: parcelamentos.map(p => p.id === id ? updatedParcelamento : p),
        lancamentos: updatedLancamentos
      };
    });
  };

  const updateInstallmentIndividual = (id: string, updates: Partial<Lancamento>) => {
    const now = new Date().toISOString();
    setData(prev => {
      const index = prev.lancamentos.findIndex(l => l.id === id);
      if (index === -1) return prev;

      const old = prev.lancamentos[index];
      const roundedUpdates = { ...updates };
      if (updates.valor !== undefined) roundedUpdates.valor = roundCurrency(updates.valor);
      
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
            updatedP.valorParcela = roundedValor;
            updatedP.valorTotal = roundCurrency(prev.lancamentos
              .filter(l => l.parcelamentoId === parcelamentoId)
              .reduce((acc, l) => acc + (l.numeroParcela! < fromParcela ? l.valor : roundedValor), 0));
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
          return { ...p, valorTotal: roundCurrency(p.valorTotal - lancamento.valor) };
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
          return {
            ...p,
            statusAtivo: false,
            dataCancelamento: now,
            motivoCancelamento: motivo || null,
            observacaoCancelamento: obs || null,
            parcelasEfetivamentePagas: fromParcela - 1,
            valorTotal: roundCurrency(keptLancamentos
              .filter(l => l.parcelamentoId === parcelamentoId)
              .reduce((acc, l) => acc + l.valor, 0))
          };
        }
        return p;
      });

      addAuditLog({
        entidade: 'parcelamento',
        entidadeId: parcelamentoId,
        acao: 'arquivamento',
        detalhes: `Parcelamento cancelado a partir da parcela ${fromParcela}`
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

      return { ...prev, orcamentosMensais: nextOrcamentos };
    });
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
