import React from 'react';
import { ODISHA_DISTRICTS } from '../constants/districts';
import { MapPin, Compass } from 'lucide-react';

interface DistrictLeaderboardFilterProps {
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  language: 'en' | 'or';
}

// Complete mapping of Odisha's 30 districts to their iconic landmarks and visuals
const DISTRICT_LANDMARKS: Record<string, { landmarkEn: string; landmarkOr: string; image: string }> = {
  Angul: {
    landmarkEn: 'Satkosia Gorge',
    landmarkOr: 'ସାତକୋଶିଆ ଗଣ୍ଡ',
    image: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=300&q=80'
  },
  Balangir: {
    landmarkEn: 'Harishankar Temple',
    landmarkOr: 'ହରିଶଙ୍କର ମନ୍ଦିର',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0db?w=300&q=80'
  },
  Balasore: {
    landmarkEn: 'Chandipur Beach',
    landmarkOr: 'ଚାନ୍ଦିପୁର ବେଳାଭୂମି',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80'
  },
  Bargarh: {
    landmarkEn: 'Dhanu Jatra',
    landmarkOr: 'ଧନୁଯାତ୍ରା ମଞ୍ଚ',
    image: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=300&q=80'
  },
  Bhadrak: {
    landmarkEn: 'Akhandalamani Temple',
    landmarkOr: 'ଆଖଣ୍ଡଳମଣି ମନ୍ଦିର',
    image: 'https://images.unsplash.com/photo-1601579899387-43400787e90e?w=300&q=80'
  },
  Boudh: {
    landmarkEn: 'Buddha Statue',
    landmarkOr: 'ବୌଦ୍ଧ ବୁଦ୍ଧ ମୂର୍ତ୍ତି',
    image: 'https://images.unsplash.com/photo-1608997008609-d3aa359eddcee?w=300&q=80'
  },
  Cuttack: {
    landmarkEn: 'Barabati Fort',
    landmarkOr: 'ବାରବାଟୀ ଦୁର୍ଗ',
    image: 'https://images.unsplash.com/photo-1596117366373-67c48f2191b5?w=300&q=80'
  },
  Deogarh: {
    landmarkEn: 'Pradhanpat Falls',
    landmarkOr: 'ପ୍ରଧାନପାଟ ଜଳପ୍ରପାତ',
    image: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=300&q=80'
  },
  Dhenkanal: {
    landmarkEn: 'Kapilash Temple',
    landmarkOr: 'କପିଳାସ ମନ୍ଦିର',
    image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=300&q=80'
  },
  Gajapati: {
    landmarkEn: 'Mahendragiri Hills',
    landmarkOr: 'ମହେନ୍ଦ୍ରଗିରି ପର୍ବତ',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&q=80'
  },
  Ganjam: {
    landmarkEn: 'Tara Tarini Temple',
    landmarkOr: 'ତାରାତାରିଣୀ ମନ୍ଦିର',
    image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=300&q=80'
  },
  Jagatsinghpur: {
    landmarkEn: 'Paradip Port',
    landmarkOr: 'ପାରାଦୀପ ବନ୍ଦର',
    image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=300&q=80'
  },
  Jajpur: {
    landmarkEn: 'Biraja Temple',
    landmarkOr: 'ବିରଜା ମନ୍ଦିର',
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300&q=80'
  },
  Jharsuguda: {
    landmarkEn: 'Koilighangar Falls',
    landmarkOr: 'କୋଇଲିଘୋଘର ଜଳପ୍ରପାତ',
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80'
  },
  Kalahandi: {
    landmarkEn: 'Phurlijharan Falls',
    landmarkOr: 'ଫୁର୍ଲିଝରଣ ଜଳପ୍ରପାତ',
    image: 'https://images.unsplash.com/photo-1432406776043-6c76db202811?w=300&q=80'
  },
  Kandhamal: {
    landmarkEn: 'Daringbadi Hill Station',
    landmarkOr: 'ଦାରିଙ୍ଗବାଡ଼ି',
    image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=300&q=80'
  },
  Kendrapara: {
    landmarkEn: 'Bhitarkanika Mangroves',
    landmarkOr: 'ଭିତରକନିକା ହେନ୍ତାଳବନ',
    image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=300&q=80'
  },
  Kendujhar: {
    landmarkEn: 'Sanaghagara Falls',
    landmarkOr: 'ସାନଘାଗରା ଜଳପ୍ରପାତ',
    image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&q=80'
  },
  Khordha: {
    landmarkEn: 'Dhauli Peace Pagoda',
    landmarkOr: 'ଧଉଳି ଶାନ୍ତି ସ୍ତୂପ',
    image: 'https://images.unsplash.com/photo-1600100397608-f010e42edaba?w=300&q=80'
  },
  Koraput: {
    landmarkEn: 'Deomali Peak',
    landmarkOr: 'ଦେଓମାଳି ପର୍ବତ',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80'
  },
  Malkangiri: {
    landmarkEn: 'Balimela Reservoir',
    landmarkOr: 'ବାଲିମେଳା ଜଳଭଣ୍ଡାର',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&q=80'
  },
  Mayurbhanj: {
    landmarkEn: 'Similipal Forests',
    landmarkOr: 'ଶିମିଳିପାଳ ଅରଣ୍ୟ',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80'
  },
  Nabarangpur: {
    landmarkEn: 'Sahid Minar',
    landmarkOr: 'ସହିଦ ମିନାର',
    image: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=300&q=80'
  },
  Nayagarh: {
    landmarkEn: 'Tarabalo Hot Springs',
    landmarkOr: 'ତରବାଲୋ ଉଷ୍ଣପ୍ରସ୍ରବଣ',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=300&q=80'
  },
  Nuapada: {
    landmarkEn: 'Patora Dam',
    landmarkOr: 'ପାତୋରା ଜଳଭଣ୍ଡାର',
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80'
  },
  Puri: {
    landmarkEn: 'Konark Sun Temple',
    landmarkOr: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର',
    image: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=300&q=80'
  },
  Rayagada: {
    landmarkEn: 'Hanging Bridge',
    landmarkOr: 'ଝୁଲା ପୋଲ',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80'
  },
  Sambalpur: {
    landmarkEn: 'Hirakud Dam',
    landmarkOr: 'ହୀରାକୁଦ ଜଳଭଣ୍ଡାର',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&q=80'
  },
  Sonepur: {
    landmarkEn: 'Subarnameru Temple',
    landmarkOr: 'ସୁବର୍ଣ୍ଣମେରୁ ମନ୍ଦିର',
    image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=300&q=80'
  },
  Sundargarh: {
    landmarkEn: 'Mandira Dam',
    landmarkOr: 'ମନ୍ଦିରା ଜଳଭଣ୍ଡାର',
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80'
  }
};

export function DistrictLeaderboardFilter({ selectedDistrict, setSelectedDistrict, language }: DistrictLeaderboardFilterProps) {
  // Front card represents "All Odisha"
  const allOdishaOption = {
    en: 'All Odisha',
    or: 'ସମସ୍ତ ଓଡ଼ିଶା',
    landmarkEn: 'Heart of Lord Jagannath',
    landmarkOr: 'ଜଗନ୍ନାଥ କ୍ଷେତ୍ର',
    image: 'https://images.unsplash.com/photo-1600100397608-f010e42edaba?w=300&q=80' // Konark wheel / Odisha theme
  };

  return (
    <div className="w-full space-y-3 mb-8">
      <div className="flex items-center gap-2 px-2">
        <Compass className="text-emerald-400 animate-spin-slow" size={16} />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {language === 'en' ? 'Explore Rankings by District' : 'ଜିଲ୍ଲା ଅନୁଯାୟୀ ମାନ୍ୟତା ଦେଖନ୍ତୁ:'}
        </span>
      </div>

      {/* Horizontal scroll track */}
      <div className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
        
        {/* All Odisha Card */}
        <button
          onClick={() => setSelectedDistrict('')}
          className={`flex-none w-40 h-24 rounded-2xl relative overflow-hidden transition-all duration-300 group border text-left cursor-pointer ${
            selectedDistrict === ''
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[0.98]'
              : 'border-white/10 hover:border-white/20 hover:-translate-y-0.5'
          }`}
        >
          {/* Card background */}
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${allOdishaOption.image})` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-black/10" />
          
          {/* Card content */}
          <div className="absolute inset-x-3 bottom-3 flex flex-col justify-end z-10 pointer-events-none">
            <span className="text-xs font-black text-emerald-400 tracking-tight flex items-center gap-1">
              <MapPin size={10} />
              {language === 'en' ? allOdishaOption.en : allOdishaOption.or}
            </span>
            <span className="text-[8px] text-slate-400 font-bold truncate mt-0.5">
              {language === 'en' ? allOdishaOption.landmarkEn : allOdishaOption.landmarkOr}
            </span>
          </div>
        </button>

        {/* Individual District Cards */}
        {ODISHA_DISTRICTS.map((d) => {
          const detail = DISTRICT_LANDMARKS[d.en] || {
            landmarkEn: 'Scenic Odisha',
            landmarkOr: 'ସୁନ୍ଦର ଓଡ଼ିଶା',
            image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80'
          };
          const isSelected = selectedDistrict.toLowerCase() === d.en.toLowerCase();

          return (
            <button
              key={d.en}
              onClick={() => setSelectedDistrict(d.en)}
              className={`flex-none w-40 h-24 rounded-2xl relative overflow-hidden transition-all duration-300 group border text-left cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[0.98]'
                  : 'border-white/10 hover:border-white/20 hover:-translate-y-0.5'
              }`}
            >
              {/* Card background */}
              <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${detail.image})` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-black/10" />

              {/* Card content */}
              <div className="absolute inset-x-3 bottom-3 flex flex-col justify-end z-10 pointer-events-none">
                <span className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight flex items-center gap-1">
                  <MapPin size={10} className={isSelected ? 'text-emerald-400' : 'text-slate-400'} />
                  {language === 'en' ? d.en : d.or}
                </span>
                <span className="text-[8px] text-slate-400 font-bold truncate mt-0.5">
                  {language === 'en' ? detail.landmarkEn : detail.landmarkOr}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
