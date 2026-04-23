import { v4 as uuidv4 } from 'uuid';
import { Category, CategoryType } from './types';

const createCategory = (nome: string, tipo: CategoryType, icone: string, cor: string, subNames: string[], ordem: number): Category => {
  const catId = uuidv4();
  const now = new Date().toISOString();
  return {
    id: catId,
    nome,
    tipo,
    icone,
    cor,
    ordem,
    ativa: true,
    dataCriacao: now,
    dataAtualizacao: now,
    subcategorias: subNames.map((name, idx) => ({
      id: uuidv4(),
      nome: name,
      ativa: true,
      ordem: idx,
      dataCriacao: now,
      categoriaPaiId: catId
    }))
  };
};

export const DEFAULT_CATEGORIES: Category[] = [
  createCategory('RENDA', 'renda', '💰', '#00875A', [
    'Salário (Titular 1)', 'Salário (Titular 2)', 'Vale Alimentação', 'Vale Refeição', 
    'Dividendos', 'Pró-Labore', 'Juros / Rendimentos', 'Aluguel Recebido'
  ], 0),
  createCategory('DOAÇÃO E GENEROSIDADE', 'despesa', '🤝', '#FF9500', [
    'Dízimo e ofertas', 'Doações', 'Auxílio a entidades', 'Rifas'
  ], 1),
  createCategory('INVESTIMENTOS', 'investimento', '📈', '#5856D6', [
    'Tesouro Direto', 'CDI', 'CDB', 'Ações', 'Fundos de Investimento'
  ], 2),
  createCategory('HABITAÇÃO', 'despesa', '🏠', '#4A90D9', [
    'Água', 'Energia Elétrica', 'Internet / Telefone Fixo', 'Supermercado', 'Padaria', 
    'IPTU', 'Financiamento Imobiliário', 'Aluguel', 'Monitoramento / Segurança', 
    'Diarista / Empregada', 'Gás', 'Manutenções'
  ], 3),
  createCategory('SAÚDE', 'despesa', '🏥', '#FF3B30', [
    'Medicamentos', 'Consulta Médica', 'Dentista', 'Exames', 'Plano de Saúde'
  ], 4),
  createCategory('TRANSPORTE', 'despesa', '🚗', '#FFCC00', [
    'Combustível', 'Seguro Veicular', 'Estacionamento', 'IPVA / DPVAT', 
    'Mecânico / Lavação', 'Ônibus / Metrô / Trem', 'Táxi / Uber', 'Troca de Óleo'
  ], 5),
  createCategory('DESPESAS PESSOAIS', 'despesa', '👤', '#AF52DE', [
    'Cosméticos', 'Manicure / Estética', 'Roupas e Acessórios', 'Telefone Celular', 
    'Academia', 'Esportes', 'Cabelereiro', 'Lazer Noturno'
  ], 6),
  createCategory('LAZER', 'despesa', '🎭', '#FF2D55', [
    'Restaurantes', 'Livraria / Jornal / Streaming', 'Hotel e Passagens', 'Passeios e Atrações'
  ], 7),
  createCategory('COMEMORAÇÕES', 'despesa', '🎉', '#FF9500', [
    'Aniversários', 'Datas Festivas (Natal, Páscoa, etc.)', 'Outros'
  ], 8),
  createCategory('FILHOS', 'despesa', '👶', '#5AC8FA', [
    'Fraldas / Higiene', 'Escola / Creche', 'Transporte Escolar (Van)', 
    'Médico Pediátrico', 'Farmácia Infantil'
  ], 9),
  createCategory('EDUCAÇÃO', 'despesa', '📚', '#8E8E93', [
    'Faculdade / Universidade', 'Livros / Material Escolar', 'Pós-Graduação / MBA', 
    'Idiomas', 'Coaching / Mentoria', 'Cursos Livres'
  ], 10),
  createCategory('PET', 'despesa', '🐾', '#A67C52', [
    'Remédios', 'Banho e tosa', 'Plano de saúde', 'Alimentação', 'Vacinas'
  ], 11),
  createCategory('GASTOS COM A CASA', 'despesa', '🛋️', '#8E44AD', [
    'Móveis', 'Enxoval', 'Panelas', 'Eletrodomésticos', 'Utilidades domésticas', 'Paisagismo'
  ], 12),
  createCategory('DESPESAS FINANCEIRAS', 'despesa', '💳', '#1D1D1F', [
    'Mensalidade Cartão de Crédito', 'Mensalidade Conta Bancária', 'Abertura de Crédito', 
    'Empréstimo Pessoal', 'Cheque Especial', 'Juros Bancários'
  ], 13),
  createCategory('SONHOS & PROJETOS', 'investimento', '⭐', '#FFD60A', [
    'Viagem a Europa', 'Sítio', 'Abrir empresa', 'Troca de carro', 'Comprar casa', 'Cirurgia plástica'
  ], 14),
  {
    id: 'cat-dividas-001',
    nome: 'DÍVIDAS',
    tipo: 'despesa',
    icone: '💳',
    cor: '#E74C3C',
    ordem: 15,
    ativa: true,
    dataCriacao: new Date().toISOString(),
    dataAtualizacao: new Date().toISOString(),
    descricao: 'Compromissos financeiros de médio e longo prazo',
    subcategorias: [
      {
        id: 'subcat-fin-carro-001',
        nome: 'Financiamento de Carro',
        icone: '🚗',
        ativa: true,
        ordem: 1,
        tipoDivida: 'veiculos',
        padraoSistema: true,
        dataCriacao: new Date().toISOString(),
        categoriaPaiId: 'cat-dividas-001'
      },
      {
        id: 'subcat-fin-casa-001',
        nome: 'Financiamento de Casa/Imóvel',
        icone: '🏠',
        ativa: true,
        ordem: 2,
        tipoDivida: 'imobiliaria',
        padraoSistema: true,
        dataCriacao: new Date().toISOString(),
        categoriaPaiId: 'cat-dividas-001'
      },
      {
        id: 'subcat-emp-pessoal-001',
        nome: 'Empréstimo Pessoal',
        icone: '💰',
        ativa: true,
        ordem: 3,
        tipoDivida: 'bancaria',
        padraoSistema: true,
        dataCriacao: new Date().toISOString(),
        categoriaPaiId: 'cat-dividas-001'
      },
      {
        id: 'subcat-reneg-serasa-001',
        nome: 'Renegociação Serasa',
        icone: '📋',
        ativa: true,
        ordem: 4,
        tipoDivida: 'bancaria',
        padraoSistema: true,
        dataCriacao: new Date().toISOString(),
        categoriaPaiId: 'cat-dividas-001'
      }
    ]
  }
];
