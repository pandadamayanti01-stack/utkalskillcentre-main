import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { solveMathDoubt } from '../services/aiService';
import confetti from 'canvas-confetti';
import { CHAPTERS_MAP } from '../data/chaptersMap';
import { Gundulu3DLab } from './Gundulu3DLab';


interface DigitalLibraryViewProps {
  user: any;
  chapters: any[];
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade?: () => void;
  onBack: () => void;
  loadChapters?: (classStr?: string) => Promise<void>;
  onNavigateTo3D?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'gundulu';
  text: string;
}

// Map Class level state board textbooks to gorgeous, premium gradient card metadata
export const CLASS_SUBJECTS: Record<string, Array<{
  key: string;
  labelEn: string;
  labelOr: string;
  gradient: string;
  icon: any;
  color: string;
  coverImage: string;
}>> = {
  "classsishuvatika(anganwadi)": [
    {
      key: "shishu_vatika",
      labelEn: "Shishu Vatika",
      labelOr: "ଶିଶୁ ବାଟିକା",
      gradient: "from-pink-400 via-yellow-300 to-cyan-300",
      icon: Lucide.BookOpen,
      color: "#f472b6",
      coverImage: "/gundulu-rath-crest.png"
    }
  ],
  class1: [
    {
      key: "ganita_khela",
      labelEn: "Ganita Khela",
      labelOr: "ଗଣିତ ଖେଳ",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "jhulana_1",
      labelEn: "Jhulana 1",
      labelOr: "ଝୁଲଣା ୧",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    }
  ],
  class2: [
    {
      key: "maja_majare_ganita",
      labelEn: "Maja Majare Ganita",
      labelOr: "ମଜା ମଜାରେ ଗଣିତ",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "jhulana_2",
      labelEn: "Jhulana 2",
      labelOr: "ଝୁଲଣା ୨",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    }
  ],
  class3: [
    {
      key: "bhasa_mahak_1",
      labelEn: "Bhasa Mahak 1",
      labelOr: "ଭାଷା ମହକ ୧",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    },
    {
      key: "ganita_mela",
      labelEn: "Ganita Mela",
      labelOr: "ଗଣିତ ମେଳା",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "paribesa_patha",
      labelEn: "Paribesa Patha",
      labelOr: "ପରିବେଶ ପାଠ",
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      icon: Lucide.Atom,
      color: "#38bdf8",
      coverImage: "/science_cover.png"
    },
    {
      key: "pallavi",
      labelEn: "Pallavi English",
      labelOr: "Pallavi",
      gradient: "from-purple-500 via-pink-600 to-rose-600",
      icon: Lucide.BookOpen,
      color: "#c084fc",
      coverImage: "/english_cover.png"
    },
    {
      key: "kala_sikhya",
      labelEn: "Art Education",
      labelOr: "କଳା ଶିକ୍ଷା",
      gradient: "from-emerald-400 via-teal-600 to-cyan-600",
      icon: Lucide.Palette,
      color: "#34d399",
      coverImage: "/epe_cover.png"
    },
    {
      key: "sharirika_sikhya",
      labelEn: "Physical Ed & Wellness",
      labelOr: "ଶାରୀରିକ ଶିକ୍ଷା ଏବଂ ସୁସ୍ଥତା",
      gradient: "from-rose-500 via-pink-600 to-orange-500",
      icon: Lucide.Heart,
      color: "#f43f5e",
      coverImage: "/epe_cover.png"
    }
  ],
  class4: [
    {
      key: "ganita_mela",
      labelEn: "Ganita Mela",
      labelOr: "ଗଣିତ ମେଳା",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "bhasa_mahak_2",
      labelEn: "Bhasa Mahak 2",
      labelOr: "ଭାଷା ମହକ ୨",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    },
    {
      key: "paribesa_patha",
      labelEn: "Paribesa Patha",
      labelOr: "ପରିବେଶ ପାଠ",
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      icon: Lucide.Atom,
      color: "#38bdf8",
      coverImage: "/science_cover.png"
    },
    {
      key: "pallavi",
      labelEn: "Pallavi English",
      labelOr: "Pallavi",
      gradient: "from-purple-500 via-pink-600 to-rose-600",
      icon: Lucide.BookOpen,
      color: "#c084fc",
      coverImage: "/english_cover.png"
    },
    {
      key: "kala_sikhya",
      labelEn: "Art Education",
      labelOr: "କଳା ଶିକ୍ଷା",
      gradient: "from-emerald-400 via-teal-600 to-cyan-600",
      icon: Lucide.Palette,
      color: "#34d399",
      coverImage: "/epe_cover.png"
    },
    {
      key: "krida_yoga",
      labelEn: "Sports & Yoga",
      labelOr: "କ୍ରୀଡ଼ା ଓ ଯୋଗ",
      gradient: "from-rose-500 via-pink-600 to-orange-500",
      icon: Lucide.Heart,
      color: "#f43f5e",
      coverImage: "/epe_cover.png"
    }
  ],
  class5: [
    {
      key: "ganita_mela",
      labelEn: "Ganita Mela",
      labelOr: "ଗଣିତ ମେଳା",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "bhasa_mahak_3",
      labelEn: "Bhasa Mahak 3",
      labelOr: "ଭାଷା ମହକ ୩",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    },
    {
      key: "ama_chaturbaswara_pruthibi",
      labelEn: "Our Surrounding World",
      labelOr: "ଆମ ଚର୍ତୁର୍ପାଶ୍ଵର ପୃଥିବୀ",
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      icon: Lucide.Atom,
      color: "#38bdf8",
      coverImage: "/science_cover.png"
    },
    {
      key: "pallavi",
      labelEn: "Pallavi English",
      labelOr: "Pallavi",
      gradient: "from-purple-500 via-pink-600 to-rose-600",
      icon: Lucide.BookOpen,
      color: "#c084fc",
      coverImage: "/english_cover.png"
    },
    {
      key: "kala_sikhya",
      labelEn: "Art Education",
      labelOr: "କଳା ଶିକ୍ଷା",
      gradient: "from-emerald-400 via-teal-600 to-cyan-600",
      icon: Lucide.Palette,
      color: "#34d399",
      coverImage: "/epe_cover.png"
    },
    {
      key: "sharirika_yoga",
      labelEn: "Physical Yoga & Wellness",
      labelOr: "ଶାରୀରିକ ଯୋଗ ଓ ସୁସ୍ଥତା",
      gradient: "from-rose-500 via-pink-600 to-orange-500",
      icon: Lucide.Heart,
      color: "#f43f5e",
      coverImage: "/epe_cover.png"
    }
  ],
  class6: [
    {
      key: "ganita_prakas",
      labelEn: "Ganita Prakas",
      labelOr: "ଗଣିତ ପ୍ରକାଶ",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "sahitya_sudha",
      labelEn: "Sahitya Sudha",
      labelOr: "ସାହିତ୍ୟ ସୁଧା",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    },
    {
      key: "jigyasa",
      labelEn: "Jigyasa Science",
      labelOr: "ଜିଜ୍ଞାସା",
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      icon: Lucide.Atom,
      color: "#38bdf8",
      coverImage: "/science_cover.png"
    },
    {
      key: "samajika_bignana",
      labelEn: "Social Science Study",
      labelOr: "ସାମାଜିକ ବିଜ୍ଞାନ ଅଧ୍ୟୟନ ଭାରତ ଓ ଆମ ପୃଥିବୀ",
      gradient: "from-amber-500 via-orange-600 to-red-600",
      icon: Lucide.Globe,
      color: "#f59e0b",
      coverImage: "/social_science_cover.png"
    },
    {
      key: "jasmine",
      labelEn: "JASMINE English",
      labelOr: "JASMINE",
      gradient: "from-purple-500 via-pink-600 to-rose-600",
      icon: Lucide.BookOpen,
      color: "#c084fc",
      coverImage: "/english_cover.png"
    },

    {
      key: "hindi_kalika",
      labelEn: "Hindi Kalika",
      labelOr: "ହିନ୍ଦୀ କଳିକା",
      gradient: "from-rose-400 via-pink-500 to-red-600",
      icon: Lucide.Languages,
      color: "#f43f5e",
      coverImage: "/hindi_cover.png"
    },
    {
      key: "sanskritakalika_1",
      labelEn: "Sanskritakalika Part 1",
      labelOr: "ସଂସ୍କୃତକଳିକା ଭାଗ - ୧",
      gradient: "from-amber-600 via-orange-500 to-yellow-600",
      icon: Lucide.Award,
      color: "#d97706",
      coverImage: "/sanskrit_cover.png"
    },
    {
      key: "kausala_bodha",
      labelEn: "Kausala Bodha",
      labelOr: "କୌଶଳ ବୋଧ",
      gradient: "from-indigo-500 via-purple-600 to-pink-600",
      icon: Lucide.Cpu,
      color: "#6366f1",
      coverImage: "/skill_cover.png"
    },
    {
      key: "kalakunja",
      labelEn: "Kalakunja Art",
      labelOr: "କଳାକୁଞ୍ଜ",
      gradient: "from-emerald-400 via-teal-600 to-cyan-600",
      icon: Lucide.Palette,
      color: "#34d399",
      coverImage: "/epe_cover.png"
    },
    {
      key: "khela_sikhya",
      labelEn: "Sports Education",
      labelOr: "ଖେଳ ଶିକ୍ଷା",
      gradient: "from-rose-500 via-pink-600 to-orange-500",
      icon: Lucide.Heart,
      color: "#f43f5e",
      coverImage: "/epe_cover.png"
    }
  ],
  class7: [
    {
      key: "ganita_prakas",
      labelEn: "Ganita Prakas",
      labelOr: "ଗଣିତ ପ୍ରକାଶ",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "sahitya_suman",
      labelEn: "Sahitya Suman",
      labelOr: "ସାହିତ୍ୟ ସୁମନ",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    },
    {
      key: "jigyasa",
      labelEn: "Jigyasa Science",
      labelOr: "ଜିଜ୍ଞାସା",
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      icon: Lucide.Atom,
      color: "#38bdf8",
      coverImage: "/science_cover.png"
    },
    {
      key: "samajika_bignana",
      labelEn: "Social Science Study",
      labelOr: "ସାମାଜିକ ବିଜ୍ଞାନ ଅଧ୍ୟୟନ ଭାରତ ଓ ଆମ ପୃଥିବୀ",
      gradient: "from-amber-500 via-orange-600 to-red-600",
      icon: Lucide.Globe,
      color: "#f59e0b",
      coverImage: "/social_science_cover.png"
    },
    {
      key: "jasmine",
      labelEn: "JASMINE English",
      labelOr: "JASMINE",
      gradient: "from-purple-500 via-pink-600 to-rose-600",
      icon: Lucide.BookOpen,
      color: "#c084fc",
      coverImage: "/english_cover.png"
    },

    {
      key: "hindi_kalika",
      labelEn: "Hindi Kalika",
      labelOr: "ହିନ୍ଦୀ କଳିକା",
      gradient: "from-rose-400 via-pink-500 to-red-600",
      icon: Lucide.Languages,
      color: "#f43f5e",
      coverImage: "/hindi_cover.png"
    },
    {
      key: "sanskritakalika_2",
      labelEn: "Sanskritakalika Part 2",
      labelOr: "ସଂସ୍କୃତକଳିକା ଭାଗ - ୨",
      gradient: "from-amber-600 via-orange-500 to-yellow-600",
      icon: Lucide.Award,
      color: "#d97706",
      coverImage: "/sanskrit_cover.png"
    },
    {
      key: "kausala_bodha",
      labelEn: "Kausala Bodha",
      labelOr: "କୌଶଳ ବୋଧ",
      gradient: "from-indigo-500 via-purple-600 to-pink-600",
      icon: Lucide.Cpu,
      color: "#6366f1",
      coverImage: "/skill_cover.png"
    },
    {
      key: "kalakruti",
      labelEn: "Kalakruti Art",
      labelOr: "କଳାକୃତି",
      gradient: "from-emerald-400 via-teal-600 to-cyan-600",
      icon: Lucide.Palette,
      color: "#34d399",
      coverImage: "/epe_cover.png"
    },
    {
      key: "khela_sikhya",
      labelEn: "Sports Education",
      labelOr: "ଖେଳ ଶିକ୍ଷା",
      gradient: "from-rose-500 via-pink-600 to-orange-500",
      icon: Lucide.Heart,
      color: "#f43f5e",
      coverImage: "/epe_cover.png"
    }
  ],
  class8: [
    {
      key: "ganita_prakas",
      labelEn: "Ganita Prakas",
      labelOr: "ଗଣିତ ପ୍ରକାଶ",
      gradient: "from-teal-500 via-emerald-600 to-amber-500",
      icon: Lucide.Binary,
      color: "#34d399",
      coverImage: "/math_cover.png"
    },
    {
      key: "sahitya_surabhi",
      labelEn: "Sahitya Surabhi",
      labelOr: "ସାହିତ୍ୟ ସୁରଭି",
      gradient: "from-orange-400 via-red-500 to-amber-600",
      icon: Lucide.Scroll,
      color: "#fb923c",
      coverImage: "/odia_cover.png"
    },
    {
      key: "jigyasa",
      labelEn: "Jigyasa Science",
      labelOr: "ଜିଜ୍ଞାସା",
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      icon: Lucide.Atom,
      color: "#38bdf8",
      coverImage: "/science_cover.png"
    },
    {
      key: "samajika_bignana",
      labelEn: "Social Science Study",
      labelOr: "ସାମାଜିକ ବିଜ୍ଞାନ ଅଧ୍ୟୟନ ଭାରତ ଓ ଆମ ପୃଥିବୀ",
      gradient: "from-amber-500 via-orange-600 to-red-600",
      icon: Lucide.Globe,
      color: "#f59e0b",
      coverImage: "/social_science_cover.png"
    },
    {
      key: "jasmine",
      labelEn: "JASMINE English",
      labelOr: "JASMINE",
      gradient: "from-purple-500 via-pink-600 to-rose-600",
      icon: Lucide.BookOpen,
      color: "#c084fc",
      coverImage: "/english_cover.png"
    },

    {
      key: "hindi_kalika",
      labelEn: "Hindi Kalika",
      labelOr: "ହିନ୍ଦୀ କଳିକା",
      gradient: "from-rose-400 via-pink-500 to-red-600",
      icon: Lucide.Languages,
      color: "#f43f5e",
      coverImage: "/hindi_cover.png"
    },
    {
      key: "sanskritakalika_3",
      labelEn: "Sanskritakalika Part 3",
      labelOr: "ସଂସ୍କୃତକଳିକା ଭାଗ - ୩",
      gradient: "from-amber-600 via-orange-500 to-yellow-600",
      icon: Lucide.Award,
      color: "#d97706",
      coverImage: "/sanskrit_cover.png"
    },
    {
      key: "kausala_bodha",
      labelEn: "Kausala Bodha",
      labelOr: "କୌଶଳ ବୋଧ",
      gradient: "from-indigo-500 via-purple-600 to-pink-600",
      icon: Lucide.Cpu,
      color: "#6366f1",
      coverImage: "/skill_cover.png"
    },
    {
      key: "kruti",
      labelEn: "Kruti Art",
      labelOr: "କୃତି",
      gradient: "from-emerald-400 via-teal-600 to-cyan-600",
      icon: Lucide.Palette,
      color: "#34d399",
      coverImage: "/skill_cover.png"
    },
    {
      key: "khela_sikhya",
      labelEn: "Sports Education",
      labelOr: "ଖେଳ ଶିକ୍ଷା",
      gradient: "from-rose-500 via-pink-600 to-orange-500",
      icon: Lucide.Heart,
      color: "#f43f5e",
      coverImage: "/epe_cover.png"
    }
  ],
  class9: [
    { key: "algebra", labelEn: "Algebra", labelOr: "ବୀଜଗଣିତ", gradient: "from-teal-500 via-emerald-600 to-amber-500", icon: Lucide.Binary, color: "#34d399", coverImage: "/math_cover.png" },
    { key: "geometry", labelEn: "Geometry", labelOr: "ଜ୍ୟାମିତି", gradient: "from-teal-500 via-emerald-600 to-amber-500", icon: Lucide.Compass, color: "#34d399", coverImage: "/math_cover.png" },
    { key: "physical_science", labelEn: "Physical Science", labelOr: "ଭୌତିକ ବିଜ୍ଞାନ", gradient: "from-cyan-500 via-blue-600 to-indigo-600", icon: Lucide.Atom, color: "#38bdf8", coverImage: "/science_cover.png" },
    { key: "life_science", labelEn: "Life Science", labelOr: "ଜୀବ ବିଜ୍ଞାନ", gradient: "from-cyan-500 via-blue-600 to-indigo-600", icon: Lucide.Leaf, color: "#38bdf8", coverImage: "/science_cover.png" },
    { key: "social_science", labelEn: "History", labelOr: "ଇତିହାସ", gradient: "from-amber-500 via-orange-600 to-red-600", icon: Lucide.Globe, color: "#f59e0b", coverImage: "/social_science_cover.png" },
    { key: "geography", labelEn: "Geography", labelOr: "ଭୂଗୋଳ", gradient: "from-amber-500 via-orange-600 to-red-600", icon: Lucide.Map, color: "#f59e0b", coverImage: "/social_science_cover.png" },
    { key: "english", labelEn: "English Literature", labelOr: "ଇଂରାଜୀ", gradient: "from-purple-500 via-pink-600 to-rose-600", icon: Lucide.BookOpen, color: "#c084fc", coverImage: "/english_cover.png" },
    { key: "english_grammar", labelEn: "English Grammar", labelOr: "ଇଂରାଜୀ ବ୍ୟାକରଣ", gradient: "from-purple-500 via-pink-600 to-rose-600", icon: Lucide.PenTool, color: "#c084fc", coverImage: "/english_cover.png" },
    { key: "odia", labelEn: "Odia Literature", labelOr: "ଓଡ଼ିଆ", gradient: "from-orange-400 via-red-500 to-amber-600", icon: Lucide.Scroll, color: "#fb923c", coverImage: "/odia_cover.png" },
    { key: "odia_grammar", labelEn: "Odia Grammar", labelOr: "ଓଡ଼ିଆ ବ୍ୟାକରଣ", gradient: "from-orange-400 via-red-500 to-amber-600", icon: Lucide.PenTool, color: "#fb923c", coverImage: "/odia_cover.png" },
    { key: "sanskrit", labelEn: "Sanskrit", labelOr: "ସଂସ୍କୃତ", gradient: "from-amber-600 via-orange-500 to-yellow-600", icon: Lucide.Award, color: "#d97706", coverImage: "/sanskrit_cover.png" },
    { key: "sanskrit_grammar", labelEn: "Sanskrit Grammar", labelOr: "ସଂସ୍କୃତ ବ୍ୟାକରଣ", gradient: "from-amber-600 via-orange-500 to-yellow-600", icon: Lucide.PenTool, color: "#d97706", coverImage: "/sanskrit_cover.png" },
    { key: "hindi", labelEn: "Hindi", labelOr: "ହିନ୍ଦୀ", gradient: "from-rose-400 via-pink-500 to-red-600", icon: Lucide.Languages, color: "#f43f5e", coverImage: "/hindi_cover.png" },
    { key: "hindi_grammar", labelEn: "Hindi Grammar", labelOr: "ହିନ୍ଦୀ ବ୍ୟାକରଣ", gradient: "from-rose-400 via-pink-500 to-red-600", icon: Lucide.PenTool, color: "#f43f5e", coverImage: "/hindi_cover.png" }
  ],
  class10: [
    { key: "algebra", labelEn: "Algebra", labelOr: "ବୀଜଗଣିତ", gradient: "from-teal-500 via-emerald-600 to-amber-500", icon: Lucide.Binary, color: "#34d399", coverImage: "/math_cover.png" },
    { key: "geometry", labelEn: "Geometry", labelOr: "ଜ୍ୟାମିତି", gradient: "from-teal-500 via-emerald-600 to-amber-500", icon: Lucide.Compass, color: "#34d399", coverImage: "/math_cover.png" },
    { key: "physical_science", labelEn: "Physical Science", labelOr: "ଭୌତିକ ବିଜ୍ଞାନ", gradient: "from-cyan-500 via-blue-600 to-indigo-600", icon: Lucide.Atom, color: "#38bdf8", coverImage: "/science_cover.png" },
    { key: "life_science", labelEn: "Life Science", labelOr: "ଜୀବ ବିଜ୍ଞାନ", gradient: "from-cyan-500 via-blue-600 to-indigo-600", icon: Lucide.Leaf, color: "#38bdf8", coverImage: "/science_cover.png" },
    { key: "social_science", labelEn: "History", labelOr: "ଇତିହାସ", gradient: "from-amber-500 via-orange-600 to-red-600", icon: Lucide.Globe, color: "#f59e0b", coverImage: "/social_science_cover.png" },
    { key: "geography", labelEn: "Geography", labelOr: "ଭୂଗୋଳ", gradient: "from-amber-500 via-orange-600 to-red-600", icon: Lucide.Map, color: "#f59e0b", coverImage: "/social_science_cover.png" },
    { key: "english", labelEn: "English Literature", labelOr: "ଇଂରାଜୀ", gradient: "from-purple-500 via-pink-600 to-rose-600", icon: Lucide.BookOpen, color: "#c084fc", coverImage: "/english_cover.png" },
    { key: "english_grammar", labelEn: "English Grammar", labelOr: "ଇଂରାଜୀ ବ୍ୟାକରଣ", gradient: "from-purple-500 via-pink-600 to-rose-600", icon: Lucide.PenTool, color: "#c084fc", coverImage: "/english_cover.png" },
    { key: "odia", labelEn: "Odia Literature", labelOr: "ଓଡ଼ିଆ", gradient: "from-orange-400 via-red-500 to-amber-600", icon: Lucide.Scroll, color: "#fb923c", coverImage: "/odia_cover.png" },
    { key: "odia_grammar", labelEn: "Odia Grammar", labelOr: "ଓଡ଼ିଆ ବ୍ୟାକରଣ", gradient: "from-orange-400 via-red-500 to-amber-600", icon: Lucide.PenTool, color: "#fb923c", coverImage: "/odia_cover.png" },
    { key: "sanskrit", labelEn: "Sanskrit", labelOr: "ସଂସ୍କୃତ", gradient: "from-amber-600 via-orange-500 to-yellow-600", icon: Lucide.Award, color: "#d97706", coverImage: "/sanskrit_cover.png" },
    { key: "sanskrit_grammar", labelEn: "Sanskrit Grammar", labelOr: "ସଂସ୍କୃତ ବ୍ୟାକରଣ", gradient: "from-amber-600 via-orange-500 to-yellow-600", icon: Lucide.PenTool, color: "#d97706", coverImage: "/sanskrit_cover.png" },
    { key: "hindi", labelEn: "Hindi", labelOr: "ହିନ୍ଦୀ", gradient: "from-rose-400 via-pink-500 to-red-600", icon: Lucide.Languages, color: "#f43f5e", coverImage: "/hindi_cover.png" },
    { key: "hindi_grammar", labelEn: "Hindi Grammar", labelOr: "ହିନ୍ଦୀ ବ୍ୟାକରଣ", gradient: "from-rose-400 via-pink-500 to-red-600", icon: Lucide.PenTool, color: "#f43f5e", coverImage: "/hindi_cover.png" },
    { key: "vocational", labelEn: "Vocational Studies", labelOr: "ବ୍ୟାବସାୟିକ ଶିକ୍ଷା", gradient: "from-indigo-500 via-purple-600 to-pink-600", icon: Lucide.Cpu, color: "#6366f1", coverImage: "/skill_cover.png" }
  ]
};

const getSubjectFallbackImage = (subKey: string): string => {
  const fallbacks: Record<string, string> = {
    math: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=400&auto=format&fit=crop",
    science: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=400&auto=format&fit=crop",
    social_science: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop",
    english: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop",
    odia: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=400&auto=format&fit=crop",
    epe: "https://images.unsplash.com/photo-1505232458627-a727264d7272?q=80&w=400&auto=format&fit=crop"
  };
  return fallbacks[subKey.toLowerCase()] || "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=400&auto=format&fit=crop";
};

const getClassCode = (cls: string): string => {
  if (!cls) return "class10";
  const num = cls.toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
  return `class${num}`;
};

const getGenerativeBookCover = (subjectKey: string, title: string, idx: number, classCode?: string): string => {
  let meta = {
    gradient: "from-teal-500 via-emerald-600 to-amber-500",
    color: "#34d399"
  };

  const code = classCode || 'class10';
  const subjectsForClass = CLASS_SUBJECTS[code] || CLASS_SUBJECTS.class10;
  const found = subjectsForClass.find(sub => sub.key === subjectKey.toLowerCase() || sub.labelEn.toLowerCase() === subjectKey.toLowerCase() || sub.labelOr.toLowerCase() === subjectKey.toLowerCase());

  if (found) {
    meta = {
      gradient: found.gradient,
      color: found.color
    };
  } else {
    // Fallback if subjectKey is generic like math, science
    if (subjectKey.includes('math') || subjectKey.includes('ganita')) {
      meta = { gradient: "from-teal-500 via-emerald-600 to-amber-500", color: "#34d399" };
    } else if (subjectKey.includes('science') || subjectKey.includes('jigyasa') || subjectKey.includes('bignana')) {
      meta = { gradient: "from-cyan-500 via-blue-600 to-indigo-600", color: "#38bdf8" };
    } else if (subjectKey.includes('social') || subjectKey.includes('samajika')) {
      meta = { gradient: "from-amber-500 via-orange-600 to-red-600", color: "#f59e0b" };
    } else if (subjectKey.includes('english') || subjectKey.includes('pallavi') || subjectKey.includes('jasmine')) {
      meta = { gradient: "from-purple-500 via-pink-600 to-rose-600", color: "#c084fc" };
    } else if (subjectKey.includes('odia') || subjectKey.includes('sahitya') || subjectKey.includes('bhasa') || subjectKey.includes('jhulana')) {
      meta = { gradient: "from-orange-400 via-red-500 to-amber-600", color: "#fb923c" };
    }
  }

  const gradientId = `grad_${subjectKey}_${idx}`;

  const getOdiaNum = (val: string): string => {
    const odiaDigits: Record<string, string> = {
      '0': '୦', '1': '୧', '2': '୨', '3': '୩', '4': '୪',
      '5': '୫', '6': '୬', '7': '୭', '8': '୮', '9': '୯'
    };
    return val.split('').map(char => odiaDigits[char] || char).join('');
  };

  const classNum = classCode ? classCode.replace('class', '') : '10';
  const odiaClassNum = getOdiaNum(classNum);
  const displayClass = `CLASS ${classNum} • ଶ୍ରେଣୀ ${odiaClassNum}`;

  const odiaChapNum = getOdiaNum(String(idx));
  const displayChap = `CH ${idx} • ଅଧ୍ୟାୟ ${odiaChapNum}`;
  const displayTitle = title.length > 22 ? title.substring(0, 19) + "..." : title;

  let decorativePattern = "";
  if (subjectKey === 'math') {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <circle cx="200" cy="180" r="140" />
        <circle cx="200" cy="180" r="90" />
        <line x1="200" y1="40" x2="200" y2="320" />
        <line x1="60" y1="180" x2="340" y2="180" />
        <path d="M 100,80 L 300,280 M 100,280 L 300,80" />
      </g>
    `;
  } else if (subjectKey === 'science') {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <ellipse cx="200" cy="170" rx="130" ry="50" transform="rotate(30 200 170)" />
        <ellipse cx="200" cy="170" rx="130" ry="50" transform="rotate(-30 200 170)" />
        <circle cx="200" cy="170" r="12" fill="white" fill-opacity="0.1" />
        <circle cx="200" cy="170" r="5" fill="white" />
      </g>
    `;
  } else if (subjectKey === 'social_science') {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <circle cx="200" cy="170" r="100" />
        <ellipse cx="200" cy="170" rx="100" ry="35" />
        <ellipse cx="200" cy="170" rx="35" ry="100" />
      </g>
    `;
  } else {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <circle cx="200" cy="170" r="120" stroke-dasharray="4,4" />
        <circle cx="200" cy="170" r="80" />
        <path d="M 140,180 Q 200,160 200,200 Q 200,160 260,180" />
      </g>
    `;
  }

  const colors = meta.gradient.replace('from-', '').replace('via-', '').replace('to-', '').split(' ');
  const startColor = colors[0] === 'teal-500' ? '#0d9488' : colors[0] === 'cyan-500' ? '#0891b2' : colors[0] === 'amber-500' ? '#d97706' : colors[0] === 'purple-500' ? '#9333ea' : colors[0] === 'orange-400' ? '#fb923c' : '#10b981';
  const midColor = colors[1] === 'emerald-600' ? '#059669' : colors[1] === 'blue-600' ? '#2563eb' : colors[1] === 'orange-600' ? '#ea580c' : colors[1] === 'pink-600' ? '#db2777' : colors[1] === 'red-500' ? '#ef4444' : '#047857';
  const endColor = colors[2] === 'amber-500' ? '#f59e0b' : colors[2] === 'indigo-600' ? '#4f46e5' : colors[2] === 'red-600' ? '#dc2626' : colors[2] === 'rose-600' ? '#e11d48' : colors[2] === 'amber-600' ? '#d97706' : '#0e7490';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="50%" stop-color="${midColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>

      <rect width="400" height="533" rx="24" fill="url(#${gradientId})" />
      <rect width="25" height="533" fill="black" fill-opacity="0.15" />
      <line x1="25" y1="0" x2="25" y2="533" stroke="white" stroke-opacity="0.08" stroke-width="1" />

      ${decorativePattern}

      <rect x="40" y="320" width="320" height="170" rx="20" fill="#020617" fill-opacity="0.8" stroke="white" stroke-opacity="0.08" stroke-width="1" />

      <rect x="55" y="345" width="135" height="20" rx="10" fill="white" fill-opacity="0.08" stroke="white" stroke-opacity="0.1" stroke-width="1" />
      <text x="122.5" y="358" fill="#34d399" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" text-anchor="middle">${displayClass}</text>

      <text x="325" y="358" fill="white" fill-opacity="0.5" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" text-anchor="end">${displayChap}</text>

      <text x="60" y="410" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" letter-spacing="-0.5">${displayTitle}</text>
      <text x="60" y="460" fill="white" fill-opacity="0.3" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" letter-spacing="1.5">UTKAL LIBRARY • ଉତ୍କଳ ଲାଇବ୍ରେରୀ</text>
    </svg>
  `;

  // Base64 encode the SVG to support non-ASCII characters (e.g. Odia scripts) and older mobile web browsers safely
  try {
    const utf8Bytes = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    const base64Svg = btoa(utf8Bytes);
    return `data:image/svg+xml;base64,${base64Svg}`;
  } catch (e) {
    console.error("Failed to base64 encode SVG book cover:", e);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
};

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl?: string) => {
  const img = e.currentTarget;
  const currentStep = img.getAttribute('data-err-step') || '0';

  if (currentStep === '0') {
    img.setAttribute('data-err-step', '1');
    if (fallbackUrl) {
      img.src = fallbackUrl;
    } else {
      img.onerror = null;
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    }
  } else {
    img.onerror = null;
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }
};
export const cleanMathNotation = (text: string): string => {
  if (!text) return "";

  let cleaned = text;

  // 1. Replace block math markers $$ ... $$ with bold formulas in blockquotes
  cleaned = cleaned.replace(/\$\$(.*?)\$\$/gs, (_, formula) => {
    return `\n> **${formula.trim()}**\n`;
  });

  // 2. Replace inline math markers $ ... $ with simple bold formulas
  cleaned = cleaned.replace(/\$(.*?)\$/g, (_, formula) => {
    return `**${formula.trim()}**`;
  });

  // 3. Clean up LaTeX formatting commands
  cleaned = cleaned.replace(/\\times/g, "×");
  cleaned = cleaned.replace(/\\div/g, "÷");
  cleaned = cleaned.replace(/\\pm/g, "±");
  cleaned = cleaned.replace(/\\theta/g, "θ");
  cleaned = cleaned.replace(/\\pi/g, "π");
  cleaned = cleaned.replace(/\\alpha/g, "α");
  cleaned = cleaned.replace(/\\beta/g, "β");
  cleaned = cleaned.replace(/\\gamma/g, "γ");
  cleaned = cleaned.replace(/\\delta/g, "δ");
  cleaned = cleaned.replace(/\\lambda/g, "λ");
  cleaned = cleaned.replace(/\\mu/g, "μ");
  cleaned = cleaned.replace(/\\sigma/g, "σ");
  cleaned = cleaned.replace(/\\phi/g, "φ");
  cleaned = cleaned.replace(/\\omega/g, "ω");
  cleaned = cleaned.replace(/\\Omega/g, "Ω");
  cleaned = cleaned.replace(/\\Sigma/g, "Σ");
  cleaned = cleaned.replace(/\\Delta/g, "Δ");
  cleaned = cleaned.replace(/\\triangle/g, "Δ");
  cleaned = cleaned.replace(/\\cdot/g, "·");
  cleaned = cleaned.replace(/\\sqrt\{(.*?)\}/g, "√$1");
  cleaned = cleaned.replace(/\\sqrt/g, "√");
  cleaned = cleaned.replace(/\\le/g, "≤");
  cleaned = cleaned.replace(/\\ge/g, "≥");
  cleaned = cleaned.replace(/\\neq/g, "≠");
  cleaned = cleaned.replace(/\\approx/g, "≈");
  cleaned = cleaned.replace(/\\infty/g, "∞");
  cleaned = cleaned.replace(/\^\\circ/g, "°");
  cleaned = cleaned.replace(/\\circ/g, "°");

  // LaTeX math spacing
  cleaned = cleaned.replace(/\\quad/g, "   ");
  cleaned = cleaned.replace(/\\qquad/g, "      ");
  cleaned = cleaned.replace(/\\[,;!]/g, " ");

  // LaTeX Fraction conversions
  cleaned = cleaned.replace(/\\frac\{(.*?)\}\{(.*?)\}/g, (_, num, den) => {
    const numClean = num.trim();
    const denClean = den.trim();
    const needsParens = (str: string) => /[\s+\-*/=<>]/g.test(str);
    const nStr = needsParens(numClean) ? `(${numClean})` : numClean;
    const dStr = needsParens(denClean) ? `(${denClean})` : denClean;
    return `${nStr}/${dStr}`;
  });

  // 4. Handle curly-braced exponents like 1^{2} or x^{10} to unicode superscripts
  cleaned = cleaned.replace(/(\w+|\([^)]+\))\^\{(.*?)\}/g, (_, base, exp) => {
    const unicodeSuperscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
    };
    let mappedExp = "";
    for (let char of exp) {
      mappedExp += unicodeSuperscripts[char] || char;
    }
    return `${base}${mappedExp}`;
  });

  // 5. Handle simple exponents like x^2 or 1^2 to unicode superscripts
  cleaned = cleaned.replace(/(\w+|\([^)]+\))\^([0-9+\-nxy])/g, (_, base, exp) => {
    const unicodeSuperscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
    };
    return `${base}${unicodeSuperscripts[exp] || ('^' + exp)}`;
  });

  // 6. Handle curly-braced subscripts like a_{1} or x_{2} or a_{n} to unicode subscripts
  cleaned = cleaned.replace(/(\w+)_\{(.*?)\}/g, (_, base, sub) => {
    const unicodeSubscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', 'n': 'ₙ', 'i': 'ᵢ',
      'j': 'ⱼ', 'k': 'ₖ', 'x': 'ₓ', 'y': 'ᵧ'
    };
    let mappedSub = "";
    for (let char of sub) {
      mappedSub += unicodeSubscripts[char] || char;
    }
    return `${base}${mappedSub}`;
  });

  // 7. Handle simple subscripts like a_1 or x_2 or S_n to unicode subscripts
  cleaned = cleaned.replace(/(\w+)_([0-9nixy])/g, (_, base, sub) => {
    const unicodeSubscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      'n': 'ₙ', 'i': 'ᵢ', 'x': 'ₓ', 'y': 'ᵧ'
    };
    return `${base}${unicodeSubscripts[sub] || sub}`;
  });

  // 8. Clean up remaining standalone backslashes or math formatting symbols
  cleaned = cleaned.replace(/\\{/g, "{").replace(/\\}/g, "}");

  return cleaned;
};

const forceGpuCompositingStyle: React.CSSProperties = {
  WebkitBackfaceVisibility: 'hidden',
  backfaceVisibility: 'hidden',
  WebkitTransformStyle: 'preserve-3d',
  transformStyle: 'preserve-3d',
  WebkitPerspective: 1000,
  perspective: 1000,
  WebkitTransform: 'translate3d(0,0,0)',
  transform: 'translate3d(0,0,0)',
};

const reverseKeyMap = (subKey: string): string => {
  const keyMap: Record<string, string[]> = {
    'math': ['ganita', 'math'],
    'odia': ['bhasa', 'sahitya', 'odia', 'jhulana'],
    'evs': ['paribesa', 'chaturbaswara', 'science', 'evs', 'jigyasa'],
    'english': ['english', 'pallavi', 'jasmine'],
    'art': ['kala', 'art', 'kruti'],
    'physical_education': ['sharirika', 'khela', 'krida', 'sports', 'yoga']
  };
  
  const subLower = subKey.toLowerCase();
  for (const [genericKey, patterns] of Object.entries(keyMap)) {
    if (patterns.some(p => subLower.includes(p))) {
      return genericKey;
    }
  }
  return subKey;
};

const getSmartClassChapterName = (chap: any, subKey: string, classStr: string) => {
  if (!chap) return '';
  
  let lookupSub = subKey.toLowerCase();
  
  if (classStr === '9' || classStr === '10') {
    if (lookupSub === 'social_science') {
      lookupSub = 'history';
    }
  } else if (parseInt(classStr, 10) <= 7) {
    lookupSub = reverseKeyMap(lookupSub);
  }
  
  const classChapters = CHAPTERS_MAP[classStr]?.[lookupSub] || [];
  
  const getChapterNumber = (c: any): number => {
    if (typeof c.number === 'number') return c.number;
    if (typeof c.chapterNumber === 'number') return c.chapterNumber;
    if (typeof c.index === 'number') return c.index;

    const titleStr = typeof c.title === 'string' ? c.title : (c.title?.en || c.title?.or || '');
    const titleMatch = titleStr.match(/Chapter[_\-\s]?\s*(\d+)/i) || titleStr.match(/Ch[_\-\s]?\s*(\d+)/i);
    if (titleMatch) return parseInt(titleMatch[1], 10);

    const urlStr = String(c.pdfUrl || c.download_url || c.driveUrl || '');
    const decodedUrl = decodeURIComponent(urlStr);
    const urlMatch = decodedUrl.match(/Chapter[_\-\s]?(\d+)/i) || decodedUrl.match(/Ch[_\-\s]?(\d+)/i);
    if (urlMatch) return parseInt(urlMatch[1], 10);

    if (c.id && !/^[a-zA-Z0-9]{20}$/.test(c.id)) {
      const idMatch = String(c.id).match(/ch[_\-\s]?(\d+)/i);
      if (idMatch) return parseInt(idMatch[1], 10);
    }
    
    // Fallbacks matching generate_roadmap.cjs
    if (titleStr.includes('ସରଳ ସହସମୀକରଣ')) return 1;
    if (titleStr.includes('ଦ୍ଵିଘାତ ସମୀକରଣ')) return 2;
    if (titleStr.includes('ସମାନ୍ତର ପ୍ରଗତି')) return 3;
    if (titleStr.includes('ସ୍ଥାନାଙ୍କ ଜ୍ୟାମିତି')) return 4;
    if (titleStr.includes('ସମ୍ଭାବ୍ୟତା')) return 5;
    if (titleStr.includes('ପରିସଂଖ୍ୟାନ')) return 6;
    
    if (titleStr.includes('ଜ୍ୟାମିତିରେ ସାଦୃଶ୍ୟ')) return 1;
    if (titleStr.includes('Circle') || titleStr.includes('ବୃତ୍ତ')) return 2;
    if (titleStr.includes('Construction') || titleStr.includes('ଅଙ୍କନ')) return 3;
    if (titleStr.includes('Mensuration') || titleStr.includes('ପରିମିତି')) return 4;

    return 999;
  };

  const chapNum = getChapterNumber(chap);
  if (chapNum === 999) return '';

  const foundChapter = classChapters.find(chName => {
    const chMatch = chName.match(/^Chapter\s*(\d+)/i) || chName.match(/^Class\d+_Ch(\d+)/i) || chName.match(/_Ch(\d+)/i);
    if (chMatch) {
      return parseInt(chMatch[1], 10) === chapNum;
    }
    return false;
  });

  return foundChapter || '';
};


export const DigitalLibraryView: React.FC<DigitalLibraryViewProps> = ({
  user,
  chapters,
  language,
  isPremium,
  onUpgrade,
  onBack,
  loadChapters,
  onNavigateTo3D
}) => {
  const isFreePeriod = new Date() < new Date('2026-06-20T17:00:00+05:30');
  const isTutorUnlocked = isPremium || isFreePeriod;

  // Navigation states: 'subjects' -> 'chapters' -> 'reader'
  const [currentView, setCurrentView] = useState<'subjects' | 'chapters' | 'reader'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  const [useDirectViewer, setUseDirectViewer] = useState<boolean>(false);

  useEffect(() => {
    setUseDirectViewer(false);
  }, [selectedChapter]);

  // Selected class (Classes 1 to 10), defaulting to student's profile class or Class 10
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (user?.class) {
      return user.class.toString().toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
    }
    return '10';
  });

  // Dynamic list of active textbooks/subjects based on selected class
  const activeClassCode = `class${selectedClass}`;
  const activeSubjects = useMemo(() => {
    return CLASS_SUBJECTS[activeClassCode] || CLASS_SUBJECTS.class10;
  }, [selectedClass]);

  // Keep selectedClass synchronized with user's registered class profile for students (admins and teachers can switch classes)
  useEffect(() => {
    if (user?.class && user.role !== 'admin' && user.role !== 'teacher') {
      const cleanCls = user.class.toString().toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
      setSelectedClass(cleanCls);
    }
  }, [user?.class, user?.role]);

  const effectivePdfUrl = selectedChapter ? (selectedChapter.pdfUrl || selectedChapter.download_url || selectedChapter.driveUrl || '') : '';

  // Material reader settings
  const [readerMode, setReaderMode] = useState<'notes' | 'pdf' | 'video' | '3d'>('notes');
  const [personalNotes, setPersonalNotes] = useState<string>('');
  const [isNotepadSaved, setIsNotepadSaved] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isChapterNotesUnlocked, setIsChapterNotesUnlocked] = useState<boolean>(false);
  const [chapterVideos, setChapterVideos] = useState<any[]>([]);
  const [isVideosLoading, setIsVideosLoading] = useState<boolean>(false);
  const [activeVideoIdx, setActiveVideoIdx] = useState<number>(0);

  // Eye Care States
  const [eyeCareMode, setEyeCareMode] = useState<'off' | 'sepia' | 'dim'>('off');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isPdfFullScreen, setIsPdfFullScreen] = useState<boolean>(false);
  const [isChatFullScreen, setIsChatFullScreen] = useState<boolean>(false);
  const [isGunduluOpen, setIsGunduluOpen] = useState<boolean>(false);

  // Gundulu chat states
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleShareToUnlock = async () => {
    if (!selectedChapter) return;

    const inviteText = language === 'en'
      ? `Hey friends! I am revising "${selectedChapter.title}" in our Digital Library on the Utkal Skill Centre app! 📚 Gundulu AI explains everything so easily with beautiful notes & formulas! Check it out here: https://utkalskillcentre.com`
      : `ହେଲୋ ସାଙ୍ଗମାନେ! ମୁଁ ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର୍ ଆପ୍‌ରେ ଆମର ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀରୁ "${selectedChapter.title}" ର ନୋଟ୍ସ ପଢୁଛି! 📚 ଗୁନ୍ଦୁଲୁ AI ବହୁତ ସହଜରେ ସବୁ ସୂତ୍ର ଏବଂ ସାରାଂଶ ବୁଝାଇ ଦେଉଛି। ମାଗଣାରେ ପଢ଼ିବା ପାଇଁ ଏଠାରେ କ୍ଲିକ୍ କରନ୍ତୁ: https://utkalskillcentre.com`;

    try {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(inviteText)}`;
      window.open(whatsappUrl, '_blank');

      // Mark as unlocked
      localStorage.setItem(`unlocked_notes_${selectedChapter.id}`, 'true');
      setIsChapterNotesUnlocked(true);

      // Blast celebratory premium confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#fbbf24', '#ec4899', '#f43f5e']
      });
    } catch (err) {
      console.log("Sharing failed or cancelled:", err);
    }
  };

  // Load / Save student notes in real-time
  useEffect(() => {
    if (selectedChapter) {
      const savedNotes = localStorage.getItem(`digilib_notes_${user?.id}_${selectedChapter.id}`);
      setPersonalNotes(savedNotes || '');
      setIsNotepadSaved(true);
      setActiveVideoIdx(0);

      const notesUnlocked = localStorage.getItem(`unlocked_notes_${selectedChapter.id}`) === 'true';
      setIsChapterNotesUnlocked(notesUnlocked);

      // Reset chatbot to initial greeting
      const greetEn = `Namaskar! Mu Gundulu. 🦜 I am your AI study companion for this chapter: "${selectedChapter.title}". Ask me any math formulas, definitions, or click the suggestions below! How can I help you today? ✨`;
      const greetOr = `ନମସ୍କାର! ମୁଁ ଗୁନ୍ଦୁଲୁ। 🦜 ଆଜି ଆମେ ଏହି ଅଧ୍ୟାୟ ପଢ଼ିବା: "${selectedChapter.title}"। ଏହି ଅଧ୍ୟାୟର କୌଣସି ପ୍ରଶ୍ନ ବା ସୂତ୍ର ବୁଝିବା ପାଇଁ ମୋତେ ପଚାରନ୍ତୁ, ମୁଁ ସାହାଯ୍ୟ କରିବି! ✨`;
      setChatMessages([
        {
          id: 'initial',
          sender: 'gundulu',
          text: language === 'en' ? greetEn : greetOr
        }
      ]);
    }
  }, [selectedChapter, language, user?.id]);

  useEffect(() => {
    setChapterVideos([]);
  }, [selectedChapter, selectedSubject, selectedClass]);

  // Scroll window and scrollable dashboard containers to top on view changes (prevent SPA bottom landing)
  useEffect(() => {
    window.scrollTo(0, 0);
    const scrollableContainers = document.querySelectorAll('.overflow-y-auto, .scrollbar-hide');
    scrollableContainers.forEach(container => {
      container.scrollTop = 0;
    });
  }, [currentView, selectedSubject, selectedChapter]);

  // Hide bottom tab bar in full screen modes to prevent overlays/double-scrolling
  useEffect(() => {
    if (isPdfFullScreen || isChatFullScreen) {
      document.body.classList.add('fullscreen-mode');
    } else {
      document.body.classList.remove('fullscreen-mode');
    }
    return () => {
      document.body.classList.remove('fullscreen-mode');
    };
  }, [isPdfFullScreen, isChatFullScreen]);

  // Handle auto-saving notes after short typing delays (debounce)
  useEffect(() => {
    if (!selectedChapter) return;
    setIsNotepadSaved(false);

    const saveTimeout = setTimeout(() => {
      localStorage.setItem(`digilib_notes_${user?.id}_${selectedChapter.id}`, personalNotes);
      setIsNotepadSaved(true);
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [personalNotes]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, isAiLoading]);

  // Filter Chapters based on selectedSubject and Selected Class (Classes 1 to 10)
  const filteredChapters = useMemo(() => {
    if (!selectedSubject) return [];
    const matched = chapters.filter((c: any) => {
      // Robust class matching (e.g., matching 'class10', '10', 'Class 10', '10th')
      const cleanClass = (cls: string) => {
        if (!cls) return '';
        return cls.toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
      };
      const targetClass = selectedClass || (user?.class ? cleanClass(user.class) : '10');
      const classMatches = cleanClass(c.class) === targetClass;
      if (!classMatches) return false;

      // Robust subject matching matching either direct keys, english names, or odia titles
      const cleanSub = (s: string) => {
        if (!s) return '';
        let cleaned = s.toLowerCase();
        // Remove brackets, parentheses and any contents inside them
        cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
        cleaned = cleaned.replace(/\([^)]*\)/g, '');
        return cleaned.trim().replace(/[\s\-_]+/g, '') || '';
      };
      const cSub = cleanSub(c.subject);

      const matchedMeta = activeSubjects.find(sub => sub.key === selectedSubject);
      if (!matchedMeta) return false;

      const matchesSubjectName =
        cSub === cleanSub(matchedMeta.key) ||
        cSub === cleanSub(matchedMeta.labelEn) ||
        cSub === cleanSub(matchedMeta.labelOr);

      // Parent category fallback matching:
      let matchesGenericFallback = false;
      const mKey = matchedMeta.key;
      
      if (mKey === 'algebra') {
        matchesGenericFallback = cSub === 'algebra' || cSub === 'algebraicequations';
      } else if (mKey === 'geometry') {
        matchesGenericFallback = cSub === 'geometry';
      } else if (mKey === 'physical_science') {
        matchesGenericFallback = cSub === 'physicalscience';
      } else if (mKey === 'life_science') {
        matchesGenericFallback = cSub === 'lifescience';
      } else if (mKey.includes('grammar')) {
        matchesGenericFallback = cSub.includes(mKey.replace('_', ''));
      } else if (mKey.includes('ganita') || mKey.includes('math')) {
        matchesGenericFallback = cSub.includes('math') || cSub.includes('ganita') || cSub === 'algebra' || cSub === 'geometry' || cSub === 'algebraicequations';
      } else if (mKey.includes('samajika') || mKey.includes('social')) {
        matchesGenericFallback = cSub.includes('social') || cSub.includes('samajika') || cSub === 'history' || cSub.includes('geography') || cSub.includes('itihasa') || cSub.includes('bhugola');
      } else if (mKey.includes('jigyasa') || mKey.includes('science') || mKey.includes('paribesa') || mKey.includes('bignana')) {
        matchesGenericFallback = (cSub.includes('science') || cSub.includes('bignana') || cSub === 'paribesapatha' || cSub === 'jigyasa' || cSub === 'physicalscience' || cSub === 'lifescience' || cSub === 'science_curiosity') && !cSub.includes('social') && !cSub.includes('samajika');
      } else if (mKey.includes('sahitya') || mKey.includes('jhulana') || mKey.includes('bhasa') || mKey.includes('odia')) {
        matchesGenericFallback = (cSub.includes('odia') || cSub === 'jhulana' || cSub === 'bhasamahak' || cSub.includes('sahitya')) && !cSub.includes('grammar');
      } else if (mKey.includes('pallavi') || mKey.includes('jasmine') || mKey.includes('english')) {
        matchesGenericFallback = (cSub.includes('english') || cSub === 'pallavi' || cSub === 'jasmine') && !cSub.includes('grammar');
      } else if (mKey.includes('sanskrit')) {
        matchesGenericFallback = (cSub.includes('sanskrit') || cSub === 'sanskrutasourav') && !cSub.includes('grammar');
      } else if (mKey.includes('talas') || mKey.includes('hindi')) {
        matchesGenericFallback = (cSub.includes('hindi') || cSub === 'talas') && !cSub.includes('grammar');
      } else if (mKey.includes('vocational') || mKey.includes('kausala')) {
        matchesGenericFallback = cSub.includes('vocational') || cSub.includes('kausala');
      }

      const subjectMatches = matchesSubjectName || matchesGenericFallback;
      // Ensure only published ones show
      return subjectMatches && c.status === 'published';
    });

    // Remove duplicates based on ID first, then title (case insensitive and trimmed)
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const uniqueChapters = matched.filter((c: any) => {
      if (!c.id || seenIds.has(c.id)) return false;
      seenIds.add(c.id);

      let titleStr = '';
      if (typeof c.title === 'string') {
        titleStr = c.title;
      } else if (c.title && typeof c.title === 'object') {
        titleStr = c.title.en || c.title.or || '';
      }

      const normalizedTitle = titleStr.toLowerCase().trim();
      if (normalizedTitle && seenTitles.has(normalizedTitle)) {
        console.log("Debug: Filtering out duplicate chapter by title:", c.title, "ID:", c.id);
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    });

    const getChapterNumber = (c: any): number => {
      if (typeof c.number === 'number') return c.number;
      if (typeof c.chapterNumber === 'number') return c.chapterNumber;
      if (typeof c.index === 'number') return c.index;

      const titleStr = typeof c.title === 'string' ? c.title : (c.title?.en || c.title?.or || '');
      const titleMatch = titleStr.match(/Chapter[_\-\s]?\s*(\d+)/i) || titleStr.match(/Ch[_\-\s]?\s*(\d+)/i);
      if (titleMatch) return parseInt(titleMatch[1], 10);

      const urlStr = String(c.pdfUrl || c.download_url || c.driveUrl || '');
      const decodedUrl = decodeURIComponent(urlStr);
      const urlMatch = decodedUrl.match(/Chapter[_\-\s]?(\d+)/i) || decodedUrl.match(/Ch[_\-\s]?(\d+)/i);
      if (urlMatch) return parseInt(urlMatch[1], 10);

      if (c.id && !/^[a-zA-Z0-9]{20}$/.test(c.id)) {
        const idMatch = String(c.id).match(/ch[_\-\s]?(\d+)/i);
        if (idMatch) return parseInt(idMatch[1], 10);
      }

      return 999;
    };

    return uniqueChapters.sort((a, b) => {
      const numA = getChapterNumber(a);
      const numB = getChapterNumber(b);
      if (numA !== numB) {
        return numA - numB;
      }
      const titleA = (typeof a.title === 'string' ? a.title : (a.title?.en || a.title?.or || '')).toLowerCase();
      const titleB = (typeof b.title === 'string' ? b.title : (b.title?.en || b.title?.or || '')).toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [chapters, selectedSubject, selectedClass, user?.class, activeSubjects]);

  // AI Notes Generator states & handler
  const [generatedNotes, setGeneratedNotes] = useState<string>('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState<boolean>(false);

  // Clear generated notes when selected chapter changes
  useEffect(() => {
    setGeneratedNotes('');
  }, [selectedChapter]);

  const handleGenerateAiNotes = async () => {
    if (!selectedChapter) return;
    setIsGeneratingNotes(true);
    try {
      const prompt = `Please generate high-quality, comprehensive, and clear student study notes for the textbook chapter: "${selectedChapter.title}" in the subject of "${selectedChapter.subject || selectedSubject || 'Mathematics'}". 
Include:
1. Core concepts explained simply with bullet points.
2. Crucial formulas, theorems, or laws clearly highlighted in LaTeX / markdown format.
3. At least 2 step-by-step worked out example problems.
4. Quick revision shortcuts or hints.

Write the notes primarily in beautiful, structured markdown, and make them bilingual-friendly (Odia and English mixed) so that an Odia medium student can easily understand all terms. Start directly with the chapter header and notes.`;

      const response = await solveMathDoubt(
        prompt,
        language,
        undefined,
        `Class ${selectedClass}`,
        `You are Gundulu, the expert educational content writer for Utkal Skill Centre. Generate beautifully-structured academic notes.`,
        []
      );

      // Save directly to Firestore under chapters collection
      const chapterDoc = doc(db, 'chapters', selectedChapter.id);
      await updateDoc(chapterDoc, { notes: response });

      // Update local state and the selected chapter reference locally as well
      setGeneratedNotes(response);
      selectedChapter.notes = response;

      alert(language === 'en' ? 'AI Notes Generated and Saved successfully for all students! ✨' : 'AI ନୋଟ୍ସ ସଫଳତାର ସହ ପ୍ରସ୍ତୁତ ଏବଂ ସମସ୍ତ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ସେଭ୍ ହୋଇଗଲା! ✨');
    } catch (err) {
      console.error("AI Notes generation failed:", err);
      alert("Failed to generate and save AI notes. Please try again!");
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Send message to Gundulu AI Tutor
  const handleSendToGundulu = async (text: string) => {
    if (!text.trim() || isAiLoading || !selectedChapter) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsAiLoading(true);
    try {
      // Construct background context from current chapter notes
      const chapterContext = `
The student is currently reading the chapter: "${selectedChapter.title}".
Here is the official reference study guide for this chapter:
---
${selectedChapter.notes || 'No reference content uploaded.'}
---
Instructions:
1. You are Gundulu, the loving elder sister (Gundulu Apa) and friendly AI tutor of Utkal Skill Centre.
2. Tutor the student step-by-step based primarily on the chapter reference guide above. Speak with the affectionate, warm care of an older sister.
3. Keep your answers supportive, visual, and highly academic. Use bilingual friendly explanations.
4. If the student asks you for an MCQ test or quiz, start an interactive, engaging quiz: ask exactly one premium MCQ question at a time (with options labeled a, b, c, d), wait for their answer, provide friendly feedback on whether they got it right or wrong with a quick educational explanation, and then proceed to ask the next unique question. Do NOT repeat any questions that are already present in the chat history.
`;

      const response = await solveMathDoubt(
        text,
        language,
        undefined,
        user?.class || 'Class 10',
        chapterContext,
        chatMessages,
        selectedSubject
      );

      const gMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'gundulu',
        text: response
      };
      setChatMessages(prev => [...prev, gMsg]);
    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString() + '_err',
        sender: 'gundulu',
        text: language === 'en'
          ? "Oops! I hit a small speedbump trying to fetch that answer. Could you ask me again? 🐾"
          : "ଓହୋ! ମୋର ସର୍ଭର କନେକ୍ସନରେ ସାମାନ୍ୟ ସମସ୍ୟା ହେଲା। ଦୟାକରି ଆଉଥରେ ପଚାରନ୍ତୁ! 🐾"
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={forceGpuCompositingStyle} className="w-full flex flex-col pb-24 font-sans relative overflow-x-hidden">
      {/* Dynamic SEO Metadata */}
      {(() => {
        const grade = user?.class || '10'; // Fallback to Class 10 if not logged in or class not defined
        const gradeInt = parseInt(grade.toString().toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', ''), 10) || 10;

        let title = language === 'en' ? 'Digital Library | Utkal Skill Centre' : 'ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ | ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର';
        let desc = language === 'en'
          ? `Access complete school textbooks, chapter solutions, MCQs, study notes, and AI support for Classes 1 to 10 in Odia on Utkal Skill Centre.`
          : `ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ୧ ରୁ ୧୦ ଶ୍ରେଣୀ ପାଇଁ ଓଡ଼ିଆ ମିଡିୟମ୍ ସ୍କୁଲ୍ ବହି, ସମାଧାନ, MCQ ଏବଂ ଏଆଇ ଶିକ୍ଷକ ଗୁନ୍ଦୁଲୁ ସହ ପାଠପଢ଼ନ୍ତୁ।`;

        let schemaData: any = null;

        if (selectedSubject && !selectedChapter) {
          const subMeta = activeSubjects.find(sub => sub.key === selectedSubject);
          const subjectLabel = subMeta ? (language === 'en' ? subMeta.labelEn : subMeta.labelOr) : selectedSubject;
          title = `Class ${grade} ${subjectLabel} Odia Medium Textbook Solutions & Tests | Utkal Skill Centre`;
          desc = language === 'en'
            ? `Study Class ${grade} ${subjectLabel} on Utkal Skill Centre. Includes interactive Odia medium chapter guides, mock tests, and daily MCQs.`
            : `ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ଶ୍ରେଣୀ ${grade} ${subjectLabel} ବହି, ପ୍ରଶ୍ନର ଉତ୍ତର, ମକ ଟେଷ୍ଟ ଏବଂ MCQ ଅଭ୍ୟାସ କରନ୍ତୁ।`;

          schemaData = {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": `Class ${grade} ${subjectLabel} - Odia Medium`,
            "description": desc,
            "provider": {
              "@type": "EducationalOrganization",
              "name": "Utkal Skill Centre",
              "sameAs": "https://utkalskillcentre.com"
            },
            "educationalLevel": `Class ${grade}`,
            "typicalAgeRange": gradeInt <= 5 ? "6-11" : gradeInt <= 8 ? "11-14" : "14-16"
          };
        } else if (selectedChapter) {
          const subjectLabel = selectedChapter.subject || selectedSubject || '';
          title = `Class ${grade} ${subjectLabel} - ${selectedChapter.title} Guides & MCQs | Utkal Skill Centre`;
          
          schemaData = {
            "@context": "https://schema.org",
            "@type": "Book",
            "name": `Class ${grade} ${subjectLabel} Solutions - ${selectedChapter.title}`,
            "bookFormat": "https://schema.org/EBook",
            "publisher": {
              "@type": "EducationalOrganization",
              "name": "Utkal Skill Centre"
            },
            "educationalAlignment": {
              "@type": "AlignmentObject",
              "alignmentType": "educationalLevel",
              "educationalFramework": "Odisha School Education Board",
              "targetName": `Class ${grade}`
            },
            "typicalAgeRange": gradeInt === 1 ? "6-7" : gradeInt === 2 ? "7-8" : gradeInt === 3 ? "8-9" : gradeInt === 4 ? "9-10" : gradeInt === 5 ? "10-11" : gradeInt === 6 ? "11-12" : gradeInt === 7 ? "12-13" : gradeInt === 8 ? "13-14" : gradeInt === 9 ? "14-15" : "15-16"
          };
        } else {
          // General library listing page
          schemaData = {
            "@context": "https://schema.org",
            "@type": "EducationalWebSite",
            "name": "Utkal Skill Centre Digital Library",
            "description": desc,
            "url": "https://utkalskillcentre.com/digital-library",
            "educationalLevel": "Classes 1 to 10"
          };
        }

        return (
          <Helmet>
            <title>{title}</title>
            <meta name="description" content={desc} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={desc} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={window.location.href} />
            {schemaData && (
              <script type="application/ld+json">
                {JSON.stringify(schemaData)}
              </script>
            )}
          </Helmet>
        );
      })()}
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-emerald-950/10 blur-[60px] md:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-teal-950/10 blur-[60px] md:blur-[120px] pointer-events-none" />

      {/* HEADER BAR */}
      <div className="w-full max-w-7xl mx-auto px-4 py-3 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Lucide.Library size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 bg-clip-text text-transparent">
              {language === 'en' ? 'Digital Library' : 'ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ'}
            </h1>
            
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentView === 'reader') {
                setCurrentView('chapters');
                setSelectedChapter(null);
              } else if (currentView === 'chapters') {
                setCurrentView('subjects');
                setSelectedSubject('');
              } else {
                onBack();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-black transition-all active:scale-95"
          >
            <Lucide.ArrowLeft size={16} />
            <span>{language === 'en' ? 'Back' : 'ଫେରିଯାଆନ୍ତୁ'}</span>
          </button>
        </div>
      </div>

      {/* VIEW CONTAINER */}
      <div className="w-full max-w-7xl mx-auto px-4 py-4 flex-1 flex flex-col justify-center relative z-10">

        {/* VIEW 1: SUBJECT TEXTBOOK SELECTOR */}
        {currentView === 'subjects' && (
          <div style={forceGpuCompositingStyle} className="flex-1 flex flex-col">
            {/* Elegant Compact Digital Library Header */}
            <div className="text-center max-w-2xl mx-auto mb-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm">
                <Lucide.Sparkles size={12} className="text-amber-400 animate-pulse" />
                <span>{language === 'en' ? 'USC Digital Library' : 'ଉତ୍କଳ ଡିଜିଟାଲ୍ ପାଠାଗାର'}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                {language === 'en' ? 'Choose a Subject Textbook' : 'ଆପଣଙ୍କର ପାଠ୍ୟପୁସ୍ତକ ବାଛନ୍ତୁ'}
              </h2>
            </div>

            {/* Premium Class Selector Pill-Bar (Only visible to Admins & Teachers) */}
            {(user?.role === 'admin' || user?.role === 'teacher') && (
              <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto pb-4 mb-8 max-w-5xl mx-auto scrollbar-thin scrollbar-thumb-emerald-500/10 scrollbar-track-transparent">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((clsNum) => {
                  const isActive = selectedClass === clsNum;
                  return (
                    <button
                      key={clsNum}
                      type="button"
                      onClick={() => setSelectedClass(clsNum)}
                      className={`shrink-0 px-4 py-2.5 rounded-2xl text-[11px] font-black tracking-wide transition-all duration-200 active:scale-95 border ${isActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border-emerald-400/20'
                        : 'bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-white border-white/5 hover:border-emerald-500/25'
                        }`}
                    >
                      {language === 'en' ? `Class ${clsNum}` : `${clsNum} ଶ୍ରେଣୀ`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* HOLOGRAPHIC SUBJECT CAROUSEL */}
            <div className="relative w-full pb-8">
              {/* Fade masks for edges */}
              <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-[#0b0f19] to-transparent z-10 pointer-events-none" />
              <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-[#0b0f19] to-transparent z-10 pointer-events-none" />
              
              <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 md:px-8 pt-4 pb-12 w-full mx-auto" style={{ scrollBehavior: 'smooth' }}>
                {activeSubjects.map((meta, index) => {
                  const Icon = meta.icon;
                  const subKey = meta.key;
                  const targetClassCode = `class${selectedClass}`;
                  const classSpecificCover = `/${targetClassCode}_${subKey}_cover.png`;

                  return (
                    <motion.div
                      key={subKey}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, rotateY: 5, rotateX: 2, y: -10 }}
                      className="snap-center shrink-0 w-72 md:w-80 relative rounded-3xl border-2 border-amber-500/30 flex flex-col cursor-pointer group hover:border-amber-500 transition-all duration-300 min-h-[380px]"
                      onClick={() => {
                        setSelectedSubject(subKey);
                        setCurrentView('chapters');
                      }}
                      style={{ perspective: 1000 }}
                    >
                      {/* Holographic Inner Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      
                      {/* Cover Image Top Section */}
                      <div className="h-48 w-full relative overflow-hidden bg-slate-950/50 rounded-t-3xl border-b border-white/5">
                        <img
                          src={classSpecificCover}
                          alt={meta.labelEn}
                          onError={(e) => {
                            const img = e.currentTarget;
                            const step = img.getAttribute('data-err-step') || '0';
                            if (step === '0') {
                              img.setAttribute('data-err-step', '1');
                              img.src = window.location.origin + meta.coverImage;
                            } else {
                              img.onerror = null;
                              img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-70 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/40 to-transparent pointer-events-none" />

                        </div>

                      {/* Floating Subject Icon Badge */}
                      <div className={`absolute top-[164px] left-6 p-4 rounded-2xl bg-gradient-to-br ${meta.gradient} text-white shadow-[0_10px_20px_rgba(0,0,0,0.5)] ring-4 ring-[#0b0f19] transform group-hover:scale-110 transition-transform duration-500 z-20`}>
                        <Icon size={24} />
                      </div>

                      {/* Content Section */}
                      <div className="p-6 pt-10 flex-1 flex flex-col justify-between relative z-10">
                        <div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm inline-block">
                            {language === 'en' ? 'Digital Textbook' : 'ଡିଜିଟାଲ୍ ପାଠ୍ୟପୁସ୍ତକ'}
                          </span>
                          <h3 className="text-xl font-extrabold !text-slate-900 group-hover:!text-emerald-600 transition-colors mt-3 leading-tight">
                            {language === 'en' ? meta.labelEn : meta.labelOr}
                          </h3>
                          <p className="text-sm !text-slate-600 mt-1 font-bold">
                            {language === 'en' ? meta.labelOr : meta.labelEn}
                          </p>
                        </div>

                        {/* Footer Progress & Enter Button */}
                        <div className="pt-5 mt-4 border-t border-white/5 flex items-center justify-between">
                          <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1.5 font-bold">
                            <Lucide.BookOpen size={14} className="text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                            <span>{language === 'en' ? 'BSE Odisha' : 'BSE ଓଡ଼ିଶା'}</span>
                          </span>
                          <div className="p-3 rounded-2xl bg-white/5 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <Lucide.ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CHAPTERS DIRECTORY LIST */}
        {currentView === 'chapters' && (
          <div style={forceGpuCompositingStyle} className="flex-1 flex flex-col">
            {(() => {
              const currentMeta = activeSubjects.find(sub => sub.key === selectedSubject) || {
                gradient: 'from-emerald-600 to-teal-800',
                icon: Lucide.BookOpen,
                labelEn: 'Textbook',
                labelOr: 'ପାଠ୍ୟପୁସ୍ତକ'
              };
              return (
                <div className={`w-full rounded-3xl p-6 md:p-10 bg-gradient-to-br ${currentMeta.gradient} mb-8 shadow-2xl relative overflow-hidden ring-1 ring-white/10`}>
                  {/* Holographic glowing orbs */}
                  <motion.div 
                    animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                    className="absolute -top-20 -left-20 w-64 h-64 bg-white/20 rounded-full blur-[40px] md:blur-[80px] pointer-events-none" 
                  />
                  <motion.div 
                    animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
                    transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-20 -right-20 w-80 h-80 bg-black/20 rounded-full blur-[40px] md:blur-[80px] pointer-events-none" 
                  />
                  
                  <div className="absolute right-6 bottom-[-20%] opacity-20 text-white pointer-events-none transform -rotate-12">
                    {React.createElement(currentMeta.icon, { size: 180 })}
                  </div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-sm">
                    <div>
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/20 border border-white/20 text-white shadow-inner backdrop-blur-md">
                        {user?.class ? user.class.toUpperCase() : 'BSE ODISHA'}
                      </span>
                      <h2 className="text-3xl md:text-5xl font-black text-white mt-4 tracking-tight" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                        {language === 'en' ? currentMeta.labelEn : currentMeta.labelOr}
                      </h2>
                      <p className="text-sm md:text-base text-white/90 mt-2 font-medium max-w-lg leading-relaxed">
                        {language === 'en'
                          ? 'Immersive holographic chapters & Gundulu study notes await.'
                          : 'ମୂଳ ବିଷୟବସ୍ତୁ ପଢ଼ନ୍ତୁ କିମ୍ବା ଆମର ସରଳୀକୃତ ଦ୍ୱିଭାଷୀ ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ ବ୍ୟବହାର କରନ୍ତୁ।'}
                      </p>
                    </div>
                    <div className="text-left md:text-right bg-black/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                      <span className="text-4xl md:text-5xl font-black text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>{filteredChapters.length}</span>
                      <p className="text-[10px] text-white/80 uppercase font-black tracking-widest mt-1">
                        {language === 'en' ? 'Chapters Live' : 'ଅଧ୍ୟାୟ ପ୍ରକାଶିତ'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CHAPTERS DIRECTORY CONTAINER */}
            {filteredChapters.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full py-20 flex flex-col items-center justify-center text-center bg-slate-900/40 border border-dashed border-white/10 rounded-3xl backdrop-blur-md"
              >
                <div className="p-5 rounded-3xl bg-slate-800 text-slate-500 mb-5 shadow-inner">
                  <Lucide.BookOpenCheck size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-300">
                  {language === 'en' ? 'Chapters Uploading Soon!' : 'ଅଧ୍ୟାୟ ଶୀଘ୍ର ଉପଲବ୍ଧ ହେବ!'}
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  {language === 'en'
                    ? 'Our teachers are currently preparing premium bilingually mapped materials for this textbook.'
                    : 'ଏହି ପାଠ୍ୟପୁସ୍ତକ ପାଇଁ ଆମର ଶିକ୍ଷକମାନେ ଖୁବ୍ ଶୀଘ୍ର ସରଳ ଦ୍ୱିଭାଷୀ ଅଧ୍ୟାୟ ପ୍ରକାଶ କରିବାକୁ ଯାଉଛନ୍ତି।'}
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-10">
                {filteredChapters.map((chap, idx) => (
                  <motion.div
                    key={chap.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => {
                      setSelectedChapter(chap);
                      setCurrentView('reader');
                      setReaderMode((chap.pdfUrl || chap.download_url || chap.driveUrl) ? 'pdf' : 'notes');
                    }}
                    className="p-5 rounded-3xl bg-slate-900/60 backdrop-blur-md md:backdrop-blur-xl border border-white/5 hover:border-emerald-500/30 flex items-center justify-between cursor-pointer group transition-all shadow-lg hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)] relative overflow-hidden"
                  >
                    {/* Hover Glow Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="flex items-center gap-5 relative z-10">
                      {/* Chapter Thumbnail Book Cover */}
                      {chap.coverUrl && chap.coverUrl !== 'none' ? (
                        <div className="relative h-20 w-14 rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex-shrink-0 group-hover:border-emerald-500/30 transition-colors shadow-lg">
                          <img
                            src={chap.coverUrl}
                            alt="Book Cover"
                            onError={(e) => {
                              handleImageError(e, '');
                            }}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                          />
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                          {/* Overlay floating chapter index badge */}
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded border border-emerald-500/30 bg-black/80 backdrop-blur-sm text-[9px] font-black text-emerald-400">
                            CH {idx + 1}
                          </div>
                        </div>
                      ) : (
                        /* Beautiful lightweight CSS gradient thumbnail */
                        <div className="relative h-20 w-14 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-white/10 flex-shrink-0 flex items-center justify-center shadow-lg group-hover:border-emerald-500/30 transition-colors">
                          <Lucide.BookOpen size={20} className="text-emerald-400 opacity-80" />
                          {/* Overlay floating chapter index badge */}
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded border border-emerald-500/30 bg-black/80 backdrop-blur-sm text-[9px] font-black text-emerald-400">
                            CH {idx + 1}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-extrabold text-white text-base group-hover:text-emerald-400 transition-colors leading-tight">
                          {typeof chap.title === 'string'
                            ? ((language === 'en' ? chap.title_en : chap.title_or) || chap.title)
                            : ((chap.title as any)?.[language] || (chap.title as any)?.or || (chap.title as any)?.en || "Untitled Chapter")}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 flex-wrap">
                          {(chap.pdfUrl || chap.download_url || chap.driveUrl) && (
                            <span className="flex items-center gap-1 text-sky-400 font-bold bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                              <Lucide.FileText size={10} />
                              <span>PDF Text</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                            <Lucide.Sparkles size={10} className="animate-pulse" />
                            <span>{language === 'en' ? 'Gundulu Note' : 'ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 h-12 w-12 rounded-full bg-slate-800/80 border border-white/5 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg shadow-black/20 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                      <Lucide.ChevronRight size={20} className="transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: IMMERSIVE DUAL-PANE READER & AI CHAT ROOM */}
        {currentView === 'reader' && selectedChapter && (
          <div style={forceGpuCompositingStyle} className="flex-1 flex flex-col lg:flex-row gap-6 relative">
            {/* LEFT / MAIN WORKSPACE PANEL (Reader Tab & Content Panel) */}
            <div className="flex-1 flex flex-col bg-slate-900/20 border border-white/5 rounded-3xl overflow-hidden p-6 relative">

              {/* Premium Chapter Title Banner with Cover Thumbnail */}
              <div className="flex items-center gap-4 pb-5 mb-5 border-b border-white/5">
                {selectedChapter.coverUrl && selectedChapter.coverUrl !== 'none' ? (
                  <div className="relative h-16 w-12 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-md flex-shrink-0">
                    <img
                      src={selectedChapter.coverUrl}
                      alt="Chapter Cover"
                      onError={(e) => {
                        handleImageError(e, '');
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  /* Beautiful lightweight native CSS gradient book shape */
                  <div className="relative h-16 w-12 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 border border-white/10 shadow-md flex-shrink-0 flex items-center justify-center">
                    <Lucide.BookOpen size={16} className="text-white opacity-85" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/5 px-2 py-0.5 rounded-md border border-emerald-400/10">
                      {language === 'en' ? 'BSE Textbook' : 'ବିଦ୍ୟାଳୟ ପାଠ୍ୟପୁସ୍ତକ'}
                    </span>
                    {(() => {
                      const currentMeta = activeSubjects.find(sub => sub.key === selectedSubject);
                      return currentMeta ? (language === 'en' ? currentMeta.labelEn : currentMeta.labelOr) : '';
                    })()}
                  </div>
                  <h2 className="text-base md:text-lg font-black text-white leading-tight mt-1">
                    {typeof selectedChapter.title === 'string'
                      ? ((language === 'en' ? selectedChapter.title_en : selectedChapter.title_or) || selectedChapter.title)
                      : ((selectedChapter.title as any)?.[language] || (selectedChapter.title as any)?.or || (selectedChapter.title as any)?.en || "Untitled Chapter")}
                  </h2>
                </div>
              </div>

              {/* Material Sub-header Control Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-white/5 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => setReaderMode('notes')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all ${readerMode === 'notes'
                      ? 'bg-[#b34d1f] text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Lucide.Sparkles size={14} />
                    <span>{language === 'en' ? 'Gundulu Note' : 'ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (effectivePdfUrl) {
                        setReaderMode('pdf');
                      } else {
                        alert(language === 'en' ? 'Original PDF not uploaded yet. Please use the Gundulu Note!' : 'ଏହି ବିଷୟର ମୂଳ PDF ଏପର୍ଯ୍ୟନ୍ତ ଅପଲୋଡ୍ ହୋଇନାହିଁ। ଦୟାକରି ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ ପଢ଼ନ୍ତୁ!');
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all ${!effectivePdfUrl ? 'opacity-40 cursor-not-allowed' : ''
                      } ${readerMode === 'pdf'
                        ? 'bg-[#b34d1f] text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Lucide.BookOpen size={14} />
                    <span>{language === 'en' ? 'Original Textbook' : 'ମୂଳ ପାଠ୍ୟପୁସ୍ତକ'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedChapter.videoUrl) {
                        setReaderMode('video');
                      } else {
                        alert(language === 'en' ? 'Concept videos are not added for this chapter yet. Our team is working on it!' : 'ଏହି ଅଧ୍ୟାୟ ପାଇଁ ଭିଡିଓ କ୍ଲାସ ଏପର୍ଯ୍ୟନ୍ତ ଯୋଡ଼ା ହୋଇନାହିଁ। ଶୀଘ୍ର ପ୍ରସ୍ତୁତ ହେବ!');
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all ${!selectedChapter.videoUrl ? 'opacity-40 cursor-not-allowed' : ''
                      } ${readerMode === 'video'
                        ? 'bg-[#b34d1f] text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <Lucide.Youtube size={14} />
                    <span>{language === 'en' ? 'Gundulu Video' : 'ଗୁନ୍ଦୁଲୁ ଭିଡିଓ'}</span>
                  </button>


                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Lucide.Notebook size={14} />
                    <span>{isSidebarOpen ? (language === 'en' ? 'Hide Notepad' : 'ନୋଟପ୍ୟାଡ୍ ଲୁଚାନ୍ତୁ') : (language === 'en' ? 'Open Notepad' : 'ନୋଟପ୍ୟାଡ୍ ଦେଖନ୍ତୁ')}</span>
                  </button>
                </div>
              </div>

              {/* SLICK COMFORT EYE SHIELD & ZOOM TOOLBAR */}
              <div className="flex items-center justify-between gap-4 mt-3 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/5 relative z-10 flex-nowrap text-xs">
                {/* Left side: Compact logo & title */}
                <div className="flex items-center gap-1.5">
                  <Lucide.Eye size={13} className="text-amber-400 shrink-0" />
                  <span className="font-extrabold text-[10px] sm:text-xs text-slate-400 leading-none tracking-wide">
                    {language === 'en' ? 'Eye Care' : 'ନେତ୍ର ରକ୍ଷା'}
                  </span>
                </div>

                {/* Right side: Filter & Zoom Buttons in one row */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
                  {/* Eye care mode filters */}
                  <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-white/5 flex-nowrap">
                    <button
                      onClick={() => setEyeCareMode('off')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all ${eyeCareMode === 'off' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      {language === 'en' ? 'Off' : 'ନର୍ମାଲ୍'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('sepia')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${eyeCareMode === 'sepia' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/10' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {language === 'en' ? 'Shield' : 'ସୁରକ୍ଷା'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('dim')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${eyeCareMode === 'dim' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/10' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <Lucide.Moon size={8} />
                      {language === 'en' ? 'Night' : 'ରାତି'}
                    </button>
                  </div>

                  {/* Zoom controls with - indicator + */}
                  {readerMode === 'notes' && (
                    <div className="flex items-center bg-slate-900/60 rounded-lg border border-white/5 p-0.5 flex-nowrap">
                      <button
                        onClick={() => {
                          if (fontSize === 'xlarge') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('normal');
                        }}
                        disabled={fontSize === 'normal'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom Out' : 'ଛୋଟ କରନ୍ତୁ'}
                      >
                        -
                      </button>
                      <span className="px-1 text-[8px] font-bold text-slate-500 uppercase select-none tracking-widest font-mono">
                        {fontSize === 'normal' ? '1x' : fontSize === 'large' ? '1.5x' : '2x'}
                      </span>
                      <button
                        onClick={() => {
                          if (fontSize === 'normal') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('xlarge');
                        }}
                        disabled={fontSize === 'xlarge'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom In' : 'ବଡ଼ କରନ୍ତୁ'}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIVE READING CANVAS */}
              <div className="flex-1 mt-6 overflow-y-auto max-h-[60vh] pr-2 scrollbar-thin scrollbar-thumb-emerald-500/10">
                {readerMode === 'notes' ? (
                  <div
                    className={`prose max-w-none p-4 md:p-6 rounded-2xl border transition-all duration-300 ${eyeCareMode === 'sepia'
                      ? 'prose-stone border-amber-900/10'
                      : 'prose-invert border-white/5 bg-slate-900/20 text-slate-200'
                      } ${fontSize === 'normal' ? 'text-base leading-relaxed' :
                        fontSize === 'large' ? 'text-lg md:text-xl leading-loose font-medium' :
                          'text-xl md:text-2xl leading-loose font-semibold'
                      }`}
                    style={{
                      backgroundColor: eyeCareMode === 'sepia' ? '#fbf0d9' : undefined,
                      color: eyeCareMode === 'sepia' ? '#433422' : undefined,
                      filter: eyeCareMode === 'dim' ? 'brightness(0.7)' : undefined,
                    }}
                  >
                    {selectedChapter.notes ? (
                      (() => {
                        const isUnlocked = isChapterNotesUnlocked || user?.role === 'admin' || user?.role === 'teacher';
                        const originalNotes = selectedChapter.notes;
                        const finalNotes = isUnlocked ? originalNotes : (originalNotes.length > 350 ? originalNotes.substring(0, 350) + "..." : originalNotes);

                        return (
                          <div className="relative">
                            <ReactMarkdown>{cleanMathNotation(finalNotes)}</ReactMarkdown>

                            {!isUnlocked && (
                              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none" />
                            )}

                            {!isUnlocked && (
                              <div className="mt-8 p-6 md:p-8 rounded-3xl border border-emerald-500/30 bg-slate-950/85 backdrop-blur-md text-center space-y-6 shadow-2xl relative overflow-hidden">
                                {/* Floating background glow effect */}
                                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />

                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-lg mx-auto relative animate-bounce">
                                  <Lucide.Lock size={28} />
                                </div>

                                <div className="space-y-3 max-w-lg mx-auto">
                                  <h4 className="text-lg font-black text-white leading-tight">
                                    {language === 'en'
                                      ? 'Unlock Full Chapter Notes & Solutions For Free! 🌟'
                                      : 'ସମ୍ପୂର୍ଣ୍ଣ ଅଧ୍ୟାୟ ନୋଟ୍ସ ମାଗଣାରେ ଅନଲକ୍ କରନ୍ତୁ! 🌟'}
                                  </h4>
                                  <p className="text-xs text-slate-400 leading-relaxed font-bold">
                                    {language === 'en'
                                      ? 'Sharing is caring! Share this premium study material to one of your WhatsApp school/tuition groups to instantly unlock the entire guide.'
                                      : 'ଏହି ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପାଠକୁ ଆପଣଙ୍କ ସ୍କୁଲ୍ WhatsApp ଗ୍ରୁପ୍‌ରେ ଶେୟାର କରନ୍ତୁ ଏବଂ ସମସ୍ତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର, ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଓ ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ ତୁରନ୍ତ ପଢ଼ନ୍ତୁ।'}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleShareToUnlock}
                                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-sm font-black flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 cursor-pointer"
                                >
                                  <Lucide.Share2 size={18} className="animate-pulse" />
                                  <span>
                                    {language === 'en'
                                      ? 'Share on WhatsApp to Unlock 🟢'
                                      : 'WhatsApp ରେ ଶେୟାର କରି ଅନଲକ୍ କରନ୍ତୁ 🟢'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : generatedNotes ? (
                      (() => {
                        const isUnlocked = isChapterNotesUnlocked || user?.role === 'admin' || user?.role === 'teacher';
                        const originalNotes = generatedNotes;
                        const finalNotes = isUnlocked ? originalNotes : (originalNotes.length > 350 ? originalNotes.substring(0, 350) + "..." : originalNotes);

                        return (
                          <div className="relative">
                            <ReactMarkdown>{cleanMathNotation(finalNotes)}</ReactMarkdown>

                            {!isUnlocked && (
                              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none" />
                            )}

                            {!isUnlocked && (
                              <div className="mt-8 p-6 md:p-8 rounded-3xl border border-emerald-500/30 bg-slate-950/85 backdrop-blur-md text-center space-y-6 shadow-2xl relative overflow-hidden">
                                {/* Floating background glow effect */}
                                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />

                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-lg mx-auto relative animate-bounce">
                                  <Lucide.Lock size={28} />
                                </div>

                                <div className="space-y-3 max-w-lg mx-auto">
                                  <h4 className="text-lg font-black text-white leading-tight">
                                    {language === 'en'
                                      ? 'Unlock Full Chapter Notes & Solutions For Free! 🌟'
                                      : 'ସମ୍ପୂର୍ଣ୍ଣ ଅଧ୍ୟାୟ ନୋଟ୍ସ ମାଗଣାରେ ଅନଲକ୍ କରନ୍ତୁ! 🌟'}
                                  </h4>
                                  <p className="text-xs text-slate-400 leading-relaxed font-bold">
                                    {language === 'en'
                                      ? 'Sharing is caring! Share this premium study material to one of your WhatsApp school/tuition groups to instantly unlock the entire guide.'
                                      : 'ଏହି ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପାଠକୁ ଆପଣଙ୍କ ସ୍କୁଲ୍ WhatsApp ଗ୍ରୁପ୍‌ରେ ଶେୟାର କରନ୍ତୁ ଏବଂ ସମସ୍ତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର, ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଓ ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ ତୁରନ୍ତ ପଢ଼ନ୍ତୁ।'}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleShareToUnlock}
                                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-sm font-black flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 cursor-pointer"
                                >
                                  <Lucide.Share2 size={18} className="animate-pulse" />
                                  <span>
                                    {language === 'en'
                                      ? 'Share on WhatsApp to Unlock 🟢'
                                      : 'WhatsApp ରେ ଶେୟାର କରି ଅନଲକ୍ କରନ୍ତୁ 🟢'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (user?.role === 'admin' || user?.role === 'teacher') ? (
                      /* Stunning Glowing AI Notes Generation CTA Card (Only visible to Administrators) */
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 border border-white/5 rounded-3xl space-y-6 max-w-lg mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 relative animate-pulse shadow-lg">
                          <Lucide.Sparkles size={28} />
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-black text-white">
                            {language === 'en' ? 'Admin AI Notes Generator Ready' : 'AI ପାଠ୍ୟକ୍ରମ ନୋଟ୍ସ ପ୍ରସ୍ତୁତକାରୀ'}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-bold">
                            {language === 'en'
                              ? "Official revision notes are blank. Click below to let Gundulu AI generate & save comprehensive chapter notes and revision formulas directly to Firestore for all students!"
                              : "ଏହି ଅଧ୍ୟାୟର ନୋଟ୍ସ ଖାଲି ଅଛି। ଗୁନ୍ଦୁଲୁ AI ଦ୍ୱାରା ନୂତନ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର, ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଏବଂ ଉଦାହରଣ ପ୍ରସ୍ତୁତ କରି ସିଧାସଳଖ ଡାଟାବେସରେ ସେଭ୍ କରିବା ପାଇଁ ତଳେ କ୍ଲିକ୍ କରନ୍ତୁ!"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isGeneratingNotes}
                          onClick={handleGenerateAiNotes}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait shadow-lg shadow-emerald-500/20"
                        >
                          {isGeneratingNotes ? (
                            <>
                              <Lucide.Loader2 size={14} className="animate-spin" />
                              <span>{language === 'en' ? 'Generating & Saving...' : 'ପ୍ରସ୍ତୁତ ଓ ସେଭ୍ ହେଉଛି...'}</span>
                            </>
                          ) : (
                            <>
                              <Lucide.Sparkles size={14} className="animate-bounce" />
                              <span>{language === 'en' ? 'Generate & Save Gundulu Notes ✨' : 'ଗୁନ୍ଦୁଲୁ ନୋଟ୍ସ ପ୍ରସ୍ତୁତ ଓ ସେଭ୍ କରନ୍ତୁ ✨'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Elegant placeholder card for students */
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 border border-white/5 rounded-3xl space-y-4 max-w-lg mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-lg">
                          <Lucide.BookOpen size={24} className="animate-pulse" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-black text-white">
                            {language === 'en' ? 'Notes Coming Soon' : 'ନୋଟ୍ସ ଖୁବ୍ Śୀଘ୍ର ଆସୁଛି'}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-bold">
                            {language === 'en'
                              ? "Revision notes, key formulas, and practice answers for this chapter are being prepared and will be uploaded soon. Stay tuned! 🌟"
                              : "ଏହି ଅଧ୍ୟାୟର ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର, ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଏବଂ ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ ଖୁବ୍ ଶୀଘ୍ର ଅପଲୋଡ୍ ହେବାକୁ ଯାଉଛି। ଅପେକ୍ଷା କରନ୍ତୁ! 🌟"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : readerMode === '3d' ? (
                  <div className="w-full h-[60vh] rounded-3xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-glow">
                    {onNavigateTo3D && (
                      <div className="absolute top-4 right-4 z-30">
                        <button
                          onClick={onNavigateTo3D}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#b34d1f] hover:bg-[#b34d1f]/90 text-white font-black text-[10px] tracking-wide uppercase transition-all shadow-md active:scale-95 border border-white/5"
                        >
                          <Lucide.ExternalLink size={12} />
                          <span>{language === 'en' ? 'Open Full-screen ↗' : 'ପୂର୍ଣ୍ଣ ସ୍କ୍ରିନ୍ କରନ୍ତୁ ↗'}</span>
                        </button>
                      </div>
                    )}
                    <Gundulu3DLab
                      language={language}
                      user={user}
                      initialModelKey={selectedChapter.title || selectedSubject}
                      isEmbedded={true}
                    />
                  </div>
                ) : readerMode === 'video' ? (
                  /* Gorgeous Embedded YouTube Player with smart class videos */
                  (() => {
                    const getYouTubeEmbedUrl = (url: string) => {
                      if (!url) return '';
                      if (url.includes('list=')) {
                        const match = url.match(/[?&]list=([^#\&\?]+)/);
                        if (match) {
                          return `https://www.youtube.com/embed/videoseries?list=${match[1]}&autoplay=1`;
                        }
                      }
                      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                      const match = url.match(regExp);
                      if (match && match[2].length === 11) {
                        return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1&autoplay=1`;
                      }
                      return '';
                    };

                    if (isVideosLoading) {
                      return (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-white/5 rounded-3xl h-[45vh] space-y-4">
                          <Lucide.Loader2 size={32} className="animate-spin text-emerald-500" />
                          <p className="text-slate-400 text-xs">{language === 'en' ? 'Loading video playlist...' : 'ଭିଡିଓ ପ୍ଲେଲିଷ୍ଟ ଲୋଡ୍ ହେଉଛି...'}</p>
                        </div>
                      );
                    }

                    if (chapterVideos.length > 0) {
                      const activeVideo = chapterVideos[activeVideoIdx] || chapterVideos[0];
                      const embedUrl = getYouTubeEmbedUrl(activeVideo.youtubeUrl);
                      
                      return (
                        <div className="flex flex-col gap-6">
                          {/* Video Player */}
                          {embedUrl ? (
                            <div className="w-full h-[45vh] md:h-[50vh] rounded-3xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                              <iframe
                                src={embedUrl}
                                title={activeVideo.title}
                                className="w-full h-full object-cover border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-white/5 rounded-3xl h-[45vh] space-y-4">
                              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                <Lucide.Youtube size={32} />
                              </div>
                              <h4 className="text-lg font-black text-white">{language === 'en' ? 'Invalid Video Link' : 'ଭୁଲ୍ ଭିଡିଓ ଲିଙ୍କ'}</h4>
                            </div>
                          )}

                          {/* Playlist selector */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Lucide.Library size={14} className="text-emerald-400" />
                              <span>{language === 'en' ? 'Smart Class Playlist' : 'ଭିଡିଓ ପାର୍ଟ ସମୂହ (Smart Class)'}</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {chapterVideos.map((vid, idx) => {
                                const isActive = idx === activeVideoIdx;
                                return (
                                  <button
                                    key={vid.id}
                                    onClick={() => setActiveVideoIdx(idx)}
                                    className={`p-3 rounded-2xl flex items-center gap-3 transition-all text-left border ${
                                      isActive 
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-md' 
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                      isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      <Lucide.Play size={12} fill="currentColor" />
                                    </div>
                                    <div className="truncate flex-1">
                                      <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                        Part {idx + 1}
                                      </div>
                                      <div className="text-xs font-bold truncate">
                                        {vid.title}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Fallback to single videoUrl in chapter metadata if no curated_videos
                    const fallbackUrl = selectedChapter.videoUrl;
                    const embedUrl = getYouTubeEmbedUrl(fallbackUrl);

                    return embedUrl ? (
                      <div
                        className="w-full h-[55vh] rounded-3xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-glow"
                      >
                        <iframe
                          src={embedUrl}
                          title={selectedChapter.title}
                          className="w-full h-full object-cover border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-white/5 rounded-3xl h-[45vh] space-y-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                          <Lucide.Youtube size={32} />
                        </div>
                        <h4 className="text-lg font-black text-white">
                          {language === 'en' ? 'No video loaded' : 'ଭିଡିଓ ମିଳିଲା ନାହିଁ'}
                        </h4>
                        <p className="text-slate-400 text-xs max-w-sm">
                          {language === 'en'
                            ? 'The video lessons for this chapter are currently being curated. Check back soon or study with AI Notes!'
                            : 'ଏହି ଅଧ୍ୟାୟର ଭିଡିଓ ଲିଙ୍କ ସଂରକ୍ଷିତ ହୋଇନାହିଁ। ଦୟାକରି AI ପାଠ୍ୟପୁସ୍ତକ ଅଭ୍ୟାସ କରନ୍ତୁ!'}
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-full h-[60vh] rounded-2xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col justify-center">
                    {isMobileDevice() ? (
                      /* Beautiful glowing mobile book launcher card */
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-slate-950">
                        {/* 3D-like book image scaled */}
                        {selectedChapter.coverUrl && selectedChapter.coverUrl !== 'none' ? (
                          <div className="w-28 h-36 rounded-xl overflow-hidden border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-all relative shrink-0">
                            <img
                              src={selectedChapter.coverUrl}
                              alt="Book Cover"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          /* Ultra-premium 3D-like pure CSS Book Shape card */
                          <div className="w-28 h-36 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 border border-white/20 shadow-[0_12px_24px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-all relative shrink-0 flex flex-col justify-between p-3.5 overflow-hidden">
                            {/* Gold bookbinding border overlay */}
                            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 border-r border-white/5" />
                            <div className="flex justify-end relative z-10">
                              <Lucide.Sparkles size={14} className="text-amber-300 animate-pulse" />
                            </div>
                            <div className="flex flex-col items-start gap-1 ml-2.5 relative z-10">
                              <Lucide.BookOpen size={24} className="text-white opacity-95" />
                              <span className="text-[8px] font-black uppercase text-emerald-200 tracking-widest leading-none">
                                BSE Odisha
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5 max-w-xs">
                          <h4 className="text-xs font-black text-white leading-tight">
                            {selectedChapter.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold leading-normal">
                            {language === 'en'
                              ? 'Read this textbook chapter in full-screen mobile comfort.'
                              : 'ମୋବାଇଲ୍ ଅଧ୍ୟୟନ ପାଇଁ ତଳ ବଟନ୍ କ୍ଲିକ୍ କରି ପାଠ୍ୟପୁସ୍ତକ ପଢ଼ନ୍ତୁ।'}
                          </p>
                        </div>

                        <a
                          href={useDirectViewer ? effectivePdfUrl : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(effectivePdfUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] tracking-wider uppercase transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                          <Lucide.BookOpen size={12} />
                          <span>{language === 'en' ? 'Open Textbook Chapter' : 'ପାଠ୍ୟପୁସ୍ତକ ଓପନ୍ କରନ୍ତୁ'}</span>
                        </a>
                      </div>
                    ) : (
                      <iframe
                        src={useDirectViewer ? effectivePdfUrl : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(effectivePdfUrl)}`}
                        className="w-full flex-1"
                        title={selectedChapter.title}
                      />
                    )}
                    <div className="p-4 bg-slate-900/60 border-t border-white/5 flex flex-wrap gap-3 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {language === 'en' ? 'Trouble loading or file is too large?' : 'ଫାଇଲ୍ ଲୋଡ୍ ହେଉନାହିଁ କିମ୍ବା ବଡ଼ ଅଛି?'}
                        </span>
                        <button
                          onClick={() => setUseDirectViewer(!useDirectViewer)}
                          className={`px-3 py-1.5 rounded-lg font-black text-[9px] tracking-wide uppercase transition-all active:scale-95 border ${useDirectViewer
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                        >
                          {useDirectViewer
                            ? (language === 'en' ? 'Using Direct Reader' : 'ଦ୍ରୁତ ପିଡିଏଫ୍ ସକ୍ରିୟ')
                            : (language === 'en' ? 'Use Direct PDF Reader' : 'ଦ୍ରୁତ ପିଡିଏଫ୍ ମୋଡ୍')}
                        </button>
                      </div>
                      <a
                        href={useDirectViewer ? effectivePdfUrl : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(effectivePdfUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs transition-all active:scale-95"
                      >
                        <Lucide.ExternalLink size={14} />
                        <span>{language === 'en' ? 'Open Viewer' : 'ଭ୍ୟୁଅର୍ ଓପନ୍'}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTTOM STUDENT NOTEPAD WORKSPACE */}
              {isSidebarOpen && (
                <div
                  className="border-t border-white/5 mt-6 pt-4 flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lucide.PenTool size={16} className="text-emerald-400 animate-pulse" />
                      <span className="text-xs font-black text-slate-300">
                        {language === 'en' ? 'Personal Study Notes' : 'ମୋର ଗୁନ୍ଦୁଲୁ ଟିପ୍ପଣୀ (ସ୍ୱତନ୍ତ୍ର)'}
                      </span>
                    </div>

                    {/* Saving Indicator */}
                    <span className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className={`h-2 w-2 rounded-full ${isNotepadSaved ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping'}`} />
                      <span className={isNotepadSaved ? 'text-slate-500' : 'text-amber-400'}>
                        {isNotepadSaved ? (language === 'en' ? 'Saved' : 'ସଂରକ୍ଷିତ') : (language === 'en' ? 'Drafting...' : 'ସଂରକ୍ଷଣ ହେଉଛି...')}
                      </span>
                    </span>
                  </div>

                  <textarea
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    placeholder={language === 'en' ? 'Write down important formulas, shortcuts, questions or hints here...' : 'ଅଧ୍ୟାୟର ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର, ପ୍ରଶ୍ନ କିମ୍ବା ହିଣ୍ଟ୍ ଏଠାରେ ଲେଖନ୍ତୁ...'}
                    className="w-full h-32 bg-slate-950 border border-white/5 rounded-2xl p-4 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30 resize-none scrollbar-none"
                  />
                </div>
              )}
            </div>

            {/* RIGHT PANEL - GUNDULU FLOATING STUDY ASSISTANT CHATBOX */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-full lg:w-[400px] flex flex-col bg-slate-950/60 backdrop-blur-lg md:backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 h-[70vh] lg:h-auto lg:sticky lg:top-6 z-40"
            >
              {/* Gundulu Chat Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-500/20 to-teal-900/40 border-b border-white/10 flex items-center justify-between backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none" />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative group cursor-pointer">
                    <div className="h-12 w-12 rounded-full border-2 border-emerald-400/50 overflow-hidden bg-emerald-950/40 shadow-[0_0_15px_rgba(52,211,153,0.4)] shrink-0 flex items-center justify-center relative">
                      <img
                        src="/gundulu-v3.png"
                        alt="Gundulu Avatar"
                        className="w-full h-full object-cover scale-[0.95] transition-transform duration-500 group-hover:scale-[1.1]"
                        onError={(e) => {
                          handleImageError(e, 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png');
                        }}
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-[0_0_10px_#34d399] animate-pulse z-20" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <span>{language === 'en' ? 'Gundulu AI Tutor' : 'ଗୁନ୍ଦୁଲୁ ଏଆଈ ସାଥୀ'}</span>
                      <Lucide.Sparkles size={12} className="text-amber-400" />
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {language === 'en' ? 'Online & Ready' : 'ସର୍ବଦା ପ୍ରସ୍ତୁତ'}
                    </p>
                  </div>
                </div>
              </div>

              {!isTutorUnlocked ? (
                /* GUNDULU SUBSCRIPTION LOCK OVERLAY */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 space-y-6">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="h-20 w-20 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-md"
                  >
                    <Lucide.Lock size={32} />
                  </motion.div>
                  <div className="space-y-3">
                    <h4 className="text-base font-black text-white">
                      {language === 'en' ? 'Unlock Gundulu AI Tutor' : 'ଗୁନ୍ଦୁଲୁ AI ଟ୍ୟୁଟର ଅନଲକ୍ କରନ୍ତୁ'}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[260px] mx-auto">
                      {language === 'en'
                        ? 'Chat with Gundulu to solve doubts, explain complex formulas, and get custom interactive practice tests instantly!'
                        : 'ଗୁନ୍ଦୁଲୁ ସହ କଥା ହୋଇ ସବୁ ଗଣିତ ପ୍ରଶ୍ନର ସମାଧାନ, ସୂତ୍ର ଏବଂ ସ୍ପେସାଲ୍ ଟେଷ୍ଟ ପାଆନ୍ତୁ!'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpgrade) {
                        onUpgrade();
                      } else {
                        alert(language === 'en' ? 'Please upgrade your plan from the profile dashboard!' : 'ଦୟାକରି ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ଡ୍ୟାସବୋର୍ଡରୁ ପ୍ଲାନ୍ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ!');
                      }
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black tracking-widest uppercase transition-all shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Lucide.Sparkles size={16} />
                    <span>{language === 'en' ? 'Unlock Premium Now' : 'ପ୍ରିମିୟମ୍ ଅନଲକ୍ କରନ୍ତୁ'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* GUNDULU CONVERSATION WATERFALL */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                    {chatMessages.map((msg, idx) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'gundulu' && (
                          <div className="h-8 w-8 rounded-full border border-emerald-500/20 shadow-lg shadow-emerald-500/10 shrink-0 overflow-hidden flex items-center justify-center bg-emerald-950/20">
                            <img
                              src="/gundulu-v3.png"
                              alt="Gundulu"
                              className="w-full h-full object-cover scale-[0.95]"
                              onError={(e) => {
                                handleImageError(e, 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png');
                              }}
                            />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-3xl p-4 leading-relaxed shadow-lg border backdrop-blur-sm ${msg.sender === 'user'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/30 text-white rounded-br-sm text-sm font-medium shadow-emerald-500/20'
                            : 'gundulu-chat-bubble bg-slate-900/80 border-emerald-500/20 text-slate-100 rounded-bl-sm text-sm font-medium tracking-wide [&_strong]:text-emerald-400 [&_strong]:font-bold [&_code]:bg-black/50 [&_code]:text-emerald-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1'
                            }`}
                        >
                          <ReactMarkdown>{cleanMathNotation(msg.text)}</ReactMarkdown>
                        </div>
                      </motion.div>
                    ))}

                    {isAiLoading && (
                      <div className="flex items-end gap-3 justify-start">
                        <div className="h-8 w-8 rounded-full shadow-lg shadow-emerald-500/20 animate-pulse border border-emerald-500/30 shrink-0 overflow-hidden flex items-center justify-center bg-emerald-950/20">
                          <img
                            src="/gundulu-v3.png"
                            alt="Gundulu"
                            className="w-full h-full object-cover scale-[0.95]"
                            onError={(e) => {
                              handleImageError(e, 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png');
                            }}
                          />
                        </div>
                        <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/20 rounded-3xl rounded-bl-sm p-4 shadow-lg">
                          <div className="flex gap-1.5 items-center h-4">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* QUICK CHIPS SUGGESTIONS */}
                  <div className="p-3 bg-slate-950/80 backdrop-blur-md md:backdrop-blur-xl border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Summarize this chapter for me." : "ଏହି ଅଧ୍ୟାୟର ଏକ ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଦିଅ।")}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-xs font-bold !text-white hover:text-emerald-300 active:scale-95 transition-all shadow-sm"
                    >
                      📝 {language === 'en' ? 'Summarize Guide' : 'ସାରାଂଶ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Give me an MCQ test based on this chapter notes." : "ଏହି ଅଧ୍ୟାୟରୁ ମୋତେ ଗୋଟିଏ MCQ ଟେଷ୍ଟ ପ୍ରଶ୍ନ ପଚାର।")}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-xs font-bold !text-white hover:text-amber-300 active:scale-95 transition-all shadow-sm"
                    >
                      ⚡ {language === 'en' ? 'Ask me MCQ' : 'MCQ ପ୍ରଶ୍ନ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Explain the most important formulas of this chapter." : "ଏହି ଅଧ୍ୟାୟର ସବୁଠାରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ରଗୁଡ଼ିକ ବୁଝାଅ।")}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-xs font-bold !text-white hover:text-purple-300 active:scale-95 transition-all shadow-sm"
                    >
                      📐 {language === 'en' ? 'Explain Formulas' : 'ମୁଖ୍ୟ ସୂତ୍ର'}
                    </button>
                  </div>

                  {/* Gundulu Chat Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendToGundulu(inputValue);
                    }}
                    className="p-4 bg-slate-950 backdrop-blur-lg md:backdrop-blur-2xl border-t border-white/10 flex items-center gap-3 relative z-10"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={language === 'en' ? 'Ask Gundulu anything...' : 'ଏହି ଅଧ୍ୟାୟ ବିଷୟରେ ଗୁନ୍ଦୁଲୁକୁ ପଚାରନ୍ତୁ...'}
                      className="gundulu-chat-input flex-1 bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 shadow-inner transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isAiLoading}
                      className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-emerald-400 hover:to-teal-500 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-emerald-500/20"
                    >
                      <Lucide.Send size={18} />
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* ULTRA-PREMIUM IMMERSIVE FULL-SCREEN READER OVERLAY */}
        <AnimatePresence>
          {false && isPdfFullScreen && selectedChapter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col p-4 md:p-6 font-sans overflow-hidden"
              style={{
                filter: eyeCareMode === 'dim' ? 'brightness(0.7)' : undefined,
              }}
            >
              {/* Header Panel */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0 flex-wrap md:flex-nowrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Lucide.BookOpen size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest leading-none block">
                      {selectedChapter.subject} • {language === 'en' ? 'Chapter' : 'ଅଧ୍ୟାୟ'} {selectedChapter.chapterIndex || 1}
                    </span>
                    <h2 className="text-sm md:text-lg font-black text-white mt-1 leading-tight">
                      {selectedChapter.title}
                    </h2>
                  </div>
                </div>

                {/* Real-time Inline Eye Care controls in Full Screen! */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Eye care toggles */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setEyeCareMode('off')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all ${eyeCareMode === 'off' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      {language === 'en' ? 'Off' : 'ନର୍ମାଲ୍'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('sepia')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${eyeCareMode === 'sepia' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/15' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {language === 'en' ? 'Shield' : 'ସୁରକ୍ଷା'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('dim')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${eyeCareMode === 'dim' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/15' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <Lucide.Moon size={8} />
                      {language === 'en' ? 'Night' : 'ରାତି'}
                    </button>
                  </div>

                  {/* Font scale toggles */}
                  {readerMode === 'notes' && (
                    <div className="flex items-center bg-slate-900 rounded-lg border border-white/5 p-0.5">
                      <button
                        onClick={() => {
                          if (fontSize === 'xlarge') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('normal');
                        }}
                        disabled={fontSize === 'normal'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom Out' : 'ଛୋଟ କରନ୍ତୁ'}
                      >
                        -
                      </button>
                      <span className="px-1 text-[8px] font-bold text-slate-500 uppercase select-none tracking-widest font-mono">
                        {fontSize === 'normal' ? '1x' : fontSize === 'large' ? '1.5x' : '2x'}
                      </span>
                      <button
                        onClick={() => {
                          if (fontSize === 'normal') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('xlarge');
                        }}
                        disabled={fontSize === 'xlarge'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom In' : 'ବଡ଼ କରନ୍ତୁ'}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Exit fullscreen button */}
                  <button
                    onClick={() => setIsPdfFullScreen(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-black text-xs transition-all active:scale-95 border border-red-500/10 shadow-lg"
                  >
                    <Lucide.Minimize2 size={14} />
                    <span>{language === 'en' ? 'Exit' : 'ବନ୍ଦ କରନ୍ତୁ'}</span>
                  </button>
                </div>
              </div>

              {/* Fullscreen Reading Canvas */}
              <div className="flex-1 overflow-y-auto mt-6 pr-2 scrollbar-thin scrollbar-thumb-emerald-500/10">
                {readerMode === 'notes' ? (
                  <div
                    className={`prose max-w-none p-6 md:p-10 rounded-2xl border transition-all duration-300 ${eyeCareMode === 'sepia'
                      ? 'prose-stone border-amber-900/10 shadow-lg shadow-amber-950/5'
                      : 'prose-invert border-white/5 bg-slate-900/20 text-slate-200'
                      } ${fontSize === 'normal' ? 'text-base leading-relaxed' :
                        fontSize === 'large' ? 'text-lg md:text-xl leading-loose font-medium' :
                          'text-xl md:text-2xl leading-loose font-semibold'
                      }`}
                    style={{
                      backgroundColor: eyeCareMode === 'sepia' ? '#fbf0d9' : undefined,
                      color: eyeCareMode === 'sepia' ? '#433422' : undefined,
                    }}
                  >
                    {selectedChapter.notes ? (
                      <ReactMarkdown>{cleanMathNotation(selectedChapter.notes)}</ReactMarkdown>
                    ) : generatedNotes ? (
                      <ReactMarkdown>{cleanMathNotation(generatedNotes)}</ReactMarkdown>
                    ) : (
                      /* Stunning Glowing AI Notes Generation CTA Card */
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 border border-white/5 rounded-3xl space-y-6 max-w-lg mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 relative animate-pulse shadow-lg">
                          <Lucide.Sparkles size={28} />
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-black text-white">
                            {language === 'en' ? 'AI Notes Generator Ready' : 'AI ପାଠ୍ୟକ୍ରମ ନୋଟ୍ସ ଚିଠା ପ୍ରସ୍ତୁତ'}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-bold">
                            {language === 'en'
                              ? "Official revision notes are not uploaded yet. Click below to let Gundulu AI generate comprehensive chapter notes, revision formulas, and laws instantly!"
                              : "ଏହି ଅଧ୍ୟାୟର ଅଫିସିଆଲ୍ ନୋଟ୍ସ ଏପର୍ଯ୍ୟନ୍ତ ଯୋଡ଼ା ଯାଇନାହିଁ। କିନ୍ତୁ ଆପଣଙ୍କ ପାଇଁ ଗୁନ୍ଦୁଲୁ AI ଗୁରୁତ୍ୱପୂર્ଣ୍ଣ ସୂତ୍ର, ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଏବଂ ଉଦାହରଣ ପ୍ରସ୍ତୁତ କରିବାକୁ ପ୍ରସ୍ତୁତ ଅଛି!"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isGeneratingNotes}
                          onClick={handleGenerateAiNotes}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait shadow-lg shadow-emerald-500/20"
                        >
                          {isGeneratingNotes ? (
                            <>
                              <Lucide.Loader2 size={14} className="animate-spin" />
                              <span>{language === 'en' ? 'Generating Notes...' : 'ପ୍ରସ୍ତୁତ କରାଯାଉଛି...'}</span>
                            </>
                          ) : (
                            <>
                              <Lucide.Sparkles size={14} className="animate-bounce" />
                              <span>{language === 'en' ? 'Generate Gundulu Notes ✨' : 'ଗୁନ୍ଦୁଲୁ ନୋଟ୍ସ ପ୍ରସ୍ତୁତ କରନ୍ତୁ ✨'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : readerMode === '3d' ? (
                  <div className="w-full h-[60vh] rounded-3xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-glow">
                    {onNavigateTo3D && (
                      <div className="absolute top-4 right-4 z-30">
                        <button
                          onClick={onNavigateTo3D}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#b34d1f] hover:bg-[#b34d1f]/90 text-white font-black text-[10px] tracking-wide uppercase transition-all shadow-md active:scale-95 border border-white/5"
                        >
                          <Lucide.ExternalLink size={12} />
                          <span>{language === 'en' ? 'Open Full-screen ↗' : 'ପୂର୍ଣ୍ଣ ସ୍କ୍ରିନ୍ କରନ୍ତୁ ↗'}</span>
                        </button>
                      </div>
                    )}
                    <Gundulu3DLab
                      language={language}
                      user={user}
                      initialModelKey={selectedChapter.title || selectedSubject}
                      isEmbedded={true}
                    />
                  </div>
                ) : readerMode === 'video' ? (
                  /* Full-screen video mode canvas helper */
                  (() => {
                    const getYouTubeEmbedUrl = (url: string) => {
                      if (!url) return '';
                      if (url.includes('list=')) {
                        const match = url.match(/[?&]list=([^#\&\?]+)/);
                        if (match) {
                          return `https://www.youtube.com/embed/videoseries?list=${match[1]}&autoplay=1`;
                        }
                      }
                      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                      const match = url.match(regExp);
                      if (match && match[2].length === 11) {
                        return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1&autoplay=1`;
                      }
                      return '';
                    };

                    if (isVideosLoading) {
                      return (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-white/5 rounded-3xl h-full space-y-4">
                          <Lucide.Loader2 size={32} className="animate-spin text-emerald-500" />
                          <p className="text-slate-400 text-xs">{language === 'en' ? 'Loading video playlist...' : 'ଭିଡିଓ ପ୍ଲେଲିଷ୍ଟ ଲୋଡ୍ ହେଉଛି...'}</p>
                        </div>
                      );
                    }

                    if (chapterVideos.length > 0) {
                      const activeVideo = chapterVideos[activeVideoIdx] || chapterVideos[0];
                      const embedUrl = getYouTubeEmbedUrl(activeVideo.youtubeUrl);
                      
                      return (
                        <div className="flex flex-col gap-6 h-full min-h-0">
                          {/* Video Player */}
                          {embedUrl ? (
                            <div className="w-full flex-1 rounded-2xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[30vh]">
                              <iframe
                                src={embedUrl}
                                title={activeVideo.title}
                                className="w-full h-full object-cover border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-white/5 rounded-3xl flex-1 min-h-[30vh] space-y-4">
                              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                <Lucide.Youtube size={32} />
                              </div>
                              <h4 className="text-lg font-black text-white">{language === 'en' ? 'Invalid Video Link' : 'ଭୁଲ୍ ଭିଡିଓ ଲିଙ୍କ'}</h4>
                            </div>
                          )}

                          {/* Playlist selector */}
                          <div className="space-y-3 shrink-0">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Lucide.Library size={14} className="text-emerald-400" />
                              <span>{language === 'en' ? 'Smart Class Playlist' : 'ଭିଡିଓ ପାର୍ଟ ସମୂହ (Smart Class)'}</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {chapterVideos.map((vid, idx) => {
                                const isActive = idx === activeVideoIdx;
                                return (
                                  <button
                                    key={vid.id}
                                    onClick={() => setActiveVideoIdx(idx)}
                                    className={`p-3 rounded-2xl flex items-center gap-3 transition-all text-left border ${
                                      isActive 
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-md' 
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                      isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      <Lucide.Play size={12} fill="currentColor" />
                                    </div>
                                    <div className="truncate flex-1">
                                      <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                        Part {idx + 1}
                                      </div>
                                      <div className="text-xs font-bold truncate">
                                        {vid.title}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const fallbackUrl = selectedChapter.videoUrl;
                    const embedUrl = getYouTubeEmbedUrl(fallbackUrl);

                    return embedUrl ? (
                      <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <iframe
                          src={embedUrl}
                          title={selectedChapter.title}
                          className="w-full flex-1 object-cover border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-white/5 rounded-3xl h-full space-y-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                          <Lucide.Youtube size={32} />
                        </div>
                        <h4 className="text-lg font-black text-white">
                          {language === 'en' ? 'No video loaded' : 'ଭିଡିଓ ମିଳିଲା ନାହିଁ'}
                        </h4>
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5 flex flex-col justify-center">
                    {isMobileDevice() ? (
                      /* Beautiful glowing mobile book launcher card in full screen */
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-slate-900">
                        {/* 3D-like book image scaled */}
                        {selectedChapter.coverUrl ? (
                          <div className="w-28 h-36 rounded-xl overflow-hidden border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-all relative shrink-0">
                            <img
                              src={selectedChapter.coverUrl}
                              alt="Book Cover"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          /* Ultra-premium 3D-like pure CSS Book Shape card */
                          <div className="w-28 h-36 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 border border-white/20 shadow-[0_12px_24px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-all relative shrink-0 flex flex-col justify-between p-3.5 overflow-hidden">
                            {/* Gold bookbinding border overlay */}
                            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 border-r border-white/5" />
                            <div className="flex justify-end relative z-10">
                              <Lucide.Sparkles size={14} className="text-amber-300 animate-pulse" />
                            </div>
                            <div className="flex flex-col items-start gap-1 ml-2.5 relative z-10">
                              <Lucide.BookOpen size={24} className="text-white opacity-95" />
                              <span className="text-[8px] font-black uppercase text-emerald-200 tracking-widest leading-none">
                                BSE Odisha
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5 max-w-xs">
                          <h4 className="text-xs font-black text-white leading-tight">
                            {selectedChapter.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold leading-normal">
                            {language === 'en'
                              ? 'Read this textbook chapter in full-screen mobile comfort.'
                              : 'ମୋବାଇଲ୍ ଅଧ୍ୟୟନ ପାଇଁ ତଳ ବଟନ୍ କ୍ଲିକ୍ କରି ପାଠ୍ୟପୁସ୍ତକ ପଢ଼ନ୍ତୁ।'}
                          </p>
                        </div>

                        <a
                          href={useDirectViewer ? effectivePdfUrl : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(effectivePdfUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] tracking-wider uppercase transition-all active:scale-95 shadow-lg shadow-emerald-500/20 animate-pulse"
                        >
                          <Lucide.BookOpen size={12} />
                          <span>{language === 'en' ? 'Open Full-Screen Textbook' : 'ପୂର୍ଣ୍ଣ ସ୍କ୍ରିନ୍ ପାଠ୍ୟପୁସ୍ତକ ଓପନ୍'}</span>
                        </a>
                      </div>
                    ) : (
                      <iframe
                        src={useDirectViewer ? effectivePdfUrl : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(effectivePdfUrl)}`}
                        className="w-full flex-1"
                        title={selectedChapter.title}
                      />
                    )}
                    <div className="p-4 bg-slate-950 border-t border-white/5 flex flex-wrap gap-3 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {language === 'en' ? 'Trouble loading or file is too large?' : 'ଫାଇଲ୍ ଲୋଡ୍ ହେଉନାହିଁ କିମ୍ବା ବଡ଼ ଅଛି?'}
                        </span>
                        <button
                          onClick={() => setUseDirectViewer(!useDirectViewer)}
                          className={`px-3 py-1.5 rounded-lg font-black text-[9px] tracking-wide uppercase transition-all active:scale-95 border ${useDirectViewer
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                        >
                          {useDirectViewer
                            ? (language === 'en' ? 'Using Direct Reader' : 'ଦ୍ରୁତ ପିଡିଏଫ୍ ସକ୍ରିୟ')
                            : (language === 'en' ? 'Use Direct PDF Reader' : 'ଦ୍ରୁତ ପିଡିଏଫ୍ ମୋଡ୍')}
                        </button>
                      </div>
                      <a
                        href={useDirectViewer ? effectivePdfUrl : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(effectivePdfUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all active:scale-95"
                      >
                        <Lucide.ExternalLink size={14} />
                        <span>{language === 'en' ? 'Open in Viewer' : 'ଭ୍ୟୁଅର୍‌ରେ ଦେଖନ୍ତୁ'}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ULTRA-PREMIUM IMMERSIVE FULL-SCREEN GUNDULU CHAT OVERLAY */}
        <AnimatePresence>
          {false && isChatFullScreen && selectedChapter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col p-4 md:p-6 font-sans overflow-hidden"
              style={{
                filter: eyeCareMode === 'dim' ? 'brightness(0.7)' : undefined,
              }}
            >
              {/* Header Panel */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0 flex-wrap md:flex-nowrap">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border border-emerald-400/30 overflow-hidden bg-emerald-950/20 shadow-md shadow-emerald-500/10 shrink-0 flex items-center justify-center relative">
                      <img
                        src="/gundulu-v3.png"
                        alt="Gundulu Avatar"
                        className="w-full h-full object-cover scale-[0.95]"
                        onError={(e) => {
                          handleImageError(e, 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png');
                        }}
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#011e1a] shadow-[0_0_8px_#34d399] z-20" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-lg font-black text-white leading-tight flex items-center gap-2">
                      <span>{language === 'en' ? 'Gundulu AI Chat Room' : 'ଗୁନ୍ଦୁଲୁ ଏଆଈ ଚାଟ୍ ରୁମ୍'}</span>
                      <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-widest font-black">
                        {language === 'en' ? 'Active' : 'ସକ୍ରିୟ'}
                      </span>
                    </h2>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1">
                      {language === 'en' ? 'Topic:' : 'ଅଧ୍ୟାୟ:'} {selectedChapter.title}
                    </p>
                  </div>
                </div>

                {/* Controls in Full Screen Chat */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Eye care toggles */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setEyeCareMode('off')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all ${eyeCareMode === 'off' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      {language === 'en' ? 'Off' : 'ନର୍ମାଲ୍'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('sepia')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${eyeCareMode === 'sepia' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/15' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {language === 'en' ? 'Shield' : 'ସୁରକ୍ଷା'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('dim')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${eyeCareMode === 'dim' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/15' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <Lucide.Moon size={8} />
                      {language === 'en' ? 'Night' : 'ରାତି'}
                    </button>
                  </div>

                  {/* Exit fullscreen chat button */}
                  <button
                    onClick={() => setIsChatFullScreen(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-black text-xs transition-all active:scale-95 border border-red-500/10 shadow-lg"
                  >
                    <Lucide.Minimize2 size={14} />
                    <span>{language === 'en' ? 'Exit Chat' : 'ଚାଟ୍ ବନ୍ଦ କରନ୍ତୁ'}</span>
                  </button>
                </div>
              </div>

              {/* Main Split workspace */}
              <div className="flex-1 flex gap-6 mt-6 overflow-hidden min-h-0">
                {/* Left study guide panel */}
                <div
                  className={`hidden lg:flex flex-col w-[35%] rounded-3xl border p-6 overflow-y-auto transition-all duration-300 ${eyeCareMode === 'sepia'
                    ? 'prose-stone border-amber-900/10 shadow-lg'
                    : 'border-white/5 bg-slate-900/20'
                    }`}
                  style={{
                    backgroundColor: eyeCareMode === 'sepia' ? '#fbf0d9' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                    <Lucide.Sparkles size={16} className="text-emerald-400" />
                    <span className={`text-xs font-black ${eyeCareMode === 'sepia' ? 'text-amber-900' : 'text-slate-300'}`}>
                      {language === 'en' ? 'Chapter Study Notes Reference' : 'ଅଧ୍ୟାୟ ଅଧ୍ୟୟନ ନୋଟ୍'}
                    </span>
                  </div>
                  <div
                    className={`prose max-w-none ${eyeCareMode === 'sepia' ? 'prose-stone text-amber-950' : 'prose-invert text-slate-300'
                      } text-xs leading-relaxed`}
                  >
                    <ReactMarkdown>{cleanMathNotation(selectedChapter.notes || '*No study materials added yet.*')}</ReactMarkdown>
                  </div>
                </div>

                {/* Right Chat panel */}
                <div className="flex-1 flex flex-col bg-slate-900/20 border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative h-full">
                  {/* Chat messages waterfall */}
                  <div
                    className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-emerald-500/10"
                    style={{
                      backgroundColor: eyeCareMode === 'sepia' ? '#f5e9ce' : undefined,
                    }}
                  >
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'gundulu' && (
                          <div className="h-8 w-8 rounded-full border border-emerald-500/10 shadow-sm shrink-0 overflow-hidden flex items-center justify-center bg-emerald-950/20">
                            <img
                              src="/gundulu-v3.png"
                              alt="Gundulu"
                              className="w-full h-full object-cover scale-[0.95]"
                              onError={(e) => {
                                handleImageError(e, 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png');
                              }}
                            />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl p-4 leading-relaxed shadow-sm border ${msg.sender === 'user'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent text-white rounded-br-none text-xs font-semibold'
                            : `gundulu-chat-bubble border-emerald-500/20 rounded-bl-none text-sm font-semibold tracking-wide [&_strong]:text-emerald-400 [&_strong]:font-bold [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 ${eyeCareMode === 'sepia'
                              ? 'bg-amber-100 text-amber-950 border-amber-900/15 [&_code]:bg-amber-200 [&_code]:text-emerald-800'
                              : 'bg-slate-900/90 text-slate-100 [&_code]:bg-slate-950 [&_code]:text-emerald-300'
                            }`
                            }`}
                        >
                          <ReactMarkdown>{cleanMathNotation(msg.text)}</ReactMarkdown>
                        </div>
                      </div>
                    ))}

                    {isAiLoading && (
                      <div className="flex items-end gap-2.5 justify-start">
                        <div className="h-8 w-8 rounded-full animate-bounce shrink-0 overflow-hidden flex items-center justify-center bg-emerald-950/20">
                          <img
                            src="/gundulu-v3.png"
                            alt="Gundulu"
                            className="w-full h-full object-cover scale-[0.95]"
                            onError={(e) => {
                              handleImageError(e, 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png');
                            }}
                          />
                        </div>
                        <div className={`border rounded-2xl rounded-bl-none p-4 shadow-sm ${eyeCareMode === 'sepia' ? 'bg-amber-100 border-amber-900/10' : 'bg-slate-950 border-white/5'
                          }`}>
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QUICK CHIPS SUGGESTIONS */}
                  <div className="p-4 bg-slate-950 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Summarize this chapter for me." : "ଏହି ଅଧ୍ୟାୟର ଏକ ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଦିଅ।")}
                      className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-bold !text-white active:scale-95 transition-all"
                    >
                      📝 {language === 'en' ? 'Summarize Guide' : 'ସାରାଂଶ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Give me an MCQ test based on this chapter notes." : "ଏହି ଅଧ୍ୟାୟରୁ ମୋତେ ଗୋଟିଏ MCQ ଟେଷ୍ଟ ପ୍ରଶ୍ନ ପଚାର।")}
                      className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-bold !text-white active:scale-95 transition-all"
                    >
                      ⚡ {language === 'en' ? 'Ask me MCQ' : 'MCQ ପ୍ରଶ୍ନ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Explain the most important formulas of this chapter." : "ଏହି ଅଧ୍ୟାୟର ସବୁଠାରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ରଗୁଡ଼ିକ ବୁଝାଅ।")}
                      className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-bold !text-white active:scale-95 transition-all"
                    >
                      📐 {language === 'en' ? 'Explain Formulas' : 'ମୁଖ୍ୟ ସୂତ୍ର'}
                    </button>
                  </div>

                  {/* Chat Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendToGundulu(inputValue);
                    }}
                    className="p-4 bg-slate-950 border-t border-white/5 flex items-center gap-3"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={language === 'en' ? 'Ask Gundulu about this chapter...' : 'ଏହି ଅଧ୍ୟାୟ ବିଷୟରେ ଗୁନ୍ଦୁଲୁକୁ ପଚାରନ୍ତୁ...'}
                      className="flex-1 bg-slate-900 border border-white/5 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isAiLoading}
                      className="p-3.5 rounded-2xl bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                    >
                      <Lucide.Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};


