import https from 'https';
import fs from 'fs';

const fetchUrl = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

function formatChapterTitle(rawName) {
  // If it's already in the correct format, return it as-is
  if (rawName.startsWith('Chapter ') && rawName.includes(' - ')) {
    return rawName;
  }

  // Extract chapter number
  let chNum = null;
  const chMatch = rawName.match(/Ch[_\-\s]?(\d+)/i);
  if (chMatch) {
    chNum = parseInt(chMatch[1], 10);
  } else {
    const fallbackMatch = rawName.match(/Chapter[_\-\s]?\s*(\d+)/i);
    if (fallbackMatch) {
      chNum = parseInt(fallbackMatch[1], 10);
    }
  }

  // List of prefixes to clean, ordered from longest to shortest to prevent partial matches
  const prefixes = [
    /Class\d+[_]?/gi,
    /C9_[a-zA-Z]+[_]?/gi,
    /Chapter\s*\d+/gi,
    /Ch\d+/gi,
    /Ch\s*\d+/gi,
    /L\d+/gi,
    /L\s*\d+/gi,
    /Sanskrit_Grammar/gi,
    /SanskritGrammar/gi,
    /English_Grammar/gi,
    /EnglishGrammar/gi,
    /Physical_science/gi,
    /PhysicalScience/gi,
    /Physical_Science/gi,
    /Hindi_Grammar/gi,
    /HindiGrammar/gi,
    /Odia_Grammar/gi,
    /OdiaGrammar/gi,
    /Sanskrit/gi,
    /SanGram/gi,
    /Life_Science/gi,
    /LifeScience/gi,
    /LifeSci/gi,
    /Physical/gi,
    /PhySci/gi,
    /Geometry/gi,
    /Geography/gi,
    /History/gi,
    /HistPol/gi,
    /GeoEco/gi,
    /HindiGram/gi,
    /OdiaGram/gi,
    /EngGram/gi,
    /English/gi,
    /HindiLit/gi,
    /Algebra/gi,
    /Hindi/gi,
    /Odia/gi,
    /Eng/gi,
    /Geo/gi,
    /Pol/gi,
    /Eco/gi,
    /Hist/gi,
    /Ready/gi
  ];

  let cleanTitle = rawName;
  for (const regex of prefixes) {
    cleanTitle = cleanTitle.replace(regex, '');
  }

  // Replace underscores and clean spaces
  cleanTitle = cleanTitle.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Clean leading/trailing clutter
  cleanTitle = cleanTitle.replace(/^[^a-zA-Z0-9(]+/, '').replace(/[^a-zA-Z0-9)]+$/, '').trim();

  // Reconstruct in Class 10 style: "Chapter X - Title"
  if (chNum !== null) {
    return `Chapter ${chNum} - ${cleanTitle}`;
  }
  return cleanTitle;
}

async function fetchAllItems() {
  let items = [];
  let pageToken = '';
  do {
    const url = `https://firebasestorage.googleapis.com/v0/b/utkalskillcentre.firebasestorage.app/o${pageToken ? `?pageToken=${pageToken}` : ''}`;
    const data = await fetchUrl(url);
    if (data.items) {
      items.push(...data.items);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return items;
}

async function main() {
  try {
    console.log('Fetching all items from Firebase Storage (handling pagination)...');
    const items = await fetchAllItems();
    console.log(`Total items retrieved: ${items.length}`);

    const structure = {};
    
    items.forEach(item => {
      const parts = item.name.split('/');
      if (parts[0] === 'Chapter Wise Text Book' && parts.length >= 4) {
        let className = parts[1].replace('Class ', '').trim();
        let originalSubject = parts[2].toLowerCase(); 
        
        let subjectsToMap = [originalSubject];
        
        // If the folder is mathematics, map its contents to BOTH 'math' and 'algebra'
        if (originalSubject === 'mathematics') {
          subjectsToMap = ['math', 'algebra'];
        }
        
        let fileName = parts[3];
        let chapterName = fileName.replace(/\.pdf$/i, '').trim();
        if (chapterName === '.placeholder') return; // Skip placeholders

        // Format Class 9 names for premium appearance matching Class 10
        if (className === '9') {
          chapterName = formatChapterTitle(chapterName);
        }

        if (!structure[className]) structure[className] = {};
        
        subjectsToMap.forEach(sub => {
          if (!structure[className][sub]) structure[className][sub] = [];
          if (!structure[className][sub].includes(chapterName)) {
            structure[className][sub].push(chapterName);
          }
        });
      }
    });

    const fileContent = `// Auto-generated chapter map from Firebase Storage
export const CHAPTERS_MAP: Record<string, Record<string, string[]>> = ${JSON.stringify(structure, null, 2)};
`;

    fs.writeFileSync('./src/data/chaptersMap.ts', fileContent);
    console.log('Successfully saved to src/data/chaptersMap.ts');
  } catch (err) {
    console.error(err);
  }
}

main();
