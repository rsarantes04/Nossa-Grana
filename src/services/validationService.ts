
import { Lancamento, Divida, Patrimonio, Cartao } from '../types';

export const isValidId = (id: string): boolean => {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
};

export const validateLancamento = (lancamento: Omit<Lancamento, 'id' | 'dataCriacao'>): boolean => {
  return (
    typeof lancamento.valor === 'number' && 
    Number.isFinite(lancamento.valor) && 
    lancamento.valor > 0 && 
    typeof lancamento.descricao === 'string' &&
    lancamento.descricao.length > 0 && 
    lancamento.descricao.length <= 256 &&
    isValidId(lancamento.categoriaId)
  );
};

export const validateDivida = (divida: Omit<Divida, 'id' | 'totalPago' | 'saldoRestante' | 'progresso' | 'status' | 'conquistada' | 'historicoPagamentos'>): boolean => {
  return (
    typeof divida.valorContratado === 'number' &&
    Number.isFinite(divida.valorContratado) &&
    divida.valorContratado > 0 && 
    typeof divida.nome === 'string' &&
    divida.nome.length > 0 &&
    divida.nome.length <= 256
  );
};

export const validatePatrimonio = (patrimonio: Omit<Patrimonio, 'id' | 'dataCriacao' | 'ativo'>): boolean => {
  return (
    typeof patrimonio.valorAquisicao === 'number' &&
    Number.isFinite(patrimonio.valorAquisicao) &&
    patrimonio.valorAquisicao > 0 && 
    typeof patrimonio.descricao === 'string' &&
    patrimonio.descricao.length > 0 &&
    patrimonio.descricao.length <= 256
  );
};

export const validateCartao = (cartao: Omit<Cartao, 'id' | 'dataCriacao' | 'ativo'>): boolean => {
    return (
        typeof cartao.nome === 'string' &&
        cartao.nome.length > 0 &&
        cartao.nome.length <= 128 &&
        Number.isInteger(cartao.diaFechamento) &&
        cartao.diaFechamento >= 1 && cartao.diaFechamento <= 28 &&
        Number.isInteger(cartao.diaVencimento) &&
        cartao.diaVencimento >= 1 && cartao.diaVencimento <= 28
    );
};
