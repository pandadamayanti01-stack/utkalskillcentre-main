const geminiApiKey = 'AIzaSyCbxvcVI_uY6x_tp-v8T0EnttJhN0QTpSI';
const model = 'gemini-3.1-flash-tts-preview';
const voiceName = 'Puck';
const text = 'ନମସ୍କାର, ମୁଁ ଗୁଣ୍ଡୁଲୁ।';

const ttsPrompt = `ନିମ୍ନଲିଖିତ ଓଡ଼ିଆ ଲେଖାକୁ ଅତ୍ୟନ୍ତ ସ୍ପଷ୍ଟ ଭାବରେ, ଗୋଟି ଗୋଟି କରି ଧୀର ଏବଂ ମଧୁର ସ୍ୱରରେ ଛୋଟ ପିଲାଙ୍କୁ ବୁଝାଇବା ଶୈଳୀରେ କହନ୍ତୁ। ପ୍ରତ୍ୟେକ ଓଡ଼ିଆ ଶବ୍ଦର ଉଚ୍ଚାରଣ ସ୍ପଷ୍ଟ ଏବଂ ସ୍ୱାଭାବିକ ହେବା ଉଚିତ। କୌଣସି ବିଦେଶୀ ଉଚ୍ଚାରଣ ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।\n\n${text}`;

async function run() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    console.log('Status:', response.status);
    const body = await response.text();
    console.log('Response body:', body);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
