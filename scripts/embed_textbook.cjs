const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Initialize Firebase Admin
const serviceAccount = require('d:/WebApp/utkalskillcentre-main/utkal-admin-sdk.json');
const app = admin.apps.length === 0 
  ? admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  : admin.apps[0];

const db = getFirestore(app, 'utkal-prod');

// 2. Load and Rotator Setup for Gemini API Keys
const keys = [];
for (let i = 1; i <= 7; i++) {
  const k = process.env[`GEMINI_ROTATOR_KEY_${i}`];
  if (k) keys.push(k);
}
// Fallback to primary keys if rotator keys aren't fully populated
if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY)) {
  keys.push(process.env.GEMINI_API_KEY);
}

if (keys.length === 0) {
  console.error("❌ No Gemini API keys found in .env! Please configure at least one key.");
  process.exit(1);
}

console.log(`🔑 Loaded ${keys.length} API keys for rotation.`);

let currentKeyIndex = 0;
function getNextApiKey() {
  const key = keys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}

// 3. Helper to generate embeddings using text-embedding-004 via Google API REST
async function getEmbedding(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const apiKey = getNextApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          outputDimensionality: 768
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Status ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const vector = resData.embedding?.values;
      if (vector && vector.length === 768) {
        return vector;
      }
      throw new Error("Invalid embedding output format or dimension mismatch");
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt} failed using key index ${currentKeyIndex}: ${err.message}`);
      if (attempt === retries) throw err;
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 4. Stanzas Dataset for Class 10 Odia - Chapter 2 (Raghabanka Lanka Jatranukula)
const LANKA_STANZAS = [
  {
    stanza: 1,
    text: "ବଳିଲା ରାଘବ ଆଶା ସୀତା ପ୍ରାପତିରେ\nବିଚାରିଲେ ସିନ୍ଧୁ ପୋତି ଯିବା ପର୍ବତରେ ଯେ ।",
    explanation: "ଶ୍ରୀରାମଚନ୍ଦ୍ରଙ୍କ ମନରେ ସୀତାଙ୍କୁ ଫେରି ପାଇବାର ଆଶା ବଳବତ୍ତର ହେଲା । ସେ ସମୁଦ୍ରକୁ ପାହାଡ଼ ପକାଇ ପୋତିଦେଇ ସେତୁ ବାନ୍ଧି ଲଙ୍କା ଯିବାକୁ ବିଚାର କଲେ ।",
    meanings: "ରାଘବ: ଶ୍ରୀରାମ, ପ୍ରାପତିରେ: ଫେରି ପାଇବାରେ, ସିନ୍ଧୁ: ସମୁଦ୍ର"
  },
  {
    stanza: 2,
    text: "ବୁଡ଼ିଗଲା ପକାଇଲେ କପି ଯେତେ ଗିରି\nବୁଦ୍‌ବୁଦ ନ ଦିଶେ ଜଳ ଫି ଫି କୃତ କରି ଯେ ।",
    explanation: "ବାନରମାନେ ଯେତେ ପାହାଡ଼ ଆଣି ପକାଇଲେ, ସେସବୁ ସମୁଦ୍ର ଭିତରେ ବୁଡ଼ିଗଲା ଏବଂ ଜଳ ଫି ଫି ଶବ୍ଦ କରି ବୁଦ୍‌ବୁଦ ମଧ୍ୟ ଦେଖାଗଲା ନାହିଁ ।",
    meanings: "କପି: ବାନର, ଗିରି: ପାହାଡ଼, ବୁଦ୍‌ବୁଦ: ପାଣି ଫୋଟକା, ଫି ଫି କୃତ: ଫି ଫି ଶବ୍ଦ କରି"
  },
  {
    stanza: 3,
    text: "ବିସୃଜି ନିଃଶ୍ୱାସ ତେଜି ବରୁଣ ପ୍ରସନ୍ନେ\nବିନାଶନରେ ଶୟନ ସେ ଦର୍ଭଶୟନେ ଯେ ।",
    explanation: "ଶ୍ରୀରାମଚନ୍ଦ୍ର ଦୀର୍ଘନିଃଶ୍ୱାସ ତ୍ୟାଗ କରି ସମୁଦ୍ରର ଅଧିଷ୍ଠାତ୍ରୀ ଦେବତା ବରୁଣଙ୍କୁ ସନ୍ତୁଷ୍ଟ କରିବା ପାଇଁ କୁଶ ଘାସର ଶଯ୍ୟା (ଦର୍ଭଶୟନ) ରେ ଶୟନ କଲେ ।",
    meanings: "ବିସୃଜି: ତ୍ୟାଗ କରି, ବରୁଣ: ସମୁଦ୍ର ଦେବତା, ପ୍ରସନ୍ନେ: ସନ୍ତୁଷ୍ଟ ପାଇଁ, ଦର୍ଭଶୟନେ: କୁଶ ଶଯ୍ୟାରେ"
  },
  {
    stanza: 4,
    text: "ବୁଧେ ଶୁଣ ଅନ୍ୟ ପ୍ରସଙ୍ଗକୁ ଦଶଶିର\nବରଗିଲା ସେ ଶୁକ ସାରଣ କରି ଚାର ଯେ ।",
    explanation: "ହେ ପଣ୍ଡିତଜନମାନେ, ଏବେ ଅନ୍ୟ ପ୍ରସଙ୍ଗ ଶୁଣନ୍ତୁ । ଲଙ୍କାର ରାଜା ରାବଣ (ଦଶଶିର) ନିଜର ଦୁଇ ଗୁପ୍ତଚର ଶୁକ ଓ ସାରଣଙ୍କୁ ଚାର (ଦୂତ) ରୂପେ ନିଯୁକ୍ତ କରି ଶ୍ରୀରାମଙ୍କ ସେନା ବିଷୟରେ ଜାଣିବାକୁ ପଠାଇଲା ।",
    meanings: "ବୁଧେ: ପଣ୍ଡିତଗଣ, ଦଶଶିର: ରାବଣ, ବରଗିଲା: ନିଯୁକ୍ତ କଲା, ଚାର: ଗୁପ୍ତଚର"
  },
  {
    stanza: 5,
    text: "ବିଭୀଷଣେ କହ ଜ୍ୟେଷ୍ଠଭ୍ରାତା ପିତା ସରି\nବୁଝି ନ ବୁଝି କୋପି ତା ବାଣୀ ପିତା କରି ଯେ ।",
    explanation: "ରାବଣ ଶୁକ ଓ ସାରଣଙ୍କୁ କହିଲା କି ବିଭୀଷଣକୁ ଯାଇ କୁହ - ତୋର ବଡ଼ଭାଇ ରାବଣ ବାପା ସମାନ ଅଟେ । ତୁ ତା'ର ଉପଦେଶକୁ ବୁଝି ନ ବୁଝିଲା ପରି କ୍ରୋଧ କରି ତା' କଥାକୁ ଶତ୍ରୁ ସମାନ (ପିତା ଅର୍ଥାତ୍ ପିତା ପରି) ଗ୍ରହଣ କଲୁ ।",
    meanings: "ଜ୍ୟେଷ୍ଠଭ୍ରାତା: ବଡ଼ଭାଇ, ପିତା ସରି: ବାପା ସମାନ, କୋପି: ରାଗିଯାଇ, ପିତା କରି: ପିତା/ତିକ୍ତ ମାନି"
  },
  {
    stanza: 6,
    text: "ବିଭୂତିକି ଭୁଞ୍ଜୁଥିଲୁ ବିଭୂତିଭୂଷଣେ\nବଡ଼କୁଳେ ଜନମି ଶରଣ କି କାରଣେ ଯେ ?",
    explanation: "ତୁ ଲଙ୍କାର ରାଜକୀୟ ଐଶ୍ୱର୍ଯ୍ୟ (ବିଭୂତି) ଭୋଗ କରୁଥିଲୁ । ମହାଦେବ (ବିଭୂତିଭୂଷଣେ) ଙ୍କ ପରି ଶ୍ରେଷ୍ଠ ବ୍ରାହ୍ମଣ କୁଳ (ପୁଲସ୍ତ୍ୟ ବଂଶ) ରେ ଜନ୍ମ ହୋଇ ତୁ ସାଧାରଣ ନର ମନୁଷ୍ୟ ଶ୍ରୀରାମଙ୍କର ଶରଣ କାହିଁକି ନେଲୁ?",
    meanings: "ବିଭୂତି: ଐଶ୍ୱର୍ଯ୍ୟ, ବିଭୂତିଭୂଷଣେ: ଭସ୍ମଭୂଷଣ ଶିବ କିମ୍ବା ଐଶ୍ୱର୍ଯ୍ୟର ମୁକୁଟ ସଦୃଶ, ବଡ଼କୁଳେ: ଉଚ୍ଚ ବଂଶ, ଶରଣ: ଆଶ୍ରୟ"
  },
  {
    stanza: 7,
    text: "ବୋଲ ଅଙ୍ଗଦକୁ ପିତା ଶତ୍ରୁ ଭକ୍ତି ପୁଣ୍ୟ\nବାଦ ରଚାଇ ପିତୃବ୍ୟ ବାହୁଡ଼ାଅ ସୈନ୍ୟ ଯେ ।",
    explanation: "ରାବଣ କହିଲା, ଅଙ୍ଗଦକୁ ଯାଇ କୁହ କି ତୋ' ବାପା (ବାଳି) ର ହତ୍ୟାକାରୀ ଶ୍ରୀରାମ (ଶତ୍ରୁ) ର ଭକ୍ତି କରିବା ତୋତେ କେଉଁ ପୁଣ୍ୟ ଦେବ? ନିଜ କକା (ବିଭୀଷଣ) ସହ ବାଦ ବିବାଦ ରଚନା କରି ତାକୁ ଓ ତୋ'ର ବାନର ସୈନ୍ୟଙ୍କୁ ଫେରାଇ ନେଇଯା ।",
    meanings: "ପିତୃବ୍ୟ: କକା (ବିଭୀଷଣ), ବାହୁଡ଼ାଅ: ଫେରାଇ ନେଇଯାଅ, ବାଦ ରଚାଇ: ଶତ୍ରୁତା ସୃଷ୍ଟି କରି"
  },
  {
    stanza: 8,
    text: "ବଞ୍ଚୁଠୁଁ ଅଙ୍ଗଦେ ଅଙ୍ଗ ଦେବାରୁ କି ଧର୍ମେ\nବଜ୍ରାଘାତ ସମ ତଳ ପ୍ରହାରିଲା ବ୍ୟୋମେ ଯେ ।",
    explanation: "ଅଙ୍ଗଦ ବଞ୍ଚିଥିବା ଅବସ୍ଥାରେ ଶତ୍ରୁ ରାବଣକୁ ନିଜର ଅଙ୍ଗ ସମର୍ପଣ କରିବା ବା ତା'ର କଥା ମାନି ଶରଣ ପଶିବା କି ପ୍ରକାର ଧର୍ମ? (ଏହା କଦାପି ସମ୍ଭବ ନୁହେଁ) । ଏହା କହି ଅଙ୍ଗଦ ନିଜର ହାତ ପାପୁଲିକୁ ବଜ୍ରପାତ ସଦୃଶ ଶବ୍ଦ କରି ଆକାଶରେ ପ୍ରହାର କଲା ।",
    meanings: "ବଞ୍ଚୁଠୁଁ: ବଞ୍ଚିଥିବା ଯାଏଁ, ଅଙ୍ଗଦେ ଅଙ୍ଗ ଦେବାରୁ: ଅଙ୍ଗଦ ଶରୀର ସମର୍ପଣ କରିବାରୁ, ବଜ୍ରାଘାତ ସମ: ବଜ୍ରପାତ ସଦୃଶ, ତଳ: ହାତ ପାପୁଲି, ବ୍ୟୋମେ: ଆକାଶରେ"
  },
  {
    stanza: 9,
    text: "ବାଜିଥିଲେ ଚୂର୍ଣ୍ଣ ବା ପାତାଳେ ଭଜିଥିବ\nବିନ୍ଧ୍ୟ ଭାନୁ ତୋଷି ହେଲେ ବଞ୍ଚାଇ ଦଇବ ଯେ ।",
    explanation: "ଯଦି ଅଙ୍ଗଦଙ୍କ ସେହି ପାପୁଲି ପ୍ରହାର ଶୁକ ଓ ସାରଣଙ୍କ ଶରୀରରେ ବାଜିଥାନ୍ତା, ତେବେ ସେମାନେ ଧୂଳିସାତ ହୋଇ ପାତାଳରେ ଲୀନ ହୋଇଯାଇଥାନ୍ତେ । ବିନ୍ଧ୍ୟ ପର୍ବତ ଓ ସୂର୍ଯ୍ୟଦେବ ସନ୍ତୁଷ୍ଟ ଥିବାରୁ ଭାଗ୍ୟବଶତଃ (ଦଇବ) ସେମାନେ ବଞ୍ଚିଗଲେ ।",
    meanings: "ଚୂର୍ଣ୍ଣ: ଗୁଣ୍ଡ ହୋଇଯିବା, ଭଜିଥିବ: ଲୀନ ହୋଇଥାନ୍ତା, ବିନ୍ଧ୍ୟ: ବିନ୍ଧ୍ୟ ପର୍ବତ, ଭାନୁ: ସୂର୍ଯ୍ୟ, ତୋଷି ହେଲେ: ସନ୍ତୁଷ୍ଟ ହେବାରୁ, ଦଇବ: ଭାଗ୍ୟ"
  },
  {
    stanza: 10,
    text: "ବଳ କେତେ ବୋଲୁ ବୋଲେ ଯେତେ ଶଙ୍ଖ ସେହି\nବାରି ରାଶିରେ ଜନିତ ତେତେ ଶଙ୍ଖ ନାହିଁ ଯେ ।",
    explanation: "ରାବଣ ଶୁକ ଓ ସାରଣଙ୍କୁ ଶ୍ରୀରାମଙ୍କ ବଳ କେତେ ବୋଲି ପଚାରିବାରୁ ସେମାନେ ଉତ୍ତର ଦେଲେ - ହେ ରାଜନ୍! ଶ୍ରୀରାମଙ୍କ ସେନାରେ 'ଶଙ୍ଖ' ସଂଖ୍ୟକ ଯେତେ ଯୋଦ୍ଧା ଅଛନ୍ତି, ସମୁଦ୍ର (ବାରିରାଶି) ରେ ସୃଷ୍ଟି ହୋଇଥିବା ଶଙ୍ଖର ସଂଖ୍ୟା ମଧ୍ୟ ସେତିକି ନୁହେଁ (ଅର୍ଥାତ୍ ବହୁତ କମ୍)"
  },
  {
    stanza: 11,
    text: "ବାରିପାଳେ ବଳ କେତେ ଶଙ୍ଖ ନିତାନ୍ତ\nବୋଲାଉଛୁ ବାରିରାଶି କାହିଁ ଏହା ଜାତ ଯେ ।",
    explanation: "ଶୁକ ଓ ସାରଣ କହିଲେ କି ସମୁଦ୍ରର ରକ୍ଷକ ବରୁଣ (ବାରିପାଳ) ଙ୍କ ଶକ୍ତି କେତେ ତାହା ନିରୂପଣ କରିବା ସମ୍ଭବ ନୁହେଁ। ଯେଉଁ ସମୁଦ୍ରକୁ ଲୋକେ ବାରିରାଶି ବୋଲାଉଛନ୍ତି, ସେହି ସମୁଦ୍ରର ଅଗାଧ ଜଳରେ ରାମଙ୍କ ନିର୍ଦ୍ଦେଶରେ ଏପରି ଅଲୌକିକ ସେତୁ ନିର୍ମାଣ ହେବା ଅତ୍ୟନ୍ତ ଆଶ୍ଚର୍ଯ୍ୟଜନକ ଅଟେ।"
  },
  {
    stanza: 12,
    text: "ବୃଥା ଜାତ ଏକି ଯେଣୁ ରାମ ନାମ ଧରି\nବାରିରାଶି ନାଶ କର ପଛେ ଆଶା କରି ଯେ ।",
    explanation: "ସମୁଦ୍ର ଭାବିଲା ମୋର ଏହି ବିଶାଳ ଅସ୍ତିତ୍ୱ ବୃଥା ଅଟେ । ସେଥିପାଇଁ ସେ ଶ୍ରୀରାମଙ୍କର ମହିମାମୟ ନାମକୁ ହୃଦୟରେ ଧାରଣ କରି ନିଜର ବିଶାଳ ଅହଂକାର (ବାରିରାଶି ନାଶ) କୁ ତ୍ୟାଗ କଲା ଏବଂ ପ୍ରଭୁଙ୍କ କରୁଣା ପାଇବାକୁ ଆଶା ରଖିଲା।"
  },
  {
    stanza: 13,
    text: "ବଳିଲା ବିଭୀଷଣେ ରାମ ଏମନ୍ତ କହି\nବଳେ ତା ପୃଷ୍ଠକୁ ସିନ୍ଧୁ ଦେଲା ପଥ ଦେଇ ଯେ ।",
    explanation: "ଶ୍ରୀରାମ ବିଭୀଷଣଙ୍କ ଉପଦେଶକୁ ଶୁଣି ଏପରି ବିଚାର କଲେ ଏବଂ ବୀରତା ପ୍ରଦର୍ଶନ କଲେ । ତା'ପରେ ସମୁଦ୍ରଦେବ ନିଜ ବଳପୂର୍ବକ ଶ୍ରୀରାମଙ୍କ ସେନା ଯିବା ପାଇଁ ରାସ୍ତା (ପଥ) ଛାଡ଼ିଦେଲା।"
  },
  {
    stanza: 14,
    text: "ବଳବନ୍ତ ବୃଦ୍ଧ କୂର୍ମ ନଳ ନୀଳେ ଭେଟି\nବାରିପଥ ମଝିରେ ବସିଲେ ଆସି ଅଣ୍ଟି ଯେ ।",
    explanation: "ସମୁଦ୍ରର ବଳବାନ ବୃଦ୍ଧ କଇଁଛ (କୂର୍ମ) ମାନେ ନଳ ଓ ନୀଳଙ୍କୁ ସାହାଯ୍ୟ କରିବା ପାଇଁ ଆସିଲେ ଏବଂ ପଥର ଗୁଡ଼ିକ ଯେପରି ଭାସି ନଯିବ, ସେଥିପାଇଁ ସମୁଦ୍ର ମଝିରେ ପାହାଡ଼ ଗୁଡ଼ିକୁ ନିଜ ଶରୀର ଦେଇ ଅଣ୍ଟି (ଆଶ୍ରୟ ଦେଇ) ଧରି ରଖିଲେ।"
  },
  {
    stanza: 15,
    text: "ବରବେଶେ ରାଘବଙ୍କୁ ନେଲେ ଲଙ୍କାପୁରେ\nବିଜେ କଲେ ଦେବୀ ସୀତା ମାତାଙ୍କ ଆଗରେ ଯେ ।",
    explanation: "ସଫଳ ସେତୁବନ୍ଧ ନିର୍ମାଣ ପରେ ଶ୍ରୀରାମଙ୍କୁ ବିଜୟୀ ବରବେଶରେ ଲଙ୍କାକୁ ନିଆଗଲା ଏବଂ ଦେବୀ ସୀତାମାତା ମଧ୍ୟ ଯୁଦ୍ଧର ଅନ୍ତେ ବିଜୟୀ ହୋଇ ଶ୍ରୀରାମଙ୍କ ସମ୍ମୁଖରେ ବିଜେ (ପ୍ରକଟ) ହେଲେ।"
  }
];

async function ingestLankaTextbook() {
  console.log("⚡ Starting Textbook Ingestion Pipeline for Class 10 Odia - Chapter 2...");
  const chapterId = 'WJx36nRZJ0INsq7PIOma';
  const classStr = '10';
  const subject = 'odia';

  // Clear any existing chunks for this chapter to avoid duplicates
  const chunksColl = db.collection('textbook_chunks');
  const existing = await chunksColl
    .where('chapterId', '==', chapterId)
    .get();
  
  if (existing.size > 0) {
    console.log(`🧹 Found ${existing.size} existing chunks for this chapter. Cleaning up...`);
    const batch = db.batch();
    existing.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log("🧹 Cleanup successful!");
  }

  // Segment, embed and upload each stanza
  for (const s of LANKA_STANZAS) {
    const chunkText = `Chapter: ରାଘବଙ୍କ ଲଙ୍କା ଯାତ୍ରାନୁକୂଳ (Raghabanka Lanka Jatranukula)
ପଦ୍ୟ/Stanza ${s.stanza}:
${s.text}

ସରଳ ଅର୍ଥ (Explanation):
${s.explanation}
${s.meanings ? `\nକଷ୍ଟକର ଶବ୍ଦାର୍ଥ (Word Meanings):\n${s.meanings}` : ''}`;

    console.log(`🌀 Processing Stanza ${s.stanza}...`);
    try {
      const embedding = await getEmbedding(chunkText);
      const docRef = chunksColl.doc(); // Random ID

      await docRef.set({
        chapterId,
        class: classStr,
        subject,
        stanzaNumber: s.stanza,
        text: chunkText,
        embedding: FieldValue.vector(embedding),
        reference: `Stanza ${s.stanza}`,
        createdAt: FieldValue.serverTimestamp()
      });
      console.log(`✅ Stanza ${s.stanza} uploaded successfully with 768-dim vector index.`);
    } catch (err) {
      console.error(`❌ Failed to process Stanza ${s.stanza}:`, err.message);
      process.exit(1);
    }
  }

  console.log("\n🎉 CONGRATULATIONS! Textbook Ingestion Pipeline completed successfully!");
  console.log("🚀 All 15 stanzas have been securely stored with vector embeddings.");
  process.exit(0);
}

ingestLankaTextbook().catch(e => {
  console.error("Textbook ingestion pipeline crashed:", e);
  process.exit(1);
});
