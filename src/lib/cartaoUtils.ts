import { Cartao } from '../types';
import { addMonths, parseISO, isValid, format, getDate, setDate, getDaysInMonth } from 'date-fns';
export function calcularDatasCobranca(cartao: Cartao, dataCompra: string) {
  const data = parseISO(dataCompra);
  
  if (!isValid(data)) {
    throw new Error('Data de compra inválida');
  }
  
  // Use métodos de date-fns para manipulação de datas, é mais seguro que Date nativo
  const diaCompra = getDate(data);
  
  let dataReferencia = data;
  let mesesAdicionar = 0;

  // Se dia da compra é ANTES do fechamento:
  // A fatura é a corrente (mês da compra + 1)
  if (diaCompra < cartao.diaFechamento) {
    mesesAdicionar = 1;
  } 
  // Se dia da compra é DIA DO FECHAMENTO ou APÓS:
  // A fatura corrente já fechou, entra mês seguinte (mês da compra + 2)
  else {
    mesesAdicionar = 2;
  }

  const dataVencimentoBase = addMonths(dataReferencia, mesesAdicionar);
  const diasNoMes = getDaysInMonth(dataVencimentoBase);
  const diaVencimento = Math.min(cartao.diaVencimento, diasNoMes);
  const dataVencimento = setDate(dataVencimentoBase, diaVencimento);
  
  return { 
    mesLancamento: dataVencimento.getMonth(), 
    anoLancamento: dataVencimento.getFullYear() 
  };
}

export function calcularQuantidadeFaturasAteVencimento(cartao: Cartao, dataInicio: string, numParcelas: number) {
  // A fatura de uma compra parcelada que inicia em uma data X,
  // dependerá de quando foi a compra e quando fecha a fatura.
  
  // Isso é complexo. Para simplificar e garantir atomicidade e precisão,
  // vamos calcular a fatura inicial corretamente e então adicionar (parcela - 1) meses.
  
  const datasFatura: { mes: number, ano: number }[] = [];
  let { mesLancamento, anoLancamento } = calcularDatasCobranca(cartao, dataInicio);
  
  for(let i = 0; i < numParcelas; i++) {
    const data = addMonths(new Date(anoLancamento, mesLancamento), i);
    datasFatura.push({ mes: data.getMonth(), ano: data.getFullYear() });
  }
  
  return datasFatura;
}

export function getFaturaDisplay(mes: number, ano: number) {
  return format(new Date(ano, mes, 1), 'MM/yyyy');
}
