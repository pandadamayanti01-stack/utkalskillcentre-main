import { db } from './src/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function fetchVideos() {
  const snap = await getDocs(collection(db, 'curated_videos'));
  const videos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("Total videos:", videos.length);
  videos.forEach(v => {
    if (v.chapter?.includes("Bright")) {
      console.log(`Class: ${v.classStr}, Subject: ${v.subject}, Chapter: "${v.chapter}", Title: "${v.title}", Order: ${v.order}`);
    }
  });
  process.exit(0);
}

fetchVideos();
