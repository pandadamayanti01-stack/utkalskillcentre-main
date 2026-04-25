import React, { useState } from 'react';
import { ODISHA_DISTRICTS } from '../constants/districts';

interface DistrictLeaderboardFilterProps {
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  language: 'en' | 'or';
}

export function DistrictLeaderboardFilter({ selectedDistrict, setSelectedDistrict, language }: DistrictLeaderboardFilterProps) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        {language === 'en' ? 'Leaderboard for:' : 'ଲିଡରବୋର୍ଡ ପାଇଁ:'}
      </label>
      <select
        className="p-2 rounded-xl bg-slate-900 text-white border border-emerald-500/30 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all shadow"
        value={selectedDistrict}
        onChange={e => setSelectedDistrict(e.target.value)}
      >
        <option value="">{language === 'en' ? 'All Odisha' : 'ସମସ୍ତ ଓଡ଼ିଶା'}</option>
        {ODISHA_DISTRICTS.map(d => (
          <option key={d.en} value={d.en}>
            {language === 'en' ? d.en : `${d.or} (${d.en})`}
          </option>
        ))}
      </select>
    </div>
  );
}
