import React, { useRef } from 'react';
import { ODISHA_DISTRICTS } from '../constants/districts';
import { MapPin, Compass, ChevronLeft, ChevronRight } from 'lucide-react';

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
    image: '/districts/angul.jpg'
  },
  Balangir: {
    landmarkEn: 'Harishankar Temple',
    landmarkOr: 'ହରିଶଙ୍କର ମନ୍ଦିର',
    image: '/districts/balangir.jpg'
  },
  Balasore: {
    landmarkEn: 'Chandipur Beach',
    landmarkOr: 'ଚାନ୍ଦିପୁର ବେଳାଭୂମି',
    image: '/districts/balasore.jpg'
  },
  Bargarh: {
    landmarkEn: 'Dhanu Jatra',
    landmarkOr: 'ଧନୁଯାତ୍ରା ମଞ୍ଚ',
    image: '/districts/bargarh.jpg'
  },
  Bhadrak: {
    landmarkEn: 'Akhandalamani Temple',
    landmarkOr: 'ଆଖଣ୍ଡଳମଣି ମନ୍ଦିର',
    image: '/districts/bhadrak.jpg'
  },
  Boudh: {
    landmarkEn: 'Buddha Statue',
    landmarkOr: 'ବୌଦ୍ଧ ବୁଦ୍ଧ ମୂର୍ତ୍ତି',
    image: '/districts/boudh.jpg'
  },
  Cuttack: {
    landmarkEn: 'Barabati Fort',
    landmarkOr: 'ବାରବାଟୀ ଦୁର୍ଗ',
    image: '/districts/cuttack.jpg'
  },
  Deogarh: {
    landmarkEn: 'Pradhanpat Falls',
    landmarkOr: 'ପ୍ରଧାନପାଟ ଜଳପ୍ରପାତ',
    image: '/districts/deogarh.jpg'
  },
  Dhenkanal: {
    landmarkEn: 'Kapilash Temple',
    landmarkOr: 'କପିଳାସ ମନ୍ଦିର',
    image: '/districts/dhenkanal.jpg'
  },
  Gajapati: {
    landmarkEn: 'Mahendragiri Hills',
    landmarkOr: 'ମହେନ୍ଦ୍ରଗିରି ପର୍ବତ',
    image: '/districts/gajapati.jpg'
  },
  Ganjam: {
    landmarkEn: 'Tara Tarini Temple',
    landmarkOr: 'ତାରାତାରିଣୀ ମନ୍ଦିର',
    image: '/districts/ganjam.jpg'
  },
  Jagatsinghpur: {
    landmarkEn: 'Paradip Port',
    landmarkOr: 'ପାରାଦୀପ ବନ୍ଦର',
    image: '/districts/jagatsinghpur.jpg'
  },
  Jajpur: {
    landmarkEn: 'Biraja Temple',
    landmarkOr: 'ବିରଜା ମନ୍ଦିର',
    image: '/districts/jajpur.jpg'
  },
  Jharsuguda: {
    landmarkEn: 'Koilighangar Falls',
    landmarkOr: 'କୋଇଲିଘୋଘର ଜଳପ୍ରପାତ',
    image: '/districts/jharsuguda.jpg'
  },
  Kalahandi: {
    landmarkEn: 'Phurlijharan Falls',
    landmarkOr: 'ଫୁର୍ଲିଝରଣ ଜଳପ୍ରପାତ',
    image: '/districts/kalahandi.jpg'
  },
  Kandhamal: {
    landmarkEn: 'Daringbadi Hill Station',
    landmarkOr: 'ଦାରିଙ୍ଗବାଡ଼ି',
    image: '/districts/kandhamal.jpg'
  },
  Kendrapara: {
    landmarkEn: 'Bhitarkanika Mangroves',
    landmarkOr: 'ଭିତରକନିକା ହେନ୍ତାଳବନ',
    image: '/districts/kendrapara.jpg'
  },
  Kendujhar: {
    landmarkEn: 'Sanaghagara Falls',
    landmarkOr: 'ସାନଘାଗରା ଜଳପ୍ରପାତ',
    image: '/districts/kendujhar.jpg'
  },
  Khordha: {
    landmarkEn: 'Dhauli Peace Pagoda',
    landmarkOr: 'ଧଉଳି ଶାନ୍ତି ସ୍ତୂପ',
    image: '/districts/khordha.jpg'
  },
  Koraput: {
    landmarkEn: 'Deomali Peak',
    landmarkOr: 'ଦେଓମାଳି ପର୍ବତ',
    image: '/districts/koraput.jpg'
  },
  Malkangiri: {
    landmarkEn: 'Balimela Reservoir',
    landmarkOr: 'ବାଲିମେଳା ଜଳଭଣ୍ଡାର',
    image: '/districts/malkangiri.jpg'
  },
  Mayurbhanj: {
    landmarkEn: 'Similipal Forests',
    landmarkOr: 'ଶିମିଳିପାଳ ଅରଣ୍ୟ',
    image: '/districts/mayurbhanj.jpg'
  },
  Nabarangpur: {
    landmarkEn: 'Sahid Minar',
    landmarkOr: 'ସହିଦ ମିନାର',
    image: '/districts/nabarangpur.jpg'
  },
  Nayagarh: {
    landmarkEn: 'Tarabalo Hot Springs',
    landmarkOr: 'ତରବାଲୋ ଉଷ୍ଣପ୍ରସ୍ରବଣ',
    image: '/districts/nayagarh.jpg'
  },
  Nuapada: {
    landmarkEn: 'Patora Dam',
    landmarkOr: 'ପାତୋରା ଜଳଭଣ୍ଡାର',
    image: '/districts/nuapada.jpg'
  },
  Puri: {
    landmarkEn: 'Konark Sun Temple',
    landmarkOr: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର',
    image: '/districts/puri.jpg'
  },
  Rayagada: {
    landmarkEn: 'Hanging Bridge',
    landmarkOr: 'ଝୁଲା ପୋଲ',
    image: '/districts/rayagada.jpg'
  },
  Sambalpur: {
    landmarkEn: 'Hirakud Dam',
    landmarkOr: 'ହୀରାକୁଦ ଜଳଭଣ୍ଡାର',
    image: '/districts/sambalpur.jpg'
  },
  Sonepur: {
    landmarkEn: 'Subarnameru Temple',
    landmarkOr: 'ସୁବର୍ଣ୍ଣମେରୁ ମନ୍ଦିର',
    image: '/districts/sonepur.jpg'
  },
  Sundargarh: {
    landmarkEn: 'Mandira Dam',
    landmarkOr: 'ମନ୍ଦିରା ଜଳଭଣ୍ଡାର',
    image: '/districts/sundargarh.jpg'
  }
};

export function DistrictLeaderboardFilter({ selectedDistrict, setSelectedDistrict, language }: DistrictLeaderboardFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };
  // Front card represents "All Odisha"
  const allOdishaOption = {
    en: 'All Odisha',
    or: 'ସମସ୍ତ ଓଡ଼ିଶା',
    landmarkEn: 'Heart of Lord Jagannath',
    landmarkOr: 'ଜଗନ୍ନାଥ କ୍ଷେତ୍ର',
    image: '/jagannath-temple.png'
  };

  return (
    <div className="w-full space-y-3 mb-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Compass className="text-emerald-400 animate-spin-slow" size={16} />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {language === 'en' ? 'Explore Rankings by District' : 'ଜିଲ୍ଲା ଅନୁଯାୟୀ ମାନ୍ୟତା ଦେଖନ୍ତୁ:'}
          </span>
        </div>
        {/* Navigation buttons for desktop */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="p-1 rounded-lg bg-slate-950/60 border border-white/5 text-slate-450 hover:text-emerald-400 hover:bg-slate-900 transition-all cursor-pointer"
            title={language === 'en' ? 'Scroll Left' : 'ବାମକୁ ସ୍କ୍ରୋଲ୍'}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 rounded-lg bg-slate-950/60 border border-white/5 text-slate-450 hover:text-emerald-400 hover:bg-slate-900 transition-all cursor-pointer"
            title={language === 'en' ? 'Scroll Right' : 'ଡାହାଣକୁ ସ୍କ୍ରୋଲ୍'}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Horizontal scroll track */}
      <div 
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent scroll-smooth"
      >
        
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

        {ODISHA_DISTRICTS.map((d) => {
          const detail = DISTRICT_LANDMARKS[d.en] || {
            landmarkEn: 'Scenic Odisha',
            landmarkOr: 'ସୁନ୍ଦର ଓଡ଼ିଶା',
            image: `/districts/${d.en.toLowerCase()}.jpg`
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

        {/* Spacer at the end to ensure the last district is fully visible and has right spacing */}
        <div className="w-4 shrink-0 text-transparent select-none pointer-events-none" aria-hidden="true">.</div>
      </div>
    </div>
  );
}
