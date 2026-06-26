import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\Bishnupriya Panda\\.gemini\\antigravity\\brain\\6c151dfb-3f77-4a9f-ac20-8606b87c6faa\\.system_generated\\logs\\transcript.jsonl';

function readLog() {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach(l => {
    if (!l.trim()) return;
    try {
      const data = JSON.parse(l);
      if (data.step_index >= 620 && data.step_index <= 660) {
        console.log(`\n=================== STEP ${data.step_index} (${data.type} - ${data.source}) ===================`);
        console.log(typeof data.content === 'string' ? data.content.substring(0, 1500) : JSON.stringify(data.tool_calls || ''));
      }
    } catch (e) {
      // Ignored parsing errors
    }
  });
}

readLog();
