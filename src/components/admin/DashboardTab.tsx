import React, { useState, useEffect } from 'react';
import { collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { LayoutDashboard, Users, Brain, CreditCard, BookOpen } from 'lucide-react';

export const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRevenue: 0,
    aiQuestionsToday: 0,
    totalChapters: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total Students
        const studentsSnap = await getCountFromServer(collection(db, 'users'));
        
        // Total Revenue (assuming transactions collection)
        // This is a simplified example, you might need to sum up actual transaction amounts
        const transactionsSnap = await getCountFromServer(collection(db, 'transactions'));
        
        // AI Questions Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const aiQuery = query(collection(db, 'ai_usage'), where('timestamp', '>=', Timestamp.fromDate(today)));
        const aiSnap = await getCountFromServer(aiQuery);
        
        // Total Chapters
        const chaptersSnap = await getCountFromServer(collection(db, 'chapters'));

        setStats({
          totalStudents: studentsSnap.data().count,
          totalRevenue: transactionsSnap.data().count * 100, // Placeholder calculation
          aiQuestionsToday: aiSnap.data().count,
          totalChapters: chaptersSnap.data().count
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard...</div>;

  const cards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-500' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: CreditCard, color: 'text-emerald-500' },
    { label: 'AI Questions Today', value: stats.aiQuestionsToday, icon: Brain, color: 'text-purple-500' },
    { label: 'Total Chapters', value: stats.totalChapters, icon: BookOpen, color: 'text-orange-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className={`p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 group-hover:scale-110 transition-all ${card.color}`}>
              <card.icon size={24} />
            </div>
            <h3 className="text-xs text-slate-400 font-medium uppercase tracking-widest">{card.label}</h3>
          </div>
          <p className="text-4xl font-black text-white tracking-tight relative z-10">{card.value}</p>
        </div>
      ))}
    </div>
  );
};
