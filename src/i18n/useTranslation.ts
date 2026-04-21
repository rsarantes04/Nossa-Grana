import { useFinance } from '../contexts/FinanceContext';
import { translations } from './translations';

export const useTranslation = () => {
  const { data } = useFinance();
  const lang = data.configuracoes.idioma || 'pt';

  const t = (key: keyof typeof translations['pt'], ...args: (string | number)[]) => {
    let text = translations[lang][key] || translations['pt'][key] || key;
    
    if (args.length > 0) {
      args.forEach((arg, index) => {
        text = text.replace(`{${index}}`, String(arg));
      });
    }
    
    return text;
  };

  return { t, lang };
};
