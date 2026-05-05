import { FinanceData, Divida, Lancamento, StatusDivida } from '../types';
import { parseISO, setYear, setMonth, setDate } from 'date-fns';
import { toCents, fromCents } from './utils';

export const getRealized = (
  data: FinanceData,
  catId: string,
  month: number,
  year: number
): number => {
  const cents = data.lancamentos
    .filter(l => l.categoriaId === catId && l.mes === month && l.ano === year && l.tipo === 'realizado')
    .reduce((acc, l) => acc + toCents(l.valor), 0);
  return fromCents(cents);
};

export const getBudgeted = (
  data: FinanceData,
  catId: string,
  month: number,
  year: number
): number => {
  const cents = data.orcamentosMensais
    .filter(o => o.categoriaId === catId && o.mes === month && o.ano === year)
    .reduce((acc, o) => acc + toCents(o.valorOrcado || 0), 0);
  return fromCents(cents);
};

export const calculateDivida = (divida: Divida, lancamentos: Lancamento[], now: Date): Divida => {
  const relatedLancamentos = lancamentos.filter(l => 
    l.subcategoriaId === divida.subcategoriaId && l.tipo === 'realizado'
  );

  const historicoPagamentos = relatedLancamentos.map(l => ({
    lancamentoId: l.id,
    data: l.data || setDate(setMonth(setYear(new Date(0), l.ano), l.mes), l.dia || 1).toISOString(),
    valor: l.valor, // Já está em centavos no modelo de dados
    numeroParcela: l.numeroParcela || 0,
    totalParcelas: l.totalParcelas || divida.quantidadeParcelas,
    origem: "via lançamento"
  })).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const totalPagoCents = historicoPagamentos.reduce((acc, p) => acc + p.valor, 0); // p.valor já está em centavos
  const parcelasPagas = historicoPagamentos.length;
  const saldoRestanteCents = Math.max(0, toCents(divida.valorContratado) - totalPagoCents);
  const progresso = divida.quantidadeParcelas > 0 ? Math.min(1, parcelasPagas / divida.quantidadeParcelas) : 0;
  
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
  
  return {
    ...divida,
    totalPago: fromCents(totalPagoCents),
    parcelasPagas,
    saldoRestante: fromCents(saldoRestanteCents),
    progresso,
    status,
    conquistada,
    historicoPagamentos
  };
};
