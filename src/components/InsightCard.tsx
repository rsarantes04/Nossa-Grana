import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Star, Gift, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';

export interface Insight {
  id: string;
  tipo: 'alerta' | 'conquista' | 'neutro';
  categoria: string;
  categoriaTipo: string;
  titulo: string;
  mensagem: string;
  detalhe: string;
  percentual: number;
  cor: string;
  icone: string;
  prioridade: number;
  categoriaId: string;
}

interface InsightCardProps {
  insight: Insight;
  onViewDetails: (categoriaId: string) => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onViewDetails }) => {
  const { lang } = useTranslation();

  const getIcon = (iconStr: string) => {
    switch (iconStr) {
      case '⚠️': return <AlertTriangle size={18} />;
      case '🎉': return <Sparkles size={18} />;
      case '🚀': return <ArrowUpRight size={18} />;
      case '⭐': return <Star size={18} />;
      case '🤝': return <Gift size={18} />;
      default: return <TrendingUp size={18} />;
    }
  };

  const isAlerta = insight.tipo === 'alerta';
  const isConquista = insight.tipo === 'conquista';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-[28px] border transition-all relative overflow-hidden group",
        isAlerta 
          ? "bg-[#FFEBEE] border-red-200 shadow-sm" 
          : isConquista
            ? "bg-white border-gray-100 shadow-sm hover:shadow-md"
            : "bg-gray-50 border-gray-200"
      )}
    >
      <div className="flex items-start gap-3">
        <div 
          className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
            isAlerta ? "bg-white text-red-500" : ""
          )}
          style={!isAlerta ? { backgroundColor: `${insight.cor}15`, color: insight.cor } : {}}
        >
          {getIcon(insight.icone)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isAlerta ? "text-red-600" : ""
            )} style={!isAlerta ? { color: insight.cor } : {}}>
              {insight.titulo}
            </span>
            {insight.percentual !== 0 && (
              <span className="text-[9px] font-bold text-gray-400">
                {insight.percentual > 0 ? '+' : ''}{insight.percentual}%
              </span>
            )}
          </div>
          
          <h4 className="font-sans font-bold text-navy-principal text-sm mb-0.5 leading-tight">
            {insight.mensagem}
          </h4>
          
          <p className="text-[11px] text-gray-500 mb-3">
            {insight.detalhe}
          </p>

          <button
            onClick={() => onViewDetails(insight.categoriaId)}
            className={cn(
              "flex items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all hover:gap-1.5",
              isAlerta ? "text-red-600" : "text-navy-principal"
            )}
          >
            Ver detalhes <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
