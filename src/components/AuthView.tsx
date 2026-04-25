import React from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2, 
  Globe,
  Phone,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { BigsanBranding } from './Branding';

interface AuthViewProps {
  language: 'en' | 'or';
  isAdminLogin: boolean;
  setIsAdminLogin: (val: boolean) => void;
  authStep: 'login' | 'otp';
  setAuthStep: (step: 'login' | 'otp') => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  otp: string;
  setOtp: (val: string) => void;
  resendTimer: number;
  isSendingOtp: boolean;
  regData: any;
  setRegData: (data: any) => void;
  handlePhoneLogin: () => void;
  verifyOtp: () => void;
  handleGoogleLogin: () => void;
  handleAdminEmailLogin: () => void;
  adminEmail: string;
  setAdminEmail: (val: string) => void;
  adminPassword: string;
  setAdminPassword: (val: string) => void;
  adminLoginError: string;
  showResetPasswordButton: boolean;
  handleSendPasswordReset: () => void;
  startPhoneAuth: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  language,
  isAdminLogin,
  setIsAdminLogin,
  authStep,
  setAuthStep,
  phoneNumber,
  setPhoneNumber,
  otp,
  setOtp,
  resendTimer,
  isSendingOtp,
  regData,
  setRegData,
  handlePhoneLogin,
  verifyOtp,
  handleGoogleLogin,
  handleAdminEmailLogin,
  adminEmail,
  setAdminEmail,
  adminPassword,
  setAdminPassword,
  adminLoginError,
  showResetPasswordButton,
  handleSendPasswordReset,
  startPhoneAuth
}) => {
  const t = translations[language];

  const [showLanguageToggle, setShowLanguageToggle] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => setShowLanguageToggle(!showLanguageToggle)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-md"
        >
          <Globe size={14} className="text-emerald-500" />
          {language === 'en' ? 'English' : 'ଓଡ଼ିଆ'}
        </button>
        
        <AnimatePresence>
          {showLanguageToggle && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full right-0 mt-2 p-2 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl min-w-[120px]"
            >
              <button 
                onClick={() => { setRegData({...regData, language: 'en'}); setShowLanguageToggle(false); }}
                className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-colors ${language === 'en' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                English
              </button>
              <button 
                onClick={() => { setRegData({...regData, language: 'or'}); setShowLanguageToggle(false); }}
                className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-colors ${language === 'or' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                ଓଡ଼ିଆ
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <img src="/utkal-192.png" alt="Utkal 192 Logo" className="h-16 w-16 mb-4" referrerPolicy="no-referrer" />
          <BigsanBranding />
        </div>

        <div className="glass-card neon-border p-8 md:p-10 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <AnimatePresence mode="wait">
            {authStep === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    {isAdminLogin ? "Admin Access" : t.login}
                  </h1>
                  <p className="text-slate-400 text-sm font-medium">
                    {isAdminLogin ? "Enter your credentials to manage the platform" : t.tagline}
                  </p>
                </div>

                {!isAdminLogin ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{t.selectClass}</label>
                        <select 
                          value={regData.class}
                          onChange={(e) => setRegData({...regData, class: e.target.value})}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                        >
                          <option value="">{t.selectClass}</option>
                          {Object.entries(t.classes).map(([key, label]) => (
                            <option key={key} value={key}>{label as string}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{t.selectBoard}</label>
                        <select 
                          value={regData.board}
                          onChange={(e) => setRegData({...regData, board: e.target.value})}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                        >
                          <option value="">{t.selectBoard}</option>
                          {Object.entries(t.boards).map(([key, label]) => (
                            <option key={key} value={key}>{label as string}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                          <Phone size={20} />
                        </div>
                        <input 
                          type="tel"
                          placeholder={t.enterPhone}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </div>

                      <button 
                        onClick={handlePhoneLogin}
                        disabled={isSendingOtp}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 group"
                      >
                        {isSendingOtp ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <>
                            {t.sendOtp}
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="bg-slate-900 px-4 text-slate-500 font-bold">{t.or}</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3"
                    >
                      <Globe size={20} className="text-blue-400" />
                      {t.googleLogin}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500">
                          <Mail size={20} />
                        </div>
                        <input 
                          type="email"
                          placeholder={t.email}
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500">
                          <Lock size={20} />
                        </div>
                        <input 
                          type="password"
                          placeholder={t.password}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </div>
                    </div>

                    {adminLoginError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium">
                        {adminLoginError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <button 
                        onClick={handleAdminEmailLogin}
                        disabled={isSendingOtp}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3"
                      >
                        {isSendingOtp ? <Loader2 className="animate-spin" size={20} /> : "Admin Login"}
                      </button>
                      
                      {showResetPasswordButton && (
                        <button 
                          onClick={handleSendPasswordReset}
                          className="w-full py-2 text-emerald-400 text-xs font-bold hover:underline"
                        >
                          Forgot Password? Reset via Email
                        </button>
                      )}

                      <button 
                        onClick={() => setIsAdminLogin(false)}
                        className="w-full py-2 text-slate-500 text-xs font-bold hover:text-white transition-colors"
                      >
                        Back to Student Login
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto mb-4">
                    <Sparkles size={32} />
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tight">{t.verifyOtp}</h1>
                  <p className="text-slate-400 text-sm font-medium">
                    {language === 'en' ? "Enter the code sent to" : "କୋଡ୍ ଦିଅନ୍ତୁ ଯାହା ପଠାଯାଇଛି"} <span className="text-white font-bold">{phoneNumber}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-5 text-center text-3xl font-black tracking-[0.5em] text-white placeholder:text-slate-800 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />

                  <div className="space-y-4">
                    <button 
                      onClick={verifyOtp}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/20"
                    >
                      {t.verifyOtp}
                    </button>

                    <div className="flex flex-col items-center gap-4">
                      <button 
                        onClick={startPhoneAuth}
                        disabled={resendTimer > 0 || isSendingOtp}
                        className="text-sm font-bold text-emerald-400 disabled:text-slate-600 transition-colors"
                      >
                        {resendTimer > 0 ? `${t.resendOtp} (${resendTimer}s)` : t.resendOtp}
                      </button>
                      
                      <button 
                        onClick={() => setAuthStep('login')}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-colors"
                      >
                        <ArrowLeft size={14} />
                        Change Phone Number
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isAdminLogin && authStep === 'login' && (
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setIsAdminLogin(true)}
            className="w-full mt-8 py-3 text-slate-600 hover:text-slate-400 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Admin Access
          </motion.button>
        )}
      </motion.div>

      <div id="recaptcha-container"></div>
    </div>
  );
};
