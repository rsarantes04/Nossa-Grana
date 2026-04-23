import { Cartao } from '../types';
import { addMonths, parseISO } from 'date-fns';

export function calcularDatasCobranca(cartao: Cartao, dataCompra: string) {
  const data = parseISO(dataCompra);
  const diaCompra = data.getDate();
  const mesCompra = data.getMonth();
  const anoCompra = data.getFullYear();

  let mesLancamento, anoLancamento;

  // Se dia da compra é ANTES do fechamento:
  // A fatura corrente vence no próximo mês (mês da compra + 1)
  if (diaCompra < cartao.diaFechamento) {
    const dataVencimento = addMonths(new Date(anoCompra, mesCompra, 1), 1);
    mesLancamento = dataVencimento.getMonth();
    anoLancamento = dataVencimento.getFullYear();
  } 
  // Se dia da compra é DIA DO FECHAMENTO ou APÓS:
  // A fatura corrente já fechou, então a compra entra na fatura do mês seguinte
  // que vencerá em 2 meses (mês da compra + 2)
  else {
    const dataVencimento = addMonths(new Date(anoCompra, mesCompra, 1), 2);
    mesLancamento = dataVencimento.getMonth();
    anoLancamento = dataVencimento.getFullYear();
  }

  return { mesLancamento, anoLancamento };
}
