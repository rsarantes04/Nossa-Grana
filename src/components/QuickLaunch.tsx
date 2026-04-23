import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { X, Check, Calendar, CreditCard, AlignLeft, Wallet, Info, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addMonths } from 'date-fns';
import { PaymentMethod } from '../types';
import { CurrencyInput } from './CurrencyInput';
import { useTranslation } from '../i18n/useTranslation';
import { calcularDatasCobranca } from '../lib/cartaoUtils';
import { cn } from '../lib/utils';

export const QuickLaunch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data, addLancamento, addParcelamento } = useFinance();
  const { t, lang } = useTranslation();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    catId: '',
    subcatId: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    valor: '',
    descricao: '',
    observacao: '',
    formaPagamento: 'Dinheiro' as PaymentMethod,
    isParcelado: false,
    numParcelas: '2',
    cartaoId: '',
  });

  const [calcResult, setCalcResult] = useState<{faturaDisplay: string, cobrancaMes: string, cobrancaAno: number, isAntesFechamento: boolean} | null>(null);

  useEffect(() => {
    if (formData.formaPagamento === 'Cartão de Crédito' && formData.cartaoId) {
       const cartao = data.cartoes?.find(c => c.id === formData.cartaoId);
       if (cartao) {
         const { mesLancamento, anoLancamento } = calcularDatasCobranca(cartao, formData.data);
         const date = parseISO(formData.data);
         setCalcResult({
           faturaDisplay: format(new Date(date.getFullYear(), date.getMonth() + (date.getDate() < cartao.diaFechamento ? 0 : 1), 1), 'MM/yyyy'),
           cobrancaMes: mesLancamento + 1,
           cobrancaAno: anoLancamento,
           isAntesFechamento: date.getDate() < cartao.diaFechamento
         });
       }
    } else {
      setCalcResult(null);
    }
  }, [formData.formaPagamento, formData.cartaoId, formData.data, data.cartoes]);

  const selectedCategory = data.categorias.find(c => c.id === formData.catId);
  const isDebt = selectedCategory?.nome === 'DÍVIDAS';

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase();
    const results: { catId: string, subcatId: string, catName: string, subName: string, icone: string }[] = [];
    
    data.categorias.forEach(cat => {
      cat.subcategorias.forEach(sub => {
        if (sub.ativa && sub.nome.toLowerCase().includes(term)) {
          results.push({
            catId: cat.id,
            subcatId: sub.id,
            catName: cat.nome,
            subName: sub.nome,
            icone: cat.icone
          });
        }
      });
    });
    
    return results.slice(0, 5);
  }, [search, data.categorias]);

  const getPlaceholder = () => {
    if (!isDebt) return t('quick.description_placeholder');
    const sub = selectedCategory?.subcategorias.find(s => s.id === formData.subcatId);
    if (sub?.nome.includes('Carro') || sub?.nome.includes('Car')) return t('quick.placeholder_car');
    if (sub?.nome.includes('Casa') || sub?.nome.includes('House')) return t('quick.placeholder_house');
    if (sub?.nome.includes('Serasa')) return t('quick.placeholder_serasa');
    return t('quick.placeholder_loan');
  };

  const handleSave = () => {
    const valor = parseFloat(formData.valor) || 0;
    const date = parseISO(formData.data);
    let extraFields = {};

    if (formData.formaPagamento === 'Cartão de Crédito' && formData.cartaoId && calcResult) {
      extraFields = {
        cartaoId: formData.cartaoId,
        dataCompra: formData.data,
        mes: calcResult.cobrancaMes - 1,
        ano: calcResult.cobrancaAno
      };
    }
    
    if (formData.isParcelado) {
      const numParcelas = parseInt(formData.numParcelas);
      const { mes: mesInicial, ano: anoInicial } = (extraFields as any) || { mes: date.getMonth(), ano: date.getFullYear() };
      
      addParcelamento({
        descricao: formData.descricao || 'Compra Parcelada',
        valorTotal: valor,
        diaVencimento: date.getDate(),
        dataInicio: formData.data,
        dataFim: format(addMonths(new Date(anoInicial, mesInicial, 1), numParcelas - 1), 'yyyy-MM-dd'),
        statusAtivo: true,
        categoriaId: formData.catId,
        subcategoriaId: formData.subcatId,
        formaPagamento: formData.formaPagamento,
        valorParcela: valor / numParcelas,
        totalParcelas: numParcelas,
        tipo: selectedCategory?.tipo || 'despesa',
        ...extraFields
      } as any, numParcelas);
    } else {
      addLancamento({
        ano: (extraFields as any).ano || date.getFullYear(),
        mes: (extraFields as any).mes !== undefined ? (extraFields as any).mes : date.getMonth(),
        dia: date.getDate(),
        data: formData.data,
        descricao: formData.descricao,
        categoriaId: formData.catId,
        subcategoriaId: formData.subcatId,
        tipo: 'realizado',
        valor: valor,
        formaPagamento: formData.formaPagamento,
        ...extraFields
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white-pure w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-navy-principal">{t('quick.title')}</h2>
          <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-off rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-ice" size={18} />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('quick.search_placeholder') || 'O que você quer lançar?'}
                  className="w-full pl-12 pr-12 py-4 bg-white-off border border-gray-soft rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-light hover:text-navy-principal transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
                
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white-pure border border-gray-soft rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      {suggestions.map((s) => (
                        <button
                          key={`${s.catId}-${s.subcatId}`}
                          onClick={() => {
                            setFormData({ ...formData, catId: s.catId, subcatId: s.subcatId, descricao: s.subName });
                            setStep(3);
                            setSearch('');
                          }}
                          className="w-full p-4 text-left flex items-center gap-3 hover:bg-gold-soft/20 transition-colors border-b border-gray-soft last:border-0"
                        >
                          <span className="text-xl">{s.icone}</span>
                          <div>
                            <p className="text-sm font-bold text-navy-principal">{s.subName}</p>
                            <p className="text-[10px] text-gray-medium uppercase font-bold tracking-wider">{s.catName}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-sm text-gray-medium font-medium">{t('quick.select_category')}</p>
              <div className="grid grid-cols-2 gap-3">
                {data.categorias
                  .map(c => ({
                    ...c,
                    subcategorias: Array.from(
                      new Map(c.subcategorias.map(s => [s.nome.toLowerCase().trim(), s])).values()
                    )
                  }))
                  .filter(c => c.ativa)
                  .map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setFormData({ ...formData, catId: c.id });
                      setStep(2);
                    }}
                    className="p-4 bg-white-off rounded-2xl border border-gray-soft flex flex-col items-center gap-2 hover:border-gold-light hover:bg-gold-soft/20 transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{c.icone}</span>
                    <span className="text-[10px] font-bold uppercase text-gray-medium truncate w-full text-center group-hover:text-navy-principal">{c.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-medium font-medium">{t('quick.select_subcategory')}</p>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                {selectedCategory?.subcategorias
                  .filter(s => s.ativa)
                  .map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setFormData({ ...formData, subcatId: s.id });
                      setStep(3);
                    }}
                    className="p-4 bg-white-off rounded-xl border border-gray-soft text-left text-sm font-medium hover:bg-gold-soft/30 hover:border-gold-light transition-all text-navy-principal"
                  >
                    {s.nome}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-gold-dark font-bold uppercase hover:text-gold-principal transition-colors">{t('quick.back')}</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-gold-soft/30 rounded-2xl border border-gold-light/30">
                <span className="text-2xl">{selectedCategory?.icone}</span>
                <div>
                  <p className="text-[10px] text-gold-dark font-bold uppercase tracking-wider">{selectedCategory?.nome}</p>
                  <p className="text-sm font-bold text-navy-principal">{selectedCategory?.subcategorias.find(s => s.id === formData.subcatId)?.nome}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-light uppercase tracking-widest">{t('quick.total_value')}</label>
                  <CurrencyInput 
                    value={formData.valor}
                    onChange={(val) => setFormData({ ...formData, valor: val })}
                    placeholder={lang === 'pt' ? 'R$ 0,00' : lang === 'en' ? '$ 0.00' : '€ 0,00'}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-light uppercase tracking-widest">{t('quick.description_label')}</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-ice" size={18} />
                    <input 
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder={getPlaceholder()}
                      className="w-full pl-12 pr-4 py-4 bg-white-off border border-gray-soft rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-light uppercase tracking-widest">{t('quick.date_label')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-ice" size={18} />
                    <input 
                      type="date"
                      value={formData.data}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        let updatedFormData = { ...formData, data: newDate };
                        if (formData.formaPagamento === 'Cartão de Crédito' && formData.cartaoId) {
                          const cartao = data.cartoes?.find(c => c.id === formData.cartaoId);
                          if (cartao) {
                             const { mesLancamento, anoLancamento } = calcularDatasCobranca(cartao, newDate);
                             updatedFormData = { ...updatedFormData, mes: mesLancamento, ano: anoLancamento };
                          }
                        }
                        setFormData(updatedFormData);
                      }}
                      className="w-full pl-12 pr-4 py-4 bg-white-off border border-gray-soft rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-light uppercase tracking-widest">{t('quick.payment_method_label')}</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-ice" size={18} />
                    <select 
                      value={formData.formaPagamento}
                      onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value as PaymentMethod })}
                      className="w-full pl-12 pr-4 py-4 bg-white-off border border-gray-soft rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gold-principal appearance-none text-navy-principal"
                    >
                      {['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.formaPagamento === 'Cartão de Crédito' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-light uppercase tracking-widest">Cartão utilizado</label>
                    <select 
                      value={formData.cartaoId}
                      onChange={(e) => setFormData({ ...formData, cartaoId: e.target.value })}
                      className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                    >
                      <option value="">Selecione um cartão</option>
                      {data.cartoes?.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.banco})</option>)}
                    </select>
                  </div>
                )}

                {calcResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-[#0F1A2E] text-white-pure rounded-2xl border border-gold-light/20 space-y-2"
                  >
                    <p className="text-xs text-gray-light uppercase tracking-widest font-bold">Resumo da Cobrança</p>
                    <p className="text-sm font-bold">Compra em {format(parseISO(formData.data), 'dd/MM')} → Fatura {calcResult.faturaDisplay}</p>
                    <div className={cn("text-lg font-black flex items-center justify-between", calcResult.isAntesFechamento ? "text-green-success" : "text-gold-principal")}>
                      <span>Cobrado em {calcResult.cobrancaMes}/{calcResult.cobrancaAno}</span>
                      <span className={cn("text-[10px] uppercase tracking-wider px-2 py-1 rounded-full", calcResult.isAntesFechamento ? "bg-green-success/20" : "bg-gold-principal/20")}>
                        {calcResult.isAntesFechamento ? 'Antes do fechamento' : 'Após fechamento'}
                      </span>
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center justify-between p-4 bg-white-off rounded-2xl border border-gray-soft">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-gray-ice" size={20} />
                    <span className="text-sm font-medium text-gray-medium">
                      {isDebt ? t('quick.is_installment_debt') : t('quick.is_installment_purchase')}
                    </span>
                  </div>
                  <button 
                    onClick={() => setFormData({ ...formData, isParcelado: !formData.isParcelado })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${formData.isParcelado ? 'bg-navy-principal' : 'bg-gray-ice'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white-pure rounded-full transition-all ${formData.isParcelado ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <AnimatePresence>
                  {formData.isParcelado && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      <label className="text-xs font-bold text-gray-light uppercase tracking-widest">{t('quick.num_installments_label')}</label>
                      <select 
                        value={formData.numParcelas}
                        onChange={(e) => setFormData({ ...formData, numParcelas: e.target.value })}
                        className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal"
                      >
                        {[2,3,4,5,6,7,8,9,10,12,18,24,36,48].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                      {formData.valor && (
                        <p className="text-xs text-gold-dark font-bold mt-2">
                          {t('quick.installment_value')}: {new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en-US' : 'es-ES', { style: 'currency', currency: lang === 'pt' ? 'BRL' : lang === 'en' ? 'USD' : 'EUR' }).format(parseFloat(formData.valor) / parseInt(formData.numParcelas))}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 p-4 bg-white-off text-gray-medium rounded-2xl font-bold hover:bg-white-ice transition-colors">{t('quick.back')}</button>
                <button 
                  onClick={handleSave}
                  disabled={!formData.valor}
                  className="flex-[2] p-4 bg-gold-principal text-navy-principal rounded-2xl font-bold shadow-lg shadow-gold-principal/20 flex items-center justify-center gap-2 hover:bg-gold-dark transition-all disabled:opacity-50"
                >
                  <Check size={20} />
                  {t('quick.confirm')}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
