const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the import
content = content.replace(
  /const CoursesView = lazy\(\(\) =>[\s\S]*?import\('\.\/components\/CoursesView'\)[\s\S]*?\.then\(\(module\) => \(\{ default: module\.CoursesView \}\)\)[\s\S]*?\);/,
  `const SmartClassesView = lazy(() => import('./components/SmartClassesView').then((module) => ({ default: module.SmartClassesView })));`
);

// Replace the render block
content = content.replace(
  /\{activeTab === 'courses' && \([\s\S]*?<CoursesView[\s\S]*?user=\{user\}[\s\S]*?chapters=\{chapters\.filter\(\(c: any\) => !c\.isLibraryChapter && !c\.pdfUrl\)\}[\s\S]*?language=\{language\}[\s\S]*?isPremium=\{isPremium\}[\s\S]*?onUpgrade=\{.*?\}[\s\S]*?onBack=\{.*?\}[\s\S]*?\/\>[\s\S]*?\)\}/,
  `{activeTab === 'smart_classes' && (
              <SmartClassesView 
                user={user} 
                language={language} 
                isPremium={isPremium} 
                onUpgrade={() => setActiveTab('plans')}
                onBack={() => setActiveTab('dashboard')}
              />
            )}`
);

// Replace the routing
content = content.replace(
  /if \(parts\[0\] === 'courses'\) \{[\s\S]*?setActiveTab\('courses'\);[\s\S]*?return;[\s\S]*?\}/,
  `if (parts[0] === 'smart_classes') {
        setActiveTab('smart_classes');
        return;
      }`
);

fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx has been successfully updated with Regex!");
