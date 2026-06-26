const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Inject import
if (!content.includes('import { FloatingGundulu }')) {
  content = content.replace(
    /import \{ Sidebar \} from '\.\/components\/Sidebar';/,
    `import { Sidebar } from './components/Sidebar';\nimport { FloatingGundulu } from './components/FloatingGundulu';`
  );
}

// Inject FloatingGundulu inside the main div where Sidebar is.
// Look for `<Sidebar user={user}`
if (!content.includes('<FloatingGundulu')) {
  content = content.replace(
    /<Sidebar user=\{user\}/,
    `<FloatingGundulu onClick={() => setActiveTab('study_buddy')} />\n      <Sidebar user={user}`
  );
}

fs.writeFileSync('src/App.tsx', content);
console.log("FloatingGundulu successfully injected into App.tsx!");
