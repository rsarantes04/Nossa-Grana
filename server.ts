import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/alertas-e-conquistas", (req, res) => {
    const { familiaId, mes, ano } = req.query;
    
    // Mock data based on the request
    const items = [
      {
        id: "1",
        tipo: "alerta",
        categoria: "Habitação",
        categoriaTipo: "despesa",
        titulo: "Atenção: Habitação",
        mensagem: "Você usou 115% do orçado",
        detalhe: "R$ 450,00 acima do planejado",
        percentual: 15,
        cor: "#FF5252",
        icone: "⚠️",
        prioridade: 1,
        categoriaId: "cat-hab"
      },
      {
        id: "2",
        tipo: "conquista",
        categoria: "Investimentos",
        categoriaTipo: "investimento",
        titulo: "Parabéns: Investimentos",
        mensagem: "Você investiu 25% acima do planejado",
        detalhe: "R$ 500,00 a mais para o futuro",
        percentual: 25,
        cor: "#2E7D32",
        icone: "🚀",
        prioridade: 2,
        categoriaId: "cat-inv"
      },
      {
        id: "3",
        tipo: "conquista",
        categoria: "Viagem Japão",
        categoriaTipo: "sonho",
        titulo: "Parabéns: Viagem Japão",
        mensagem: "Você superou o planejado em 30%",
        detalhe: "R$ 300,00 além do previsto",
        percentual: 30,
        cor: "#7209B7",
        icone: "⭐",
        prioridade: 2,
        categoriaId: "cat-sonho"
      }
    ];

    // Sort by priority
    const sortedItems = items.sort((a, b) => a.prioridade - b.prioridade);

    res.json(sortedItems);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
