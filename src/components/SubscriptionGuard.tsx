import React from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { translations } from '../translations';

interface SubscriptionGuardProps {
  onSubscribe: (amount: number, type: 'monthly' | 'yearly', userClass: number) => void;
  language: 'en' | 'or';
  isPremium: boolean;
  user: any;
  onShare: () => void;
  systemSettings: any;
  onBack: () => void;
}

export function SubscriptionGuard({ onSubscribe, language, isPremium, user, onShare, systemSettings, onBack }: SubscriptionGuardProps) {
  const p = translations[language].pricing;

  const monthlyPrice = systemSettings?.monthlyPrice || 99;
  const yearlyPrice = systemSettings?.yearlyPrice || 999;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">{p.title}</h2>
        <p className="text-slate-400">Empowering your education with personalized learning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden">
          {!isPremium && (
            <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {translations[language].pricing.currentPlan}
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{p.free.name}</h3>
            <div className="text-4xl font-bold text-white">{p.free.price}</div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {p.free.features.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px]">✓</div>
                {f}
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-4 rounded-2xl bg-white/5 text-slate-500 font-bold cursor-not-allowed">
            {isPremium ? "Included" : p.currentPlan}
          </button>
        </div>

        {/* Premium Plan */}
        <div className="bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-emerald-500/20 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-emerald-500/10">
          {isPremium && (
            <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {translations[language].pricing.currentPlan}
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{p.premium.name}</h3>
            <div className="space-y-1">
              <div className="text-4xl font-bold text-white">₹{monthlyPrice} / {language === 'en' ? 'month' : 'ମାସ'}</div>
              <div className="text-emerald-400 font-bold">₹{yearlyPrice} / {language === 'en' ? 'year' : 'ବର୍ଷ'} (Save 70%)</div>
            </div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {p.premium.features.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white">✓</div>
                {f}
              </li>
            ))}
          </ul>
          {!isPremium ? (
            <div className="space-y-4">
              <button 
                onClick={() => onSubscribe(monthlyPrice, 'monthly', user?.class || 1)}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20"
              >
                {language === 'en' ? `Subscribe Monthly (₹${monthlyPrice})` : `ମାସିକ ସବସ୍କ୍ରିପସନ୍ (₹${monthlyPrice})`}
              </button>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>{language === 'en' ? `Unlock Yearly Offer (₹${yearlyPrice})` : `ବାର୍ଷିକ ଅଫର୍ ଅନଲକ୍ କରନ୍ତୁ (₹${yearlyPrice})`}</span>
                  {((user?.shareCount || 0) >= 5) ? (
                    <span className="text-emerald-500">Unlocked!</span>
                  ) : (
                    <span className="text-orange-500">Locked</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{p.shareToUnlock}</span>
                    <span>{user?.shareCount || 0}/5</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all" 
                      style={{ width: `${Math.min(((user?.shareCount || 0) / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <button 
                    onClick={onShare}
                    className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> {p.shareOnWhatsApp}
                  </button>
                </div>

                <button 
                  onClick={() => onSubscribe(yearlyPrice, 'yearly', user?.class || 1)}
                  disabled={((user?.shareCount || 0) < 5)}
                  className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                    ((user?.shareCount || 0) >= 5)
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {((user?.shareCount || 0) >= 5) 
                    ? (language === 'en' ? `Offer Unlocked! Pay ₹${yearlyPrice} Now` : `ଅଫର୍ ଅନଲକ୍ ହୋଇଛି! ଏବେ ₹${yearlyPrice} ପେମେଣ୍ଟ କରନ୍ତୁ`)
                    : (language === 'en' ? `Subscribe Yearly (₹${yearlyPrice})` : `ବାର୍ଷିକ ସବସ୍କ୍ରିପସନ୍ (₹${yearlyPrice})`)}
                </button>
              </div>
            </div>
          ) : (
            <button disabled className="w-full py-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-bold cursor-not-allowed">
              Active
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
