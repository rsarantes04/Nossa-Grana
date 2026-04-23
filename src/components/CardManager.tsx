import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Cartao } from '../types';
import { X, Plus, Trash2, Edit2, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

export const CardManager = ({ onClose }: { onClose: () => void }) => {
  const { data, addCartao, removeCartao } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    bandeira: 'Visa' as Cartao['bandeira'],
    banco: '',
    diaFechamento: 1,
    diaVencimento: 5,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.banco) return;
    addCartao(formData);
    setIsAdding(false);
    setFormData({ nome: '', bandeira: 'Visa', banco: '', diaFechamento: 1, diaVencimento: 5 });
  };

  return (
    <div className="fixed inset-0 bg-navy-principal/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white-pure rounded-3xl w-full max-w-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-navy-principal">Cartões de Crédito</h2>
          <button onClick={onClose}><X size={24} className="text-gray-medium" /></button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {data.cartoes?.map((c) => (
            <div key={c.id} className="bg-navy-principal text-white-pure p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <p className="font-bold">{c.nome}</p>
                <p className="text-xs text-gray-ice">{c.banco} • {c.bandeira}</p>
                <p className="text-[10px] text-gray-light mt-2 uppercase tracking-widest">Fecha: dia {c.diaFechamento} | Vence: dia {c.diaVencimento}</p>
              </div>
              <button onClick={() => removeCartao(c.id)} className="p-2 text-red-brick"><Trash2 size={20} /></button>
            </div>
          ))}
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="w-full py-4 border-2 border-dashed border-gray-soft rounded-2xl flex items-center justify-center gap-2 text-gray-medium font-bold hover:border-gold-principal hover:text-gold-principal">
              <Plus size={20} /> Adicionar Cartão
            </button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-gray-soft">
            <input placeholder="Apelido (ex: Nubank)" className="w-full p-3 bg-white-off rounded-xl border border-gray-soft" onChange={e => setFormData({...formData, nome: e.target.value})} required />
            <input placeholder="Banco (ex: Nubank)" className="w-full p-3 bg-white-off rounded-xl border border-gray-soft" onChange={e => setFormData({...formData, banco: e.target.value})} required />
            <select className="w-full p-3 bg-white-off rounded-xl border border-gray-soft" onChange={e => setFormData({...formData, bandeira: e.target.value as any})}>
              {['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Dia Fechamento" className="w-full p-3 bg-white-off rounded-xl border border-gray-soft" onChange={e => setFormData({...formData, diaFechamento: parseInt(e.target.value)})} min="1" max="28" required />
              <input type="number" placeholder="Dia Vencimento" className="w-full p-3 bg-white-off rounded-xl border border-gray-soft" onChange={e => setFormData({...formData, diaVencimento: parseInt(e.target.value)})} min="1" max="28" required />
            </div>
            <button className="w-full py-3 bg-navy-principal text-white-pure rounded-xl font-bold">Salvar Cartão</button>
          </form>
        )}
      </div>
    </div>
  );
};
