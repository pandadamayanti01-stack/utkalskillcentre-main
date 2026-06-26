const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the ChatbotModal close button in App.tsx
content = content.replace(
  /<button onClick=\{\(\) => setIsOpen\(false\)\} className="text-white\/70 hover:text-white">/g,
  `<button onClick={() => setIsOpen(false)} className="bg-black/20 hover:bg-red-500/80 p-2 rounded-full text-white transition-all shadow-md">`
);

fs.writeFileSync('src/App.tsx', content);
console.log("ChatbotModal close button fixed!");
