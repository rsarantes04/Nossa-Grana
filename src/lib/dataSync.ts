import { FinanceData } from '../types';
import { roundCurrency, toCents, fromCents } from '../lib/utils';
import { calculateDivida } from '../lib/financialCalculations';
import { addMonths } from 'date-fns';

export const syncDividas = (currentData: FinanceData): FinanceData => {
  const now = new Date();
  const newInsights = [...currentData.insights];
  
  const updatedDividas = currentData.dividas.map(divida => {
    const newDivida = calculateDivida(divida, currentData.lancamentos, now);

    // Generate insight if just paid off
    if (newDivida.conquistada && !divida.conquistada) {
      const insightId = `divida-quitada-${newDivida.id}`;
      const existingInsight = newInsights.find(i => i.id === insightId);
      if (!existingInsight) {
        newInsights.unshift({
          id: insightId,
          tipo: 'conquista',
          titulo: `Dívida Quitada: ${newDivida.nome}!`,
          descricao: `Parabéns! Você finalizou o pagamento de ${newDivida.nome}. Menos uma preocupação no seu orçamento! 🎉`,
          categoriaId: null,
          mes: now.getMonth(),
          ano: now.getFullYear(),
          lido: false,
          dispensado: false,
          geradoEm: now.toISOString()
        });
      }
    }

    // Check if this specific debt changed
    return JSON.stringify(newDivida) !== JSON.stringify(divida) ? newDivida : divida;
  });

  const dividasChanged = JSON.stringify(updatedDividas) !== JSON.stringify(currentData.dividas);
  const insightsChanged = JSON.stringify(newInsights) !== JSON.stringify(currentData.insights);

  if (!dividasChanged && !insightsChanged) {
      return currentData; 
  }

  return { ...currentData, dividas: updatedDividas, insights: newInsights };
};

export const syncSonhosProjetos = (currentData: FinanceData): FinanceData => {
  const now = new Date();

  const updatedSonhos = currentData.sonhosProjetos.map(sonho => {
    const subcatExists = currentData.categorias.some(c => 
      c.subcategorias.some(s => s.id === sonho.subcategoriaId)
    );

    const targetSubcatId = subcatExists ? sonho.subcategoriaId : null;
    const relatedLancamentos = currentData.lancamentos.filter(l => 
      targetSubcatId && l.subcategoriaId === targetSubcatId
    );
    
    const aportes = relatedLancamentos.map(l => {
      const status = l.tipo === 'realizado' ? 'confirmado' : 'previsto';
      
      return {
        lancamentoId: l.id,
        data: l.data || new Date(l.ano, l.mes, l.dia || 1).toISOString(),
        valor: toCents(l.valor),
        status: status as any,
        parcelamentoId: l.parcelamentoId,
        numeroParcela: l.numeroParcela,
        totalParcelas: l.totalParcelas
      };
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const valorAcumuladoCents = aportes
      .filter(a => a.status === 'confirmado')
      .reduce((acc, a) => acc + a.valor, 0);

    const progresso = sonho.valorMeta > 0 ? fromCents(valorAcumuladoCents) / sonho.valorMeta : 0;
    const conquistado = progresso >= 1;

    // Estimativa de conclusão baseada na média dos últimos 3 aportes confirmados
    const ultimosAportes = aportes.filter(a => a.status === 'confirmado').slice(0, 3);
    const mediaAporteCents = ultimosAportes.length > 0 
      ? ultimosAportes.reduce((acc, a) => acc + a.valor, 0) / ultimosAportes.length 
      : 0;
    
    let estimativaConclusao = undefined;
    const valorMetaCents = toCents(sonho.valorMeta);
    if (mediaAporteCents > 0 && !conquistado && valorMetaCents > 0) {
      const restanteCents = valorMetaCents - valorAcumuladoCents;
      const mesesRestantes = Math.ceil(restanteCents / mediaAporteCents);
      estimativaConclusao = addMonths(now, mesesRestantes).toISOString();
    }

    return {
      ...sonho,
      subcategoriaId: targetSubcatId,
      valorAcumulado: fromCents(valorAcumuladoCents),
      progresso,
      conquistado,
      aportes: aportes.map(a => ({ ...a, valor: fromCents(a.valor) })),
      estimativaConclusao
    };
  });

  if (JSON.stringify(updatedSonhos) === JSON.stringify(currentData.sonhosProjetos)) {
    return currentData;
  }

  return { ...currentData, sonhosProjetos: updatedSonhos };
};
