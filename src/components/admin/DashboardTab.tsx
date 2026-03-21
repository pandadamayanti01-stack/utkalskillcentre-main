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
        <div key={index} className="bg-slate-800 p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 bg-slate-900 rounded-xl ${card.color}`}>
              <card.icon size={24} />
            </div>
            <h3 className="text-slate-400 font-medium">{card.label}</h3>
          </div>
          <p className="text-3xl font-bold text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
};
