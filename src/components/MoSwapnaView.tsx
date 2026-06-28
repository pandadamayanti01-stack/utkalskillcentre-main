import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { getAI, withRetry, cleanOdiaOrthography } from '../services/aiService';

interface MoSwapnaViewProps {
  language: 'en' | 'or';
  onBack: () => void;
  user: any;
}

interface CareerRoadmap {
  id: string;
  category: 'government' | 'private' | 'odisha';
  titleEn: string;
  titleOr: string;
  icon: string;
  gradient: string;
  glowColor: string;
  taglineEn: string;
  taglineOr: string;
  examsEn: string[];
  examsOr: string[];
  milestones: {
    stage: string;
    titleEn: string;
    titleOr: string;
    descEn: string;
    descOr: string;
  }[];
  roleModels: {
    name: string;
    descEn: string;
    descOr: string;
  }[];
}

const CAREER_DATABASE: CareerRoadmap[] = [
  // A. Government Sector
  {
    id: 'civil_services',
    category: 'government',
    titleEn: 'Civil Services (IAS/IPS)',
    titleOr: 'ପ୍ରଶାସନିକ ସେବା (IAS/IPS)',
    icon: 'Landmark',
    gradient: 'from-amber-600/20 to-orange-600/20',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    taglineEn: 'Lead and serve the nation as an administrator.',
    taglineOr: 'ଜଣେ ପ୍ରଶାସକ ଭାବରେ ଦେଶ ଏବଂ ସମାଜର ସେବା କରନ୍ତୁ।',
    examsEn: ['UPSC Civil Services', 'OPSC State Services', 'IPS/IFS Entry'],
    examsOr: ['UPSC ସିଭିଲ୍ ସେବା', 'OPSC ରାଜ୍ୟ ସେବା', 'IPS/IFS ପ୍ରବେଶ'],
    milestones: [
      { stage: '1', titleEn: 'Schooling (Class 6-10)', titleOr: 'ବିଦ୍ୟାଳୟ ଶିକ୍ଷା (୬-୧୦ ଶ୍ରେଣୀ)', descEn: 'Focus on Social Science, History, Geography, and current affairs. Develop a strong reading habit.', descOr: 'ସାମାଜିକ ବିଜ୍ଞାନ, ଇତିହାସ, ଭୂଗୋଳ ଏବଂ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ଉପରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ।' },
      { stage: '2', titleEn: 'Higher Secondary (+2)', titleOr: 'ଉଚ୍ଚ ମାଧ୍ୟମିକ (+୨ ଶିକ୍ଷା)', descEn: 'Choose any stream (Arts, Science, or Commerce). Arts gives a solid background for humanities.', descOr: 'ଆପଣଙ୍କ ପସନ୍ଦର ଯେକୌଣସି ବିଷୟ ରଖି ପଢ଼ନ୍ତୁ। କଳା (Arts) ବିଷୟ ଅଧିକ ସହାୟକ ହୋଇଥାଏ।' },
      { stage: '3', titleEn: 'Graduation', titleOr: 'ସ୍ନାତକ (Graduation)', descEn: 'Earn a bachelor\'s degree in any field. Begin basic UPSC syllabus preparation alongside.', descOr: 'ଯେକୌଣସି ବିଷୟରେ ଡିଗ୍ରୀ ହାସଲ କରନ୍ତୁ। ଏହା ସହିତ ସିଭିଲ୍ ସେବା ପାଠ୍ୟକ୍ରମର ପ୍ରସ୍ତୁତି ଆରମ୍ଭ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'UPSC Exam', titleOr: 'ସିଭିଲ୍ ସେବା ପରୀକ୍ଷା', descEn: 'Appear for the UPSC Civil Services Examination (Prelims, Mains, and Interview).', descOr: 'UPSC ସିଭିଲ୍ ସେବା ପରୀକ୍ଷା (ପ୍ରିଲିମ୍ସ, ମେନ୍ସ ଏବଂ ସାକ୍ଷାତକାର) ଦିଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. Krishan Kumar', descEn: 'Renowned IAS officer known for transformative infrastructure works in Odisha.', descOr: 'ଓଡ଼ିଶାରେ ଭିତ୍ତିଭୂମି ବିକାଶ ପାଇଁ ପ୍ରସିଦ୍ଧ ଜଣେ ଦକ୍ଷ ପ୍ରଶାସକ।' }
    ]
  },
  {
    id: 'govt_doctor',
    category: 'government',
    titleEn: 'Government Doctor / Medical Officer',
    titleOr: 'ସରକାରୀ ଡାକ୍ତର (Medical Officer)',
    icon: 'Stethoscope',
    gradient: 'from-emerald-600/20 to-teal-600/20',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    taglineEn: 'Provide healthcare and save lives in public hospitals.',
    taglineOr: 'ସରକାରୀ ମେଡିକାଲ୍ ଏବଂ ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ରରେ ଚିକିତ୍ସା କରି ଜୀବନ ରକ୍ଷା କରନ୍ତୁ।',
    examsEn: ['NEET-UG', 'NEET-PG', 'OPSC Medical Services Recruitment'],
    examsOr: ['NEET-UG ପ୍ରବେଶ', 'NEET-PG ପରୀକ୍ଷା', 'OPSC ମେଡିକାଲ୍ ସେବା ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'High School', titleOr: 'ବିଦ୍ୟାଳୟ ଶିକ୍ଷା', descEn: 'Focus deeply on Biology, Chemistry, and Physics in Classes 9 and 10.', descOr: 'ଶ୍ରେଣୀ ୯ ଏବଂ ୧୦ ରେ ଜୀବବିଜ୍ଞାନ, ରସାୟନ ବିଜ୍ଞାନ ଏବଂ ଭୌତିକ ବିଜ୍ଞାନକୁ ଭଲ ଭାବରେ ପଢ଼ନ୍ତୁ।' },
      { stage: '2', titleEn: 'Higher Secondary (+2 Science)', titleOr: '+୨ ବିଜ୍ଞାନ ଶିକ୍ଷା', descEn: 'Take Biology, Physics, and Chemistry (PCB). Prepare for medical entrance examinations.', descOr: 'ଭୌତିକ, ରସାୟନ ଏବଂ ଜୀବବିଜ୍ଞାନ (PCB) ବିଷୟ ରଖି ପଢ଼ନ୍ତୁ ଏବଂ ପ୍ରବେଶିକା ପରୀକ୍ଷା ପାଇଁ ପ୍ରସ୍ତୁତ ହୁଅନ୍ତୁ।' },
      { stage: '3', titleEn: 'NEET Exam & MBBS', titleOr: 'NEET ପରୀକ୍ଷା ଓ MBBS ଡିଗ୍ରୀ', descEn: 'Clear NEET-UG to enter a medical college. Complete the 5.5-year MBBS degree including internship.', descOr: 'NEET ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ ମେଡିକାଲ୍ କଲେଜରେ ପ୍ରବେଶ କରନ୍ତୁ। ୫.୫ ବର୍ଷର MBBS ପାଠ୍ୟକ୍ରମ ସମାପ୍ତ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Medical Officer Recruitment', titleOr: 'ମେଡିକାଲ୍ ଅଫିସର ନିଯୁକ୍ତି', descEn: 'Clear OPSC Medical Services or UPSC Combined Medical Services to get a government posting.', descOr: 'OPSC ମେଡିକାଲ୍ ସେବା ପରୀକ୍ଷା ଦେଇ ସରକାରୀ ହସ୍ପିଟାଲରେ ନିଯୁକ୍ତି ପାଆନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. Ramachandra Dandapat', descEn: 'Legendary doctor from Odisha dedicated to serving rural populations.', descOr: 'ଗ୍ରାମାଞ୍ଚଳରେ ନିରଳସ ସେବା ପ୍ରଦାନ କରିଥିବା ଓଡ଼ିଶାର ଜଣେ କିମ୍ବଦନ୍ତୀ ଚିକିତ୍ସକ।' }
    ]
  },
  {
    id: 'govt_nurse',
    category: 'government',
    titleEn: 'Government Nurse (Staff Nurse)',
    titleOr: 'ସରକାରୀ ନର୍ସ (Staff Nurse / ANM)',
    icon: 'Activity',
    gradient: 'from-cyan-600/20 to-sky-600/20',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    taglineEn: 'The backbone of medical service and patient care.',
    taglineOr: 'ରୋଗୀଙ୍କ ନିରନ୍ତର ସେବା ଓ ଯତ୍ନ ନେବା ପାଇଁ ଏକ ମହାନ କ୍ୟାରିଅର୍।',
    examsEn: ['OSSC Nursing Exam', 'AIIMS Nursing Officer Exam'],
    examsOr: ['OSSC ନର୍ସିଂ ପରୀକ୍ଷା', 'AIIMS ନର୍ସିଂ ଅଫିସର ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Schooling (Class 10)', titleOr: 'ଶାସନି ଶିକ୍ଷା (୧୦ମ)', descEn: 'Build basic knowledge in general science, health education, and biology.', descOr: 'ବିଜ୍ଞାନ ଏବଂ ଜୀବବିଜ୍ଞାନର ସାଧାରଣ ନିୟମଗୁଡ଼ିକୁ ଭଲ ଭାବରେ ବୁଝନ୍ତୁ।' },
      { stage: '2', titleEn: 'Nursing Course', titleOr: 'ନର୍ସିଂ ପାଠ୍ୟକ୍ରମ (GNM / B.Sc)', descEn: 'Enroll in GNM (General Nursing and Midwifery) or B.Sc Nursing in a government-recognized institute.', descOr: 'GNM କିମ୍ବା B.Sc ନର୍ସିଂ ପାଠ୍ୟକ୍ରମରେ ନାମ ଲେଖାଇ ଶିକ୍ଷା ଗ୍ରହଣ କରନ୍ତୁ।' },
      { stage: '3', titleEn: 'Registration', titleOr: 'ନର୍ସିଂ କାଉନସିଲ୍ ପଞ୍ଜିକରଣ', descEn: 'Register with the State Nursing Council (ONMRC) as a registered nurse.', descOr: 'ଓଡ଼ିଶା ନର୍ସିଂ କାଉନସିଲ୍‌ରେ ନିଜ ନାମ ପଞ୍ଜିକରଣ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Staff Nurse Recruitment', titleOr: 'ନିଯୁକ୍ତି ପରୀକ୍ଷା', descEn: 'Apply and clear OSSC Nursing Officer recruitment exams for government hospital placements.', descOr: 'ସରକାରୀ ହସ୍ପିଟାଲ୍‌ରେ ସ୍ଥାୟୀ ନିଯୁକ୍ତି ପାଇଁ ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSC) ପରୀକ୍ଷା ଦିଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Kunti Lawrence', descEn: 'Award-winning nurse dedicated to healthcare and patient advocacy.', descOr: 'ରୋଗୀଙ୍କ ନିଷ୍ଠାପର ସେବା ପାଇଁ ସମ୍ମାନିତ ଜଣେ ଆଦର୍ଶ ନର୍ସ।' }
    ]
  },
  {
    id: 'defense_forces',
    category: 'government',
    titleEn: 'Defense Forces (Army/Navy/Air Force)',
    titleOr: 'ପ୍ରତିରକ୍ଷା ବାହିନୀ (ଥଳ, ଜଳ ଓ ଆକାଶ ସେନା)',
    icon: 'Shield',
    gradient: 'from-blue-600/20 to-indigo-600/20',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    taglineEn: 'Protect the borders and sovereignty of the nation.',
    taglineOr: 'ଦେଶର ସୀମା ଓ ସୁରକ୍ଷା ପାଇଁ ଗର୍ବର ସହ ସୈନ୍ୟବାହିନୀରେ ଯୋଗ ଦିଅନ୍ତୁ।',
    examsEn: ['NDA (National Defence Academy)', 'CDS Exam', 'AFACT (Air Force)'],
    examsOr: ['NDA (ଜାତୀୟ ପ୍ରତିରକ୍ଷା ଏକାଡେମୀ)', 'CDS ମିଳିତ ପରୀକ୍ଷା', 'AFACT (ଆକାଶ ସେନା ପରୀକ୍ଷା)'],
    milestones: [
      { stage: '1', titleEn: 'Physical Fitness & Studies', titleOr: 'ଶାରୀରିକ ଯୋଗ୍ୟତା ଓ ପାଠପଢ଼ା', descEn: 'Maintain excellent physical health, participate in sports/NCC, and focus on Mathematics and Physics.', descOr: 'ଉତ୍ତମ ଶାରୀରିକ ସ୍ୱାସ୍ଥ୍ୟ ବଜାୟ ରଖନ୍ତୁ, NCC କିମ୍ବା କ୍ରୀଡ଼ାରେ ଯୋଗ ଦିଅନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Higher Secondary', titleOr: '+୨ ଶିକ୍ଷା (ବିଜ୍ଞାନ ଅଧିକ ସହାୟକ)', descEn: 'Complete Class 12. Focus on Physics and Mathematics if aiming for Navy/Air Force.', descOr: 'ଦ୍ୱାଦଶ ଶ୍ରେଣୀ ପାସ୍ କରନ୍ତୁ। ନୌସେନା ଓ ବାୟୁସେନା ପାଇଁ ଗଣିତ ଓ ପଦାର୍ଥ ବିଜ୍ଞାନ ଆବଶ୍ୟକ।' },
      { stage: '3', titleEn: 'NDA Entrance Exam', titleOr: 'NDA ପ୍ରବେଶିକା ପରୀକ୍ଷା', descEn: 'Apply for NDA exam conducted by UPSC during or after Class 12. Clear SSB Interview.', descOr: 'ଦ୍ୱାଦଶ ଶ୍ରେଣୀ ପରେ UPSC ଦ୍ୱାରା ପରିଚାଳିତ NDA ପରୀକ୍ଷା ଏବଂ SSB ସାକ୍ଷାତକାର ଉତ୍ତୀର୍ଣ୍ଣ ହୁଅନ୍ତୁ।' },
      { stage: '4', titleEn: 'Military Academy Training', titleOr: 'ପ୍ରତିରକ୍ଷା ଏକାଡେମୀ ପ୍ରଶିକ୍ଷଣ', descEn: 'Complete 3-4 years of rigorous training in Pune/Dehradun to be commissioned as a Lieutenant or Officer.', descOr: 'NDA/IMA ରେ କଠିନ ତାଲିମ ସମାପ୍ତ କରି ସେନାବାହିନୀରେ ଅଫିସର (Lieutenant) ଭାବେ ଯୋଗ ଦିଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'General Bipin Rawat', descEn: 'India\'s first Chief of Defence Staff, an inspiration for young soldiers.', descOr: 'ଭାରତର ପ୍ରଥମ ଚିଫ୍ ଅଫ୍ ଡିଫେନ୍ସ ଷ୍ଟାଫ୍, ଯିଏ ଯୁବପିଢ଼ିଙ୍କ ପାଇଁ ପ୍ରେରଣାର ଉତ୍ସ।' }
    ]
  },
  {
    id: 'space_scientist',
    category: 'government',
    titleEn: 'Space Scientist (ISRO / DRDO)',
    titleOr: 'ବୈଜ୍ଞାନିକ (ISRO / DRDO / Space Research)',
    icon: 'Rocket',
    gradient: 'from-purple-600/20 to-pink-600/20',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    taglineEn: 'Build rockets, design satellites, and explore outer space.',
    taglineOr: 'ରକେଟ୍ ନିର୍ମାଣ, କୃତ୍ରିମ ଉପଗ୍ରହ ଡିଜାଇନ୍ ଏବଂ ମହାକାଶ ଗବେଷଣା କରନ୍ତୁ।',
    examsEn: ['JEE Advanced (for IIST)', 'ISRO Centralised Recruitment Board (ICRB)', 'GATE Exam'],
    examsOr: ['JEE Advanced (IIST କଲେଜ)', 'ISRO କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି ପରୀକ୍ଷା', 'GATE ପ୍ରବେଶ ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Class 6-10 Foundation', titleOr: 'ଶିକ୍ଷାର ମୂଳଦୁଆ', descEn: 'Develop strong logic in Mathematics and core physics. Build curiosity about outer space and astronomical events.', descOr: 'ଗଣିତ ଏବଂ ପଦାର୍ଥ ବିଜ୍ଞାନରେ ଗଭୀର ରୁଚି ରଖନ୍ତୁ। ବିଜ୍ଞାନ ପ୍ରକଳ୍ପରେ ଯୋଗ ଦିଅନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science (PCM)', titleOr: '+୨ ବିଜ୍ଞាន ଶିକ୍ଷା (PCM)', descEn: 'Choose Physics, Chemistry, and Mathematics. Aim for top engineering colleges or IIST.', descOr: 'ଗଣିତ, ପଦାର୍ଥ ଓ ରସାୟନ ବିଜ୍ଞାନ ରଖନ୍ତୁ। IIST (Indian Institute of Space Science and Technology) କୁ ଲକ୍ଷ୍ୟ ରଖନ୍ତୁ।' },
      { stage: '3', titleEn: 'Engineering / Physics Degree', titleOr: 'ଉଚ୍ଚତର ଡିଗ୍ରୀ (B.Tech / Physics)', descEn: 'Complete B.Tech in Aerospace, Electronics, Mechanical or M.Sc in Astrophysics/Physics.', descOr: 'B.Tech (Aerospace/Electronics/Mechanical) କିମ୍ବା Astrophysics ରେ ଡିଗ୍ରୀ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Join ISRO', titleOr: 'ISRO ରେ ଯୋଗଦାନ', descEn: 'Clear the ISRO Centralised Recruitment Board (ICRB) exam or get directly selected from IIST.', descOr: 'ISRO କେନ୍ଦ୍ରୀୟ ଚୟନ ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୁଅନ୍ତୁ କିମ୍ବା ଗବେଷଣା ବୈଜ୍ଞାନିକ ଭାବେ ଯୋଗ ଦିଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. APJ Abdul Kalam', descEn: 'The Missile Man of India, space pioneer and former President of India.', descOr: 'ଭାରତର ମିସାଇଲ୍ ମ୍ୟାନ୍ ଓ ପୂର୍ବତନ ରାଷ୍ଟ୍ରପତି, ମହାକାଶ ବିଜ୍ଞାନର ଅଗ୍ରଦୂତ।' }
    ]
  },

  // B. Private Sector
  {
    id: 'ai_specialist',
    category: 'private',
    titleEn: 'AI & Data Scientist',
    titleOr: 'ଏଆଇ ଓ ଡାଟା ବିଶେଷଜ୍ଞ (AI & Data Scientist)',
    icon: 'Cpu',
    gradient: 'from-violet-600/20 to-fuchsia-600/20',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    taglineEn: 'Build artificial intelligence models and predict the future.',
    taglineOr: 'ଆର୍ଟିଫିସିଆଲ୍ ଇଣ୍ଟେଲିଜେନ୍ସ (AI) ମଡେଲ୍ ଏବଂ ଆଲଗୋରିଦମ ତିଆରି କରନ୍ତୁ।',
    examsEn: ['JEE Main / Advanced', 'BITSAT', 'GATE (Computer Science)'],
    examsOr: ['JEE Main / Advanced', 'BITSAT ପ୍ରବେଶ', 'GATE (କମ୍ପ୍ୟୁଟର ବିଜ୍ଞାନ)'],
    milestones: [
      { stage: '1', titleEn: 'Coding Foundation', titleOr: 'କୋଡିଂ ଓ ଯୁକ୍ତିର ମୂଳଦୁଆ', descEn: 'Learn logical reasoning, statistics, and basic programming (Python/Scratch) in school.', descOr: 'ଗଣିତ, ପରିସଂଖ୍ୟାନ ଏବଂ ପ୍ରାରମ୍ଭିକ କୋଡିଂ (Python) ଶିଖନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science (PCM & CS)', titleOr: '+୨ ବିଜ୍ଞାନ (PCM & CS)', descEn: 'Take Mathematics, Physics, Chemistry, and Computer Science.', descOr: 'PCM ସହିତ କମ୍ପ୍ୟୁଟର ବିଜ୍ଞାନକୁ ଇଚ୍ଛାଧୀନ ବିଷୟ ଭାବେ ରଖନ୍ତୁ।' },
      { stage: '3', titleEn: 'B.Tech / B.Sc in Data Science', titleOr: 'କମ୍ପ୍ୟୁଟର ବିଜ୍ଞାନରେ ସ୍ନାତକ', descEn: 'Pursue B.Tech in Computer Science, Artificial Intelligence, or B.Sc in Data Science/Statistics.', descOr: 'କମ୍ପ୍ୟୁଟର ବିଜ୍ଞାନ କିମ୍ବା AI & Machine Learning ରେ B.Tech ଶିକ୍ଷା ଶେଷ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Industry Specialist', titleOr: 'AI ଇଣ୍ଡଷ୍ଟ୍ରି ବିଶେଷଜ୍ଞ', descEn: 'Build AI projects, learn Deep Learning, and join leading global AI labs or tech startups.', descOr: 'ମେସିନ୍ ଲର୍ଣ୍ଣିଂ ଓ ଡିପ୍ ଲର୍ଣ୍ଣିଂ ଶିଖି ବଡ଼ ଟେକ୍ କମ୍ପାନୀରେ AI ଡେଭଲପର୍ ଭାବେ ଯୋଗ ଦିଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Anuradha Acharya', descEn: 'Pioneering bioinformatics and tech entrepreneur utilizing big data.', descOr: 'ବିଗ୍ ଡାଟା ଓ ବାୟୋଇନଫର୍ମାଟିକ୍ସ କ୍ଷେତ୍ରରେ କାର୍ଯ୍ୟରତ ପ୍ରସିଦ୍ଧ ଭାରତୀୟ ଟେକ୍ ଉଦ୍ୟୋଗୀ।' }
    ]
  },
  {
    id: 'content_creator',
    category: 'private',
    titleEn: 'Content Creator & YouTuber',
    titleOr: 'ୟୁଟ୍ୟୁବର୍ ଓ ଭିଡିଓ କ୍ରିଏଟର (Content Creator)',
    icon: 'Youtube',
    gradient: 'from-rose-600/20 to-red-600/20',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    taglineEn: 'Express ideas, build an audience, and create digital media.',
    taglineOr: 'ନିଜର ପ୍ରତିଭା ଓ ଭିଡିଓ ମାଧ୍ୟମରେ ଲୋକଙ୍କୁ ଶିକ୍ଷା ବା ମନୋରଞ୍ଜନ ପ୍ରଦାନ କରନ୍ତୁ।',
    examsEn: ['No Formal Exam', 'Courses in Digital Marketing & Video Editing'],
    examsOr: ['କୌଣସି ପରୀକ୍ଷା ଆବଶ୍ୟକ ନାହିଁ', 'ଡିଜିଟାଲ୍ ମାର୍କେଟିଂ ଓ ଭିଡିଓ ଏଡିଟିଂ ପାଠ୍ୟକ୍ରମ'],
    milestones: [
      { stage: '1', titleEn: 'Find Your Passion', titleOr: 'ନିଜର ରୁଚି ଚିହ୍ନଟ କରନ୍ତୁ', descEn: 'Discover what you love (science, comedy, teaching, arts, gaming) and practice storytelling.', descOr: 'ଆପଣ କେଉଁଥିରେ ଭଲ (ବିଜ୍ଞାନ, କଳା, ଗେମିଂ, ଶିକ୍ଷା) ତାହା ଜାଣନ୍ତୁ ଏବଂ କହିବା ଶୈଳୀ ସୁଧାରନ୍ତୁ।' },
      { stage: '2', titleEn: 'Learn Digital Skills', titleOr: 'ଡିଜିଟାଲ୍ ଦକ୍ଷତା ହାସଲ', descEn: 'Learn basic video editing, graphic design, and audio recording. Start a small YouTube channel or blog.', descOr: 'ଭିଡିଓ ଏଡିଟିଂ, ଗ୍ରାଫିକ୍ ଡିଜାଇନ୍ ଏବଂ ଅଡିଓ ରେକର୍ଡିଂର ପ୍ରାଥମିକ ଜ୍ଞାନ ଶିଖନ୍ତୁ।' },
      { stage: '3', titleEn: 'Communication & Media Degree', titleOr: 'ଉଚ୍ଚତର ଶିକ୍ଷା (ଇଚ୍ଛାଧୀନ)', descEn: 'A degree in Journalism, Mass Communication, or Digital Media helps refine storytelling and production.', descOr: 'ଜର୍ଣ୍ଣାଲିଜିମ୍ କିମ୍ବା ଗଣଯୋଗାଯୋଗରେ ଶିକ୍ଷା କାର୍ଯ୍ୟକ୍ରମ ସାହାଯ୍ୟ କରିଥାଏ।' },
      { stage: '4', titleEn: 'Build Your Brand', titleOr: 'ଡିଜିଟାଲ୍ କ୍ୟାରିଅର୍ ପ୍ରତିଷ୍ଠା', descEn: 'Consistently upload valuable content, build an online community, and monetize through sponsors/ads.', descOr: 'ନିୟମିତ ଭାବେ ଉତ୍ତମ ଭିଡିଓ ପ୍ରସ୍ତୁତ କରି ନିଜର ଦର୍ଶକ ସଂଖ୍ୟା ବଢ଼ାନ୍ତୁ ଓ ଆୟ ଆରମ୍ଭ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Technical Guruji', descEn: 'One of the world\'s largest tech YouTubers creating massive value in technology review.', descOr: 'ଟେକ୍ନୋଲୋଜି କ୍ଷେତ୍ରରେ ପୃଥିବୀର ଅନ୍ୟତମ ବୃହତ୍ତମ ଭାରତୀୟ ୟୁଟ୍ୟୁବର୍।' }
    ]
  },
  {
    id: 'chartered_accountant',
    category: 'private',
    titleEn: 'Chartered Accountant (CA)',
    titleOr: 'ଚାର୍ଟାର୍ଡ ଆକାଉଣ୍ଟାଣ୍ଟ (CA)',
    icon: 'TrendingUp',
    gradient: 'from-amber-600/20 to-yellow-600/20',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    taglineEn: 'Manage financial audits, taxation, and corporate wealth.',
    taglineOr: 'ବଡ଼ ବଡ଼ କମ୍ପାନୀର ଟିକସ, ଅଡିଟିଂ ଏବଂ ଆର୍ଥିକ ହିସାବ କାର୍ଯ୍ୟ ପରିଚାଳନା କରନ୍ତୁ।',
    examsEn: ['CA Foundation', 'CA Intermediate', 'CA Final (ICAI)'],
    examsOr: ['CA ଫାଉଣ୍ଡେସନ୍', 'CA ଇଣ୍ଟରମିଡିଏଟ୍', 'CA ଫାଇନାଲ୍ ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Mathematics & Logical Analytics', titleOr: 'ଗଣିତ ଓ ମାନସିକ ଦକ୍ଷତା', descEn: 'Build speed in calculation and analytics in high school. Focus on details.', descOr: 'ଶୀଘ୍ର ହିସାବ କରିବା ଏବଂ ଗାଣିତିକ ଯୁକ୍ତିର ଅଭ୍ୟାସ ବିଦ୍ୟାଳୟ ସ୍ତରରୁ କରନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Commerce', titleOr: '+୨ ବାଣିଜ୍ୟ ଶିକ୍ଷା (Commerce)', descEn: 'Choose Commerce stream with Accountancy, Business Studies, and Mathematics.', descOr: 'ବାଣିଜ୍ୟ ବିଭାଗରେ ଆକାଉଣ୍ଟାନ୍ସି, ଗଣିତ ଏବଂ ଅର୍ଥଶାସ୍ତ୍ର ବିଷୟ ରଖି ପଢ଼ନ୍ତୁ।' },
      { stage: '3', titleEn: 'CA Foundation & Articleship', titleOr: 'CA ଫାଉଣ୍ଡେସନ୍ ପରୀକ୍ଷା', descEn: 'Register with ICAI and clear CA Foundation. Complete the 3-year practical internship (Articleship).', descOr: 'ICAI ରେ ପଞ୍ଜିକୃତ ହୋଇ ଫାଉଣ୍ଡେସନ୍ ପାସ୍ କରନ୍ତୁ ଏବଂ ସିଏ ଅଧୀନରେ ୩ ବର୍ଷର ପ୍ରଶିକ୍ଷଣ ନିଅନ୍ତୁ।' },
      { stage: '4', titleEn: 'CA Final & Membership', titleOr: 'CA ଫାଇନାଲ୍ ଓ ଲାଇସେନ୍ସ', descEn: 'Clear CA Intermediate and CA Final to practice as a certified Chartered Accountant.', descOr: 'CA ଫାଇନାଲ୍ ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ ଜଣେ ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ଚାର୍ଟାର୍ଡ ଆକାଉଣ୍ଟାଣ୍ଟ ବନନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Kumar Mangalam Birla', descEn: 'Renowned industrialist and qualified Chartered Accountant leading the Aditya Birla Group.', descOr: 'ଆଦିତ୍ୟ ବିର୍ଲା ଗ୍ରୁପ୍‌ର ମୁଖ୍ୟ, ଯିଏ ଜଣେ ପ୍ରତିଷ୍ଠିତ ଚାର୍ଟାର୍ଡ ଆକାଉଣ୍ଟାଣ୍ଟ ମଧ୍ୟ।' }
    ]
  },

  // C. Odisha Specific
  {
    id: 'odisha_civil_services',
    category: 'odisha',
    titleEn: 'Odisha Civil Services (OAS/OPS)',
    titleOr: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OAS/OPS)',
    icon: 'Building',
    gradient: 'from-amber-600/20 to-orange-700/20',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    taglineEn: 'Direct administrative management of blocks and districts in Odisha.',
    taglineOr: 'ଓଡ଼ିଶାର ବିଭିନ୍ନ ବ୍ଲକ୍ ଏବଂ ଜିଲ୍ଲାର ପ୍ରତ୍ୟକ୍ଷ ଶାସନ ଓ ବିକାଶ ପରିଚାଳନା କରନ୍ତୁ।',
    examsEn: ['OPSC Odisha Civil Services Examination (OCSE)'],
    examsOr: ['OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସେବା ପରୀକ୍ଷା (OCSE)'],
    milestones: [
      { stage: '1', titleEn: 'Schooling (Odisha History & Geography)', titleOr: 'ଭୂଗୋଳ ଓ ଓଡ଼ିଶା ଇତିହାସ', descEn: 'Learn deeply about Odisha\'s rivers, history, mineral resources, and Odia literature.', descOr: 'ଓଡ଼ିଶାର ଇତିହାସ, ଭୂଗୋଳ, ନଦୀ ଏବଂ ସଂସ୍କୃତି ବିଷୟରେ ଜ୍ଞାନ ବଢ଼ାନ୍ତୁ।' },
      { stage: '2', titleEn: 'Any stream in +2 / +3', titleOr: '+୨ କିମ୍ବା +୩ ଶିକ୍ଷା', descEn: 'Complete intermediate and graduation in any stream from a recognized university.', descOr: 'ଯେକୌଣସି ବିଭାଗରେ +୨ ଏବଂ ସ୍ନାତକ ଡିଗ୍ରୀ ଶେଷ କରନ୍ତୁ।' },
      { stage: '3', titleEn: 'OPSC Preparation', titleOr: 'OPSC ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି', descEn: 'Prepare for OPSC exam with a focus on Odisha GK, current state schemes, and Odia language paper.', descOr: 'ଓଡ଼ିଶାର ଯୋଜନା, ସାଧାରଣ ଜ୍ଞାନ ଏବଂ ଓଡ଼ିଆ ଭାଷା ବିଷୟ ଉପରେ ଗୁରୁତ୍ୱ ଦେଇ ଓପିଏସସି ପ୍ରସ୍ତୁତି କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Clear OPSC & Join as OAS/OPS', titleOr: 'OAS / OPS ଭାବେ ଯୋଗଦାନ', descEn: 'Clear Prelims, Mains, and Interview to get posted as Block Development Officer (BDO) or DSP.', descOr: 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ BDO କିମ୍ବା DSP ଭାବେ ସେବା ଆରମ୍ଭ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Gopabandhu Das', descEn: 'Social worker, reformer, and political leader of Odisha (Utkal Mani).', descOr: 'ଉତ୍କଳମଣି ଗୋପବନ୍ଧୁ ଦାସ, ଯିଏ ଓଡ଼ିଶାର ଜନସେବାର ଶ୍ରେଷ୍ଠ ପ୍ରତୀକ।' }
    ]
  },
  {
    id: 'oavs_teacher',
    category: 'odisha',
    titleEn: 'Odisha School Teacher (OAVS/OES)',
    titleOr: 'ଓଡ଼ିଶା ଆଦର୍ଶ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ (OAVS)',
    icon: 'BookOpen',
    gradient: 'from-teal-600/20 to-emerald-700/20',
    glowColor: 'rgba(20, 184, 166, 0.45)',
    taglineEn: 'Educate children in rural Odisha through model schools.',
    taglineOr: 'ଓଡ଼ିଶାର ଆଦର୍ଶ ଏବଂ ସରକାରୀ ବିଦ୍ୟାଳୟରେ ଯୁବପିଢ଼ିଙ୍କୁ ଗଢ଼ି ତୋଳନ୍ତୁ।',
    examsEn: ['OAVS Entrance Exam', 'OTET (Odisha Teacher Eligibility Test)', 'OSSTET'],
    examsOr: ['OAVS ଶିକ୍ଷକ ନିଯୁକ୍ତି ପରୀକ୍ଷା', 'OTET (ଓଡ଼ିଶା ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା)', 'OSSTET'],
    milestones: [
      { stage: '1', titleEn: 'High School Foundation', titleOr: 'ବିଦ୍ୟାଳୟ ଶିକ୍ଷା', descEn: 'Achieve excellent scores in Matriculation. Pick your favorite subjects to specialize in.', descOr: 'ମାଟ୍ରିକ୍ ପରୀକ୍ଷାରେ ଭଲ ନମ୍ବର ରଖନ୍ତୁ। ନିଜର ପ୍ରିୟ ବିଷୟ ଉପରେ ଦକ୍ଷତା ବଢ଼ାନ୍ତୁ।', },
      { stage: '2', titleEn: 'Graduation (+3)', titleOr: 'ସ୍ନାତକ ଶିକ୍ଷା (+୩)', descEn: 'Complete B.Sc or B.A in your chosen teaching subjects (Physics, Math, Chemistry, Bio, Odia, English).', descOr: 'କଳା ବା ବିଜ୍ଞାନରେ ନିଜ ପ୍ରିୟ ଶିକ୍ଷା ବିଷୟ ନେଇ ସ୍ନାତକ ସମାପ୍ତ କରନ୍ତୁ।' },
      { stage: '3', titleEn: 'B.Ed Course & OTET', titleOr: 'B.Ed ପାଠ୍ୟକ୍ରମ ଓ OTET ପରୀକ୍ଷା', descEn: 'Complete Bachelor of Education (B.Ed) course. Pass OTET or OSSTET examinations.', descOr: 'B.Ed (ଶିକ୍ଷକ ପ୍ରଶିକ୍ଷଣ) ସମାପ୍ତ କରି OTET କିମ୍ବା OSSTET ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୁଅନ୍ତୁ।' },
      { stage: '4', titleEn: 'OAVS Teacher Selection', titleOr: 'ଶିକ୍ଷକ ଭାବେ ନିଯୁକ୍ତି', descEn: 'Clear the OAVS (Odisha Adarsha Vidyalaya Sangathan) recruitment exam for placement in model English medium schools.', descOr: 'OAVS ନିଯୁକ୍ତି ପରୀକ୍ଷା ଦେଇ ଓଡ଼ିଶାର ଆଦର୍ଶ ମଡେଲ୍ ସ୍କୁଲ୍‌ରେ ଶିକ୍ଷକତା ଆରମ୍ଭ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Chandra Sekhar Behera', descEn: 'Eminent educationist and freedom fighter from Sambalpur, Odisha.', descOr: 'ସମ୍ବଲପୁରର ପ୍ରତିଷ୍ଠିତ ଶିକ୍ଷାବିତ୍ ତଥା ମୁକ୍ତି ସଂଗ୍ରାମୀ।' }
    ]
  },
  {
    id: 'mining_geologist',
    category: 'odisha',
    titleEn: 'Mining Engineer & Geologist (OMC/MCL)',
    titleOr: 'ଖଣି ଇଞ୍ଜିନିୟର୍ ଓ ଭୂତତ୍ତ୍ୱବିତ୍ (OMC/MCL)',
    icon: 'HardHat',
    gradient: 'from-amber-700/20 to-yellow-800/20',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    taglineEn: 'Manage mineral resource excavation in Odisha\'s rich mining sector.',
    taglineOr: 'ଓଡ଼ିଶାର ସମୃଦ୍ଧ ଖଣି ସମ୍ପଦର ଉତ୍ତୋଳନ, ଗବେଷଣา ଏବଂ ସୁରକ୍ଷା ପରିଚାଳନା କରନ୍ତୁ।',
    examsEn: ['JEE Advanced (for IIT ISM)', 'GATE (Mining/Geology)', 'OMC Recruitment Exam'],
    examsOr: ['JEE Advanced (IIT ISM Dhanbad)', 'GATE (ଖଣି/ଭୂତତ୍ତ୍ୱ)', 'OMC ନିଯୁକ୍ତି ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Science & Geography', titleOr: 'ଭୂଗୋଳ ଓ ଭୌତିକ ବିଜ୍ଞାନ', descEn: 'Build curiosity in earth sciences, rocks, minerals, and geography in school.', descOr: 'ଭୂଗୋଳ, ପଥର, ଖଣିଜ ଦ୍ରବ୍ୟ ଓ ପୃଥିବୀ ସଂରଚନା ବିଷୟରେ ବିଦ୍ୟାଳୟରେ ଭଲ ଭାବରେ ପଢ଼ନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science (PCM)', titleOr: '+୨ ବିଜ୍ଞାନ (PCM)', descEn: 'Take PCM (Physics, Chemistry, Math). Focus on clearing engineering entrance exams.', descOr: 'PCM ବିଷୟ ରଖି ପଢ଼ନ୍ତୁ ଏବଂ ଇଞ୍ଜିନିୟରିଂ ଏଣ୍ଟ୍ରାନ୍ସ ପାଇଁ ପ୍ରସ୍ତୁତ ହୁଅନ୍ତୁ।' },
      { stage: '3', titleEn: 'B.Tech / M.Sc in Mining/Geology', titleOr: 'ଖଣିଜ ଇଞ୍ଜିନିୟରିଂ ଡିଗ୍ରୀ', descEn: 'Complete B.Tech in Mining Engineering or M.Sc in Applied Geology from top institutes like NIT Rourkela.', descOr: 'NIT ରାଉରକେଲା କିମ୍ବା ଅନ୍ୟାନ୍ୟ କଲେଜରୁ Mining Engineering ରେ B.Tech ଡିଗ୍ରୀ ହାସଲ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Join OMC / MCL / NALCO', titleOr: 'ଖଣି କ୍ଷେତ୍ରରେ କାର୍ଯ୍ୟ', descEn: 'Join state PSUs like Odisha Mining Corporation (OMC) or central companies like MCL and NALCO.', descOr: 'ଓଡ଼ିଶା ଖଣି ନିଗମ (OMC) କିମ୍ବା MCL, NALCO ରେ ଜଣେ ଇଞ୍ଜିନିୟର୍ ଭାବେ ଯୋଗ ଦିଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. Pathani Samanta', descEn: 'Legendary astronomer from Odisha who measured the positions of stars with simple tools.', descOr: 'ଓଡ଼ିଶାର ଜ୍ୟୋତିର୍ବିଜ୍ଞାନୀ ମହାପୁରୁଷ ପଠାଣି ସାମନ୍ତ, ଯିଏ ନିଜ ଗବେଷଣା ପାଇଁ ବିଶ୍ୱପ୍ରସିଦ୍ଧ।' }
    ]
  },
  {
    id: 'police_paramilitary',
    category: 'government',
    titleEn: 'Police & Paramilitary Forces',
    titleOr: 'ଆରକ୍ଷୀ ଓ ସାମରିକ ବଳ (Police & SI)',
    icon: 'ShieldCheck',
    gradient: 'from-blue-700/20 to-slate-700/20',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    taglineEn: 'Maintain law and order, and protect citizens\' lives.',
    taglineOr: 'ଆଇନ ଶୃଙ୍ଖଳା ରକ୍ଷା କରିବା ସହ ନାଗରିକଙ୍କ ସୁରକ୍ଷା ନିଶ୍ଚିତ କରନ୍ତୁ।',
    examsEn: ['Civil Services (for IPS)', 'SSC CPO', 'State Police SI & Constable Exams', 'CAPF Exam'],
    examsOr: ['ସିଭିଲ୍ ସେବା (IPS ପାଇଁ)', 'SSC CPO ପରୀକ୍ଷା', 'ରାଜ୍ୟ ପୋଲିସ SI ଓ କନଷ୍ଟେବଳ ପରୀକ୍ଷା', 'CAPF ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Physical Fitness & Sports', titleOr: 'ଶାରୀରିକ ଯୋଗ୍ୟତା ଓ କ୍ରୀଡ଼ା', descEn: 'Participate in sports, running, and maintain height and physical fitness standards during school.', descOr: 'ସ୍କୁଲ ସମୟରୁ ଦୌଡ଼ିବା, ଖେଳକୁଦ ଓ ଉପଯୁକ୍ତ ଉଚ୍ଚତା ସହ ଶାରୀରିକ ସ୍ୱାସ୍ଥ୍ୟ ବଜାୟ ରଖନ୍ତୁ।' },
      { stage: '2', titleEn: 'Higher Secondary & NCC', titleOr: 'ଉଚ୍ଚ ମାଧ୍ୟମିକ ଓ NCC', descEn: 'Complete +2 in any stream. Joining NCC (National Cadet Corps) is highly beneficial.', descOr: 'ଯେକୌଣସି ବିଷୟରେ +୨ ପାସ୍ କରନ୍ତୁ। NCC ରେ ଯୋଗଦାନ ଅଧିକ ସହାୟକ ହୋଇଥାଏ।' },
      { stage: '3', titleEn: 'Graduation / Physical Tests', titleOr: 'ସ୍ନାତକ ଓ ଶାରୀରିକ ପରୀକ୍ଷା', descEn: 'Complete a bachelor\'s degree. Begin training for physical efficiency tests (running, long jump).', descOr: 'ସ୍ନାତକ (Degree) ପାସ୍ କରନ୍ତୁ। ଦୌଡ଼, ଲମ୍ବ ଡିଆଁ ଆଦି ଶାରୀରିକ ଦକ୍ଷତା ପରୀକ୍ଷା ପାଇଁ ଅଭ୍ୟାସ ଆରମ୍ଭ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Written & Physical Exams', titleOr: 'ଲିଖିତ ଓ ସାକ୍ଷାତକାର ପରୀକ୍ଷା', descEn: 'Pass the competitive recruitment exams (General Knowledge, Math, English) and clear the medical checkup.', descOr: 'ନିଯୁକ୍ତି ପାଇଁ ଆବଶ୍ୟକ ଲିଖିତ ପରୀକ୍ଷା (ସାଧାରଣ ଜ୍ଞାନ, ଗଣିତ) ଓ ସ୍ୱାସ୍ଥ୍ୟ ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୁଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Kiran Bedi', descEn: 'First woman IPS officer of India, known for prison reforms and strong leadership.', descOr: 'ଭାରତର ପ୍ରଥମ ମହିଳା ଆଇପିଏସ ଅଫିସର, ଯିଏ ନିଜର ଦୃଢ଼ ଶାସନ ପାଇଁ ପ୍ରସିଦ୍ଧ।' }
    ]
  },
  {
    id: 'judges_legal',
    category: 'government',
    titleEn: 'Judges & Legal Officers',
    titleOr: 'ଜଜ୍ ଓ ସରକାରୀ ଓକିଲ (Judges & Law)',
    icon: 'Scale',
    gradient: 'from-amber-800/20 to-stone-800/20',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    taglineEn: 'Deliver justice and uphold the constitution.',
    taglineOr: 'ନ୍ୟାୟ ପ୍ରଦାନ କରିବା ସହ ସମ୍ବିଧାନ ଓ ଆଇନର ରକ୍ଷା କରନ୍ତୁ।',
    examsEn: ['CLAT (Law Entrance)', 'Odisha Judicial Service (OJS)', 'AIBE Exam'],
    examsOr: ['CLAT (ଆଇନ ପ୍ରବେଶ)', 'ଓଡ଼ିଶା ଜୁଡିସିଆଲ୍ ସେବା (OJS)', 'AIBE ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Debating & Language Skills', titleOr: 'ଭାଷଣ ଓ ଭାଷା ଦକ୍ଷତା', descEn: 'Develop excellent reading, writing, debating, and English language skills in high school.', descOr: 'ସ୍କୁଲ୍ ସ୍ତରରୁ ବିତର୍କ, ବକ୍ତୃତା ଓ ଉଭୟ ଇଂରାଜୀ ଏବଂ ଓଡ଼ିଆ ଭାଷା ଉପରେ ଦକ୍ଷତା ହାସଲ କରନ୍ତୁ।' },
      { stage: '2', titleEn: 'Integrated Law (BA LLB)', titleOr: 'ସମନ୍ୱିତ ଆଇନ ପାଠ୍ୟକ୍ରମ', descEn: 'Appear for CLAT after +2 to enroll in a 5-year integrated BA LLB course at National Law Universities.', descOr: '+୨ ପରେ CLAT ପରୀକ୍ଷା ଦେଇ ୫-ବର୍ଷର ସମନ୍ୱିତ BA LLB ପାଠ୍ୟକ୍ରମରେ ନାମ ଲେଖାନ୍ତୁ।' },
      { stage: '3', titleEn: 'Law Practice & Bar Council', titleOr: 'ଓକିଲାତି ଓ ବାର୍ କାଉନସିଲ୍', descEn: 'Graduate in Law, register with the Bar Council, and begin practicing in district courts or high courts.', descOr: 'ଆଇନ ଡିଗ୍ରୀ ଶେଷ କରି ବାର୍ କାଉନସିଲ୍‌ରେ ପଞ୍ଜିକରଣ ସହ ଓକିଲାତି ଅଭ୍ୟାସ ଆରମ୍ଭ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'OJS Exam / Judge Posting', titleOr: 'ଜୁଡିସିଆଲ୍ ସେବା ପରୀକ୍ଷା', descEn: 'Clear the Odisha Judicial Service (OJS) exam to be appointed as a Civil Judge / Magistrate.', descOr: 'ଓଡ଼ିଶା ଜୁଡିସିଆଲ୍ ସେବା (OJS) ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ ସିଭିଲ୍ ଜଜ୍ ଭାବେ ନିଯୁକ୍ତି ପାଆନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Justice Ranganath Misra', descEn: 'Former Chief Justice of India and Human Rights pioneer from Odisha.', descOr: 'ଓଡ଼ିଶାର ବରିଷ୍ଠ ଆଇନଜ୍ଞ ଓ ଭାରତର ପୂର୍ବତନ ପ୍ରଧାନ ବିଚାରପତି।' }
    ]
  },
  {
    id: 'railway_banking',
    category: 'government',
    titleEn: 'Railway & Banking Services',
    titleOr: 'ରେଳବାଇ ଓ ବ୍ୟାଙ୍କିଙ୍ଗ (Railway & Bank)',
    icon: 'TrainFront',
    gradient: 'from-emerald-700/20 to-blue-800/20',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    taglineEn: 'Manage public finance, banking, and government transport systems.',
    taglineOr: 'ସରକାରୀ ଆର୍ଥିକ କାରବାର, ବ୍ୟାଙ୍କିଙ୍ଗ୍ ଏବଂ ରେଳବାଇ ପରିଚାଳନା କରନ୍ତୁ।',
    examsEn: ['IBPS PO/Clerk', 'SBI PO/Clerk', 'RRB NTPC', 'SSC CGL'],
    examsOr: ['IBPS PO/Clerk ପରୀକ୍ଷା', 'SBI PO/Clerk ପରୀକ୍ଷା', 'RRB NTPC ରେଳବାଇ', 'SSC CGL ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Math & Reasoning Speed', titleOr: 'ଗଣିତ ଓ ମାନସିକ ଦକ୍ଷତା', descEn: 'Focus on speed arithmetic, calculations, and analytical puzzles during school.', descOr: 'ସ୍କୁଲ୍ ସ୍ତରରୁ ଦ୍ରୁତ ଗାଣିତିକ ହିସାବ ଓ ଯୁକ୍ତିମୂଳକ ପ୍ରଶ୍ନର ଅଭ୍ୟାସ କରନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 & College Graduation', titleOr: '+୨ ଓ ସ୍ନାତକ ଶିକ୍ଷା', descEn: 'Complete intermediate and graduation in any stream (Commerce or Science is helpful).', descOr: 'ଯେକୌଣସି ବିଭାଗରେ +୨ ଏବଂ ସ୍ନାତକ ଡିଗ୍ରୀ ଶେଷ କରନ୍ତୁ।' },
      { stage: '3', titleEn: 'Bank & Railway Coaching', titleOr: 'ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି', descEn: 'Prepare for banking and railway exams focusing on Quantitative Aptitude, English, and Reasoning.', descOr: 'ଗଣିତ, ଇଂରାଜୀ, ସାଧାରଣ ଜ୍ଞାନ ଓ ମାନସିକ ଦକ୍ଷତା ଉପରେ ଗୁରୁତ୍ୱ ଦେଇ ପ୍ରସ୍ତୁତି କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Clear Exams & Join', titleOr: 'ନିଯୁକ୍ତି ଓ ଯୋଗଦାନ', descEn: 'Clear Preliminary, Mains exams, and Interviews to get posted as Bank PO or Railway Officer.', descOr: 'ଲିଖିତ ପରୀକ୍ଷା ଏବଂ ସାକ୍ଷାତକାର ପାସ୍ କରି ବ୍ୟାଙ୍କ୍ କିମ୍ବା ରେଳବାଇରେ କାର୍ଯ୍ୟ ଆରମ୍ଭ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Shaktikanta Das', descEn: 'Renowned bureaucrat from Odisha, serving as the Governor of the Reserve Bank of India (RBI).', descOr: 'ଓଡ଼ିଶାର ପ୍ରତିଷ୍ଠିତ ବ୍ୟକ୍ତିତ୍ୱ ଓ ଭାରତୀୟ ରିଜର୍ଭ ବ୍ୟାଙ୍କର ବର୍ତ୍ତମାନର ଗଭର୍ଣ୍ଣର।' }
    ]
  },
  {
    id: 'govt_teacher',
    category: 'government',
    titleEn: 'Government School Teacher',
    titleOr: 'ସରକାରୀ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ (Govt Teacher)',
    icon: 'GraduationCap',
    gradient: 'from-teal-600/20 to-cyan-700/20',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    taglineEn: 'Educate and shape the future of students in government schools.',
    taglineOr: 'ସରକାରୀ ବିଦ୍ୟାଳୟଗୁଡ଼ିକରେ ଉତ୍ତମ ଶିକ୍ଷା ଦେଇ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ଭବିଷ୍ୟତ ଗଢ଼ନ୍ତୁ।',
    examsEn: ['CT Exam', 'OTET', 'OSSTET', 'SSD Teacher recruitment'],
    examsOr: ['CT ପ୍ରବେଶିକା ପରୀକ୍ଷା', 'OTET ଶିକ୍ଷକ ଯୋଗ୍ୟତା', 'OSSTET ପରୀକ୍ଷା', 'ସରକାରୀ ଶିକ୍ଷକ ନିଯୁକ୍ତି'],
    milestones: [
      { stage: '1', titleEn: 'Explain concepts simply', titleOr: 'ଶିକ୍ଷାଦାନ ଶୈଳୀ ଓ ଧୈର୍ଯ୍ୟ', descEn: 'Develop communication skills and patience. Help classmates with studies in school.', descOr: 'ସହପାଠୀମାନଙ୍କୁ ପଢ଼ାଇବା ସହ ନିଜର ବୁଝାଇବା ଶୈଳୀ ଓ କଥାବାର୍ତ୍ତା ସୁଧାରନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 or Graduation', titleOr: '+୨ କିମ୍ବା +୩ ଶିକ୍ଷା', descEn: 'Complete +2 for Primary Teacher (CT path) or Graduation (+3) for High School Teacher (B.Ed path).', descOr: 'ପ୍ରାଥମିକ ଶିକ୍ଷକ ପାଇଁ +୨ କିମ୍ବା ହାଇସ୍କୁଲ୍ ଶିକ୍ଷକ ପାଇଁ ସ୍ନାତକ ଡିଗ୍ରୀ ଶେଷ କରନ୍ତୁ।' },
      { stage: '3', titleEn: 'CT / B.Ed Professional Training', titleOr: 'ଶିକ୍ଷକ ତାଲିମ ପାଠ୍ୟକ୍ରମ', descEn: 'Enroll in D.El.Ed (CT) or B.Ed (Bachelor of Education) from recognized training institutes.', descOr: 'ଶିକ୍ଷକ ତାଲିମ ଡିଗ୍ରୀ D.El.Ed (CT) କିମ୍ବା B.Ed ପାଠ୍ୟକ୍ରମ ସଫଳତାର ସହ ସମାପ୍ତ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Pass OTET & Get Posting', titleOr: 'OTET ଓ ସରକାରୀ ନିଯୁକ୍ତି', descEn: 'Clear the Odisha Teacher Eligibility Test and state teacher recruitment examinations.', descOr: 'OTET/OSSTET ପାସ୍ କରି ରାଜ୍ୟ ସରକାରୀ ସ୍କୁଲରେ ଶିକ୍ଷକ ଭାବେ ନିଯୁକ୍ତି ପାଆନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. Sarvepalli Radhakrishnan', descEn: 'Great philosopher, teacher, and the second President of India, in whose honor Teacher\'s Day is celebrated.', descOr: 'ମହାନ ଦାର୍ଶନିକ ଓ ଶିକ୍ଷକ, ଯାହାଙ୍କ ଜନ୍ମଦିନକୁ ଶିକ୍ଷକ ଦିବସ ଭାବେ ପାଳନ କରାଯାଏ।' }
    ]
  },
  {
    id: 'software_engineer',
    category: 'private',
    titleEn: 'Software Engineer & Web Developer',
    titleOr: 'ସଫ୍ଟୱେର୍ ଇଞ୍ଜିନିୟର୍ (Software & Web)',
    icon: 'Code2',
    gradient: 'from-sky-500/20 to-indigo-600/20',
    glowColor: 'rgba(14, 165, 233, 0.4)',
    taglineEn: 'Build web apps, mobile apps, and solve digital problems.',
    taglineOr: 'ୱେବସାଇଟ୍, ଆପ୍ସ ଏବଂ ବିଭିନ୍ନ ଡିଜିଟାଲ୍ ସଫ୍ଟୱେର୍ ତିଆରି କରନ୍ତୁ।',
    examsEn: ['JEE Main (for NITs)', 'JEE Advanced (for IITs)', 'OJEE (for Odisha Colleges)'],
    examsOr: ['JEE Main (NIT ପାଇଁ)', 'JEE Advanced (IIT ପାଇଁ)', 'OJEE (ଓଡ଼ିଶା ଇଞ୍ଜିନିୟରିଂ)'],
    milestones: [
      { stage: '1', titleEn: 'Basic Logic & Math', titleOr: 'ଗଣିତ ଓ ପ୍ରାରମ୍ଭିକ କମ୍ପ୍ୟୁଟର', descEn: 'Focus on mathematics, puzzle-solving, and basic computing in school. Learn Scratch/HTML.', descOr: 'ଗଣିତ, ସମସ୍ୟା ସମାଧାନ ଏବଂ ସ୍କୁଲରେ HTML ଓ ମୌଳିକ କମ୍ପ୍ୟୁଟର ଶିଖନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science with CS', titleOr: '+୨ ବିଜ୍ଞାନ ଓ କମ୍ପ୍ୟୁଟର', descEn: 'Choose Science stream with Mathematics and Computer Science (optional) in +2.', descOr: '+୨ ବିଜ୍ଞାନରେ ଗଣିତ ଏବଂ କମ୍ପ୍ୟୁଟର ବିଜ୍ଞାନ ବିଷୟ ରଖି ପଢ଼ନ୍ତୁ।' },
      { stage: '3', titleEn: 'B.Tech / BCA Degree', titleOr: 'କମ୍ପ୍ୟୁଟର ଇଞ୍ଜିନିୟରିଂ (B.Tech/BCA)', descEn: 'Pursue B.Tech in Computer Science, BCA, or B.Sc in IT from a recognized college.', descOr: 'କମ୍ପ୍ୟୁଟର ବିଜ୍ଞାନରେ B.Tech, BCA କିମ୍ବା B.Sc IT ଡିଗ୍ରୀ ହାସଲ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Learn Coding & Join Tech Teams', titleOr: 'କୋଡିଂ ଅଭ୍ୟାସ ଓ ନିଯୁକ୍ତି', descEn: 'Learn programming languages like Java, Python, JavaScript. Build projects and get hired by IT companies.', descOr: 'Java, Python, JS ଶିଖନ୍ତୁ। କୋଡିଂ ପ୍ରୋଜେକ୍ଟ କରି ସଫ୍ଟୱେର କମ୍ପାନୀରେ ନିଯୁକ୍ତି ପାଆନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Sundar Pichai', descEn: 'IIT graduate who became the CEO of Google and Alphabet, leading global tech innovation.', descOr: 'ଆଇଆଇଟି ଛାତ୍ର ଯିଏ ଗୁଗୁଲର CEO ଭାବେ ବିଶ୍ୱରେ ପ୍ରତିଷ୍ଠିତ।' }
    ]
  },
  {
    id: 'private_doctor',
    category: 'private',
    titleEn: 'Private Doctor & Dental Specialist',
    titleOr: 'ଘରୋଇ ଡାକ୍ତର ଓ ଦନ୍ତ ଚିକିତ୍ସକ (Private Doctor)',
    icon: 'HeartPulse',
    gradient: 'from-emerald-500/20 to-cyan-500/20',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    taglineEn: 'Offer specialized medical consulting, surgeries, or dental care.',
    taglineOr: 'ଘରୋଇ ଚିକିତ୍ସାଳୟ କିମ୍ବା ନିଜର କ୍ଲିନିକ୍ ମାଧ୍ୟମରେ ସ୍ୱାସ୍ଥ୍ୟ ସେବା ଯୋଗାନ୍ତୁ।',
    examsEn: ['NEET-UG', 'NEET-MDS', 'NEET-PG'],
    examsOr: ['NEET-UG ପ୍ରବେଶିକା', 'NEET-MDS (ଦନ୍ତ ବିଭାଗ)', 'NEET-PG (ସ୍ନାତକୋତ୍ତର)'],
    milestones: [
      { stage: '1', titleEn: 'High School Biology', titleOr: 'ବିଜ୍ଞାନ ଓ ଜୀବବିଜ୍ଞାନ', descEn: 'Pay close attention to human biology, plant biology, and general science in Class 9-10.', descOr: 'ସ୍କୁଲ୍ ସମୟରୁ ଜୀବବିଜ୍ଞାନ ଓ ମାନବ ସ୍ୱାସ୍ଥ୍ୟ ସମ୍ପର୍କିତ ପାଠ୍ୟ ପ୍ରତି ରୁଚି ବଢ଼ାନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science (PCB)', titleOr: '+୨ ବିଜ୍ଞାନ (PCB)', descEn: 'Select Physics, Chemistry, Biology in intermediate. Start preparing for NEET exam.', descOr: '+୨ ରେ ଭୌତିକ, ରସାୟନ ଓ ଜୀବବିଜ୍ଞାନ ପଢ଼ି NEET ପାଇଁ ପ୍ରସ୍ତୁତ ହୁଅନ୍ତୁ।' },
      { stage: '3', titleEn: 'MBBS / BDS Course', titleOr: 'MBBS କିମ୍ବା BDS ଡିଗ୍ରୀ', descEn: 'Pass NEET exam to enroll in MBBS or BDS (Bachelor of Dental Surgery) course in medical colleges.', descOr: 'NEET ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ MBBS କିମ୍ବା BDS (ଦନ୍ତ ଚିକିତ୍ସା) କଲେଜରେ ପଢ଼ନ୍ତୁ।' },
      { stage: '4', titleEn: 'MD Specialization & Practice', titleOr: 'ସ୍ୱତନ୍ତ୍ର ଚିକିତ୍ସା ଓ କ୍ଲିନିକ୍', descEn: 'Complete MD/MS specialization. Join private healthcare groups or start your own specialty clinic.', descOr: 'MD/MS ସ୍ପେଶାଲାଇଜେସନ୍ କରି ବଡ଼ ହସ୍ପିଟାଲରେ ଯୋଗ ଦିଅନ୍ତୁ କିମ୍ବା କ୍ଲିନିକ୍ ଆରମ୍ଭ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. Devi Shetty', descEn: 'Renowned cardiac surgeon and founder of Narayana Health, promoting affordable care.', descOr: 'ଭାରତର ପ୍ରସିଦ୍ଧ ହୃଦରୋଗ ବିଶେଷଜ୍ଞ, ଯିଏ ସୁଲଭ ସ୍ୱାସ୍ଥ୍ୟ ସେବା ପାଇଁ ଜଣାଶୁଣା।' }
    ]
  },
  {
    id: 'private_nurse',
    category: 'private',
    titleEn: 'Private Nurse & Lab Technician',
    titleOr: 'ନର୍ସ ଓ ଲ୍ୟାବ୍ ଟେକ୍ନିସିଆନ୍ (Nurse & Lab Tech)',
    icon: 'ShieldPlus',
    gradient: 'from-sky-500/20 to-teal-500/20',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    taglineEn: 'Support patient diagnostics and nursing care in modern hospitals.',
    taglineOr: 'ଘରୋଇ ଚିକିତ୍ସାଳୟ ଓ ରକ୍ତ ପରୀକ୍ଷା କେନ୍ଦ୍ରଗୁଡ଼ିକରେ କାର୍ଯ୍ୟ କରନ୍ତୁ।',
    examsEn: ['DMLT Entrance', 'B.Sc Nursing Entry Exams'],
    examsOr: ['DMLT (ଲ୍ୟାବ୍ ଟେକ୍ନିସିଆନ୍ ପ୍ରବେଶ)', 'B.Sc ନର୍ସିଂ ପ୍ରବେଶ ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Basic Science & Hygiene', titleOr: 'ସାଧାରଣ ବିଜ୍ଞାନ ଓ ସ୍ୱାସ୍ଥ୍ୟ', descEn: 'Learn biological processes, chemicals, and human body functions in high school.', descOr: 'ସ୍କୁଲ୍‌ରେ ଜୀବବିଜ୍ଞାନ ଏବଂ ସ୍ୱାସ୍ଥ୍ୟରକ୍ଷା ନିୟମ ଭଲ ଭାବରେ ବୁଝନ୍ତୁ।' },
      { stage: '2', titleEn: 'Intermediate & Tech Courses', titleOr: '+୨ ଓ ବୈଷୟିକ ପାଠ୍ୟକ୍ରମ', descEn: 'Complete +2 in Science. Opt for ANM/GNM courses or DMLT (Diploma in Medical Lab Technology).', descOr: '+୨ ବିଜ୍ଞାନ ପରେ ନର୍ସିଂ (GNM) କିମ୍ବା ଡିପ୍ଲୋମା ଲ୍ୟାବ୍ ଟେକ୍ନୋଲୋଜି (DMLT) ପଢ଼ନ୍ତୁ।' },
      { stage: '3', titleEn: 'Practical Training & Internship', titleOr: 'ବ୍ୟବହାରିକ ପ୍ରଶିକ୍ଷଣ', descEn: 'Complete internship at hospital labs. Learn handling diagnostic machinery and patient care.', descOr: 'ହସ୍ପିଟାଲ୍ ଲ୍ୟାବ୍‌ରେ ପ୍ରଶିକ୍ଷଣ ନିଅନ୍ତୁ। ବିଭିନ୍ନ ପରୀକ୍ଷା ଯନ୍ତ୍ରପାତି ଚଳାଇବା ଶିଖନ୍ତୁ।' },
      { stage: '4', titleEn: 'Hospital Placement', titleOr: 'ଚିକିତ୍ସାଳୟରେ ନିଯୁକ୍ତି', descEn: 'Get hired by top private hospitals (Apollo, Care, etc.) or diagnostic centers as a specialist.', descOr: 'B.Sc ନର୍ସିଂ ବା DMLT ସାରି ବଡ଼ ଘରୋଇ ହସ୍ପିଟାଲ୍‌ରେ କାର୍ଯ୍ୟ ଆରମ୍ଭ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Florence Nightingale', descEn: 'The founder of modern nursing, whose compassion transformed patient care.', descOr: 'ଆଧୁନିକ ନର୍ସିଂ ସେବାର ଜନନୀ, ଯିଏ ଦୟା ଓ ସେବାର ମହାନ ଆଦର୍ଶ।' }
    ]
  },
  {
    id: 'entrepreneur',
    category: 'private',
    titleEn: 'Entrepreneur & Startup Founder',
    titleOr: 'ଉଦ୍ୟୋଗୀ ଓ ଷ୍ଟାର୍ଟଅପ୍ ପ୍ରତିଷ୍ଠାତା (Entrepreneur)',
    icon: 'Lightbulb',
    gradient: 'from-yellow-500/20 to-amber-600/20',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    taglineEn: 'Build businesses, invent new products, and create employment.',
    taglineOr: 'ନୂତନ ବ୍ୟବସାୟ ଓ ଷ୍ଟାର୍ଟଅପ୍ ଆରମ୍ଭ କରି କର୍ମସଂସ୍ଥାନ ସୃଷ୍ଟି କରନ୍ତୁ।',
    examsEn: ['No Mandatory Exam', 'Management Entrance (CAT/MAT for MBA)'],
    examsOr: ['କୌଣସି ନିର୍ଦ୍ଦିଷ୍ଟ ପରୀକ୍ଷା ଆବଶ୍ୟକ ନାହିଁ', 'MBA ପାଇଁ CAT/MAT ପ୍ରବେଶିକା ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Problem Solving & Innovation', titleOr: 'ସମସ୍ୟା ସମାଧାନ ଓ କଳ୍ପନା', descEn: 'Find everyday problems around you and think of unique ways to solve them. Build leadership.', descOr: 'ସମାଜରେ ଥିବା ସମସ୍ୟାଗୁଡ଼ିକୁ ଚିହ୍ନଟ କରି ସୃଜନଶୀଳ ଉପାୟରେ ସେଗୁଡ଼ିକର ସମାଧାନ ଚିନ୍ତା କରନ୍ତୁ।' },
      { stage: '2', titleEn: 'Business Basics & Public Speaking', titleOr: 'ବ୍ୟବସାୟ ଶିକ୍ଷା ଓ କଥାବାର୍ତ୍ତା', descEn: 'Learn basic accounting, business case studies, and presentation/pitching skills.', descOr: 'ଆର୍ଥିକ ହିସାବ କିତାବ, ମାର୍କେଟିଂ ଓ ଲୋକଙ୍କ ଆଗରେ ନିଜ ବିଚାର ଉପସ୍ଥାପନ କରିବା ଦକ୍ଷତା ବଢ଼ାନ୍ତୁ।' },
      { stage: '3', titleEn: 'Degree in Business / Tech', titleOr: 'ଉଚ୍ଚ ଶିକ୍ଷା (BBA / B.Tech / B.Com)', descEn: 'Complete Graduation. A degree in management (BBA/MBA) or technology helps understand industry.', descOr: 'ସ୍ନାତକ ଡିଗ୍ରୀ ଶେଷ କରନ୍ତୁ। ମ୍ୟାନେଜମେଣ୍ଟ ବା ବୈଷୟିକ ଡିଗ୍ରୀ ନୂଆ ଆଇଡିଆ ପାଇଁ ସହାୟକ ହୋଇଥାଏ।' },
      { stage: '4', titleEn: 'Launch Startup & Fundraise', titleOr: 'ଷ୍ଟାର୍ଟଅପ୍ ଆରମ୍ଭ ଓ ଅର୍ଥ ଯୋଗାଡ଼', descEn: 'Develop your Minimum Viable Product (MVP), pitch to investors, register your business, and launch!', descOr: 'ନିଜର ପ୍ରଡକ୍ଟ ତିଆରି କରନ୍ତୁ, ନିବେଶକଙ୍କ ସହ ଭାଗିଦାରୀ କରି ନିଜର କମ୍ପାନୀ ଖୋଲନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Ritesh Agarwal', descEn: 'Young entrepreneur from Odisha who founded OYO Rooms, becoming one of the youngest billionaires.', descOr: 'ଓଡ଼ିଶାର ଯୁବ ଉଦ୍ୟୋଗୀ ତଥା OYO ରୁମ୍ସର ପ୍ରତିଷ୍ଠାତା।' }
    ]
  },
  {
    id: 'creative_designer',
    category: 'private',
    titleEn: 'Creative Designer & Visual Artist',
    titleOr: 'କଳାକାର ଓ ଗ୍ରାଫିକ୍ ଡିଜାଇନର୍ (Designer & Artist)',
    icon: 'Palette',
    gradient: 'from-pink-500/20 to-rose-600/20',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    taglineEn: 'Design user interfaces, 3D animations, and digital brand materials.',
    taglineOr: 'ଡିଜିଟାଲ୍ ଆର୍ଟ, ଗ୍ରାଫିକ୍ ଡିଜାଇନ୍ ଏବଂ ଆନିମେସନ୍ ସୃଷ୍ଟି କରନ୍ତୁ।',
    examsEn: ['UCEED (Design Entrance)', 'NID Entrance Exam', 'NIFT Exam'],
    examsOr: ['UCEED (ଡିଜାଇନ୍ ପ୍ରବେଶ)', 'NID ପ୍ରବେଶିକା ପରୀକ୍ଷା', 'NIFT (ଫ୍ୟାଶନ୍ ଡିଜାଇନ୍)'],
    milestones: [
      { stage: '1', titleEn: 'Drawing & Creative Expression', titleOr: 'ଚିତ୍ରାଙ୍କନ ଓ ସୃଜନଶୀଳତା', descEn: 'Practice sketching, colors, photography, and learn basic visual aesthetics at school.', descOr: 'ଚିତ୍ରାଙ୍କନ, ରଙ୍ଗ ମିଶ୍ରଣ, ଫଟୋଗ୍ରାଫି ଓ କଳାତ୍ମକ ଦୃଷ୍ଟିକୋଣ ପ୍ରତି ସ୍କୁଲରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ।' },
      { stage: '2', titleEn: 'Learn Digital Design Tools', titleOr: 'ଡିଜିଟାଲ୍ ଡିଜାଇନ୍ ଟୁଲ୍ସ', descEn: 'Learn computer graphic tools like Canva, Photoshop, Illustrator, or 3D Blender.', descOr: 'କମ୍ପ୍ୟୁଟର ସଫ୍ଟୱେର୍ ଯେପରିକି Canva, Photoshop କିମ୍ବା 3D ଆନିମେସନ୍ ଟୁଲ୍ସ ଶିଖନ୍ତୁ।' },
      { stage: '3', titleEn: 'Bachelor of Design (B.Des)', titleOr: 'ଡିଜାଇନ୍ କ୍ଷେତ୍ରରେ ସ୍ନାତକ', descEn: 'Enroll in B.Des (Bachelor of Design) or Bachelor of Fine Arts (BFA) at NID, IIT, or private design academies.', descOr: 'NID, IIT କିମ୍ବା ଡିଜାଇନ୍ ଆଇଟିଆଇରୁ B.Des କିମ୍ବା Fine Arts ରେ ଡିଗ୍ରୀ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Portfolio Development', titleOr: 'ପୋର୍ଟଫୋଲିଓ ଓ ଚାକିରି', descEn: 'Create a portfolio of your design projects. Join tech companies as UI/UX Designer or gaming studios as 3D Artist.', descOr: 'ନିଜର ଡିଜାଇନ୍ ସଂଗ୍ରହ (Portfolio) ତିଆରି କରନ୍ତୁ ଓ ଟେକ୍ କମ୍ପାନୀ କିମ୍ବା ଆନିମେସନ୍ ଷ୍ଟୁଡିଓରେ ଯୋଗ ଦିଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Sudarshan Pattnaik', descEn: 'World-famous sand artist from Odisha, awarded Padma Shri for his unique art.', descOr: 'ଓଡ଼ିଶାର ଆନ୍ତର୍ଜାତୀୟ ଖ୍ୟାତିସମ୍ପନ୍ନ ବାଲୁକା ଶିଳ୍ପୀ, ଯିଏ ପଦ୍ମଶ୍ରୀ ସମ୍ମାନରେ ସମ୍ମାନିତ।' }
    ]
  },
  {
    id: 'aviation_hospitality',
    category: 'private',
    titleEn: 'Aviation & Hospitality Management',
    titleOr: 'ବୈମାନିକ ଓ ଆତିଥେୟତା ପରିଚାଳନା (Aviation)',
    icon: 'Plane',
    gradient: 'from-sky-600/20 to-blue-700/20',
    glowColor: 'rgba(2, 132, 199, 0.4)',
    taglineEn: 'Fly commercial airplanes, manage luxury hotels, or travel the world as cabin crew.',
    taglineOr: 'ବୈମାନିକ (Pilot), କ୍ୟାବିନ୍ କ୍ରିୟୁ କିମ୍ବା ହୋଟେଲ ପରିଚାଳନା କାର୍ଯ୍ୟ କରନ୍ତୁ।',
    examsEn: ['IGRUA (Pilot Entrance)', 'NCHMCT JEE (Hotel Management)', 'Aviation Academy Screening'],
    examsOr: ['IGRUA (ପାଇଲଟ୍ ପ୍ରବେଶ)', 'NCHMCT JEE (ହୋଟେଲ ମ୍ୟାନେଜମେଣ୍ଟ)', 'ଏଭିଏସନ୍ ସ୍କ୍ରିନିଂ ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'English Fluency & Manners', titleOr: 'ଭାଷା ଦକ୍ଷତା ଓ ଶିଷ୍ଟାଚାର', descEn: 'Build strong oral communication in English, grooming, and interpersonal behavior in school.', descOr: 'ଉତ୍ତମ ଶିଷ୍ଟାଚାର ବଜାୟ ରଖନ୍ତୁ ଏବଂ ଇଂରାଜୀରେ କଥାବାର୍ତ୍ତା କରିବା ଦକ୍ଷତା ବଢ଼ାନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science (PCM) for Pilots', titleOr: '+୨ ଶିକ୍ଷା (ପାଇଲଟ୍ ପାଇଁ PCB/M)', descEn: 'Complete +2. Physics and Mathematics are mandatory for commercial pilot license training.', descOr: '+୨ ଶେଷ କରନ୍ତୁ। ପାଇଲଟ୍ ହେବା ପାଇଁ ଗଣିତ ଓ ପଦାର୍ଥ ବିଜ୍ଞାନ ଆବଶ୍ୟକ।' },
      { stage: '3', titleEn: 'Flying School / Hotel College', titleOr: 'ପାଇଲଟ୍ ଟ୍ରେନିଂ କିମ୍ବା ହୋଟେଲ ମ୍ୟାନେଜମେଣ୍ଟ', descEn: 'Join a flight school to log flying hours for CPL, or study BHM (Bachelor of Hotel Management).', descOr: 'CPL ଲାଇସେନ୍ସ ପାଇଁ ଫ୍ଲାଇଂ ସ୍କୁଲରେ କିମ୍ବା ହୋଟେଲ ମ୍ୟାନେଜମେଣ୍ଟ (BHM) କଲେଜରେ ଯୋଗ ଦିଅନ୍ତୁ।' },
      { stage: '4', titleEn: 'Join Airlines / 5-Star Hotels', titleOr: 'ବିମାନ କମ୍ପାନୀ କିମ୍ବା ହୋଟେଲରେ ଯୋଗଦାନ', descEn: 'Join airlines as a pilot/cabin crew, or luxury hotel chains (Taj, Oberoi) as an executive.', descOr: 'ବିଭିନ୍ନ ଏୟାରଲାଇନ୍ସ କମ୍ପାନୀ କିମ୍ବା ପଞ୍ଚତାରକା ହୋଟେଲ୍‌ରେ ନିଯୁକ୍ତି ପାଆନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Biju Patnaik', descEn: 'Former Chief Minister of Odisha, legendary freedom fighter, and an extraordinary pilot.', descOr: 'ଓଡ଼ିଶାର ପ୍ରବାଦ ପୁରୁଷ ଓ ପୂର୍ବତନ ମୁଖ୍ୟମନ୍ତ୍ରୀ, ଯିଏ ଜଣେ ସାହସୀ ଓ ଦକ୍ଷ ପାଇଲଟ୍ ଥିଲେ।' }
    ]
  },
  {
    id: 'odisha_agriculture',
    category: 'odisha',
    titleEn: 'Odisha Agriculture & Horticulture Officer',
    titleOr: 'ଓଡ଼ିଶା କୃଷି ବିଭାଗ ଅଧିକାରୀ (Agriculture Officer)',
    icon: 'Sprout',
    gradient: 'from-emerald-700/20 to-green-800/20',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    taglineEn: 'Empower farmers, introduce scientific farming, and improve crop yield in Odisha.',
    taglineOr: 'ବିଜ୍ଞାନସମ୍ମତ ପ୍ରଣାଳୀ ଓ ଔଷଧ ସାହାଯ୍ୟରେ ଓଡ଼ିଶାର କୃଷିର ବିକାଶ କରନ୍ତୁ।',
    examsEn: ['OUAT Entrance Exam', 'OPSC Agriculture Officer Recruitment'],
    examsOr: ['OUAT ପ୍ରବେଶିକା ପରୀକ୍ଷା', 'OPSC କୃଷି ଅଧିକାରୀ ନିଯୁକ୍ତି ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Life Sciences & Farming Interest', titleOr: 'ଉଦ୍ଭିଦ ବିଜ୍ଞାନ ଓ କୃଷିରେ ରୁଚି', descEn: 'Learn plant science, soil types, and ecology in high school biology.', descOr: 'ଉଦ୍ଭିଦ ପ୍ରକ୍ରିୟା, ମୃତ୍ତିକା ଏବଂ ପ୍ରାକୃତିକ କୃଷି ସମ୍ପର୍କରେ ସ୍କୁଲ୍ ସମୟରୁ ଜ୍ଞାନ ଆହରଣ କରନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science (PCB/PCM)', titleOr: '+୨ ବିଜ୍ଞାନ ଶିକ୍ଷା', descEn: 'Complete +2 Science. Focus on Physics, Chemistry, and Biology (PCB).', descOr: '+୨ ବିଜ୍ଞାନରେ ଜୀବବିଜ୍ଞାନ ଓ ରସାୟନ ବିଜ୍ଞାନ ଭଲ ଭାବରେ ପଢ଼ନ୍ତୁ।' },
      { stage: '3', titleEn: 'B.Sc Agriculture (OUAT)', titleOr: 'କୃଷି ବିଜ୍ଞାନରେ ସ୍ନାତକ (B.Sc Agri)', descEn: 'Clear the OUAT entrance exam and complete a 4-year B.Sc (Hons) in Agriculture or Horticulture.', descOr: 'OUAT ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ କୃଷି କଲେଜରୁ B.Sc (Agriculture) ଡିଗ୍ରୀ ହାସଲ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Clear OPSC & Join Agriculture Dept', titleOr: 'OPSC ପରୀକ୍ଷା ଓ ବ୍ଲକ୍‌ରେ ନିଯୁକ୍ତି', descEn: 'Clear the OPSC Agriculture Services exam to join as an Agricultural Officer (AO) at block level.', descOr: 'OPSC କୃଷି ସେବା ପରୀକ୍ଷା ଦେଇ ବ୍ଲକ୍ ସ୍ତରରେ କୃଷି ଅଧିକାରୀ (AO) ଭାବେ କାର୍ଯ୍ୟ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. MS Swaminathan', descEn: 'The father of the Green Revolution in India, whose agricultural research saved millions.', descOr: 'ଭାରତୀୟ ସବୁଜ ବିପ୍ଳବର ଜନକ, ଯିଏ ନୂତନ କୃଷି ଗବେଷଣାର ପ୍ରଦର୍ଶକ ଥିଲେ।' }
    ]
  },
  {
    id: 'odisha_forest',
    category: 'odisha',
    titleEn: 'Odisha Forest & Wildlife Officer',
    titleOr: 'ଓଡ଼ିଶା ଜଙ୍ଗଲ ବିଭାଗ ଅଧିକାରୀ (Forest Officer)',
    icon: 'TreePine',
    gradient: 'from-green-800/20 to-emerald-950/20',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    taglineEn: 'Protect Odisha\'s rich forest cover, Similipal tigers, and natural ecosystems.',
    taglineOr: 'ଓଡ଼ିଶାର ଘଞ୍ଚ ଅରଣ୍ୟ, ବନ୍ୟଜନ୍ତୁ ଏବଂ ଜଳବାୟୁର ସୁରକ୍ଷା ନିଶ୍ଚିତ କରନ୍ତୁ।',
    examsEn: ['OPSC Forest Service (IFS/OFSD)', 'OSSC Forest Guard Recruitment'],
    examsOr: ['OPSC ଜଙ୍ଗଲ ସେବା ପରୀକ୍ଷା', 'OSSC ଫରେଷ୍ଟ ଗାର୍ଡ ନିଯୁକ୍ତି ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Environmental Science & Outdoor Activities', titleOr: 'ପରିବେଶ ବିଜ୍ଞାନ ଓ ବାହ୍ୟ ପରିକ୍ରମା', descEn: 'Learn about forest trees, animal species, and wildlife conservation at school.', descOr: 'ପରିବେଶ ସନ୍ତୁଳନ, ଗଛଲତା ଏବଂ ଜଙ୍ଗଲ ପ୍ରତି ସ୍କୁଲ୍ ସମୟରୁ ଆଗ୍ରହ ରଖନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Science', titleOr: '+୨ ବିଜ୍ଞାନ', descEn: 'Complete +2 Science. Keep regular walking/fitness activities active.', descOr: '+୨ ବିଜ୍ଞାନ ପାସ୍ କରନ୍ତୁ ଏବଂ ନିଜର ଶାରୀରିକ ସ୍ୱାସ୍ଥ୍ୟ ବଜାୟ ରଖନ୍ତୁ।' },
      { stage: '3', titleEn: 'Science / Forestry Degree', titleOr: 'ସ୍ନାତକ ଡିଗ୍ରୀ (Forestry/Science)', descEn: 'Complete B.Sc in Forestry, Botany, Zoology, or Agricultural Engineering from a recognized college.', descOr: 'Forestry, ଉଦ୍ଭିଦ ବିଜ୍ଞାନ କିମ୍ବା ପ୍ରାଣୀ ବିଜ୍ଞାନରେ B.Sc ଡିଗ୍ରୀ ଶେଷ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Forest Exam & Physical Run', titleOr: 'Forest ପରୀକ୍ଷା ଓ ଶାରୀରିକ ଚାଲି', descEn: 'Clear OPSC Forest Services exams (Written + Physical test consisting of long walking/running).', descOr: 'ଜଙ୍ଗଲ ସେବା ପରୀକ୍ଷା ସହ ଉଦ୍ଦିଷ୍ଟ ଚାଲି ପରୀକ୍ଷା (Physical Test) ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ ନିଯୁକ୍ତି ପାଆନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dr. Saroj Raj Choudhury', descEn: 'First Director of Similipal Tiger Reserve, pioneer in tiger census and conservation.', descOr: 'ଶିମିଳିପାଳ ବ୍ୟାଘ୍ର ପ୍ରକଳ୍ପର ପ୍ରଥମ ନିର୍ଦ୍ଦେଶକ ଓ ବନ୍ୟପ୍ରାଣୀ ସଂରକ୍ଷକ।' }
    ]
  },
  {
    id: 'odisha_tourism',
    category: 'odisha',
    titleEn: 'Odisha Tourism & Cultural Heritage Manager',
    titleOr: 'ଓଡ଼ିଶା ପର୍ଯ୍ୟଟନ ଓ ସଂସ୍କୃତି ବିକାଶ (Tourism Manager)',
    icon: 'Compass',
    gradient: 'from-amber-600/20 to-red-800/20',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    taglineEn: 'Promote Odisha\'s famous art, temples, and natural beauty to visitors worldwide.',
    taglineOr: 'ଓଡ଼ିଶାର ସଂସ୍କୃତି, କଳାକୃତି ଓ ପର୍ଯ୍ୟଟନ ସ୍ଥଳଗୁଡ଼ିକୁ ବିଶ୍ୱ ଦରବାରରେ ପହଞ୍ଚାନ୍ତୁ।',
    examsEn: ['NCHMCT JEE', 'Odisha Tourism Dept recruitment exams', 'University specific Entrance'],
    examsOr: ['NCHMCT JEE ପରୀକ୍ଷା', 'ଓଡ଼ିଶା ପର୍ଯ୍ୟଟନ ନିଯୁକ୍ତି ପରୀକ୍ଷା', 'ମାଷ୍ଟର୍ସ ପ୍ରବେଶିକา ପରୀକ୍ଷା'],
    milestones: [
      { stage: '1', titleEn: 'Odia Culture & History Study', titleOr: 'ଇତିହାସ, ସଂସ୍କୃତି ଓ ସାହିତ୍ୟ', descEn: 'Explore Odisha\'s history, tourist sites (Konark, Puri, Chilika), and art forms (Odissi, Pattachitra) in school.', descOr: 'କୋଣାର୍କ, ପୁରୀ, ଚିଲିକା ସମେତ ଓଡ଼ିଶାର କଳା ଓ ଭାସ୍କର୍ଯ୍ୟ ବିଷୟରେ ପଢ଼ନ୍ତୁ।' },
      { stage: '2', titleEn: 'Higher Secondary School', titleOr: 'ଉଚ୍ଚ ମାଧ୍ୟମିକ ଶିକ୍ଷା', descEn: 'Complete +2 in Arts, Science, or Commerce. Learn languages (English, Hindi, Odia).', descOr: '+୨ ପାସ୍ କରନ୍ତୁ। ବିଭିନ୍ନ ଭାଷา (ଇଂରାଜୀ, ହିନ୍ଦୀ) କହିବା ଏବଂ ବୁଝିବା ଅଭ୍ୟାସ କରନ୍ତୁ।' },
      { stage: '3', titleEn: 'Tourism Degree (BTTM / MBA)', titleOr: 'ପର୍ଯ୍ୟଟନ ପରିଚାଳନା ଡିଗ୍ରୀ', descEn: 'Pursue Bachelor of Tourism & Travel Management (BTTM) or MBA in Tourism & Hospitality.', descOr: 'ପର୍ଯ୍ୟଟନ ଓ ଭ୍ରମଣ ପରିଚାଳନା (BTTM/MBA) ପାଠ୍ୟକ୍ରମରେ ଶିକ୍ଷା ଗ୍ରହଣ କରନ୍ତୁ।' },
      { stage: '4', titleEn: 'Join OTDC or Tourism Sector', titleOr: 'OTDC କିମ୍ବା ଘରୋଇ ନିଯୁକ୍ତି', descEn: 'Work with Odisha Tourism Development Corporation (OTDC), international agencies, or start your own tourism enterprise.', descOr: 'ଓଡ଼ିଶା ପର୍ଯ୍ୟଟନ ଉନ୍ନୟନ ନିଗମ (OTDC) କିମ୍ବା ବିଶ୍ୱ ପର୍ଯ୍ୟଟନ ସଂସ୍ଥାରେ କାର୍ଯ୍ୟ ଆରମ୍ଭ କରନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Pathani Samanta', descEn: 'Inspiring Odia scholar whose heritage works motivate curiosity and global recognition of Odia intellect.', descOr: 'ପ୍ରତିଷ୍ଠିତ ଓଡ଼ିଆ ବିଜ୍ଞାନ ପୁରୁଷ ଯାହାଙ୍କ ଜ୍ଞାନ ଓ ପରମ୍ପରା ଆମକୁ ଗର୍ବିତ କରିଥାଏ।' }
    ]
  }
,
  {
    id: 'sports_athlete',
    category: 'odisha',
    titleEn: 'Sports Athlete & Physical Coach',
    titleOr: 'କ୍ରୀଡ଼ାବିତ୍ ଓ କ୍ରୀଡ଼ା ପ୍ରଶିକ୍ଷକ (Sports Athlete)',
    icon: 'Trophy',
    gradient: 'from-orange-600/20 to-amber-700/20',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    taglineEn: 'Train in high-performance centers and represent Odisha and India in sports.',
    taglineOr: 'ଓଡ଼ିଶା ଉଚ୍ଚ-ଦକ୍ଷତା କ୍ରୀଡ଼ା କେନ୍ଦ୍ରରେ ତାଲିମ ନେଇ ଦେଶ ଓ ରାଜ୍ୟ ପାଇଁ ଗର୍ବ ଆଣନ୍ତୁ।',
    examsEn: ['State/National Trials', 'Sports Hostel Admission Exam', 'NSNIS Diploma in Coaching'],
    examsOr: ['ରାଜ୍ୟ/ଜାତୀୟ ପ୍ରତିଭା ଚୟନ', 'କ୍ରୀଡ଼ା ହଷ୍ଟେଲ ପ୍ରବେଶ ପରୀକ୍ଷା', 'NSNIS କୋଚିଂ ଡିପ୍ଲୋମା'],
    milestones: [
      { stage: '1', titleEn: 'School Sports (Class 6-10)', titleOr: 'ସ୍କୁଲ୍ ସ୍ତରୀୟ କ୍ରୀଡ଼ା', descEn: 'Participate in block/district meets. Try to join government sports hostels for free training.', descOr: 'ବ୍ଲକ୍ ଏବଂ ଜିଲ୍ଲା ସ୍ତରୀୟ କ୍ରୀଡ଼ାରେ ଭାଗ ନିଅନ୍ତୁ। ମାଗଣା ତାଲିମ ପାଇଁ ସରକାରୀ କ୍ରୀଡ଼ା ହଷ୍ଟେଲରେ ଯୋଗ ଦିଅନ୍ତୁ।' },
      { stage: '2', titleEn: '+2 Higher Secondary & Academy', titleOr: '+୨ ଶିକ୍ଷା ଓ କ୍ରୀଡ଼ା ଏକାଡେମୀ', descEn: 'Enroll in recognized sports academies. Maintain intensive physical fitness and junior national practice.', descOr: '+୨ ବିଜ୍ଞାନ, କଳା କିମ୍ବା ବାଣିଜ୍ୟ ସହ ସ୍ଥାନୀୟ ଏକାଡେମୀରେ ଅଭ୍ୟାସ ଓ ଜାତୀୟ ପ୍ରତିଯୋଗିତା ପାଇଁ ପ୍ରସ୍ତୁତି କରନ୍ତୁ।' },
      { stage: '3', titleEn: 'HPC & University Level', titleOr: 'ଉଚ୍ଚ-ଦକ୍ଷତା କେନ୍ଦ୍ର ଓ ମହାବିଦ୍ୟାଳୟ', descEn: 'Get scouted for Odisha High Performance Centres (Hockey, Athletics) or SAI training programs.', descOr: 'ଓଡ଼ିଶା କ୍ରୀଡ଼ା ବିଭାଗର ଉଚ୍ଚ-ଦକ୍ଷତା କେନ୍ଦ୍ର (HPC) କିମ୍ବା SAI (Sports Authority of India) କେନ୍ଦ୍ରରେ ଯୋଗ ଦିଅନ୍ତୁ।' },
      { stage: '4', titleEn: 'Pro Representation / Coaching', titleOr: 'ପ୍ରଫେସନାଲ୍ କ୍ୟାରିଅର୍ ଓ କୋଚିଂ', descEn: 'Compete in national/international championships. Complete NSNIS coaching diploma to serve as a sports guide.', descOr: 'ଦେଶ ପାଇଁ ଖେଳି ସୁନାମ ଆଣନ୍ତୁ, କିମ୍ବା NSNIS ଡିପ୍ଲୋମା ଶେଷ କରି ଜଣେ କ୍ରୀଡ଼ା ପ୍ରଶିକ୍ଷକ ହୁଅନ୍ତୁ।' }
    ],
    roleModels: [
      { name: 'Dutee Chand', descEn: 'Eminent sprinter from Odisha who won two silver medals at the Asian Games.', descOr: 'ଓଡ଼ିଶାର ପ୍ରସିଦ୍ଧ ଦ୍ରୁତ ଧାବିକା, ଯିଏ ଏସୀୟ କ୍ରୀଡ଼ାରେ ଭାରତ ପାଇଁ ଦୁଇଟି ରୌପ୍ୟ ପଦକ ଜିତିଛନ୍ତି।' }
    ]
  }
];

export function MoSwapnaView({ language, onBack, user }: MoSwapnaViewProps) {
  const [activeTabSub, setActiveTabSub] = useState<'atlas' | 'tracker' | 'advisor'>('atlas');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'government' | 'private' | 'odisha'>('all');
  const [selectedCareer, setSelectedCareer] = useState<CareerRoadmap | null>(null);

  // Prevent body scroll when career modal is open
  useEffect(() => {
    if (selectedCareer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCareer]);

  // Goal Tracker States
  const [goals, setGoals] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newGoalText, setNewGoalText] = useState('');

  // AI Chat States
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'gundulu'; text: string }[]>([
    {
      sender: 'gundulu',
      text: language === 'en' 
        ? "Hello! I am Gundulu, your Career Dream Advisor. Select a query below or tell me about your dream career!" 
        : "ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ, ତୁମର କ୍ୟାରିଅର୍ ସ୍ୱପ୍ନ ମାର୍ଗଦର୍ଶକ। ତୁମେ ନିଜ ସ୍ୱପ୍ନ ବିଷୟରେ ମୋତେ ପଚାରି ପାରିବ।"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [customQuery, setCustomQuery] = useState('');

  // Load goals from local storage on mount
  useEffect(() => {
    const savedGoals = localStorage.getItem('mo_swapna_goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      // Default placeholder goals
      const defaults = language === 'en' ? [
        { id: '1', text: 'Read about Dr. APJ Abdul Kalam\'s childhood', completed: false },
        { id: '2', text: 'Study Mathematics and Science notes for 1 hour', completed: false },
        { id: '3', text: 'Solve 10 practice questions in Syllabus Tracker', completed: false }
      ] : [
        { id: '1', text: 'ଡଃ ଏପିଜେ ଅବଦୁଲ କଲାମଙ୍କ ଜୀବନୀ ପଢ଼ନ୍ତୁ', completed: false },
        { id: '2', text: 'ଗଣିତ ଏବଂ ବିଜ୍ଞାନ ପାଠ୍ୟକ୍ରମ ୧ ଘଣ୍ଟା ପାଇଁ ପଢ଼ନ୍ତୁ', completed: false },
        { id: '3', text: 'ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜରେ ୧୦ଟି ଗଣିତ ପ୍ରଶ୍ନ ସମାଧାନ କରନ୍ତୁ', completed: false }
      ];
      setGoals(defaults);
      localStorage.setItem('mo_swapna_goals', JSON.stringify(defaults));
    }
  }, []);

  // Save goals
  const saveGoals = (updatedGoals: typeof goals) => {
    setGoals(updatedGoals);
    localStorage.setItem('mo_swapna_goals', JSON.stringify(updatedGoals));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const newGoal = {
      id: Date.now().toString(),
      text: newGoalText.trim(),
      completed: false
    };
    const updated = [...goals, newGoal];
    saveGoals(updated);
    setNewGoalText('');
  };

  const handleToggleGoal = (id: string) => {
    const updated = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
    saveGoals(updated);
  };

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    saveGoals(updated);
  };

  // Preset queries for AI advisor
  const presetQueries = language === 'en' ? [
    { q: "How to become an IAS Officer in Odisha?", a: "To become an IAS/OAS officer, start by focusing on social studies, history, and general knowledge in school. After completing 12th in any stream, finish your graduation. Then prepare for the OPSC/UPSC Civil Services exam. Consistency, writing practice, and current affairs are key!" },
    { q: "What stream should I take for ISRO?", a: "To join ISRO as a space scientist, you must take +2 Science with Physics, Chemistry, and Mathematics (PCM). Try to clear JEE Advanced and join IIST (Indian Institute of Space Science and Technology) in Kerala, or pursue Aerospace/Mechanical/Electronics engineering." },
    { q: "How to become a Doctor through NEET?", a: "To become a doctor, choose +2 Science with Biology, Physics, and Chemistry (PCB). Clear the NEET-UG national entrance exam after 12th. Complete your 5.5-year MBBS degree. You can then write OPSC Medical Services recruitment to join as a Government Medical Officer." },
    { q: "What are the career scopes in AI & Tech?", a: "Artificial Intelligence is booming! Focus on Mathematics and computer coding in school. Take PCM in +2 and pursue B.Tech in Computer Science or AI. Build coding projects in Python, learn statistics, and stay updated with data science tools." }
  ] : [
    { q: "ଓଡ଼ିଶାରେ କିପରି OAS/IAS ଅଫିସର ହେବି?", a: "ଓଡ଼ିଶାରେ OAS/IAS ଅଫିସର ହେବା ପାଇଁ ବିଦ୍ୟାଳୟ ସ୍ତରରୁ ସାମାଜିକ ବିଜ୍ଞାନ, ଭୂଗୋଳ ଏବଂ ସାଧାରଣ ଜ୍ଞାନ ଉପରେ ଗୁରୁତ୍ୱ ଦିଅନ୍ତୁ। ଯେକୌଣସି ବିଭାଗରେ ସ୍ନାତକ ଡିଗ୍ରୀ ହାସଲ କରିବା ପରେ OPSC OCSE ପରୀକ୍ଷା ପାଇଁ ପ୍ରସ୍ତୁତି କରନ୍ତୁ। ନିୟମିତ ଓଡ଼ିଶା ଜିକେ ଏବଂ ଖବରକାଗଜ ପଢ଼ିବା ଅଭ୍ୟାସ ରଖନ୍ତୁ।" },
    { q: "ISRO ରେ ବୈଜ୍ଞାନିକ ହେବା ପାଇଁ କଣ ପଢ଼ିବି?", a: "ISRO ରେ ମହାକାଶ ବୈଜ୍ଞାନିକ ହେବା ପାଇଁ ଆପଣଙ୍କୁ +୨ ବିଜ୍ଞାନ (ଗଣିତ, ପଦାର୍ଥ ଓ ରସାୟନ ବିଜ୍ଞାନ - PCM) ରଖି ପଢ଼ିବାକୁ ହେବ। ଏହା ପରେ IIST (ମହାକାଶ ଏକାଡେମୀ) ରେ ପ୍ରବେଶ ପାଇଁ JEE Advanced ପରୀକ୍ଷା ଦିଅନ୍ତୁ କିମ୍ବା NIT/IIT ରୁ B.Tech ଶିକ୍ଷା ସମାପ୍ତ କରନ୍ତୁ।" },
    { q: "NEET ପରୀକ୍ଷା ଦେଇ କିପରି ଡାକ୍ତର ହେବି?", a: "ଡାକ୍ତରୀ କ୍ୟାରିଅର୍ ପାଇଁ +୨ ବିଜ୍ଞାନରେ ଜୀବବିଜ୍ଞାନ, ଭୌତିକ ଓ ରସାୟନ ବିଜ୍ଞାନ (PCB) ରଖନ୍ତୁ। ଦ୍ୱାଦଶ ପରେ NEET-UG ଜାତୀୟ ପ୍ରବେଶିକା ପରୀକ୍ଷା ଦିଅନ୍ତୁ। ଏହା ଉତ୍ତୀର୍ଣ୍ଣ ହେଲେ ଆପଣ MBBS ପାଠ୍ୟକ୍ରମରେ ନାମ ଲେଖାଇ ପାରିବେ। ଏହା ପରେ OPSC ପରୀକ୍ଷା ଦେଇ ସରକାରୀ ମେଡିକାଲ୍ ଅଫିସର ହେବେ।" },
    { q: "ଏଆଇ (AI) କ୍ଷେତ୍ରରେ କିପରି ଭବିଷ୍ୟତ ଗଢ଼ିବି?", a: "AI ଓ ଡାଟା ସାଇନ୍ସ ଏକ ଆଧୁନିକ ଲୋକପ୍ରିୟ କ୍ୟାରିଅର୍। ବିଦ୍ୟାଳୟ ସ୍ତରରୁ ଗଣିତ ଓ କମ୍ପ୍ୟୁଟର ପ୍ରୋଗ୍ରାମିଂ (Python) ଶିଖିବା ଆରମ୍ଭ କରନ୍ତୁ। +୨ ରେ PCM ଏବଂ ତା\'ପରେ B.Tech (Computer Science / AI) ଡିଗ୍ରୀ ହାସଲ କରି କମ୍ପାନୀରେ ଯୋଗ ଦେଇପାରିବେ।" }
  ];

  const handleSendQuery = (queryText: string, answerText: string) => {
    if (isTyping) return;
    
    // Add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setIsTyping(true);

    // Stagger response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'gundulu', text: answerText }]);
      setIsTyping(false);
      
      // Play soft notification sound safely
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    }, 1200);
  };

  const handleSendCustomQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isTyping || !customQuery.trim()) return;

    const queryText = customQuery.trim();
    setCustomQuery('');

    // Add user message to UI
    setChatMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setIsTyping(true);

    try {
      const ai = getAI();
      const contents = chatMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({
        role: 'user',
        parts: [{ text: queryText }]
      });

      const systemInstruction = `You are Gundulu, a warm, inspiring, and highly knowledgeable AI Career Guide for school students (Class 1 to 10) in Odisha, India. 
Your goal is to guide students on how to achieve their dream careers. Follow these guidelines:
1. Always respond in Odia (ଓଡ଼ିଆ) if the student asks or writes in Odia. If the user writes in English, you can respond in English but maintain Odia context. Keep your language simple and friendly, easy for children to understand.
2. Provide a step-by-step career path (High school focus, +2 stream, graduation, relevant entrance exams like NEET, JEE, CLAT, UPSC, OPSC OJS/OCSE, and colleges).
3. Mention Odisha-specific roles, government and private sectors, and local role models (e.g. Biju Patnaik, Dr. APJ Abdul Kalam, Pathani Samanta, Gopabandhu Das) to inspire them.
4. Keep answers positive, clear, structured, and motivational.
5. Crucial Spelling Constraint: When writing in Odia, ensure spelling is correct. Avoid spelling mistakes like 'ପରିକ୍ଷା' (use 'ପରୀକ୍ଷା' instead), 'ଗୁଣ୍ଡୁଲୁ' (use 'ଗୁଣ୍ଡୁଲୁ' instead).`;

      const responseText = await withRetry(async (modelName, apiVersion) => {
        const genModel = ai.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
        }, { apiVersion });

        const result = await genModel.generateContent({ contents });
        return result.response.text();
      }, 'flash');

      const rawReply = responseText || (language === 'en' ? "I couldn't process that. Please try again." : "ଦୟାକରି ପୁଣିଥରେ ଚେଷ୍ଟା କରନ୍ତୁ।");
      const cleanReply = cleanOdiaOrthography(rawReply);

      setChatMessages(prev => [...prev, { sender: 'gundulu', text: cleanReply }]);

      // Play soft notification sound safely
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (err) {
      console.error("Gundulu Advisor AI error:", err);
      const errorMsg = language === 'en' 
        ? "Sorry, I am facing connectivity issues. Please try again later." 
        : "ଦୁଃଖିତ, ସଂଯୋଗରେ ସମସ୍ୟା ଦେଖାଦେଇଛି। ଦୟାକରି ପରେ ଚେଷ୍ଟା କରନ୍ତୁ।";
      setChatMessages(prev => [...prev, { sender: 'gundulu', text: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };


  const filteredCareers = selectedCategory === 'all' 
    ? CAREER_DATABASE 
    : CAREER_DATABASE.filter(c => c.category === selectedCategory);

  const getLucideIcon = (iconName: string) => {
    const IconComponent = (Lucide as any)[iconName];
    return IconComponent ? <IconComponent size={24} /> : <Lucide.Briefcase size={24} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 pb-20 relative overflow-hidden"
    >
      {/* Ethereal background gradient mesh elements */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-white"
          >
            <Lucide.ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3.5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-orange-200 tracking-tight flex items-center gap-2 uppercase">
              <Lucide.Compass className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              {language === 'en' ? 'Mo Swapna' : 'ମୋ ସ୍ୱପ୍ନ'}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
              {language === 'en' 
                ? 'Your personalized dream career roadmap and goal setting platform' 
                : 'ତୁମର କ୍ୟାରିଅର୍ ସ୍ୱପ୍ନ ମାନଚିତ୍ର ଏବଂ ଲକ୍ଷ୍ୟ ହାସଲ କରିବାର ଶ୍ରେଷ୍ଠ ମାଧ୍ୟମ'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex rounded-2xl bg-slate-900/60 border border-slate-800 p-1 relative z-10 backdrop-blur-md max-w-lg">
        <button
          onClick={() => setActiveTabSub('atlas')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTabSub === 'atlas' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lucide.Map size={16} />
          <span>{language === 'en' ? 'Dream Atlas' : 'ସ୍ୱପ୍ନ ମାନଚିତ୍ର'}</span>
        </button>

        <button
          onClick={() => setActiveTabSub('tracker')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTabSub === 'tracker' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lucide.CheckSquare size={16} />
          <span>{language === 'en' ? 'My Goals' : 'ମୋ ଲକ୍ଷ୍ୟ'}</span>
        </button>

        <button
          onClick={() => setActiveTabSub('advisor')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTabSub === 'advisor' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lucide.Sparkles size={16} />
          <span>{language === 'en' ? 'AI Guide' : 'AI ମାର୍ଗଦର୍ଶକ'}</span>
        </button>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {/* TAB 1: DREAM ATLAS */}
        {activeTabSub === 'atlas' && (
          <motion.div
            key="atlas"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 relative z-10"
          >
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', labelEn: 'All Sectors', labelOr: 'ସମସ୍ତ କ୍ୟାରିଅର୍' },
                { id: 'government', labelEn: 'Govt. Jobs', labelOr: 'ସରକାରୀ ଚାକିରି' },
                { id: 'private', labelEn: 'Private / Corporate', labelOr: 'ଘରୋଇ ଓ ଟେକ୍' },
                { id: 'odisha', labelEn: 'Odisha Focused', labelOr: 'ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500/10 border-amber-400/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {language === 'en' ? cat.labelEn : cat.labelOr}
                </button>
              ))}
            </div>

            {/* Careers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCareers.map((career) => (
                <motion.div
                  key={career.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => setSelectedCareer(career)}
                  className={`glass-card rounded-[2rem] border border-slate-800/80 p-6 flex flex-col justify-between cursor-pointer group transition-all relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950`}
                  style={{ 
                    boxShadow: `0 10px 30px -10px rgba(0,0,0,0.5), inset 0 1px 0px rgba(255,255,255,0.05)`
                  }}
                >
                  {/* Glowing inner spot */}
                  <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {/* Icon container */}
                      <div 
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border bg-gradient-to-br ${career.gradient} border-white/5 text-amber-400 group-hover:border-amber-400/30 transition-all`}
                        style={{ boxShadow: `0 0 20px ${career.glowColor}10` }}
                      >
                        {getLucideIcon(career.icon)}
                      </div>
                      
                      {/* Category Badge */}
                      <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-300">
                        {career.category === 'government' ? (language === 'en' ? 'Govt' : 'ସରକାରୀ') :
                         career.category === 'private' ? (language === 'en' ? 'Private' : 'ଘରୋଇ') : 
                         (language === 'en' ? 'Odisha' : 'ଓଡ଼ିଶା')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                        {language === 'en' ? career.titleEn : career.titleOr}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed font-bold">
                        {language === 'en' ? career.taglineEn : career.taglineOr}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-widest group-hover:gap-2.5 transition-all">
                    <span>{language === 'en' ? 'View Roadmap' : 'ସ୍ୱପ୍ନ ପଥ ଦେଖନ୍ତୁ'}</span>
                    <Lucide.ArrowRight size={14} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 2: GOAL TRACKER */}
        {activeTabSub === 'tracker' && (
          <motion.div
            key="tracker"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10"
          >
            {/* Left: Goals Stats */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card rounded-[2rem] border border-slate-800 p-6 bg-slate-950/60 backdrop-blur-md">
                <h3 className="text-lg font-black text-white mb-4 uppercase tracking-tight">
                  {language === 'en' ? 'Dream Progress' : 'ସ୍ୱପ୍ନ ସଫଳତା ପ୍ରଗତି'}
                </h3>
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  {/* Progress Circle Visual */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="transparent" />
                      <motion.circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        stroke="url(#goldGrad)" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - (goals.length > 0 ? goals.filter(g => g.completed).length / goals.length : 0))}
                        strokeLinecap="round"
                        transition={{ duration: 0.8 }}
                      />
                      <defs>
                        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">
                        {goals.length > 0 ? Math.round((goals.filter(g => g.completed).length / goals.length) * 100) : 0}%
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Completed</span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="text-sm font-black text-white">
                      {goals.filter(g => g.completed).length} / {goals.length} {language === 'en' ? 'Goals Met' : 'ଲକ୍ଷ୍ୟ ପୂରଣ ହୋଇଛି'}
                    </div>
                    <p className="text-slate-400 text-xs">
                      {language === 'en' ? 'Complete targets to get closer to your dream' : 'ନିଜର ପ୍ରତିଦିନର ଲକ୍ଷ୍ୟ ପୂରଣ କରି ସ୍ୱପ୍ନ ସଫଳ କର'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Goals List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card rounded-[2rem] border border-slate-800 p-6 bg-slate-950/60 backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    {language === 'en' ? 'My Dream Journal Goals' : 'ମୋର ସ୍ୱପ୍ନ ଲକ୍ଷ୍ୟ ପତ୍ରିକା'}
                  </h3>
                </div>

                {/* Add Goal Input */}
                <form onSubmit={handleAddGoal} className="flex gap-2">
                  <input
                    type="text"
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder={language === 'en' ? 'Add a new career goal (e.g. Study science notes)' : 'ନୂଆ କାର୍ଯ୍ୟ ଲକ୍ଷ୍ୟ ଲେଖନ୍ତୁ (ଯେପରି: ଗଣିତ ଅଭ୍ୟାସ)'}
                    className="flex-1 bg-slate-900/80 border border-slate-800 focus:border-amber-500/50 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black cursor-pointer shadow-md flex items-center justify-center shrink-0"
                  >
                    <Lucide.Plus size={18} />
                  </button>
                </form>

                {/* List */}
                <div className="space-y-3">
                  {goals.length > 0 ? (
                    goals.map(goal => (
                      <div 
                        key={goal.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          goal.completed 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-500' 
                            : 'bg-slate-900/30 border-slate-800/80 text-white'
                        }`}
                      >
                        <div 
                          onClick={() => handleToggleGoal(goal.id)}
                          className="flex items-center gap-3 cursor-pointer flex-1 select-none"
                        >
                          <div className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            goal.completed 
                              ? 'bg-emerald-500 border-emerald-400 text-[#0f172a]' 
                              : 'border-slate-700 hover:border-amber-500'
                          }`}>
                            {goal.completed && <Lucide.Check size={14} className="stroke-[3.5]" />}
                          </div>
                          <span className={`text-xs sm:text-sm font-semibold leading-relaxed ${goal.completed ? 'line-through opacity-60' : ''}`}>
                            {goal.text}
                          </span>
                        </div>

                        <button 
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer ml-2"
                        >
                          <Lucide.Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500 space-y-2">
                      <Lucide.ClipboardList size={36} className="mx-auto text-slate-600 animate-pulse" />
                      <p className="text-sm font-black">{language === 'en' ? 'Your Dream Journal is empty!' : 'ତୁମର ଲକ୍ଷ୍ୟ ପତ୍ରିକା ଖାଲି ଅଛି!'}</p>
                      <p className="text-xs">{language === 'en' ? 'Add some goals to start your career journey.' : 'ସ୍ୱପ୍ନ ପଥରେ ଆଗକୁ ବଢ଼ିବା ପାଇଁ କିଛି ଲକ୍ଷ୍ୟ ଯୋଡ଼ନ୍ତୁ।'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: AI ADVISOR */}
        {activeTabSub === 'advisor' && (
          <motion.div
            key="advisor"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10"
          >
            {/* Left: Preset Questions */}
            <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
              <div className="glass-card rounded-[2rem] border border-slate-800 p-5 bg-slate-950/60 backdrop-blur-md space-y-4">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lucide.Compass size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
                  {language === 'en' ? 'Common Career Queries' : 'ସାଧାରଣ ପ୍ରଶ୍ନ ପଚାର'}
                </h3>
                <div className="flex flex-col gap-2.5">
                  {presetQueries.map((item, index) => (
                    <button
                      key={index}
                      disabled={isTyping}
                      onClick={() => handleSendQuery(item.q, item.a)}
                      className={`text-left p-3 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-amber-500/40 hover:bg-amber-500/5 text-xs text-slate-300 font-bold transition-all cursor-pointer active:scale-98 ${
                        isTyping ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Mystical Chat Console */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="glass-card rounded-[2rem] border border-slate-800 bg-slate-950/60 backdrop-blur-md h-[460px] flex flex-col justify-between overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_35px_rgba(0,0,0,0.5)]">
                {/* Chat Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xs animate-ping" />
                      <Lucide.Sparkles size={14} className="text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white leading-none">
                        {language === 'en' ? 'Gundulu Dream Advisor' : 'ଗୁଣ୍ଡୁଲୁ ସ୍ୱପ୍ନ ମାର୍ଗଦର୍ଶକ'}
                      </h4>
                      <span className="text-[8px] sm:text-[9px] font-bold text-emerald-400 tracking-wider flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ONLINE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 flex flex-col">
                  {chatMessages.map((msg, index) => (
                    <div 
                      key={index}
                      className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="self-start flex items-center gap-1 bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  )}
                </div>

                {/* Chat Input Section */}
                <form onSubmit={handleSendCustomQuery} className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center gap-2 relative z-20">
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder={language === 'en' ? "Ask Gundulu anything about your dream career..." : "ଗୁଣ୍ଡୁଲୁକୁ ତୁମର ସ୍ୱପ୍ନ କ୍ୟାରିଅର୍ ବିଷୟରେ ପଚାର..."}
                    disabled={isTyping}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    disabled={isTyping || !customQuery.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer"
                  >
                    <Lucide.Send size={14} className="stroke-[2.5]" />
                  </button>
                </form>

                {/* Chat Info bottom */}
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/30 text-center text-[10px] text-slate-500 font-semibold">
                  {language === 'en' 
                    ? 'Type a custom question above or click one of the queries on the left to receive guidance.' 
                    : 'ଉପରେ ନିଜ ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ କିମ୍ବା ବାମ ପାର୍ଶ୍ୱରେ ଥିବା ପ୍ରଶ୍ନଗୁଡ଼ିକ ଉପରେ କ୍ଲିକ୍ କରି ମାର୍ଗଦର୍ଶନ ପାଆନ୍ତୁ।'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROADMAP OVERLAY MODAL */}
      <AnimatePresence>
        {selectedCareer && (
          <div className="fixed inset-0 z-[12000] bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden force-dark-theme">
            {/* Outer golden aura backing */}
            <div 
              style={{ boxShadow: '0 0 150px 40px rgba(245,158,11,0.2)' }}
              className="absolute w-[200px] h-[200px] rounded-full blur-[90px] pointer-events-none z-0" 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              className="relative overflow-hidden rounded-t-[2rem] sm:rounded-[2.5rem] border-t sm:border border-amber-500/25 bg-[#080d1a] p-4 sm:p-8 md:p-10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] max-w-4xl w-full h-[88vh] sm:h-auto max-h-[88vh] sm:max-h-[90vh] md:max-h-[85vh] z-10 flex flex-col space-y-4 sm:space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedCareer(null)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-500/40 text-white hover:text-amber-300 transition-all cursor-pointer z-30"
              >
                <Lucide.X size={18} className="stroke-[2.5]" />
              </button>

              {/* Header inside modal */}
              <div className="flex items-start gap-3 sm:gap-4 pr-12 sm:pr-10">
                <div 
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border bg-gradient-to-br ${selectedCareer.gradient} border-amber-500/30 text-amber-400 shrink-0`}
                  style={{ boxShadow: `0 0 25px ${selectedCareer.glowColor}20` }}
                >
                  {getLucideIcon(selectedCareer.icon)}
                </div>
                <div>
                  <div className="inline-flex px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-black uppercase text-amber-400 tracking-wider mb-1">
                    {selectedCareer.category === 'government' ? (language === 'en' ? 'Government' : 'ସରକାରୀ') :
                     selectedCareer.category === 'private' ? (language === 'en' ? 'Private / Corporate' : 'ଘରୋଇ ଓ ଟେକ୍') : 
                     (language === 'en' ? 'Odisha Special' : 'ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର')}
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                    {language === 'en' ? selectedCareer.titleEn : selectedCareer.titleOr}
                  </h2>
                  <p className="text-slate-400 text-[10px] sm:text-sm font-semibold mt-1">
                    {language === 'en' ? selectedCareer.taglineEn : selectedCareer.taglineOr}
                  </p>
                </div>
              </div>

              {/* Scrollable Content Wrapper */}
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-3 space-y-4 sm:space-y-6 custom-scrollbar overscroll-contain">
                {/* Grid content inside modal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 pt-2">
                {/* Left: Roadmaps Timeline */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                    🎓 {language === 'en' ? 'Success Milestones' : 'ସ୍ୱପ୍ନ ମାଇଲଖୁଣ୍ଟ'}
                  </h3>
                  
                  {/* Timeline Cards */}
                  <div className="space-y-4">
                    {selectedCareer.milestones.map((m, idx) => (
                      <div key={idx} className="flex gap-3 sm:gap-4 relative">
                        {/* Milestone Number bubble */}
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center text-[10px] sm:text-xs font-black text-amber-400 relative z-10">
                            {m.stage}
                          </div>
                          {idx < selectedCareer.milestones.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gradient-to-b from-amber-500/30 to-transparent my-1" />
                          )}
                        </div>
                        {/* Milestone Text Box */}
                        <div className="flex-1 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-900 space-y-1 relative -top-1">
                          <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                            {language === 'en' ? m.titleEn : m.titleOr}
                          </h4>
                          <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed font-bold">
                            {language === 'en' ? m.descEn : m.descOr}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Target Exams & Role Models */}
                <div className="lg:col-span-1 space-y-4 sm:space-y-5">
                  {/* Target Exams */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-900 space-y-2.5 sm:space-y-3">
                    <h4 className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lucide.GraduationCap size={13} className="sm:size-[14px]" />
                      {language === 'en' ? 'Target Examinations' : 'ସଫଳତା ପ୍ରବେଶିକା ପରୀକ୍ଷା'}
                    </h4>
                    <ul className="space-y-1.5 sm:space-y-2 list-none p-0 m-0">
                      {(language === 'en' ? selectedCareer.examsEn : selectedCareer.examsOr).map((exam, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[10px] sm:text-xs font-bold text-slate-300 leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                          <span>{exam}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Role Models */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-900 space-y-2.5 sm:space-y-3">
                    <h4 className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lucide.Trophy size={13} className="sm:size-[14px]" />
                      {language === 'en' ? 'Inspiring Role Models' : 'ଆଦର୍ଶ ପ୍ରେରଣା ଦାତା'}
                    </h4>
                    <div className="space-y-3 sm:space-y-2.5">
                      {selectedCareer.roleModels.map((rm, idx) => (
                        <div key={idx} className="space-y-0.5 sm:space-y-1">
                          <h5 className="text-[11px] sm:text-xs font-black text-white leading-snug">{rm.name}</h5>
                          <p className="text-slate-400 text-[9px] sm:text-[10px] leading-relaxed font-semibold">
                            {language === 'en' ? rm.descEn : rm.descOr}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
