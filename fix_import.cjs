const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// If SmartClassesView import already exists, don't add it again
if (!content.includes('const SmartClassesView = lazy(')) {
  content = content.replace(
    /const DigitalLibraryView = lazy\(\(\) =>[\s\S]*?import\('\.\/components\/DigitalLibraryView'\)[\s\S]*?\.then\(\(module\) => \(\{ default: module\.DigitalLibraryView \}\)\)[\s\S]*?\);/,
    `const DigitalLibraryView = lazy(() => import('./components/DigitalLibraryView').then((module) => ({ default: module.DigitalLibraryView })));\nconst SmartClassesView = lazy(() => import('./components/SmartClassesView').then((module) => ({ default: module.SmartClassesView })));`
  );
  fs.writeFileSync('src/App.tsx', content);
  console.log("Import successfully injected!");
} else {
  console.log("Import already exists.");
}
