export type TransactionType = 'orcado' | 'realizado';
export type CategoryType = 'renda' | 'despesa' | 'investimento';

export type DebtType = 'bancaria' | 'pessoal' | 'imobiliaria' | 'veiculos' | 'outra';

export interface Subcategory {
  id: string;
  nome: string;
  ativa: boolean;
  ordem: number;
  dataCriacao: string;
  categoriaPaiId: string;
  icone?: string;
  tipoDivida?: DebtType;
  padraoSistema?: boolean;
}

export interface Category {
  id: string;
  nome: string;
  tipo: CategoryType;
  icone: string;
  cor: string;
  ordem: number;
  ativa: boolean;
  dataCriacao: string;
  dataAtualizacao: string;
  descricao?: string;
  subcategorias: Subcategory[];
}

export type PaymentMethod = 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Boleto';

export interface Cartao {
  id: string;
  nome: string;
  bandeira: 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Hipercard';
  banco: string;
  diaFechamento: number;
  diaVencimento: number;
  ativo: boolean;
  criadoEm: string;
}

export interface Lancamento {
  id: string;
  ano: number;
  mes: number;
  dia?: number;
  data?: string; // ISO string
  dataCriacao: string; // ISO string for sorting
  descricao?: string;
  categoriaId: string;
  subcategoriaId: string;
  tipo: TransactionType;
  valor: number;
  observacao?: string;
  parcelamentoId?: string;
  numeroParcela?: number;
  totalParcelas?: number;
  formaPagamento?: PaymentMethod;
  cartaoId?: string | null;
  dataCompra?: string;
  mesCobranca?: number;
  anoCobranca?: number;
  dataEdicao?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  entidade: 'lancamento' | 'parcelamento' | 'divida' | 'meta' | 'categoria' | 'subcategoria';
  entidadeId: string;
  acao: 'criacao' | 'edicao' | 'exclusao' | 'arquivamento' | 'reativacao';
  detalhes: string;
  usuario: string;
}

export interface Parcelamento {
  id: string;
  descricao: string;
  valorTotal: number;
  diaVencimento: number;
  dataInicio: string; // ISO string
  dataFim: string; // ISO string
  statusAtivo: boolean;
  categoriaId: string;
  subcategoriaId: string;
  formaPagamento?: PaymentMethod;
  valorParcela: number;
  totalParcelas: number;
  tipo: CategoryType;
  dataCancelamento?: string | null;
  motivoCancelamento?: string | null;
  observacaoCancelamento?: string | null;
  parcelasEfetivamentePagas?: number;
  cartaoId?: string | null;
  dataCompra?: string;
  mes?: number;
  ano?: number;
}

export interface PagamentoDivida {
  lancamentoId: string;
  data: string;
  valor: number;
  numeroParcela: number;
  totalParcelas: number;
  origem: string;
}

export type StatusDivida = 'em_dia' | 'atencao' | 'atrasado' | 'quitada';

export interface Divida {
  id: string;
  nome: string;
  valorContratado: number;
  quantidadeParcelas: number;
  valorParcela: number;
  dataInicio: string;
  dataFim: string;
  parcelasPagas: number;
  totalPago: number;
  saldoRestante: number;
  saldoQuitacaoVista: number;
  progresso: number;
  status: StatusDivida;
  conquistada: boolean;
  subcategoriaId: string;
  historicoPagamentos: PagamentoDivida[];
}

export interface Meta {
  id: string;
  nome: string;
  valorMeta: number;
  valorAcumulado: number;
  prazo?: string;
}

export interface Familia {
  id: string;
  nome: string;
  moeda: string;
}

export interface MetasMensais {
  aporteInvestimentos: number; // 0.20
  doacoes: number; // 0.10
  gastos: number; // 0.70
}

export interface OrcamentoMensal {
  id: string;
  categoriaId: string;
  subcategoriaId?: string;
  ano: number;
  mes: number;
  valorOrcado: number | null;
  dataAtualizacao: string;
}

export interface AporteSonho {
  lancamentoId: string;
  data: string;
  valor: number;
  status: 'confirmado' | 'previsto';
  parcelamentoId?: string | null;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
}

export interface SonhoProjeto {
  id: string;
  nome: string;
  tipo: 'sonho' | 'projeto';
  valorMeta: number;
  valorAcumulado: number;
  progresso: number;
  prazo?: string;
  icone: string;
  cor: string;
  ativa: boolean;
  conquistado: boolean;
  subcategoriaId: string;
  origemCriacao: 'categorias' | 'abaMais';
  estimativaConclusao?: string;
  aportes: AporteSonho[];
}

export interface Insight {
  id: string;
  tipo: 'critico' | 'atencao' | 'conquista' | 'dica' | 'liberdade';
  titulo: string;
  descricao: string;
  categoriaId: string | null;
  mes: number;
  ano: number;
  lido: boolean;
  dispensado: boolean;
  geradoEm: string;
  dados?: {
    varPercentual?: number;
    valorAtual?: number;
    valorAnterior?: number;
    mesesConsecutivos?: number;
    categorias?: string[];
  };
}

export interface PerfilUsuario {
  criado: boolean;
  nome: string;
  codigo: string;
  senhaHash: string;
  criadoEm: string;
}

export interface Configuracoes {
  tamanhoFonte: 'pequena' | 'media' | 'grande' | 'extra';
  tema: 'classico' | 'noturno' | 'verde' | 'oceano' | 'ambar' | 'rosa';
  idioma: 'pt' | 'en' | 'es';
  notificacoes: boolean;
  ocultarValores: boolean;
  perfil: PerfilUsuario;
}

export type PatrimonioCategory = 'imovel' | 'veiculo' | 'investimento';

export interface Patrimonio {
  id: string;
  categoria: PatrimonioCategory;
  subcategoria: string;
  descricao: string;
  valorAquisicao: number;
  dataAquisicao: string;
  observacao?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface FinanceData {
  familia: Familia;
  categorias: Category[];
  lancamentos: Lancamento[];
  cartoes: Cartao[];
  parcelamentos: Parcelamento[];
  orcamentosMensais: OrcamentoMensal[];
  dividas: Divida[];
  metas: Meta[];
  sonhosProjetos: SonhoProjeto[];
  patrimonio: Patrimonio[];
  insights: Insight[];
  metasMensais: MetasMensais;
  logs: AuditLog[];
  onboarded: boolean;
  showDividasWelcome?: boolean;
  metaIndependenciaFinanceira?: number;
  configuracoes: Configuracoes;
}
