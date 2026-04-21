from flask import Flask, request, jsonify
from decimal import Decimal

app = Flask(__name__)

def calculate_insights(data, familia_id, mes, ano):
    insights = []
    
    # Mock data structure for example
    # In a real app, this would come from a database (PostgreSQL/SQLAlchemy)
    categorias = data.get('categorias', [])
    orcamentos = data.get('orcamentos', [])
    lancamentos = data.get('lancamentos', [])
    
    for cat in categorias:
        # Filter budget for this category/month/year
        orcado = next((o['valor'] for o in orcamentos 
                      if o['categoriaId'] == cat['id'] 
                      and o['mes'] == mes 
                      and o['ano'] == ano), 0)
        
        if orcado <= 0:
            continue
            
        # Filter realized transactions
        realizado = sum(l['valor'] for l in lancamentos 
                       if l['categoriaId'] == cat['id'] 
                       and l['mes'] == mes 
                       and l['ano'] == ano 
                       and l['tipo'] == 'realizado')
        
        if realizado == 0:
            continue
            
        diff = realizado - orcado
        percent = round((diff / orcado) * 100, 1)
        
        # Logic based on category type
        insight = None
        
        if cat['tipo'] == 'despesa' and realizado > orcado:
            insight = {
                "categoriaId": cat['id'],
                "categoriaNome": cat['nome'],
                "tipo": "negativo",
                "mensagem": f"Atenção: você ultrapassou o orçado em {percent}%",
                "subtitulo": f"Gasto de R$ {diff:,.2f} acima do planejado",
                "percentual": percent,
                "cor": "#E63946", # Red
                "icone": "⚠️",
                "valorOrcado": float(orcado),
                "valorRealizado": float(realizado),
                "diferenca": float(diff)
            }
        elif cat['tipo'] == 'renda' and realizado > orcado:
            insight = {
                "categoriaId": cat['id'],
                "categoriaNome": cat['nome'],
                "tipo": "positivo",
                "mensagem": f"Parabéns! Sua renda superou a expectativa em {percent}%",
                "subtitulo": f"Você recebeu R$ {diff:,.2f} acima do previsto",
                "percentual": percent,
                "cor": "#D4AF37", # Gold
                "icone": "🎉",
                "valorOrcado": float(orcado),
                "valorRealizado": float(realizado),
                "diferenca": float(diff)
            }
        elif cat['tipo'] == 'investimento' and realizado > orcado:
            insight = {
                "categoriaId": cat['id'],
                "categoriaNome": cat['nome'],
                "tipo": "positivo",
                "mensagem": f"Excelente! Você investiu {percent}% acima do planejado",
                "subtitulo": f"R$ {diff:,.2f} a mais para o seu futuro financeiro",
                "percentual": percent,
                "cor": "#2D6A4F", # Dark Green
                "icone": "🚀",
                "valorOrcado": float(orcado),
                "valorRealizado": float(realizado),
                "diferenca": float(diff)
            }
        elif cat['tipo'] == 'sonho' and realizado > orcado:
            insight = {
                "categoriaId": cat['id'],
                "categoriaNome": cat['nome'],
                "tipo": "positivo",
                "mensagem": "Incrível! Você está mais perto do seu sonho",
                "subtitulo": f"Aporte de R$ {diff:,.2f} além do planejado",
                "percentual": percent,
                "cor": "#7209B7", # Purple
                "icone": "⭐",
                "valorOrcado": float(orcado),
                "valorRealizado": float(realizado),
                "diferenca": float(diff)
            }
        elif cat['tipo'] == 'doacao' and realizado > orcado:
            insight = {
                "categoriaId": cat['id'],
                "categoriaNome": cat['nome'],
                "tipo": "positivo",
                "mensagem": "Que generosidade! Você doou acima do planejado",
                "subtitulo": f"R$ {diff:,.2f} extras compartilhados",
                "percentual": percent,
                "cor": "#B185DB", # Soft Purple
                "icone": "🤝",
                "valorOrcado": float(orcado),
                "valorRealizado": float(realizado),
                "diferenca": float(diff)
            }
            
        if insight:
            insights.append(insight)
            
    return insights

@app.route('/alertas-e-conquistas', methods=['GET'])
def get_alertas_e_conquistas():
    familia_id = request.args.get('familiaId')
    mes = int(request.args.get('mes', 0))
    ano = int(request.args.get('ano', 0))
    
    # Mock logic for calculation
    # In a real app, this would use calculate_insights and map to the new format
    items = [
        {
            "id": "1",
            "tipo": "alerta",
            "categoria": "Habitação",
            "categoriaTipo": "despesa",
            "titulo": "Atenção: Habitação",
            "mensagem": "Você usou 115% do orçado",
            "detalhe": "R$ 450,00 acima do planejado",
            "percentual": 15,
            "cor": "#FF5252",
            "icone": "⚠️",
            "prioridade": 1,
            "categoriaId": "cat-hab"
        },
        {
            "id": "2",
            "tipo": "conquista",
            "categoria": "Investimentos",
            "categoriaTipo": "investimento",
            "titulo": "Parabéns: Investimentos",
            "mensagem": "Você investiu 25% acima do planejado",
            "detalhe": "R$ 500,00 a mais para o futuro",
            "percentual": 25,
            "cor": "#2E7D32",
            "icone": "🚀",
            "prioridade": 2,
            "categoriaId": "cat-inv"
        }
    ]
    
    # Sort by priority
    sorted_items = sorted(items, key=lambda x: x['prioridade'])
    
    return jsonify(sorted_items)

if __name__ == '__main__':
    app.run(port=5000)
