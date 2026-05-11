const geminiApiKey = 'AIzaSyCbxvcVI_uY6x_tp-v8T0EnttJhN0QTpSI';
const model = 'gemini-3.1-flash-tts-preview';
const voiceName = 'Puck';
const text = 'ନମସ୍କାର';

const ttsPrompt = `ନିମ୍ନଲିଖିତ ଓଡ଼ିଆ ଲେଖାକୁ ଅତ୍ୟନ୍ତ ସ୍ପଷ୍ଟ ଭାବରେ କହନ୍ତୁ।\n\n${text}`;

async function run() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: ttsPrompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      }),
    });

    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData)?.inlineData;
    console.log('MimeType:', inlineData?.mimeType);
    console.log('Data length:', inlineData?.data?.length);
    console.log('Error details:', JSON.stringify(data.error || {}));
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
