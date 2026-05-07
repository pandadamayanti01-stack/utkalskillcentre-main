import React from 'react';
import { motion } from 'framer-motion';
import { Bell, ArrowLeft, Calendar, AlertCircle } from 'lucide-react';
import { translations } from '../translations';
import { Timestamp } from 'firebase/firestore';

interface NotificationsViewProps {
  notifications: any[];
  language: 'en' | 'or';
  onBack: () => void;
  readNotifIds?: string[];
}

export function NotificationsView({ notifications, language, onBack, readNotifIds = [] }: NotificationsViewProps) {
  const t = translations[language];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
    exit: { opacity: 0, y: -20 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-6 pb-20"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {language === 'en' ? 'Notifications' : 'ବିଜ୍ଞପ୍ତି'}
          </h1>
          <p className="text-slate-400 text-sm">
            {language === 'en' ? 'Stay updated with important announcements' : 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଘୋଷଣାଗୁଡ଼ିକ ସହିତ ଅଦ୍ୟତିତ ରୁହନ୍ତୁ'}
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id || index}
              variants={itemVariants}
              className="glass-card neon-border rounded-2xl p-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <Bell size={20} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                      {notification.title || (language === 'en' ? 'System Notification' : 'ସିଷ୍ଟମ୍ ବିଜ୍ଞପ୍ତି')}
                      {!readNotifIds.includes(notification.id) && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse shrink-0" />
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Calendar size={12} />
                      {notification.createdAt ? (
                        notification.createdAt instanceof Timestamp || (notification.createdAt && typeof notification.createdAt === 'object' && 'toDate' in notification.createdAt)
                          ? new Date(notification.createdAt.toDate()).toLocaleDateString() 
                          : new Date(notification.createdAt).toLocaleDateString()
                      ) : (
                        notification.timestamp ? new Date(notification.timestamp.toDate()).toLocaleDateString() : 'Recent'
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {notification.description || notification.message || (language === 'en' ? 'No description available' : 'କୌଣସି ବର୍ଣ୍ଣନା ଉପଲବ୍ଧ ନାହିଁ')}
                  </p>
                  {notification.audience && (
                    <div className="flex items-center gap-2">
                      <AlertCircle size={12} className="text-amber-500" />
                      <span className="text-amber-400 text-xs font-medium">
                        {language === 'en' ? `For: ${notification.audience}` : `ପାଇଁ: ${notification.audience}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div
            variants={itemVariants}
            className="text-center py-12 space-y-4"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
              <Bell size={32} />
            </div>
            <h3 className="text-xl font-black text-white">
              {language === 'en' ? 'No notifications yet' : 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିଜ୍ଞପ୍ତି ନାହିଁ'}
            </h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              {language === 'en'
                ? 'You\'ll receive important updates and announcements here when they become available.'
                : 'ଯେତେବେଳେ ସେଗୁଡ଼ିକ ଉପଲବ୍ଧ ହେବ, ଆପଣ ଏଠାରେ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଅଦ୍ୟତନ ଏବଂ ଘୋଷଣାଗୁଡ଼ିକ ପାଇବେ |'}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}