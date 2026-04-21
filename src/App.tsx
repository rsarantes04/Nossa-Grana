/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { useFinance } from './contexts/FinanceContext';
import { Dashboard } from './components/Dashboard';
import { Budget } from './components/Budget';
import { Categories } from './components/Categories';
import { More } from './components/More';
import { Chat } from './components/Chat';
import { Onboarding } from './components/Onboarding';
import { QuickLaunch } from './components/QuickLaunch';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, CheckCircle2, AlertCircle, Info as InfoIcon, X } from 'lucide-react';
import { Logo } from './components/Logo';
import { LoginModal } from './components/LoginModal';
import { cn } from './lib/utils';

import { BotaoAdicionar } from './components/BotaoAdicionar';

export default function App() {
  const { data, isLoggedIn, toast } = useFinance();
  const [activeTab, setActiveTab] = useState('inicio');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQuickLaunchOpen, setIsQuickLaunchOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-navy-dark flex items-center justify-center z-[100]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="w-[60%]"
        >
          <Logo size="large" showTagline={true} />
        </motion.div>
      </div>
    );
  }

  if (!data.onboarded) {
    return <Onboarding />;
  }

  if (!isLoggedIn) {
    return <LoginModal />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return (
        <Dashboard />
      );
      case 'orcamento': return <Budget />;
      case 'categorias': return <Categories />;
      case 'mais': return <More />;
      default: return (
        <Dashboard />
      );
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} onOpenChat={() => setIsChatOpen(true)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </Layout>

      {/* Quick Launch Floating Button */}
      {activeTab !== 'mais' && (
        <BotaoAdicionar onClick={() => setIsQuickLaunchOpen(true)} />
      )}

      <AnimatePresence>
        {isChatOpen && (
          <Chat onClose={() => setIsChatOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQuickLaunchOpen && (
          <QuickLaunch onClose={() => setIsQuickLaunchOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-6 right-6 z-[300] flex justify-center pointer-events-none"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto border",
              toast.type === 'success' ? "bg-green-forest text-white-pure border-green-dark" :
              toast.type === 'error' ? "bg-red-brick text-white-pure border-red-dark" :
              "bg-navy-principal text-white-pure border-navy-dark"
            )}>
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'info' && <InfoIcon size={20} />}
              <p className="font-bold text-sm">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
// Impede o pull-to-refresh no topo da página
window.addEventListener('touchmove', function(e) {
  if (window.scrollY === 0) {
    e.preventDefault();
  }
}, { passive: false });
