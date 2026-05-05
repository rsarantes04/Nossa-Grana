import { GoogleGenAI } from "@google/genai";
import { FinanceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAssistantResponse(userMessage: string, financeData: FinanceData) {
  const model = "gemini-1.5-flash"; // A widely available model

  const now = new Date();
  const mesAtual = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const lancamentosMes = financeData.lancamentos.filter(l => l.ano === now.getFullYear() && l.mes === now.getMonth());
  
  const totalRecebido = lancamentosMes.filter(l => financeData.categorias.find(c => c.id === l.categoriaId)?.tipo === 'renda').reduce((acc, l) => acc + l.valor, 0);
  const totalGasto = lancamentosMes.filter(l => financeData.categorias.find(c => c.id === l.categoriaId)?.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0);
  
  const topCategorias = financeData.categorias
    .filter(c => c.tipo === 'despesa')
    .map(c => ({
      nome: c.nome,
      valor: lancamentosMes.filter(l => l.categoriaId === c.id).reduce((acc, l) => acc + l.valor, 0)
    }))
    .filter(c => c.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3);

  const contextoDados = JSON.stringify({
    mesAtual,
    totalRecebido,
    totalGasto,
    saldoMes: totalRecebido - totalGasto,
    topCategorias,
    sonhosAtivos: financeData.sonhosProjetos.filter(s => s.ativa).map(s => ({ nome: s.nome, progresso: s.progresso })),
    dividasAtivas: financeData.dividas.filter(d => !d.conquistada).length,
    patrimonioTotal: financeData.patrimonio.reduce((acc, p) => acc + p.valorAquisicao, 0),
    idioma: "pt"
  });
  
  const systemInstruction = `
    Você é o assistente financeiro do aplicativo Nossa Grana.
    Seu nome é Grana. Responda sempre em português.
    Seja objetivo, amigável e use linguagem simples.
    Não invente dados — use apenas as informações fornecidas no contexto abaixo. Se não souber responder com os dados disponíveis, diga que não tem essa informação no momento.

    Contexto financeiro do usuário:
    ${contextoDados}

    Responda a pergunta do usuário de forma clara e direta.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userMessage,
      config: {
        systemInstruction,
      },
    });

    return response.text || "Desculpe, não consegui processar sua solicitação agora.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ocorreu um erro ao falar com o assistente. Verifique sua conexão.";
  }
}
