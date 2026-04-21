import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useTranslation } from '../i18n/useTranslation';
import { formatCurrency, cn } from '../lib/utils';
import { 
  User as UserIcon, 
  ChevronRight, 
  ArrowLeft, 
  Lock, 
  Eye, 
  EyeOff, 
  Bell, 
  Download, 
  Trash2, 
  Check, 
  AlertTriangle,
  Globe,
  Type,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { data, updateConfiguracoes, resetData, logout } = useFinance();
  const { t, lang } = useTranslation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleExport = (type: 'xlsx' | 'csv') => {
    const lancamentos = data.lancamentos.map(l => ({
      Data: l.data || `${l.dia}/${l.mes + 1}/${l.ano}`,
      Descrição: l.descricao || '',
      Categoria: data.categorias.find(c => c.id === l.categoriaId)?.nome || '',
      Subcategoria: data.categorias.find(c => c.id === l.categoriaId)?.subcategorias.find(s => s.id === l.subcategoriaId)?.nome || '',
      Tipo: l.tipo,
      Valor: l.valor
    }));

    const ws = XLSX.utils.json_to_sheet(lancamentos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    
    if (type === 'xlsx') {
      XLSX.writeFile(wb, `nossa-grana-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      XLSX.writeFile(wb, `nossa-grana-export-${new Date().toISOString().split('T')[0]}.csv`, { bookType: 'csv' });
    }
  };

  const handleDeleteAll = () => {
    if (deleteConfirm === t('settings.other.delete_all.confirm_word')) {
      resetData();
      setIsDeleteModalOpen(false);
      onBack();
    }
  };

  return (
    <div className="min-h-full bg-white-off pb-20">
      {/* Header */}
      <div className="bg-navy-dark p-6 pt-12 rounded-b-[40px] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-gold-principal rounded-full blur-[100px]" />
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <button onClick={onBack} className="p-2 bg-white-pure/10 hover:bg-white-pure/20 rounded-full text-white-pure transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center">
            <div className="text-gold-principal mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 18L4 7L9 11L12 4L15 11L20 7L22 18H2Z" />
              </svg>
            </div>
            <h1 className="text-white-pure font-serif font-bold text-xl">Nossa Grana</h1>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        <div className="mt-8 text-center relative z-10">
          <h2 className="text-gold-light font-serif font-bold text-2xl">{t('settings.title')}</h2>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* BLOCO 1 — PERFIL DE USUÁRIO */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em] px-2">{t('settings.profile.title')}</h3>
          
          {!data.configuracoes.perfil.criado ? (
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full p-6 bg-white-pure rounded-[32px] border-2 border-dashed border-gray-soft hover:border-gold-light hover:bg-gold-soft/20 transition-all text-left space-y-4 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white-off rounded-2xl flex items-center justify-center text-gray-medium group-hover:bg-white-pure shadow-inner">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-navy-principal">{t('settings.profile.no_profile.title')}</h4>
                  <p className="text-xs text-gray-medium">{t('settings.profile.no_profile.subtitle')}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="w-full py-3 bg-gold-principal text-navy-principal rounded-2xl text-center font-bold text-sm shadow-lg shadow-gold-principal/10">
                  {t('settings.profile.no_profile.button')}
                </div>
                <p className="text-center text-xs text-gray-light underline">{t('settings.profile.no_profile.skip')}</p>
              </div>
            </button>
          ) : (
            <div className="bg-white-pure p-6 rounded-[32px] border border-gray-soft shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-navy-dark rounded-full flex items-center justify-center text-gold-principal font-serif font-bold text-xl border-2 border-gold-light/20">
                  {data.configuracoes.perfil.nome.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-serif font-bold text-navy-principal truncate">{data.configuracoes.perfil.nome}</h4>
                    <span className="px-2 py-0.5 bg-gold-soft text-gold-principal text-[8px] font-black uppercase tracking-widest rounded-full">
                      {t('settings.profile.created.connected')}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gold-dark font-bold">{data.configuracoes.perfil.codigo}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="py-3 bg-gold-principal text-navy-principal rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md"
                >
                  {t('settings.profile.created.edit')}
                </button>
                <button 
                  onClick={logout}
                  className="py-3 bg-red-soft text-red-brick rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-brick/10"
                >
                  {t('settings.profile.created.logout')}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* BLOCO 2 — TAMANHO DA LETRA */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em] px-2">{t('settings.font_size.title')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['pequena', 'media', 'grande', 'extra'] as const).map((size) => (
              <button
                key={size}
                onClick={() => updateConfiguracoes({ tamanhoFonte: size })}
                className={cn(
                  "p-4 rounded-3xl border-2 transition-all text-center space-y-2",
                  data.configuracoes.tamanhoFonte === size 
                    ? "border-gold-principal bg-gold-soft shadow-lg shadow-gold-principal/5" 
                    : "border-gray-soft bg-white-pure hover:border-gray-ice"
                )}
              >
                <Type size={16} className={cn("mx-auto", data.configuracoes.tamanhoFonte === size ? "text-gold-principal" : "text-gray-light")} />
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  data.configuracoes.tamanhoFonte === size ? "text-gold-principal" : "text-gray-medium"
                )}>
                  {t(`settings.font_size.${size}` as any)}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* BLOCO 3 — ESQUEMA DE CORES (TEMA) */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em] px-2">{t('settings.theme.title')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(['classico', 'noturno', 'verde', 'oceano', 'ambar', 'rosa'] as const).map((theme) => {
              const themes = {
                classico: { header: '#0F1A2E', primary: '#00875A', accent: '#C9A962' },
                noturno: { header: '#1a1a2e', primary: '#7F77DD', accent: '#5DCAA5' },
                verde: { header: '#f5f5f0', primary: '#00875A', accent: '#1D9E75' },
                oceano: { header: '#042C53', primary: '#378ADD', accent: '#85B7EB' },
                ambar: { header: '#2C2C2A', primary: '#EF9F27', accent: '#FAC775' },
                rosa: { header: '#ffffff', primary: '#D4537E', accent: '#534AB7' }
              };
              const colors = themes[theme];
              const isSelected = data.configuracoes.tema === theme;

              return (
                <button
                  key={theme}
                  onClick={() => updateConfiguracoes({ tema: theme })}
                  className={cn(
                    "bg-white-pure rounded-[28px] border-2 transition-all overflow-hidden text-left shadow-sm",
                    isSelected ? "border-gold-principal ring-4 ring-gold-principal/5" : "border-gray-soft hover:border-gray-ice"
                  )}
                >
                  <div className="h-10 w-full" style={{ backgroundColor: colors.header }} />
                  <div className="p-3 space-y-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.accent }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-navy-principal uppercase tracking-widest">{t(`settings.theme.${theme}` as any)}</p>
                      <p className="text-[8px] text-gray-medium leading-tight">{t(`settings.theme.${theme}.desc` as any)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* BLOCO 4 — IDIOMA */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em] px-2">{t('settings.language.title')}</h3>
          <div className="bg-white-pure rounded-[32px] border border-gray-soft shadow-sm overflow-hidden divide-y divide-gray-soft">
            {[
              { id: 'pt', name: 'Português', flag: '🇧🇷', desc: 'Português Brasileiro' },
              { id: 'en', name: 'English', flag: '🇺🇸', desc: 'American English' },
              { id: 'es', name: 'Español', flag: '🇪🇸', desc: 'Español latinoamericano' }
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => setIsLangModalOpen(l.id)}
                className="w-full p-5 flex items-center justify-between hover:bg-white-off transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{l.flag}</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-navy-principal">{l.name}</p>
                    <p className="text-[10px] text-gray-medium">{l.desc}</p>
                  </div>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  data.configuracoes.idioma === l.id ? "border-gold-principal bg-gold-principal text-navy-principal" : "border-gray-ice"
                )}>
                  {data.configuracoes.idioma === l.id && <Check size={14} />}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* BLOCO 5 — OUTROS */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-light uppercase tracking-[0.2em] px-2">{t('settings.other.title')}</h3>
          <div className="bg-white-pure rounded-[32px] border border-gray-soft shadow-sm overflow-hidden divide-y divide-gray-soft">
            {/* Notificações */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-soft rounded-xl flex items-center justify-center text-blue-steel">
                  <Bell size={20} />
                </div>
                <p className="text-sm font-bold text-navy-principal">{t('settings.other.notifications')}</p>
              </div>
              <button 
                onClick={() => updateConfiguracoes({ notificacoes: !data.configuracoes.notificacoes })}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  data.configuracoes.notificacoes ? "bg-gold-principal" : "bg-gray-ice"
                )}
              >
                <motion.div 
                  animate={{ x: data.configuracoes.notificacoes ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white-pure rounded-full shadow-sm"
                />
              </button>
            </div>

            {/* Privacidade */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-navy-light rounded-xl flex items-center justify-center text-navy-principal">
                  {data.configuracoes.ocultarValores ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
                <p className="text-sm font-bold text-navy-principal">{t('settings.other.privacy')}</p>
              </div>
              <button 
                onClick={() => updateConfiguracoes({ ocultarValores: !data.configuracoes.ocultarValores })}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  data.configuracoes.ocultarValores ? "bg-gold-principal" : "bg-gray-ice"
                )}
              >
                <motion.div 
                  animate={{ x: data.configuracoes.ocultarValores ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white-pure rounded-full shadow-sm"
                />
              </button>
            </div>

            {/* Exportar */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gold-soft rounded-xl flex items-center justify-center text-gold-dark">
                  <Download size={20} />
                </div>
                <p className="text-sm font-bold text-navy-principal">{t('settings.other.export')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleExport('xlsx')}
                  className="py-3 bg-white-off border border-gray-soft rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-soft transition-colors"
                >
                  Excel (.xlsx)
                </button>
                <button 
                  onClick={() => handleExport('csv')}
                  className="py-3 bg-white-off border border-gray-soft rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-soft transition-colors"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Apagar Tudo */}
            <div className="p-5">
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-4 bg-red-soft text-red-brick rounded-2xl text-xs font-bold uppercase tracking-widest border border-red-brick/10 hover:bg-red-brick hover:text-white-pure transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                {t('settings.other.delete_all')}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* Profile Modal */}
        {isProfileModalOpen && (
          <ProfileModal 
            onClose={() => setIsProfileModalOpen(false)} 
            perfilAtual={data.configuracoes.perfil}
            onSave={(perfil) => {
              updateConfiguracoes({ perfil });
              setIsProfileModalOpen(false);
            }}
          />
        )}

        {/* Language Confirmation Modal */}
        {isLangModalOpen && (
          <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white-pure w-full max-w-xs rounded-[40px] p-8 space-y-6 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-gold-soft rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
                <Globe size={40} className="text-gold-principal" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-navy-principal">{t('settings.language.confirm.title')}</h3>
                <p className="text-sm text-gray-medium leading-relaxed">{t('settings.language.confirm.desc')}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    updateConfiguracoes({ idioma: isLangModalOpen as any });
                    setIsLangModalOpen(null);
                  }}
                  className="w-full py-4 bg-navy-principal text-white-pure rounded-2xl font-bold shadow-lg shadow-navy-principal/10"
                >
                  {t('common.save')}
                </button>
                <button 
                  onClick={() => setIsLangModalOpen(null)}
                  className="w-full py-2 text-gray-light font-bold text-sm"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white-pure w-full max-w-xs rounded-[40px] p-8 space-y-6 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-soft rounded-full flex items-center justify-center mx-auto text-red-brick shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-red-brick">{t('settings.other.delete_all')}</h3>
                <p className="text-xs text-gray-medium leading-relaxed">
                  Esta ação é irreversível. Todos os seus lançamentos, parcelamentos e metas serão apagados.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-light uppercase tracking-widest">{t('settings.other.delete_all.confirm')}</p>
                  <input 
                    type="text" 
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={t('settings.other.delete_all.confirm_word')}
                    className="w-full p-4 bg-white-off border border-red-brick/20 rounded-2xl text-center font-bold text-red-brick outline-none focus:ring-2 focus:ring-red-brick/20"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleDeleteAll}
                    disabled={deleteConfirm !== t('settings.other.delete_all.confirm_word')}
                    className="w-full py-4 bg-red-brick text-white-pure rounded-2xl font-bold shadow-lg shadow-red-brick/20 disabled:opacity-30"
                  >
                    {t('common.delete')}
                  </button>
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="w-full py-2 text-gray-light font-bold text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileModal = ({ onClose, perfilAtual, onSave }: { onClose: () => void, perfilAtual: any, onSave: (perfil: any) => void }) => {
  const { t } = useTranslation();
  const [nome, setNome] = useState(perfilAtual.nome || '');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Generate code if not exists
  const codigo = useMemo(() => {
    if (perfilAtual.codigo) return perfilAtual.codigo;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `NG-${random}`;
  }, [perfilAtual.codigo]);

  const handleCreate = async () => {
    if (!nome) return setError('Nome é obrigatório');
    if (senha.length < 6) return setError('Senha deve ter no mínimo 6 caracteres');
    if (senha !== confirmarSenha) return setError('As senhas não coincidem');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    onSave({
      criado: true,
      nome,
      codigo,
      senhaHash: hash,
      criadoEm: perfilAtual.criadoEm || new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white-pure w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-navy-principal">{t('settings.profile.modal.title')}</h2>
          <button onClick={onClose} className="p-2 text-gray-light hover:bg-white-off rounded-full transition-colors">
            <ArrowLeft size={20} className="rotate-90" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-widest px-1">{t('settings.profile.modal.name')}</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Família Silva"
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-bold"
            />
          </div>

          {/* Código (Imutável) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-widest px-1">{t('settings.profile.modal.code')}</label>
            <div className="w-full p-4 bg-navy-principal border border-navy-dark rounded-2xl flex items-center justify-center">
              <span className="text-xl font-mono font-bold text-gold-principal tracking-widest">{codigo}</span>
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-widest px-1">{t('settings.profile.modal.password')}</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-bold"
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

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-light uppercase tracking-widest px-1">{t('settings.profile.modal.confirm_password')}</label>
            <input 
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full p-4 bg-white-off border border-gray-soft rounded-2xl outline-none focus:ring-2 focus:ring-gold-principal text-navy-principal font-bold"
            />
          </div>

          {/* Aviso */}
          <div className="p-4 bg-amber-soft rounded-2xl border border-amber-principal/20 flex gap-3">
            <AlertTriangle size={20} className="text-amber-principal shrink-0" />
            <p className="text-[10px] font-bold text-amber-dark leading-relaxed">
              {t('settings.profile.modal.warning')}
            </p>
          </div>

          {error && <p className="text-xs font-bold text-red-brick text-center">{error}</p>}

          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={handleCreate}
              className="w-full py-4 bg-gold-principal text-navy-principal rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-gold-principal/20"
            >
              {perfilAtual.criado ? t('common.save') : t('settings.profile.modal.create')}
            </button>
            <button 
              onClick={onClose}
              className="w-full py-2 text-gray-light font-bold text-sm"
            >
              {t('settings.profile.modal.cancel')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
