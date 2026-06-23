import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';

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
    taglineOr: 'ଓଡ଼ିଶାର ସମୃଦ୍ଧ ଖଣି ସମ୍ପଦର ଉତ୍ତୋଳନ, ଗବେଷଣା ଏବଂ ସୁରକ୍ଷା ପରିଚାଳନା କରନ୍ତୁ।',
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
  }
];

export function MoSwapnaView({ language, onBack, user }: MoSwapnaViewProps) {
  const [activeTabSub, setActiveTabSub] = useState<'atlas' | 'tracker' | 'advisor'>('atlas');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'government' | 'private' | 'odisha'>('all');
  const [selectedCareer, setSelectedCareer] = useState<CareerRoadmap | null>(null);

  // Goal Tracker States
  const [goals, setGoals] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newGoalText, setNewGoalText] = useState('');

  // AI Chat States
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'gundulu'; text: string }[]>([
    {
      sender: 'gundulu',
      text: language === 'en' 
        ? "Hello! I am Gundulu, your Career Dream Advisor. Select a query below or tell me about your dream career!" 
        : "ନମସ୍କାର! ମୁଁ ଗୁନ୍ଦୁଲୁ, ତୁମର କ୍ୟାରିଅର୍ ସ୍ୱପ୍ନ ମାର୍ଗଦର୍ଶକ। ତୁମେ ନିଜ ସ୍ୱପ୍ନ ବିଷୟରେ ମୋତେ ପଚାରି ପାରିବ।"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

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
                        {language === 'en' ? 'Gundulu Dream Advisor' : 'ଗୁନ୍ଦୁଲୁ ସ୍ୱପ୍ନ ମାର୍ଗଦର୍ଶକ'}
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

                {/* Chat Info bottom */}
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/30 text-center text-[10px] text-slate-500 font-semibold">
                  {language === 'en' 
                    ? 'Click one of the queries on the left to receive dynamic counseling guidance.' 
                    : 'କ୍ୟାରିଅର୍ ପଥ ପାଇଁ ବାମ ପାର୍ଶ୍ୱରେ ଥିବା ଯେକୌଣସି ପ୍ରଶ୍ନ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROADMAP OVERLAY MODAL */}
      <AnimatePresence>
        {selectedCareer && (
          <div className="fixed inset-0 z-[12000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
            {/* Outer golden aura backing */}
            <div 
              style={{ boxShadow: '0 0 150px 40px rgba(245,158,11,0.2)' }}
              className="absolute w-[200px] h-[200px] rounded-full blur-[90px] pointer-events-none z-0" 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/25 bg-[#080d1a] p-6 sm:p-8 md:p-10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] max-w-4xl w-full z-10 space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedCareer(null)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-500/40 text-white hover:text-amber-300 transition-all cursor-pointer z-30"
              >
                <Lucide.X size={18} className="stroke-[2.5]" />
              </button>

              {/* Header inside modal */}
              <div className="flex items-start gap-4">
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border bg-gradient-to-br ${selectedCareer.gradient} border-amber-500/30 text-amber-400 shrink-0`}
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
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                    {language === 'en' ? selectedCareer.titleEn : selectedCareer.titleOr}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm font-semibold mt-1">
                    {language === 'en' ? selectedCareer.taglineEn : selectedCareer.taglineOr}
                  </p>
                </div>
              </div>

              {/* Grid content inside modal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                {/* Left: Roadmaps Timeline */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                    🎓 {language === 'en' ? 'Success Milestones' : 'ସ୍ୱପ୍ନ ମାଇଲଖୁଣ୍ଟ'}
                  </h3>
                  
                  {/* Timeline Cards */}
                  <div className="space-y-4">
                    {selectedCareer.milestones.map((m, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        {/* Milestone Number bubble */}
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 relative z-10">
                            {m.stage}
                          </div>
                          {idx < selectedCareer.milestones.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gradient-to-b from-amber-500/30 to-transparent my-1" />
                          )}
                        </div>
                        {/* Milestone Text Box */}
                        <div className="flex-1 p-4 rounded-2xl bg-slate-950/80 border border-slate-900 space-y-1 relative -top-1.5">
                          <h4 className="text-xs sm:text-sm font-black text-white leading-none">
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
                <div className="lg:col-span-1 space-y-5">
                  {/* Target Exams */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-900 space-y-3">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lucide.GraduationCap size={14} />
                      {language === 'en' ? 'Target Examinations' : 'ସଫଳତା ପ୍ରବେଶିକା ପରୀକ୍ଷା'}
                    </h4>
                    <ul className="space-y-2 list-none p-0 m-0">
                      {(language === 'en' ? selectedCareer.examsEn : selectedCareer.examsOr).map((exam, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {exam}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Role Models */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-900 space-y-3">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lucide.Trophy size={14} />
                      {language === 'en' ? 'Inspiring Role Models' : 'ଆଦର୍ଶ ପ୍ରେରଣା ଦାତା'}
                    </h4>
                    <div className="space-y-2">
                      {selectedCareer.roleModels.map((rm, idx) => (
                        <div key={idx} className="space-y-1">
                          <h5 className="text-xs font-black text-white">{rm.name}</h5>
                          <p className="text-slate-400 text-[10px] leading-relaxed font-medium">
                            {language === 'en' ? rm.descEn : rm.descOr}
                          </p>
                        </div>
                      ))}
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
