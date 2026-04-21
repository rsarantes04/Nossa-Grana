import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useTranslation } from '../i18n/useTranslation';
import { Lock, Eye, EyeOff, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LoginModal: React.FC = () => {
  const { data, login } = useFinance();
  const { t } = useTranslation();
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    const success = await login(codigo, senha);
    if (success) {
      setError('');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(t('login.error'));
      
      if (newAttempts >= 5) {
        setIsBlocked(true);
        setError(t('login.blocked'));
        setTimeout(() => {
          setIsBlocked(false);
          setAttempts(0);
          setError('');
        }, 30000); // 30 seconds block
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-dark z-[500] flex items-center justify-center p-6 overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-gold-principal rounded-full blur-[120px]" />
        <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-green-forest rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white-pure w-full max-w-sm rounded-[48px] p-10 space-y-8 shadow-2xl relative z-10"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-navy-dark rounded-3xl flex items-center justify-center mx-auto text-gold-principal shadow-xl mb-4">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-navy-principal">{t('login.title')}</h1>
          <p className="text-sm text-gray-medium">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-widest px-1">{t('login.code')}</label>
            <input 
              type="text" 
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="NG-0000"
              className="w-full p-5 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-mono font-bold text-center text-lg tracking-widest"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-widest px-1">{t('login.password')}</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full p-5 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-bold text-center text-lg"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-light"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-soft rounded-2xl border border-red-brick/10 flex items-center gap-3"
            >
              <AlertTriangle size={18} className="text-red-brick shrink-0" />
              <p className="text-xs font-bold text-red-brick">{error}</p>
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isBlocked}
            className="w-full py-5 bg-navy-principal text-gold-principal rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-navy-principal/20 hover:bg-navy-dark transition-all disabled:opacity-50"
          >
            {t('login.button')}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setShowHelp(true)}
            className="text-xs text-gray-medium hover:text-navy-principal transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            <HelpCircle size={14} />
            {t('login.forgot')}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 bg-navy-dark/80 backdrop-blur-md z-[600] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white-pure w-full max-w-xs rounded-[40px] p-8 space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-gold-soft rounded-2xl flex items-center justify-center mx-auto text-gold-dark">
                <HelpCircle size={32} />
              </div>
              <div className="space-y-4 text-center">
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('login.help.title')}</h3>
                <p className="text-xs text-gray-medium leading-relaxed">
                  {t('login.help.description')}
                </p>
                <div className="p-4 bg-white-off rounded-2xl text-left space-y-2">
                  <p className="text-[10px] font-bold text-navy-principal uppercase tracking-widest">{t('login.help.whatToDo')}</p>
                  <p className="text-[10px] text-gray-medium leading-relaxed">
                    {t('login.help.whatToDoDesc')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-4 bg-navy-principal text-white-pure rounded-2xl font-bold"
              >
                {t('login.help.understand')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
