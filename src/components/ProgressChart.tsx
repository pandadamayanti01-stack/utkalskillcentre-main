import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface ProgressChartProps {
  data: any[];
  language: 'en' | 'or';
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ data, language }) => {
  const translations = {
    en: {
      points: 'Points Earned',
      accuracy: 'Accuracy %',
      date: 'Date'
    },
    or: {
      points: 'ଅର୍ଜିତ ପଏଣ୍ଟ',
      accuracy: 'ସଠିକତା %',
      date: 'ତାରିଖ'
    }
  };

  const t = translations[language];

  return (
    <div className="space-y-8">
      <div className="h-[300px] w-full bg-slate-900/50 border border-white/5 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">{t.points}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(str) => str.split('-').slice(1).join('/')}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#10B981' }}
            />
            <Area 
              type="monotone" 
              dataKey="pointsEarned" 
              stroke="#10B981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPoints)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[300px] w-full bg-slate-900/50 border border-white/5 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">{t.accuracy}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(str) => str.split('-').slice(1).join('/')}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#8b5cf6' }}
            />
            <Line 
              type="monotone" 
              dataKey="accuracy" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
