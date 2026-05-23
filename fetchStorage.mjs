import https from 'https';
import fs from 'fs';

const fetchUrl = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

async function main() {
  try {
    const data = await fetchUrl('https://firebasestorage.googleapis.com/v0/b/utkalskillcentre.firebasestorage.app/o');
    if (!data.items) return;

    const structure = {};
    
    data.items.forEach(item => {
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
