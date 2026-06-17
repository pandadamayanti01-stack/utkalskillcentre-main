const fs = require('fs');
const path = require('path');
const readline = require('readline');

if (process.argv.length < 3) {
  console.error("❌ Error: Please specify the path to the downloaded batch output JSONL file.");
  console.log("Usage: node scripts/apply_gemini_batch_output.cjs <path_to_batch_output.jsonl>");
  process.exit(1);
}

const batchOutputPath = path.resolve(process.argv[2]);
if (!fs.existsSync(batchOutputPath)) {
  console.error(`❌ Error: File not found: ${batchOutputPath}`);
  process.exit(1);
}

// Map to cache loaded files in memory to avoid repetitive reads/writes
const dbCache = new Map();

// Helper to get cached data or load from file
function getFileData(classNum) {
  if (dbCache.has(classNum)) {
    return dbCache.get(classNum);
  }
  const filepath = path.resolve(__dirname, '..', `textbook_vectors_class_${classNum}_progress.json`);
  if (!fs.existsSync(filepath)) {
    console.error(`⚠️ Database file not found for Class ${classNum}: ${filepath}`);
    return null;
  }
  const content = fs.readFileSync(filepath, 'utf8');
  const data = JSON.parse(content);
  dbCache.set(classNum, { filepath, data, modified: false });
  return dbCache.get(classNum);
}

async function main() {
  console.log(`📂 Reading batch output file: ${batchOutputPath}...`);

  const fileStream = fs.createReadStream(batchOutputPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let processedCount = 0;
  let skippedCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    let result;
    try {
      result = JSON.parse(line);
    } catch (e) {
      console.error(`⚠️ Failed to parse line:`, e.message);
      continue;
    }

    const key = result.key;
    if (!key) {
      skippedCount++;
      continue;
    }

    // Parse key format: class{classNum}_idx{index}
    const match = key.match(/^class(\d+)_idx(\d+)$/);
    if (!match) {
      console.log(`⚠️ Invalid key format: ${key} (skipping)`);
      skippedCount++;
      continue;
    }

    const classNum = match[1];
    const index = parseInt(match[2], 10);

    // Retrieve response text from candidates
    let cleanText = null;
    try {
      cleanText = result.response.candidates[0].content.parts[0].text;
    } catch (e) {
      console.error(`⚠️ Could not extract text for key ${key}:`, e.message);
    }

    if (!cleanText) {
      skippedCount++;
      continue;
    }

    // Load file and apply clean text
    const fileInfo = getFileData(classNum);
    if (fileInfo && fileInfo.data[index]) {
      // Clean up the text field in our array
      fileInfo.data[index].text = cleanText.trim();
      fileInfo.modified = true;
      processedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\n💾 Saving modified database files...`);
  let savedFilesCount = 0;
  for (const [classNum, fileInfo] of dbCache.entries()) {
    if (fileInfo.modified) {
      fs.writeFileSync(fileInfo.filepath, JSON.stringify(fileInfo.data, null, 2), 'utf8');
      console.log(`  ✅ Saved Class ${classNum} database: ${fileInfo.filepath}`);
      savedFilesCount++;
    }
  }

  console.log(`\n🎉 Processing complete!`);
  console.log(`Total segments updated with clean text: ${processedCount}`);
  console.log(`Total segments skipped or failed: ${skippedCount}`);
  console.log(`Total database files updated: ${savedFilesCount}`);
}

main().catch(console.error);
