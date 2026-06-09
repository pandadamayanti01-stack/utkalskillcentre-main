import React, { useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { motion } from 'framer-motion';
import { getPremiumConceptMapUrl } from '../data/conceptMapsRegistry';

interface Chapter {
  id: string;
  title: string;
  title_en?: string;
  title_or?: string;
  notes?: string;
  subject?: string;
}

interface ConceptMapViewProps {
  chapter: Chapter;
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade?: () => void;
  onAskGundulu: (query: string) => void;
}

interface OverlayNode {
  labelEn: string;
  labelOr: string;
  top: string;
  left: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
}

const PREMIUM_OVERLAYS: Record<string, OverlayNode[]> = {
  'Vx3FQK8ZAl67KwvDi1Iy': [
    { labelEn: "Photosynthesis Overview", labelOr: "ଆଲୋକଶ୍ଳେଷଣ ସାରาଂଶ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Carbon Dioxide (CO2)", labelOr: "ଅଙ୍ଗାରକାମ୍ଳ (CO2)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Water (H2O)", labelOr: "ଜଳ (H2O)", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Chloroplast (Chlorophyll)", labelOr: "ହରିତ୍‌କଣା (ହରିତକାଣ)", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Light Reaction (Grana)", labelOr: "ଆଲୋକ ପ୍ରକ୍ରିୟା (ଗ୍ରାନା)", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Dark Reaction (Stroma)", labelOr: "ଅନ୍ଧକାର ପ୍ରକ୍ରିୟା (ଷ୍ଟ୍ରୋମା)", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Glucose & Oxygen (O2)", labelOr: "ଗ୍ଲୁକୋଜ୍ ଏବଂ ଅମ୍ଳଜାନ (O2)", top: '85%', left: '50%', color: 'emerald' }
  ],
  'WHZAR4BSAWixmaPmHuqW': [
    { labelEn: "Photosynthesis Overview", labelOr: "ଆଲୋକଶ୍ଳେଷଣ ସାରାଂଶ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Carbon Dioxide (CO2)", labelOr: "ଅଙ୍ଗାରକାମ୍ଳ (CO2)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Water (H2O)", labelOr: "ଜଳ (H2O)", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Chloroplast (Chlorophyll)", labelOr: "ହରିତ୍‌କଣା (ହରିତକାଣ)", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Light Reaction (Grana)", labelOr: "ଆଲୋକ ପ୍ରକ୍ରିୟା (ଗ୍ରାନା)", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Dark Reaction (Stroma)", labelOr: "ଅନ୍ଧକାର ପ୍ରକ୍ରିୟା (ଷ୍ଟ୍ରୋମା)", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Glucose & Oxygen (O2)", labelOr: "ଗ୍ଲୁକୋଜ୍ ଏବଂ ଅମ୍ଳଜାନ (O2)", top: '85%', left: '50%', color: 'emerald' }
  ],
  'CUQwtkjyKesVfAtJYiky': [
    { labelEn: "Chemical Equations", labelOr: "ରାସାୟନିକ ସମୀକରଣ", top: '10%', left: '50%', color: 'amber' },
    { labelEn: "Reactants", labelOr: "ପ୍ରତିକାରକ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Combination Reaction", labelOr: "ସଂଶ୍ଳେଷଣ ପ୍ରତିକ୍ରିୟା", top: '65%', left: '20%', color: 'emerald' },
    { labelEn: "Reaction Conditions", labelOr: "ପ୍ରତିକ୍ରିୟା ସର୍ତ୍ତାବଳୀ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Products", labelOr: "ଉତ୍ପାଦ", top: '30%', left: '80%', color: 'blue' },
    { labelEn: "Decomposition Reaction", labelOr: "ବିଘଟନ ପ୍ରତିକ୍ରିୟା", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Displacement & Redox", labelOr: "ବିସ୍ଥାପନ ଓ ଜାରଣ-ବିଜାରଣ", top: '85%', left: '50%', color: 'amber' }
  ],
  'BkI12z7DPpAaIozm4bKH': [
    { labelEn: "Electric Circuit", labelOr: "ବିଦ୍ୟୁତ୍ ପରିପଥ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Electric Current (I)", labelOr: "ବିଦ୍ୟୁତ୍ ସ୍ରୋତ (I)", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "Voltage / Potential (V)", labelOr: "ବିଭବାନ୍ତର (V)", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Ohm's Law (V = IR)", labelOr: "ଓମ୍‌ଙ୍କ ନିୟମ (V = IR)", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Resistance (R)", labelOr: "ପ୍ରତିରୋଧ (R)", top: '30%', left: '80%', color: 'purple' },
    { labelEn: "Series / Parallel Resistors", labelOr: "ଶ୍ରେଣୀ ଓ ସମାନ୍ତରାଳ ସଂଯୋଗ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Heating Effect", labelOr: "ତାପୀୟ ପ୍ରଭାବ", top: '85%', left: '50%', color: 'amber' }
  ],
  '5n7Dg8pphGZT8XG2xKHW': [
    { labelEn: "Acids, Bases & Salts", labelOr: "ଅମ୍ଳ, କ୍ଷାରକ ଓ ଲବଣ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Acids (pH < 7)", labelOr: "ଅମ୍ଳ (pH < ୭)", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "pH Indicators", labelOr: "pH ସୂଚକ", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Neutralization", labelOr: "ପ୍ରଶମନ ପ୍ରତିକ୍ରିୟା", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Bases (pH > 7)", labelOr: "କ୍ଷାରକ (pH > ୭)", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Salts & Properties", labelOr: "ଲବଣ ଓ ଗୁଣଧର୍ମ", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Chlor-Alkali Process", labelOr: "କ୍ଲୋର-ଆଲକାଲି ପ୍ରଣାଳୀ", top: '85%', left: '50%', color: 'amber' }
  ],
  'hN2uO4iyaCERFcPLmran': [
    { labelEn: "Metals & Non-Metals", labelOr: "ଧାତୁ ଓ ଅଧାତୁ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Physical Properties", labelOr: "ଭୌତିକ ଧର୍ମ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Reactivity Series", labelOr: "ପ୍ରତିକ୍ରିୟାଶୀଳତା ଶ୍ରେଣୀ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Ionic Bonding", labelOr: "ଆୟୋନିକ୍ ବନ୍ଧନ", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Chemical Properties", labelOr: "ରାସାୟନିକ ଧର୍ମ", top: '30%', left: '80%', color: 'purple' },
    { labelEn: "Extraction of Metals", labelOr: "ଧାତୁ ନିଷ୍କାସନ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Corrosion Prevention", labelOr: "କ୍ଷୟୀଭବନ ପ୍ରତିରୋଧ", top: '85%', left: '50%', color: 'emerald' }
  ],
  'vfXYwB9Po1rB4Aty4q3Y': [
    { labelEn: "Carbon Compounds", labelOr: "କାର୍ବନ ଯୌଗିକ", top: '10%', left: '50%', color: 'amber' },
    { labelEn: "Covalent Bonding", labelOr: "ସହସଂଯୋଜକ ବନ୍ଧନ", top: '30%', left: '20%', color: 'emerald' },
    { labelEn: "Saturated (Alkanes)", labelOr: "ସନ୍ତୃପ୍ତ (ଆଲକେନ୍)", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Allotropes (Diamond/Graphite)", labelOr: "ଅପରୂପ (ହୀରା/ଗ୍ରାଫାଇଟ୍)", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Functional Groups", labelOr: "କ୍ରିୟାତ୍ମକ ଗ୍ରୁପ୍", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Unsaturated (Alkenes/Alkynes)", labelOr: "ଅସନ୍ତୃପ୍ତ (ଆଲକିନ୍/ଆଲକାଇନ୍)", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Soap & Detergents", labelOr: "ସାବୁନ୍ ଏବଂ ଡିଟରଜେଣ୍ଟ୍", top: '85%', left: '50%', color: 'emerald' }
  ],
  'vYSgSwsyfXAUGTHZPMHk': [
    { labelEn: "Periodic Classification", labelOr: "ମୌଳିକର ଶ୍ରେଣୀକରଣ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Early Attempts (Triads/Octaves)", labelOr: "ପ୍ରାରମ୍ଭିକ ପ୍ରୟାସ (ତ୍ରିପଦୀ/ଅଷ୍ଟକ)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Mendeleev's Periodic Table", labelOr: "ମେଣ୍ଡେଲିଭ୍ ପର୍ଯ୍ୟାୟ ସାରଣୀ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Modern Periodic Table (Atomic No.)", labelOr: "ଆଧୁନିକ ପର୍ଯ୍ୟାୟ ସାରଣୀ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Periods (7) & Groups (18)", labelOr: "ପର୍ଯ୍ୟାୟ (୭) ଓ ଗ୍ରୁପ୍ (୧୮)", top: '30%', left: '80%', color: 'blue' },
    { labelEn: "Valency & Atomic Size Trends", labelOr: "ଯୋଜ୍ଯତା ଓ ଆଟୋମିକ୍ ସାଇଜ୍ ପ୍ରବୃତ୍ତି", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Metallic & Non-Metallic Trends", labelOr: "ଧାତବ ଓ ଅଧାତବ ଗୁଣଧର୍ମ", top: '85%', left: '50%', color: 'emerald' }
  ],
  'vIk5JIUpltQXmdbvknis': [
    { labelEn: "Electromagnetism Overview", labelOr: "ବିଦ୍ୟୁତ୍ ଚୁମ୍ବକତ୍ୱ ସାରାଂଶ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Magnetic Field Lines", labelOr: "ଚୁମ୍ବକୀୟ ବଳରେଖା", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "Current in Solenoid", labelOr: "ସୋଲେନଏଡ୍‌ରେ ପ୍ରବାହିତ ସ୍ରୋତ", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Fleming's Left-Hand Rule", labelOr: "ଫ୍ଲେମିଙ୍ଗଙ୍କ ବାମ-හସ୍ତ ନିୟମ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Electric Motor principle", labelOr: "ବିଦ୍ୟୁତ୍ ମୋଟର ନିୟମ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Induced Current / Generator", labelOr: "ପ୍ରେରିତ ସ୍ରୋତ / ଜେନେରେଟର", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Domestic Electric Circuits", labelOr: "ଗୃହୋପକରଣ ବିଦ୍ୟୁତ୍ ପରିପଥ", top: '85%', left: '50%', color: 'amber' }
  ],
  'yBsU83fVRBM0lGzhfG5N': [
    { labelEn: "Human Eye & Light", labelOr: "ମାନବ ଚକ୍ଷୁ ଓ ଆଲୋକ", top: '10%', left: '50%', color: 'amber' },
    { labelEn: "Accommodation of Eye", labelOr: "ଚକ୍ଷୁର ସମାଯୋଜନ କ୍ଷମତା", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Myopia & Hypermetropia", labelOr: "ସମୀପ ଦୃଷ୍ଟି ଓ ଦୂର ଦୃଷ୍ଟି ଦୋଷ", top: '65%', left: '20%', color: 'emerald' },
    { labelEn: "Dispersion / Spectrum", labelOr: "ଆଲୋକର ବିଛୁରଣ / ବର୍ଣ୍ଣାଳୀ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Atmospheric Refraction", labelOr: "ବାୟୁମଣ୍ଡଳୀୟ ପ୍ରତିସରଣ", top: '30%', left: '80%', color: 'blue' },
    { labelEn: "Scattering (Tyndall Effect)", labelOr: "ଆଲୋକର ବିକିରଣ (ଟିଣ୍ଡାଲ୍ ପ୍ରଭାବ)", top: '65%', left: '80%', color: 'amber' },
    { labelEn: "Rainbow Formation", labelOr: "ଇନ୍ଦ୍ରଧନୁ ସୃଷ୍ଟି ପ୍ରକ୍ରିୟା", top: '85%', left: '50%', color: 'emerald' }
  ],
  '8kGT8tSrIIFZ3sxoeyXt': [
    { labelEn: "Ecosystem Balance", labelOr: "ପରିସଂସ୍ଥା ସନ୍ତୁଳନ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Food Chain & Food Web", labelOr: "ଖାଦ୍ୟ ଶୃଙ୍ଖଳ ଓ ଖାଦ୍ୟ ଜାଲ", top: '30%', left: '20%', color: 'emerald' },
    { labelEn: "Energy Flow Pyramid", labelOr: "ଶକ୍ତି ପ୍ରବାହ ପିରାମିଡ୍", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Ozone Layer & CFCs", labelOr: "ଓଜୋନ୍ ସ୍ତର ଓ କ୍ଷୟୀକରଣ", top: '48%', left: '50%', color: 'amber' },
    { labelEn: "Biodegradable Waste", labelOr: "ଜୈବ ବିଘଟନଯୋଗ୍ୟ ଆବର୍ଜନା", top: '30%', left: '80%', color: 'purple' },
    { labelEn: "Non-Biodegradable Waste", labelOr: "ଜୈବ ଅବିଘଟନଯୋଗ୍ୟ ଆବର୍ଜନା", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Ecosystem Management", labelOr: "ଆମ ପରିବେଶ ସୁରକ୍ଷା", top: '85%', left: '50%', color: 'blue' }
  ],
  'PVqIhNgzghFKacVchjs1': [
    { labelEn: "Control & Coordination", labelOr: "ନିୟନ୍ତ୍ରଣ ଓ ସମନ୍ୱୟ", top: '10%', left: '50%', color: 'purple' },
    { labelEn: "Central Nervous System", labelOr: "କେନ୍ଦ୍ରୀୟ ସ୍ନାୟୁତନ୍ତ୍ର", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Reflex Action & Arc", labelOr: "ପ୍ରତିକ୍ଷେପ କ୍ରିୟā ଓ ଚାପ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Human Brain Parts", labelOr: "ମାନବ ମସ୍ତିଷ୍କ ଭାଗ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Plant Hormones", labelOr: "ଉଦ୍ଭିଦ ହରମୋନ୍", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Endocrine System (Glands)", labelOr: "ଅନ୍ତଃସ୍ରାବୀ ଗ୍ରନ୍ଥି ଓ ହରମୋନ୍", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Hormonal Feedback", labelOr: "ହରମୋନାଲ୍ ନିୟନ୍ତ୍ରଣ ଚକ୍ର", top: '85%', left: '50%', color: 'amber' }
  ],
  'fNy21816t8C3EMrsdP4S': [
    { labelEn: "Excretion Overview", labelOr: "ରେଚନ ପ୍ରକ୍ରିୟା ସାରାଂଶ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Kidneys & Urinary Tract", labelOr: "ବୃକ୍‌କ ଓ ମୂତ୍ରାଶୟ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Filtration & Absorption", labelOr: "ଛାଣିବା ଓ ପୁନଃଶୋଷଣ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Nephron Structure", labelOr: "ନେଫ୍ରନ୍ ସଂରଚନା", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Hemodialysis", labelOr: "ଡାୟାଲିସିସ୍ ପ୍ରଣାଳୀ", top: '30%', left: '80%', color: 'purple' },
    { labelEn: "Plant Waste Products", labelOr: "ଉଦ୍ଭିଦରେ ରେଚନ ଗୁଣ", top: '65%', left: '80%', color: 'emerald' },
    { labelEn: "Accessory Excretory Organs", labelOr: "ସହାୟକ ରେଚନ ଅଙ୍ଗ", top: '85%', left: '50%', color: 'blue' }
  ],
  'Jb1gxditmbVBJIubDjok': [
    { labelEn: "How Organisms Reproduce", labelOr: "ଜୀବମାନଙ୍କ ପ୍ରଜନନ ପ୍ରକ୍ରିୟା", top: '10%', left: '50%', color: 'purple' },
    { labelEn: "Asexual Methods (Fission)", labelOr: "ଅଲିଙ୍ଗୀ ଜନନ ପଦ୍ଧତି", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Sexual Reproduction in Plants", labelOr: "ଉଦ୍ଭିଦରେ ଲିଙ୍ଗୀ ଜନନ", top: '65%', left: '20%', color: 'emerald' },
    { labelEn: "Zygote & Embryo", labelOr: "ଯୁଗ୍ମଜ ଏବଂ ଭ୍ରୂଣ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Male Reproductive System", labelOr: "ପୁରୁଷ ପ୍ରଜନନ ତନ୍ତ୍ର", top: '30%', left: '80%', color: 'blue' },
    { labelEn: "Female Reproductive System", labelOr: "ସ୍ତ୍ରୀ ପ୍ରଜନନ ତନ୍ତ୍ର", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Reproductive Health & Contraception", labelOr: "ପ୍ରଜନନ ସ୍ୱାସ୍ଥ୍ୟ ଓ ଜନ୍ମ ନିୟନ୍ତ୍ରଣ", top: '85%', left: '50%', color: 'amber' }
  ],
  'zti7Pcoic1HhlnFlsGxK': [
    { labelEn: "Heredity & Genetics", labelOr: "ବଂଶାନୁକ୍ରମ ଓ ଜେନେଟିକ୍ସ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Mendelian Inheritance", labelOr: "ମେଣ୍ଡେଲଙ୍କ ନିୟମାବଳୀ", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "Sex Determination (XY)", labelOr: "ଲିଙ୍ଗ ନିରୂପଣ ପ୍ରକ୍ରିୟା", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "DNA Double Helix", labelOr: "ଡିଏନଏ ଓ କ୍ରୋମୋଜୋମ୍", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Acquired & Inherited Traits", labelOr: "ଅର୍ଜିତ ଓ ବଂଶଗତ ଲକ୍ଷଣ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Speciation & Evolution", labelOr: "ଜାତି ସୃଷ୍ଟି ଓ କ୍ରମବିକାଶ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Fossils & Homologous Organs", labelOr: "ଜୀବାଶ୍ମ ଓ ସମସଂସ୍ଥ ଅଙ୍ଗ", top: '85%', left: '50%', color: 'emerald' }
  ],
  'FE7XoiswjRxPglXwvzwd': [
    { labelEn: "Covid-19 Management", labelOr: "କୋଭିଡ-୧୯ ପରିଚାଳନା", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "SARS-CoV-2 Structure", labelOr: "କରୋନା ଭାଇରସ୍ ଗଠନ", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "Droplet Transmission", labelOr: "ସଂକ୍ରମଣ ଓ ବ୍ୟାପିବା ପଥ", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Immune Shielding", labelOr: "ରୋଗ ପ୍ରତିରୋଧକ ଶକ୍ତି", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Masks & Hand Hygiene", labelOr: "ମାସ୍କ ଓ ହାତ ଧୋଇବା", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Vaccine Protection", labelOr: "ଟିକାକରଣ ପ୍ରୋଟୋକଲ୍", top: '65%', left: '80%', color: 'emerald' },
    { labelEn: "Social Distancing", labelOr: "ସାମାଜିକ ଦୂରତା ରକ୍ଷା", top: '85%', left: '50%', color: 'blue' }
  ],
  'lw9n7sG7qxnfbwm4kLY9': [
    { labelEn: "Simultaneous Equations", labelOr: "ସରଳ ସହସମୀକରଣ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Linear Form (ax + by + c = 0)", labelOr: "ସହସମୀକରଣ ସାଧାରଣ ରୂପ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Graphical Solution", labelOr: "ଲେଖଚିତ୍ର ପ୍ରଣାଳୀ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Consistency Conditions", labelOr: "ସମୀକରଣ ସଙ୍ଗତ ସର୍ତ୍ତାବଳୀ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Method of Substitution", labelOr: "ପ୍ରତିକଳ୍ପନ ପ୍ରଣାଳୀ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Method of Elimination", labelOr: "ଅପସାରଣ ପ୍ରଣାଳୀ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Cross Multiplication", labelOr: "ବଜ୍ରଗୁଣନ ପ୍ରଣାଳୀ", top: '85%', left: '50%', color: 'amber' }
  ],
  'bH692tqUJlkINiHpNJMk': [
    { labelEn: "Quadratic Equations", labelOr: "ଦ୍ୱିଘାତ ସମୀକରଣ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Standard Form (ax² + bx + c = 0)", labelOr: "ଦ୍ୱିଘାତ ସମୀକରଣ ରୂପ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Discriminant (b² - 4ac)", labelOr: "ପ୍ରଭେଦକ (b² - 4ac)", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Shreedharacharya Formula", labelOr: "ଦ୍ୱିଘାତ ସୂତ୍ର (ଶ୍ରୀଧର ଆଚାର୍ଯ୍ୟ)", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Nature of Roots", labelOr: "ବୀଜର ସ୍ୱରୂପ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Sum & Product of Roots", labelOr: "ବୀଜଦ୍ଵୟର ସମଷ୍ଟି ଓ ଗୁଣଫଳ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Reducible Equations", labelOr: "ରୂପାନ୍ତରିତ ହେବା ସମୀକରଣ", top: '85%', left: '50%', color: 'blue' }
  ],
  'ZNhThX6hmIa5GKYUDpIX': [
    { labelEn: "Arithmetic Progression", labelOr: "ସମାନ୍ତର ପ୍ରଗତି", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Nth Term (t_n)", labelOr: "n-ତମ ପଦ (t_n)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Common Difference (d)", labelOr: "ସାଧାରଣ ଅନ୍ତର (d)", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Arithmetic Mean (AM)", labelOr: "ସମାନ୍ତର ମଧ୍ୟକ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Sum of N Terms (S_n)", labelOr: "n-ତମ ପଦ ପର୍ଯ୍ୟନ୍ତ ସମଷ୍ଟି (S_n)", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Selecting AP Terms", labelOr: "ପଦ ମାନଙ୍କର ଚୟନ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "AP Word Problems", labelOr: "ସମାନ୍ତର ପ୍ରଗତି ବ୍ୟବହାରିକ ପ୍ରଶ୍ନ", top: '85%', left: '50%', color: 'emerald' }
  ],
  'lQX4qU8uY9Rjy5wrcUhX': [
    { labelEn: "Probability Basics", labelOr: "ସମ୍ଭାବ୍ୟତା ଧାରଣା", top: '10%', left: '50%', color: 'amber' },
    { labelEn: "Random Experiment", labelOr: "ଯାଦୃଚ୍ଛିକ ପରୀକ୍ଷଣ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Sample Space (S)", labelOr: "ନମୁନା ସ୍ପେସ୍ (S)", top: '65%', left: '20%', color: 'emerald' },
    { labelEn: "Probability P(E)", labelOr: "ସମ୍ଭାବ୍ୟତା P(E) ସୂତ୍ର", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Sure & Impossible Events", labelOr: "ନିଶ୍ଚିତ ଓ ଅସମ୍ଭବ ଘଟଣା", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Complementary Event E'", labelOr: "ପରିପୂରକ ଘଟଣା (E')", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Dice and Cards Probability", labelOr: "ତାସ୍ ଓ ଲୁଡୁ ଗୋଟି ପ୍ରଶ୍ନ", top: '85%', left: '50%', color: 'blue' }
  ],
  'zM3ZUo9MXaprYQbtlbC4': [
    { labelEn: "Statistics Methods", labelOr: "ପରିସଂଖ୍ୟାନ ପଦ୍ଧତି", top: '10%', left: '50%', color: 'purple' },
    { labelEn: "Mean (Direct/Assumed Mean)", labelOr: "ମାଧ୍ୟମାନ (Direct/Assumed Mean)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Median for Grouped Data", labelOr: "ମଧ୍ୟମା (Median)", top: '65%', left: '20%', color: 'emerald' },
    { labelEn: "Mean, Median, Mode Relation", labelOr: "ମାଧ୍ୟମାନ, ମଧ୍ୟମା ଓ ଗରିଷ୍ଠକ ସମ୍ବନ୍ଧ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Mode of Grouped Data", labelOr: "ଗରିଷ୍ଠକ (Mode)", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Ogive Curves", labelOr: "କ୍ରମପୁଞ୍ଜିତ ବାରମ୍ବାରତା (Ogive)", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Class Mark & Limits", labelOr: "ଶ୍ରେଣୀ ମଧ୍ୟବିନ୍ଦୁ ଓ ସୀମା", top: '85%', left: '50%', color: 'emerald' }
  ],
  'cKl1PFkdrkgSnGH7AReP': [
    { labelEn: "Co-ordinate Geometry", labelOr: "ସ୍ଥାନาଙ୍କ ଜ୍ୟାମିତି", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Distance Formula", labelOr: "ଦୂରତା ସୂତ୍ର", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Section Formula (Internal)", labelOr: "ବିଭାଜନ ସୂତ୍ର (ଅନ୍ତର୍ବିଭାଜନ)", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Midpoint coordinates", labelOr: "ମଧ୍ୟବିନ୍ଦୁ ସ୍ଥାନାଙ୍କ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Centroid of Triangle", labelOr: "ତ୍ରିଭୁଜର ଭରକେନ୍ଦ୍ର", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Area of Triangle Formula", labelOr: "ତ୍ରିଭୁଜର କ୍ଷେତ୍ରଫଳ ସୂତ୍ର", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Collinearity Condition", labelOr: "ଏକରେଖୀୟ ସର୍ତ୍ତ", top: '85%', left: '50%', color: 'blue' }
  ],
  'zjmscF6RCwSzh7UsljMp': [
    { labelEn: "Similarity of Triangles", labelOr: "ଜ୍ୟାମିତିରେ ସାଦୃଶ୍ୟ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Basic Proportionality Theorem", labelOr: "ମୌଳିକ ସମାନୁପାତିକତା ଉପପାଦ୍ୟ (ଥେଲସ୍)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "AAA / SAS / SSS Criteria", labelOr: "ସାଦୃଶ୍ୟ ସର୍ତ୍ତାବଳୀ (କୋ-କୋ-କୋ/ବା-କୋ-ବା)", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Pythagorean Theorem Proof", labelOr: "ପିଥାଗୋରାସ୍ ଉପପାଦ୍ୟ ସୂତ୍ର", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Area Ratio Theorem", labelOr: "ସଦୃଶ ତ୍ରିଭୁଜ କ୍ଷେତ୍ରଫଳ ଅନୁପାତ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Right Triangle Altitude", labelOr: "ସମକୋଣୀ ତ୍ରିଭୁଜ ସାଦୃଶ୍ୟ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Geometric Mean Properties", labelOr: "ଜ୍ୟାମିତିକ ମାଧ୍ୟ ଗୁଣଧର୍ମ", top: '85%', left: '50%', color: 'blue' }
  ],
  'HlfuVAm9dcK1gGpNkpuq': [
    { labelEn: "Similarity of Triangles", labelOr: "ଜ୍ୟାମିତିରେ ସାଦୃଶ୍ୟ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Basic Proportionality Theorem", labelOr: "ମୌଳିକ ସମାନୁପାତିକତା ଉପପାଦ୍ୟ (ଥେଲସ୍)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "AAA / SAS / SSS Criteria", labelOr: "ସାଦୃଶ୍ୟ ସର୍ତ୍ତାବଳୀ (କୋ-କୋ-କୋ/ବା-କୋ-ବା)", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Pythagorean Theorem Proof", labelOr: "ପିଥାଗୋରାସ୍ ଉପପାଦ୍ୟ ସୂତ୍ର", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Area Ratio Theorem", labelOr: "ସଦୃଶ ତ୍ରିଭୁଜ କ୍ଷେତ୍ରଫଳ ଅନୁପାତ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Right Triangle Altitude", labelOr: "ସମକୋଣୀ ତ୍ରିଭୁଜ ସାଦୃଶ୍ୟ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Geometric Mean Properties", labelOr: "ଜ୍ୟାମିତିକ ମାଧ୍ୟ ଗୁଣଧର୍ମ", top: '85%', left: '50%', color: 'blue' }
  ],
  'bq9cINIoZgSaIWag7JLM': [
    { labelEn: "Circles Overview", labelOr: "ବୃତ୍ତ ସାରାଂଶ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Radius & Diameter", labelOr: "ବ୍ୟାସାର୍ଦ୍ଧ ଓ ବ୍ୟାସ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Chord & Arc", labelOr: "ଜ୍ୟା ଓ ଚାପ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Theorems on Chords", labelOr: "ଜ୍ୟା ସମ୍ବନ୍ଧୀୟ ଉପପାଦ୍ୟ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Circumference & Area", labelOr: "ପରିଧି ଓ କ୍ଷେତ୍ରଫଳ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Sector & Segment", labelOr: "ବୃତ୍ତକଳା ଓ ବୃତ୍ତଖଣ୍ଡ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Cyclic Quadrilateral", labelOr: "ଚକ୍ରୀୟ ଚତୁର୍ଭୁଜ", top: '85%', left: '50%', color: 'blue' }
  ],
  'j5ym70mivqsTXHpAnMxJ': [
    { labelEn: "Tangents Overview", labelOr: "ବୃତ୍ତର ସ୍ପର୍ଶକ ସାରାଂଶ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Secant & Tangent", labelOr: "ଛେଦକ ଓ ସ୍ପର୍ଶକ", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "Point of Contact", labelOr: "ସ୍ପର୍ଶ ବିନ୍ଦୁ", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Length of Tangents", labelOr: "ସ୍ପର୍ଶକର ଦୈର୍ଘ୍ୟ", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Alternate Segment Theorem", labelOr: "ଏକାନ୍ତର ବୃତ୍ତଖଣ୍ଡ ଉପପାଦ୍ୟ", top: '30%', left: '80%', color: 'purple' },
    { labelEn: "Intersecting Chords Theorem", labelOr: "ପରସ୍ପର ଛେଦୀ ଜ୍ୟା ଉପପାଦ୍ୟ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Common Tangents", labelOr: "ସାଧାରଣ ସ୍ପର୍ଶକ", top: '85%', left: '50%', color: 'amber' }
  ],
  'cHD1xEpJvTclMfvi5ZJH': [
    { labelEn: "Trigonometry Basics", labelOr: "ତ୍ରିକୋଣମିତିର ଧାରଣା", top: '10%', left: '50%', color: 'amber' },
    { labelEn: "Trigonometric Ratios", labelOr: "ତ୍ରିକୋଣମିତିକ ଅନୁପାତ", top: '30%', left: '20%', color: 'emerald' },
    { labelEn: "Ratios of Specific Angles", labelOr: "ନିର୍ଦ୍ଦିଷ୍ଟ କୋଣର ଅନୁପାତ", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Trigonometric Identities", labelOr: "ତ୍ରିକୋଣମିତିକ ଅଭେଦାବଳୀ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Heights & Distances", labelOr: "ଉଚ୍ଚତା ଓ ଦୂରତା", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Angle of Elevation/Depression", labelOr: "ଉନ୍ନତି ଓ ଅବନତି କୋଣ", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Applications of Trigonometry", labelOr: "ତ୍ରିକୋଣମିତିର ପ୍ରୟୋଗ", top: '85%', left: '50%', color: 'emerald' }
  ],
  '4XpiLqgcg15qMNkQdgMm': [
    { labelEn: "Mensuration Overview", labelOr: "ପରିମିତି ସାରାଂଶ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Circle & Sector", labelOr: "ବୃତ୍ତ ଓ ବୃତ୍ତକଳା", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Cylinder & Cone", labelOr: "ସିଲିଣ୍ଡର୍ ଓ କୋନ୍", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Sphere & Hemisphere", labelOr: "ଗୋଲକ ଓ ଅର୍ଦ୍ଧଗୋଲକ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Surface Area Formulas", labelOr: "ପୃଷ୍ଠତଳର କ୍ଷେତ୍ରଫଳ ସୂତ୍ର", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Volume Formulas", labelOr: "ଆୟତନ ସୂତ୍ର", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Combination of Solids", labelOr: "ମିଳିତ କଠିନ ବସ୍ତୁ", top: '85%', left: '50%', color: 'blue' }
  ],
  '7Yukb86gfwmb9Bptpbwd': [
    { labelEn: "Construction Basics", labelOr: "ଜ୍ୟାମିତିକ ଅଙ୍କନ ଧାରଣା", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Dividing a Line Segment", labelOr: "ରେଖାଖଣ୍ଡର ବିଭାଜନ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Circumcircle of Triangle", labelOr: "ତ୍ରିଭୁଜର ପରିବୃତ୍ତ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Incircle of Triangle", labelOr: "ତ୍ରିଭୁଜର ଅନ୍ତର୍ବୃତ୍ତ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Tangents to a Circle", labelOr: "ବୃତ୍ତକୁ ସ୍ପର୍ଶକ ଅଙ୍କନ", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Similar Triangle Construction", labelOr: "ସଦୃଶ ତ୍ରିଭୁଜ ଅଙ୍କନ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Cyclic Polygons Construction", labelOr: "ଚକ୍ରୀୟ ବହୁଭୁଜ ଅଙ୍କନ", top: '85%', left: '50%', color: 'emerald' }
  ]
};

export const ConceptMapView: React.FC<ConceptMapViewProps> = ({
  chapter,
  language,
  isPremium,
  onUpgrade,
  onAskGundulu,
}) => {
  const premiumUrl = useMemo(() => {
    return getPremiumConceptMapUrl(chapter.id, language);
  }, [chapter.id, language]);

  const overlays = useMemo(() => {
    return PREMIUM_OVERLAYS[chapter.id] || [];
  }, [chapter.id]);

  // Clean chapter title for display
  const displayTitle = useMemo(() => {
    if (typeof chapter.title === 'string') {
      return (language === 'en' ? chapter.title_en : chapter.title_or) || chapter.title;
    }
    return (chapter.title as any)?.[language] || (chapter.title as any)?.or || (chapter.title as any)?.en || "Concept Map";
  }, [chapter.title, chapter.title_en, chapter.title_or, language]);

  // Extract headings from notes
  const subtopics = useMemo(() => {
    const notesText = chapter.notes || '';
    if (!notesText.trim()) {
      return getDefaultConcepts(displayTitle, language);
    }

    // Regex to capture markdown headings (e.g. ## Heading, ### Heading)
    const headingRegex = /^#{2,3}\s+(.+)$/gm;
    const extracted: string[] = [];
    let match;

    while ((match = headingRegex.exec(notesText)) !== null) {
      let text = match[1].trim();
      // Remove any markdown styling (bold, italics, code)
      text = text.replace(/[*_`]/g, '');
      // Remove LaTeX expressions from the title
      text = text.replace(/\$.*?\$/g, '');
      text = text.replace(/\\.*?\s/g, '');
      if (text && text.length > 3 && text.length < 50 && !extracted.includes(text)) {
        extracted.push(text);
      }
    }

    if (extracted.length >= 3) {
      return extracted.slice(0, 6); // Limit to 6 subtopics to prevent layout clutter
    }

    // Fallback: parse bullet points if no headings are present
    const bulletRegex = /^\s*[-*+]\s+([^#\n]+)$/gm;
    const bulletMatches: string[] = [];
    while ((match = bulletRegex.exec(notesText)) !== null) {
      let text = match[1].trim();
      text = text.replace(/[*_`]/g, '');
      if (text && text.length > 5 && text.length < 40 && !bulletMatches.includes(text)) {
        bulletMatches.push(text);
      }
    }

    if (bulletMatches.length >= 3) {
      return bulletMatches.slice(0, 6);
    }

    return getDefaultConcepts(displayTitle, language);
  }, [chapter.notes, displayTitle, language]);

  // Central point coordinate in coordinates space of 800 x 600 (exact 4:3 aspect ratio)
  const CX = 400;
  const CY = 300;
  const R = 185; // Radius of outer circle arrangement

  const nodes = useMemo(() => {
    const n = subtopics.length;
    return subtopics.map((topic, i) => {
      // Offset by -pi/2 so first node starts at the top
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      return {
        id: `node_${i}`,
        label: topic,
        x: CX + R * Math.cos(angle),
        y: CY + R * Math.sin(angle),
      };
    });
  }, [subtopics]);

  const handleNodeClick = (topic: string) => {
    const query = language === 'en'
      ? `Explain this topic from the chapter: "${topic}".`
      : `ଏହି ଅଧ୍ୟାୟରୁ ଏହି ବିଷୟଟି ବୁଝାଅ: "${topic}"।`;
    onAskGundulu(query);

    // Scroll to Gundulu chatbot sidebar on mobile viewports
    setTimeout(() => {
      const chatSidebar = document.getElementById('gundulu-chat-sidebar');
      if (chatSidebar) {
        chatSidebar.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (premiumUrl) {
    return (
      <div className="w-full flex flex-col items-center gap-6 relative">
        {/* Banner header */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            {language === 'en' ? 'Premium Infographic Map' : 'ପ୍ରିମିୟମ ଚିତ୍ରାତ୍ମକ ସାରାଂଶ'}
          </span>
          <h3 className="text-base md:text-lg font-black text-white">{displayTitle}</h3>
        </div>

        {/* Display the chapter's custom premium concept map */}
        <div className="relative max-w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950 p-2 shadow-2xl group flex items-center justify-center">
          <div className="relative inline-block">
            <img
              src={premiumUrl}
              alt={`${displayTitle} Concept Map`}
              className={`max-h-[70vh] w-auto object-contain rounded-xl shadow-lg border border-white/5 transition-transform duration-500 ${
                isPremium ? 'group-hover:scale-[1.01]' : 'blur-md opacity-40 pointer-events-none select-none'
              }`}
            />
            {/* HTML Overlay Layer */}
            {isPremium && overlays.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {overlays.map((node, i) => {
                  const label = language === 'en' ? node.labelEn : node.labelOr;
                  const borderClass = {
                    emerald: 'border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
                    blue: 'border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)] hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
                    amber: 'border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
                    purple: 'border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)] hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  }[node.color];

                  return (
                    <button
                      key={i}
                      onClick={() => handleNodeClick(label)}
                      className={`absolute px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border text-[10px] sm:text-xs font-black tracking-wide whitespace-nowrap cursor-pointer pointer-events-auto hover:scale-105 active:scale-95 transition-all duration-300 hover:text-white ${borderClass}`}
                      style={{
                        top: node.top,
                        left: node.left,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent pointer-events-none" />

          {/* Premium Lock Overlay for Free Users */}
          {!isPremium && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/40 backdrop-blur-[2px] z-10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 border border-yellow-300 shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-4 animate-bounce">
                <Lucide.Crown size={28} className="fill-current" />
              </div>
              <h4 className="text-lg font-black text-white leading-tight mb-2 tracking-wide">
                {language === 'en' ? 'Unlock Premium Infographic Summary' : 'ପ୍ରିମିୟମ ଭିଜୁଆଲ୍ ସାରାଂଶ ଅନଲକ୍ କରନ୍ତୁ'}
              </h4>
              <p className="text-xs text-slate-300 font-bold max-w-sm leading-relaxed mb-6">
                {language === 'en'
                  ? 'Access high-resolution visual concept maps, cheat-sheets, and advanced animations for all chapters!'
                  : 'ସମସ୍ତ ଅଧ୍ୟାୟ ପାଇଁ ଆଇ କ୍ୟାଚିଂ ଚିତ୍ରାତ୍ମକ ସାରାଂଶ, ମୁଖ୍ୟ ସୂତ୍ର ଚିଟ୍-ସିଟ୍ ଏବଂ ଗୁନ୍ଦୁଲୁ ଆନିମେସନ୍ ର ମଜା ନିଅନ୍ତୁ!'}
              </p>
              {onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="px-6 py-3 rounded-2xl crystal-button-gold text-slate-950 font-black text-xs tracking-wider uppercase active:scale-95 transition-all shadow-lg flex items-center gap-2"
                >
                  <Lucide.Sparkles size={14} className="fill-current" />
                  <span>{language === 'en' ? 'Upgrade to Premium' : 'ପ୍ରିମିୟମକୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Interactive Focus Areas: Allows clicking topics to trigger Gundulu chat on premium maps */}
        <div className="w-full max-w-2xl bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <Lucide.Sparkles size={12} className="text-emerald-400" />
            <span>{language === 'en' ? 'Tutor Mode: Ask Gundulu Apa about a key concept' : 'ଟ୍ୟୁଟର ମୋଡ୍: ଗୁନ୍ଦୁଲୁ ଆପାଙ୍କୁ ଏହି ବିଷୟ ପଚାରନ୍ତୁ'}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {subtopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => {
                  if (isPremium) {
                    handleNodeClick(topic);
                  } else {
                    if (onUpgrade) onUpgrade();
                  }
                }}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl border transition-all active:scale-95 shadow-sm flex items-center gap-1.5 ${
                  isPremium
                    ? 'border-white/5 bg-slate-900/60 hover:bg-slate-900 hover:border-emerald-500/30 hover:text-white text-slate-300'
                    : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 hover:border-amber-500/30'
                }`}
              >
                {!isPremium && <Lucide.Lock size={10} className="text-amber-400" />}
                <span>{topic}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback interactive SVG mindmap layout
  return (
    <div className="w-full flex flex-col items-center gap-6 relative">
      <div className="text-center space-y-1">
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
          {language === 'en' ? 'Interactive Concept Map' : 'ପ୍ରଶ୍ନୋତ୍ତର ମାଇଣ୍ଡ୍-ମ୍ୟାପ୍'}
        </span>
        <h3 className="text-base md:text-lg font-black text-white">{displayTitle}</h3>
        <p className="text-[10px] sm:text-xs text-slate-400 font-bold max-w-md mx-auto">
          {language === 'en'
            ? "Click on any node to ask Gundulu Apa to explain the concept!"
            : "ଯେକୌଣସି ବବଲ୍ ଉପରେ କ୍ଲିକ୍ କରି ଗୁନ୍ଦୁଲୁ ଆପାଙ୍କୁ ସେହି ବିଷୟ ବୁଝାଇବା ପାଇଁ କୁହନ୍ତୁ!"}
        </p>
      </div>

      {/* SVG Mind Map Container */}
      <div className="w-full max-w-4xl aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950/80 border border-white/5 shadow-2xl relative force-dark-theme">
        <svg
          viewBox="0 0 800 600"
          width="100%"
          height="100%"
          className="select-none pointer-events-auto"
        >
          <defs>
            <filter id="svg-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="center-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="connector-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Connection Lines & Flow Particles */}
          <g>
            {nodes.map((node) => (
              <g key={`connector_${node.id}`}>
                {/* Connector Line */}
                <line
                  x1={CX}
                  y1={CY}
                  x2={node.x}
                  y2={node.y}
                  stroke="url(#connector-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  className="opacity-70"
                />

                {/* Micro-animated flowing pulse particle */}
                <circle r="4" fill="#34d399" filter="url(#svg-glow)">
                  <animateMotion
                    dur={`${2.5 + Math.random() * 1.5}s`}
                    repeatCount="indefinite"
                    path={`M ${CX} ${CY} L ${node.x} ${node.y}`}
                  />
                </circle>
              </g>
            ))}
          </g>

          {/* Center Chapter Node */}
          <foreignObject
            x={CX - 85}
            y={CY - 60}
            width="170"
            height="120"
            className="overflow-visible"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full h-full p-4 rounded-3xl border-2 border-emerald-500 bg-slate-900/90 text-white shadow-[0_0_35px_rgba(16,185,129,0.35)] flex flex-col items-center justify-center text-center cursor-pointer select-none ring-1 ring-white/10"
              style={{ color: '#ffffff' }}
              onClick={() => handleNodeClick(displayTitle)}
            >
              <Lucide.BookOpen size={20} className="text-emerald-400 mb-1.5 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">
                {language === 'en' ? 'Core Topic' : 'ମୂଳ ବିଷୟ'}
              </span>
              <span className="text-xs md:text-sm font-black line-clamp-3 leading-snug text-white">
                {displayTitle}
              </span>
            </motion.div>
          </foreignObject>

          {/* Outer Subtopic Nodes */}
          {nodes.map((node) => (
            <foreignObject
              key={node.id}
              x={node.x - 70}
              y={node.y - 50}
              width="140"
              height="100"
              className="overflow-visible"
            >
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="w-full h-full p-3 rounded-2xl border border-white/10 bg-slate-950/90 text-slate-200 shadow-lg hover:text-white hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all duration-300 ring-1 ring-white/5"
                style={{ color: '#e2e8f0' }}
                onClick={() => handleNodeClick(node.label)}
              >
                <span className="text-[10px] font-bold line-clamp-3 leading-tight text-slate-200">
                  {node.label}
                </span>
                <Lucide.ArrowUpRight size={10} className="text-slate-500 mt-1 opacity-0 hover:opacity-100 transition-opacity" />
              </motion.div>
            </foreignObject>
          ))}
        </svg>
      </div>
    </div>
  );
};

const getDefaultConcepts = (title: string, language: 'en' | 'or'): string[] => {
  if (language === 'en') {
    return [
      "Key Chapter Overview",
      "Definitions & Core Meanings",
      "Important Laws & Formulas",
      "Real-world Applications",
      "Solved Problems & Examples",
      "Chapter Summary Notes"
    ];
  } else {
    return [
      "ଅଧ୍ୟାୟର ମୁଖ୍ୟ ସାରାଂଶ",
      "ସଂଜ୍ଞା ଓ ମୌଳିକ ଅର୍ଥ",
      "ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ନିୟମ ଓ ସୂତ୍ର",
      "ବାସ୍ତବିକ ବ୍ୟବହାର ଓ ପ୍ରୟୋଗ",
      "ଉଦାହରଣ ଏବଂ ସମାଧାନ",
      "ଅଭ୍ୟାସ ପ୍ରଶ୍ନ ଓ ଉତ୍ତର"
    ];
  }
};
