import type { Express } from 'express';
import { App, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CHAPTERS_MAP } from '../data/chaptersMap.js';

// Regex helper to extract YouTube ID from url
export function extractYoutubeId(url: string): string {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

// Format raw chapter name to clean chapter name (copied for server-side parity)
export function formatChapterName(rawName: string): string {
  if (rawName.includes(' - ')) {
    return rawName.trim();
  }

  let chapterNum = 1;
  const numMatch = rawName.match(/Chapter[_\-\s]?\s*(\d+)/i) || rawName.match(/Ch[_\-\s]?\s*(\d+)/i);
  if (numMatch) {
    chapterNum = parseInt(numMatch[1], 10);
  }

  let titlePart = rawName.replace(/^Class\d+_/i, '');
  titlePart = titlePart.replace(/^(KalaSikhya|KalaKruti|PE|Pallavi|EVS|Odia|Mathematics|Evs|Physical_education)_[A-Za-z0-9]+_/i, '');
  titlePart = titlePart.replace(/^(KalaSikhya|KalaKruti|PE|Pallavi|EVS|Odia|Mathematics|Evs|Physical_education)_/i, '');
  titlePart = titlePart.replace(/^Ch[_\-\s]?\d+_/i, '');
  titlePart = titlePart.replace(/^Chapter[_\-\s]?\d+_/i, '');
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_Ch\d+_/i, '');
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_Ch0\d+_/i, '');
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_/i, '');
  titlePart = titlePart.replace(/^Ch\d+_/i, '');
  titlePart = titlePart.replace(/_/g, ' ').trim();

  titlePart = titlePart.split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');

  return `Chapter ${chapterNum} - ${titlePart}`;
}

// Maps subject keys to rich search keywords for YouTube API
function getSubjectSearchName(subjectKey: string): string {
  const mapping: Record<string, string> = {
    'math': 'Math Mathematics',
    'algebra': 'Algebra Mathematics',
    'geometry': 'Geometry Mathematics',
    'odia': 'Odia Bhasa Sahitya',
    'english': 'English English',
    'evs': 'EVS Paribesa Patha',
    'science': 'Science',
    'physical_science': 'Physical Science',
    'life_science': 'Life Science',
    'social_science': 'Social Science History Geography',
    'geography': 'Geography',
    'history': 'History',
    'hindi': 'Hindi',
    'sanskrit': 'Sanskrit',
    'art': 'Kala Art',
    'physical_education': 'Physical Education PE'
  };
  return mapping[subjectKey.toLowerCase()] || subjectKey;
}

// Initialize Gemini Client using process.env or fallback rotator keys
function getGeminiClient(): GoogleGenerativeAI {
  const mainKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (mainKey) {
    return new GoogleGenerativeAI(mainKey);
  }
  
  for (let i = 1; i <= 7; i++) {
    const key = process.env[`GEMINI_ROTATOR_KEY_${i}`];
    if (key) {
      console.log(`[YouTube Sync] Using GEMINI_ROTATOR_KEY_${i} for verification.`);
      return new GoogleGenerativeAI(key);
    }
  }

  throw new Error('No GEMINI_API_KEY or rotator keys configured in environment.');
}

// Helper to find the best available YouTube API key (supports fallback to Gemini rotator keys)
export function getYoutubeApiKey(): string {
  const ytKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || '';
  if (ytKey) return ytKey;

  // Fallback to Gemini keys starting with AIzaSy
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (geminiKey.startsWith('AIzaSy')) return geminiKey;

  for (let i = 1; i <= 7; i++) {
    const key = process.env[`GEMINI_ROTATOR_KEY_${i}`];
    if (key && key.startsWith('AIzaSy')) {
      console.log(`[YouTube Sync] Falling back to GEMINI_ROTATOR_KEY_${i} for YouTube API.`);
      return key;
    }
  }

  return '';
}

// Fetch YouTube video statistics and metadata
export async function getYoutubeVideoData(videoId: string) {
  const apiKey = getYoutubeApiKey();
  if (!apiKey) {
    console.warn('[YouTube Sync] YOUTUBE_API_KEY and fallback keys are missing.');
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    let errMsg = `YouTube API returned status ${res.status}`;
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errMsg += `: ${errData.error.message}`;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }
  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    return null;
  }
  return data.items[0];
}

// Fetch statistics and metadata for multiple YouTube videos in a single batch call
export async function getYoutubeVideosDataBatch(videoIds: string[]) {
  if (videoIds.length === 0) return [];
  const apiKey = getYoutubeApiKey();
  if (!apiKey) {
    console.warn('[YouTube Sync] YOUTUBE_API_KEY and fallback keys are missing.');
    return [];
  }

  const idsStr = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${idsStr}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    let errMsg = `YouTube API returned status ${res.status}`;
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errMsg += `: ${errData.error.message}`;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }
  const data = await res.json();
  return data.items || [];
}


// Compute engagement score: views + likes * 5 + comments * 10
export function calculateEngagementScore(stats: any): number {
  if (!stats) return 0;
  const views = parseInt(stats.viewCount || '0', 10);
  const likes = parseInt(stats.likeCount || '0', 10);
  const comments = parseInt(stats.commentCount || '0', 10);
  return views + (likes * 5) + (comments * 10);
}

// Gemini Multimodal Verification of video thumbnail and metadata
export async function verifyYoutubeVideoWithGemini(
  classStr: string,
  subject: string,
  chapter: string,
  videoTitle: string,
  videoDescription: string,
  videoId: string
): Promise<{ verified: boolean; confidence: number; reasoning: string }> {
  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Download thumbnail image
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    let imagePart: any = null;
    try {
      const imgRes = await fetch(thumbnailUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imagePart = {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/jpeg'
          }
        };
      }
    } catch (err) {
      console.error(`[YouTube Sync] Failed to download thumbnail for video ${videoId}:`, err);
    }

    const prompt = `
You are an expert curriculum verification assistant for school education in Odisha, India (BSE Odisha board).
Your task is to analyze a YouTube video's metadata and its thumbnail image to verify if the video is educational and directly teaches the following specific topic:
Class: Class ${classStr}
Subject: ${subject}
Chapter/Topic: ${chapter}

Video Metadata:
Title: "${videoTitle}"
Description: "${videoDescription}"

Instructions:
1. Examine the thumbnail image (if provided). Read any Odia, English, or Hindi text visible in the thumbnail using OCR.
2. Verify if the video is indeed teaching the specified chapter/topic of the specified class. Odia medium (BSE Odisha) is standard, but English medium explanations of BSE Odisha syllabus are also acceptable.
3. Ignore generic entertainment, irrelevant vlogs, songs, or unrelated school news. The video must be a lecture, tutorial, concept explanation, or question/answer discussion for school students.
4. **CRITICAL INDEX/GUIDE SKIP RULE**: Identify if the chapter title/content is just a syllabus listing, table of contents, syllabus index, introduction guide, index, or preface sheet rather than an actual learning chapter. If the target chapter is just a guide/index (e.g. syllabus layout, course details, index sheet) and does not have actual lecture videos, you MUST set "verified" to false and explain that we should skip index/guide chapters.
5. Output your analysis in JSON format with the following fields:
- "verified" (boolean): true if the video matches the educational content for the chapter, false if it does not match OR if this is an index/guide chapter that should be skipped.
- "confidence" (number between 0 and 1): your confidence level.
- "reasoning" (string): a brief explanation of your decision (refer to visible text on the thumbnail or title elements).

Format your response strictly as a JSON object, with no markdown formatting around it (no backticks, no "json" label), or wrapped in a code block that we can parse using JSON.parse().
`;

    const contents: any[] = [prompt];
    if (imagePart) {
      contents.push(imagePart);
    }

    const response = await model.generateContent(contents);
    const text = response.response.text();
    
    // Clean up potential markdown formatting in Gemini output
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text;
    const result = JSON.parse(cleanJson);
    
    return {
      verified: !!result.verified,
      confidence: Number(result.confidence) || 0,
      reasoning: String(result.reasoning || '')
    };
  } catch (error) {
    console.error('[YouTube Sync] Gemini verification error:', error);
    return {
      verified: false,
      confidence: 0,
      reasoning: `Error during verification: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Add or sync a video, handling the 5-video A/B trial switches
export async function handleVideoSyncOrAddition(
  adminApp: App,
  databaseId: string,
  videoData: {
    classStr: string;
    subject: string;
    chapter: string;
    youtubeUrl: string;
    title: string;
    order?: number;
  },
  bypassLimitCheck: boolean = false
) {
  const db = getAdminFirestore(adminApp, databaseId);
  const videoId = extractYoutubeId(videoData.youtubeUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL.');
  }

  // 1. Fetch stats and metadata from YouTube
  const ytData = await getYoutubeVideoData(videoId);
  if (!ytData) {
    throw new Error('Could not retrieve video information from YouTube.');
  }

  const score = calculateEngagementScore(ytData.statistics);
  const viewCount = parseInt(ytData.statistics?.viewCount || '0', 10);
  const likeCount = parseInt(ytData.statistics?.likeCount || '0', 10);
  const commentCount = parseInt(ytData.statistics?.commentCount || '0', 10);

  // 2. Fetch existing active videos for this chapter
  const videosRef = db.collection('curated_videos');
  const snap = await videosRef
    .where('classStr', '==', videoData.classStr)
    .where('subject', '==', videoData.subject)
    .where('chapter', '==', videoData.chapter)
    .get();

  const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const activeVideos = allDocs.filter(v => !v.status || v.status === 'published' || v.status === 'trial');
  activeVideos.sort((a, b) => (a.order || 0) - (b.order || 0));

  const targetOrder = videoData.order || (activeVideos.length > 0 ? activeVideos[activeVideos.length - 1].order + 1 : 1);

  // 3. Check if playlist limit is reached (5 active videos)
  if (activeVideos.length >= 5 && !bypassLimitCheck) {
    // Playlist is full! Fetch live stats for current active videos to compare engagement
    const activeVideoIds = activeVideos.map(v => extractYoutubeId(v.youtubeUrl)).filter(Boolean);
    const activeYtItems = await getYoutubeVideosDataBatch(activeVideoIds);

    const scoreMap: Record<string, number> = {};
    for (const item of activeYtItems) {
      scoreMap[item.id] = calculateEngagementScore(item.statistics);
    }

    for (const v of activeVideos) {
      const vidId = extractYoutubeId(v.youtubeUrl);
      v.liveScore = scoreMap[vidId] || v.engagementScore || 0;
    }

    // Find the lowest performing video
    let lowestVideo = activeVideos[0];
    for (const v of activeVideos) {
      if (v.liveScore < lowestVideo.liveScore) {
        lowestVideo = v;
      }
    }

    // Compare new video's score with the lowest-scoring active video
    if (score > lowestVideo.liveScore) {
      console.log(`[A/B Switch] Replacing lowest performing video ${lowestVideo.id} (${lowestVideo.title}, Score: ${lowestVideo.liveScore}) with new video (Score: ${score})`);

      // Mark old video as backup
      await videosRef.doc(lowestVideo.id).update({
        status: 'backup',
        originalOrder: lowestVideo.order || 1,
        trialStartedAt: FieldValue.serverTimestamp()
      });

      // Add new video as trial
      const newVideoDoc = {
        classStr: videoData.classStr,
        subject: videoData.subject,
        chapter: videoData.chapter,
        youtubeUrl: videoData.youtubeUrl,
        title: videoData.title,
        order: lowestVideo.order || 1, // Keep same ordering position
        status: 'trial',
        trialStartedAt: FieldValue.serverTimestamp(),
        replacedVideoId: lowestVideo.id,
        originalOrder: lowestVideo.order || 1,
        initialScore: score,
        viewCount,
        likeCount,
        commentCount,
        engagementScore: score,
        createdAt: FieldValue.serverTimestamp()
      };

      const added = await videosRef.add(newVideoDoc);
      return {
        success: true,
        action: 'switched',
        trialVideoId: added.id,
        replacedVideoId: lowestVideo.id,
        newScore: score,
        replacedScore: lowestVideo.liveScore,
        message: `Successfully replaced low-performing video (${lowestVideo.title}) with trial video (Score: ${score} vs ${lowestVideo.liveScore}). Old video retained as backup for 15 days.`
      };
    } else {
      // New video is lower performing than current playlist! Add to review queue as inactive
      const newVideoDoc = {
        classStr: videoData.classStr,
        subject: videoData.subject,
        chapter: videoData.chapter,
        youtubeUrl: videoData.youtubeUrl,
        title: videoData.title,
        order: targetOrder,
        status: 'pending_review',
        reviewReason: `Performance score (${score}) was not higher than lowest active video (${lowestVideo.title} - Score: ${lowestVideo.liveScore}).`,
        viewCount,
        likeCount,
        commentCount,
        engagementScore: score,
        createdAt: FieldValue.serverTimestamp()
      };

      const added = await videosRef.add(newVideoDoc);
      return {
        success: true,
        action: 'flagged_pending',
        videoId: added.id,
        message: `New video score (${score}) is lower than the lowest active video (${lowestVideo.liveScore}). Video added to pending review queue.`
      };
    }
  } else {
    // Fewer than 5 active videos, add directly as published
    const newVideoDoc = {
      classStr: videoData.classStr,
      subject: videoData.subject,
      chapter: videoData.chapter,
      youtubeUrl: videoData.youtubeUrl,
      title: videoData.title,
      order: targetOrder,
      status: 'published',
      viewCount,
      likeCount,
      commentCount,
      engagementScore: score,
      createdAt: FieldValue.serverTimestamp()
    };

    const added = await videosRef.add(newVideoDoc);
    return {
      success: true,
      action: 'added',
      videoId: added.id,
      message: `Video curated successfully as published (Total active: ${activeVideos.length + 1}).`
    };
  }
}

// Evaluate trial videos that have finished their 15-day trial period
export async function evaluateTrialVideos(
  adminApp: App,
  databaseId: string,
  forceEvaluateAll: boolean = false
) {
  const db = getAdminFirestore(adminApp, databaseId);
  const videosRef = db.collection('curated_videos');

  const snap = await videosRef.where('status', '==', 'trial').get();
  const trials = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  const results = [];
  const nowMs = Date.now();
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

  for (const trial of trials) {
    const trialStartedAt = trial.trialStartedAt?.toDate();
    if (!trialStartedAt) continue;

    const elapsedMs = nowMs - trialStartedAt.getTime();
    const isMatured = elapsedMs >= fifteenDaysMs;

    if (!isMatured && !forceEvaluateAll) {
      continue; // Skip trials that are still active
    }

    try {
      const trialYtId = extractYoutubeId(trial.youtubeUrl);
      const backupVideoId = trial.replacedVideoId;

      let backupDoc = null;
      if (backupVideoId) {
        const backupSnap = await videosRef.doc(backupVideoId).get();
        if (backupSnap.exists) {
          backupDoc = { id: backupSnap.id, ...backupSnap.data() } as any;
        }
      }

      const backupYtId = backupDoc ? extractYoutubeId(backupDoc.youtubeUrl) : '';
      const ytIds = [trialYtId];
      if (backupYtId) ytIds.push(backupYtId);

      const ytItems = await getYoutubeVideosDataBatch(ytIds);
      const trialYt = ytItems.find(item => item.id === trialYtId);
      const backupYt = ytItems.find(item => item.id === backupYtId);

      const trialScore = trialYt ? calculateEngagementScore(trialYt.statistics) : trial.engagementScore || 0;
      const backupScore = backupYt ? calculateEngagementScore(backupYt.statistics) : (backupDoc ? backupDoc.engagementScore || 0 : 0);

      if (trialScore >= backupScore || !backupDoc) {
        // SUCCESS: Promote trial, delete backup permanently
        await videosRef.doc(trial.id).update({
          status: 'published',
          trialStartedAt: FieldValue.delete(),
          replacedVideoId: FieldValue.delete(),
          originalOrder: FieldValue.delete(),
          initialScore: FieldValue.delete(),
          engagementScore: trialScore
        });

        if (backupVideoId) {
          await videosRef.doc(backupVideoId).delete();
        }

        results.push({
          trialId: trial.id,
          title: trial.title,
          result: 'promoted',
          message: `Trial succeeded (Score: ${trialScore} vs Backup: ${backupScore}). Replaced backup deleted.`
        });
      } else {
        // FAILURE: Rollback to backup, delete trial
        await videosRef.doc(trial.id).delete();

        if (backupDoc) {
          await videosRef.doc(backupVideoId).update({
            status: 'published',
            order: trial.originalOrder || backupDoc.originalOrder || backupDoc.order || 1,
            originalOrder: FieldValue.delete(),
            trialStartedAt: FieldValue.delete()
          });
        }

        results.push({
          trialId: trial.id,
          title: trial.title,
          result: 'rolled_back',
          message: `Trial failed (Score: ${trialScore} vs Backup: ${backupScore}). Restored original backup.`
        });
      }
    } catch (err) {
      console.error(`[YouTube Sync] Error evaluating trial video ${trial.id}:`, err);
      results.push({
        trialId: trial.id,
        title: trial.title,
        result: 'error',
        message: `Error: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  }

  return results;
}

// Retroactive OCR re-verification of all active curated videos
export async function reverifyExistingVideos(adminApp: App, databaseId: string) {
  const db = getAdminFirestore(adminApp, databaseId);
  const videosRef = db.collection('curated_videos');

  // Fetch a bounded batch of active videos
  const snap = await videosRef
    .where('status', 'not-in', ['backup', 'pending_review'])
    .limit(40)
    .get();

  if (snap.empty) {
    return [];
  }

  // Filter locally to select up to 15 videos that have either never been verified or were verified > 7 days ago.
  // This avoids requiring complex composite Firestore indexes.
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const videos = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as any))
    .filter(video => {
      if (video.verificationStatus === 'passed' && video.lastVerifiedAt) {
        return new Date(video.lastVerifiedAt).getTime() < sevenDaysAgo;
      }
      return true;
    })
    .slice(0, 15);

  const results = [];
  const CHUNK_SIZE = 3; // Process in chunks of 3 parallel calls
  const COOLING_PERIOD_MS = 2500; // 2.5s cooling period between chunks

  for (let i = 0; i < videos.length; i += CHUNK_SIZE) {
    const chunk = videos.slice(i, i + CHUNK_SIZE);
    
    const chunkPromises = chunk.map(async (video) => {
      const videoId = extractYoutubeId(video.youtubeUrl);
      if (!videoId) {
        await videosRef.doc(video.id).update({
          status: 'pending_review',
          reviewReason: 'Invalid YouTube URL format.'
        });
        return { id: video.id, title: video.title, verified: false, reasoning: 'Invalid YouTube URL format.' };
      }

      try {
        const verifyResult = await verifyYoutubeVideoWithGemini(
          video.classStr,
          video.subject,
          video.chapter,
          video.title,
          '',
          videoId
        );

        if (!verifyResult.verified) {
          await videosRef.doc(video.id).update({
            status: 'pending_review',
            reviewReason: `Failed retroactive OCR verification: ${verifyResult.reasoning}`
          });
          return { id: video.id, title: video.title, verified: false, reasoning: verifyResult.reasoning };
        }

        // Update verification timestamp and status to avoid redundant checks
        await videosRef.doc(video.id).update({
          verificationStatus: 'passed',
          lastVerifiedAt: new Date().toISOString()
        });
        return { id: video.id, title: video.title, verified: true, reasoning: verifyResult.reasoning };
      } catch (err: any) {
        console.error(`[Verification Error] Failed for video ${video.id}:`, err.message);
        return { id: video.id, title: video.title, error: true, message: err.message };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    if (i + CHUNK_SIZE < videos.length) {
      console.log(`[Retroactive Sync] Chunk complete. Cooling down for ${COOLING_PERIOD_MS}ms to protect API rate limits...`);
      await new Promise(resolve => setTimeout(resolve, COOLING_PERIOD_MS));
    }
  }

  return results;
}

// Automated sync: searches YouTube for new videos and curates them (running limits/A/B switch)
export async function runAutomatedSyncForSubject(
  adminApp: App,
  databaseId: string,
  classStr: string,
  subject: string
) {
  const apiKey = getYoutubeApiKey();
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured in the environment. Please add YOUTUBE_API_KEY or VITE_YOUTUBE_API_KEY to your .env configuration.');
  }


  const db = getAdminFirestore(adminApp, databaseId);
  const videosRef = db.collection('curated_videos');

  // Retrieve chapters for this class and subject from the static mapping
  const subjectKey = subject.toLowerCase();
  const classChapters = CHAPTERS_MAP[classStr]?.[subjectKey] || [];
  if (classChapters.length === 0) {
    return { message: `No chapters defined for Class ${classStr} - ${subject}.` };
  }

  const results = [];
  const subjectSearchName = getSubjectSearchName(subject);

  for (const rawChapter of classChapters) {
    const cleanChapterName = formatChapterName(rawChapter);
    
    // Check if this chapter is an index or guide chapter (pre-skip before YouTube search to conserve quota)
    const lowerChapter = cleanChapterName.toLowerCase();
    if (
      lowerChapter.includes('index') || 
      lowerChapter.includes('syllabus') || 
      lowerChapter.includes('guide') || 
      lowerChapter.includes('preface') ||
      lowerChapter.includes('introduction')
    ) {
      console.log(`[YouTube Sync] Pre-skipping index/guide chapter: ${cleanChapterName}`);
      results.push({ chapter: cleanChapterName, status: 'skipped', reason: 'Pre-skipped index/guide chapter.' });
      continue;
    }

    // 1. Fetch currently curated video IDs for this chapter to avoid duplicate sync
    const existSnap = await videosRef
      .where('classStr', '==', classStr)
      .where('subject', '==', subjectKey)
      .where('chapter', '==', rawChapter)
      .get();
    
    const existingIds = new Set(
      existSnap.docs.map(doc => extractYoutubeId(doc.data().youtubeUrl)).filter(Boolean)
    );

    // 2. Perform search on YouTube
    const searchQuery = `Class ${classStr} ${subjectSearchName} ${cleanChapterName} Odia Medium BSE Odisha`;
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${apiKey}&maxResults=5&order=relevance`;
    
    try {
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        let errMsg = `YouTube Search failed with status ${searchRes.status}`;
        try {
          const errData = await searchRes.json();
          if (errData?.error?.message) {
            errMsg += `: ${errData.error.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      
      const searchData = await searchRes.json();
      const items = searchData.items || [];
      
      // Filter out items already curated
      const candidates = items.filter((item: any) => !existingIds.has(item.id.videoId));
      if (candidates.length === 0) {
        results.push({ chapter: cleanChapterName, status: 'no_new_candidates' });
        continue;
      }

      // 3. Batch fetch statistics for candidates to find the highest-performing video
      const candidateIds = candidates.map((item: any) => item.id.videoId);
      const ytItems = await getYoutubeVideosDataBatch(candidateIds);
      
      // Compute scores and sort candidates descending
      const candidatesWithScores = ytItems.map(item => {
        return {
          id: item.id,
          snippet: item.snippet,
          statistics: item.statistics,
          score: calculateEngagementScore(item.statistics)
        };
      });
      candidatesWithScores.sort((a, b) => b.score - a.score);

      let syncedVideo = false;
      // 4. Iterate sorted candidates, run Gemini OCR check, and curate
      for (const candidate of candidatesWithScores) {
        const verifyResult = await verifyYoutubeVideoWithGemini(
          classStr,
          subjectKey,
          rawChapter,
          candidate.snippet.title,
          candidate.snippet.description || '',
          candidate.id
        );

        const url = `https://www.youtube.com/watch?v=${candidate.id}`;

        if (verifyResult.verified) {
          if (verifyResult.confidence >= 0.8) {
            // AUTOMATIC (High confidence) -> Add/Publish/Trial immediately!
            const additionResult = await handleVideoSyncOrAddition(adminApp, databaseId, {
              classStr,
              subject: subjectKey,
              chapter: rawChapter,
              youtubeUrl: url,
              title: candidate.snippet.title
            });

            results.push({
              chapter: cleanChapterName,
              status: 'synced_automatic',
              videoId: candidate.id,
              title: candidate.snippet.title,
              score: candidate.score,
              confidence: verifyResult.confidence,
              details: additionResult
            });
            syncedVideo = true;
            break; // Done with this chapter
          } else {
            // MANUAL REVIEW (Low confidence) -> Add to review queue (status: 'pending_review')
            const newVideoDoc = {
              classStr: classStr,
              subject: subjectKey,
              chapter: rawChapter,
              youtubeUrl: url,
              title: candidate.snippet.title,
              order: existingIds.size + 1,
              status: 'pending_review',
              reviewReason: `Gemini verified but confidence is low (${verifyResult.confidence}): ${verifyResult.reasoning}`,
              viewCount: parseInt(candidate.statistics?.viewCount || '0', 10),
              likeCount: parseInt(candidate.statistics?.likeCount || '0', 10),
              commentCount: parseInt(candidate.statistics?.commentCount || '0', 10),
              engagementScore: candidate.score,
              createdAt: FieldValue.serverTimestamp()
            };
            
            await videosRef.add(newVideoDoc);

            results.push({
              chapter: cleanChapterName,
              status: 'flagged_review_low_confidence',
              videoId: candidate.id,
              title: candidate.snippet.title,
              score: candidate.score,
              confidence: verifyResult.confidence,
              reason: verifyResult.reasoning
            });
            syncedVideo = true;
            break; // Done with this chapter
          }
        } else {
          console.log(`[YouTube Sync] Candidate ${candidate.id} failed Gemini OCR/Index verification: ${verifyResult.reasoning}`);
        }
      }

      if (!syncedVideo) {
        results.push({ chapter: cleanChapterName, status: 'no_verified_candidates' });
      }

    } catch (err) {
      console.error(`[YouTube Sync] Error syncing chapter ${cleanChapterName}:`, err);
      results.push({
        chapter: cleanChapterName,
        status: 'error',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return results;
}

// Register routing endpoints on the Express application
export function registerYoutubeSyncAutomation(app: Express, providedAdminApp: App | null, databaseId: string) {
  
  // Endpoint to proxy YouTube search queries securely without exposing the API key on the frontend
  app.get('/api/admin/videos/search', async (req, res) => {
    try {
      const { q, maxResults } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Missing search query parameter (q).' });
      }

      const apiKey = getYoutubeApiKey();
      if (!apiKey) {
        return res.status(503).json({ error: 'YouTube API key is not configured.' });
      }

      const limit = Number(maxResults) || 15;
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(String(q))}&type=video&key=${apiKey}&maxResults=${limit}&order=relevance`;

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        let errMsg = `YouTube Search failed with status ${searchRes.status}`;
        try {
          const errData = await searchRes.json();
          if (errData?.error?.message) {
            errMsg += `: ${errData.error.message}`;
          }
        } catch (_) {}
        return res.status(searchRes.status).json({ error: errMsg });
      }

      const searchData = await searchRes.json();
      return res.json(searchData);
    } catch (error: unknown) {
      console.error('[YouTube Sync API] Secure search proxy error:', error);
      return res.status(500).json({ error: 'Failed to query YouTube API.', details: String(error) });
    }
  });

  // Endpoint to manually trigger A/B Trial evaluations
  app.all('/api/admin/videos/trial-eval', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (req.method === 'GET' && process.env.CRON_SECRET) {
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          return res.status(401).json({ error: 'Unauthorized Cron Request' });
        }
      }

      const adminApp = providedAdminApp || getAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized.' });
      }

      const force = req.body?.force === true || req.query?.force === 'true';
      const results = await evaluateTrialVideos(adminApp, databaseId, force);
      return res.json({ success: true, results });
    } catch (error: unknown) {
      console.error('[YouTube Sync API] Trial eval error:', error);
      return res.status(500).json({ error: 'Failed to run trial evaluation.', details: String(error) });
    }
  });

  // Endpoint to run retroactive OCR validation on all active curated videos
  app.post('/api/admin/videos/reverify', async (req, res) => {
    try {
      const adminApp = providedAdminApp || getAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized.' });
      }

      const results = await reverifyExistingVideos(adminApp, databaseId);
      return res.json({ success: true, count: results.length, results });
    } catch (error: unknown) {
      console.error('[YouTube Sync API] Re-verification error:', error);
      return res.status(500).json({ error: 'Failed to run re-verification.', details: String(error) });
    }
  });

  // Endpoint to run automated bulk YouTube sync for a selected class/subject
  app.post('/api/admin/videos/sync', async (req, res) => {
    try {
      const { classStr, subject } = req.body;
      if (!classStr || !subject) {
        return res.status(400).json({ error: 'Missing classStr or subject parameters.' });
      }

      const adminApp = providedAdminApp || getAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized.' });
      }

      const results = await runAutomatedSyncForSubject(adminApp, databaseId, classStr, subject);
      return res.json({ success: true, classStr, subject, results });
    } catch (error: unknown) {
      console.error('[YouTube Sync API] Bulk sync error:', error);
      return res.status(500).json({ error: 'Failed to run automated sync.', details: String(error) });
    }
  });

  // Endpoint to manually add a video, ensuring the 5-video limit checks and A/B switches run
  app.post('/api/admin/videos/add-direct', async (req, res) => {
    try {
      const { classStr, subject, chapter, youtubeUrl, title, order, bypassLimitCheck } = req.body;
      if (!classStr || !subject || !chapter || !youtubeUrl || !title) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }

      const adminApp = providedAdminApp || getAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized.' });
      }

      const result = await handleVideoSyncOrAddition(
        adminApp,
        databaseId,
        { classStr, subject, chapter, youtubeUrl, title, order: Number(order) || undefined },
        bypassLimitCheck === true
      );

      return res.json(result);
    } catch (error: unknown) {
      console.error('[YouTube Sync API] Add direct error:', error);
      return res.status(500).json({ error: 'Failed to add video.', details: String(error) });
    }
  });
}
