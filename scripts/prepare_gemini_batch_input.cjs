const fs = require('fs');
const path = require('path');

// Classes 1-5, 8, and 9 are completed.
// Classes 6, 7, and 10 are uncompleted or need reprocessing, and will be staged.
const CLASSES = ['6', '7', '10'];
const outputFilename = 'gemini_batch_requests.jsonl';
const outputPath = path.resolve(__dirname, '..', outputFilename);

const promptPrefix = `You are a professional Odia educational proofreader and editor for the Board of Secondary Education, Odisha (BSE Odisha).
Your task is to fix any OCR errors, spelling mistakes, layout alignment errors, and number-word mismatches in the following Odia textbook page segment.

Rules:
1. Output ONLY the clean, corrected textbook page text in Odia.
2. Do not summarize, comment, explain, or add any intro/outro text.
3. Keep the original text meaning, numbers, structure, and chapter references intact.
4. Correct any obvious OCR misreads (e.g. garbled conjunct characters or incorrect character pairs).

Textbook Page Segment:
---
`;

async function main() {
  console.log('🔍 Scanning textbook vector progress files...');
  
  const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  let totalSegments = 0;

  for (const classNum of CLASSES) {
    const filename = `textbook_vectors_class_${classNum}_progress.json`;
    const filepath = path.resolve(__dirname, '..', filename);

    if (!fs.existsSync(filepath)) {
      console.log(`⚠️ File not found: ${filename} (skipping)`);
      continue;
    }

    console.log(`📖 Reading ${filename}...`);
    const content = fs.readFileSync(filepath, 'utf8');
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      console.error(`❌ Failed to parse JSON for ${filename}:`, e.message);
      continue;
    }

    if (!Array.isArray(data)) {
      console.log(`⚠️ ${filename} is not a JSON Array (skipping)`);
      continue;
    }

    console.log(`  - Found ${data.length} segments.`);
    let fileSegmentsCount = 0;

    for (let index = 0; index < data.length; index++) {
      const segment = data[index];
      if (!segment.text || segment.text.trim().length < 5) continue;

      const fullPrompt = `${promptPrefix}${segment.text}\n---`;
      
      // Construct the JSONL line format required by the Gemini Batch API
      const requestLine = {
        key: `class${classNum}_idx${index}`,
        request: {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ]
        }
      };

      writeStream.write(JSON.stringify(requestLine) + '\n');
      fileSegmentsCount++;
      totalSegments++;
    }

    console.log(`  - Staged ${fileSegmentsCount} segments.`);
  }

  writeStream.end();
  console.log(`\n🎉 Staging complete!`);
  console.log(`Total staged segments: ${totalSegments}`);
  console.log(`Batch request file generated at: ${outputPath}`);
}

main().catch(console.error);
