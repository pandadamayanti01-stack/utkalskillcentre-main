import { DailyMcq } from '../types';
import { translations } from '../translations';

/**
 * Generates a professional printable exam paper for a Daily MCQ set.
 * Uses native browser printing to perfectly support Odia and other scripts.
 */
export async function exportDailyMcqToPdf(mcq: DailyMcq) {
  const language = 'or'; // Default to Odia for exam papers as requested
  const t = translations[language];
  
  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const subjectLabel = mcq.subject ? (t.subjects?.[mcq.subject] || mcq.subject) : 'General';
  const classLabel = t.classes?.[mcq.class] || mcq.class;

  // Question HTML
  const questionsHtml = mcq.questions.map((q, i) => `
    <div class="question">
      <div class="q-header">
        <span class="q-num">${i + 1}.</span>
        <span class="q-text">${q.question}</span>
        <span class="q-marks">(${q.marks || 1} Mark)</span>
      </div>
      ${q.type === 'mcq' && q.options ? `
        <div class="options">
          ${q.options.map((opt, optIdx) => `
            <div class="option">
              <span class="opt-label">${String.fromCharCode(65 + optIdx)})</span>
              <span class="opt-text">${opt}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="subjective-space"></div>
      `}
    </div>
  `).join('');

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>USC Exam - ${mcq.class} - ${mcq.subject}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Noto+Sans+Oriya:wght@400;700&display=swap');
        
        body {
          font-family: 'Noto Sans Oriya', 'Inter', sans-serif;
          color: #1a1a1a;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
          position: relative;
        }

        .logo-box {
          position: absolute;
          top: 0;
          left: 0;
          width: 60px;
          height: 60px;
        }

        .logo-box img {
          width: 100%;
          height: 100%;
          object-contain: contain;
        }
        
        .school-name {
          font-size: 28px;
          font-weight: 900;
          color: #000;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .dept-name {
          font-size: 14px;
          font-weight: 700;
          color: #666;
          margin: 5px 0 0 0;
          letter-spacing: 2px;
        }
        
        .exam-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          font-weight: 700;
          font-size: 14px;
          background: #f9f9f9;
          padding: 15px 20px;
          border-radius: 8px;
        }

        .meta-item span {
          color: #666;
          text-transform: uppercase;
          font-size: 10px;
          display: block;
          margin-bottom: 2px;
        }
        
        .question {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .q-header {
          display: flex;
          gap: 10px;
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 12px;
        }
        
        .q-num { min-width: 25px; }
        .q-text { flex: 1; }
        .q-marks { font-size: 12px; color: #666; white-space: nowrap; }
        
        .options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 40px;
          padding-left: 35px;
        }
        
        .option {
          display: flex;
          gap: 8px;
          font-size: 14px;
        }
        
        .opt-label { font-weight: 700; color: #444; }
        
        .subjective-space {
          height: 80px;
          border-bottom: 1px dashed #ccc;
          margin-left: 35px;
        }
        
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 10px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }

        @media print {
          body { padding: 0; }
          .exam-meta { background: none; border: 1px solid #eee; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-box">
          <img src="/utkal-512.png" alt="Logo">
        </div>
        <h1 class="school-name">UTKAL SKILL CENTRE</h1>
        <p class="dept-name">EXAMINATION DEPARTMENT - 2026</p>
      </div>
      
      <div class="exam-meta">
        <div class="meta-item">
          <span>Subject / ବିଷୟ</span>
          ${subjectLabel}
        </div>
        <div class="meta-item">
          <span>Class / ଶ୍ରେଣୀ</span>
          ${classLabel.toUpperCase()}
        </div>
        <div class="meta-item" style="text-align: right;">
          <span>Date / ତାରିଖ</span>
          ${mcq.activeDate}
        </div>
        <div class="meta-item" style="text-align: right;">
          <span>Max Marks / ମୋଟ ନମ୍ବର</span>
          50
        </div>
      </div>
      
      <div class="questions">
        ${questionsHtml}
      </div>
      
      <div class="footer">
        Generated by Utkal Skill Centre AI Engine | Digital Education for Odisha
      </div>

      <script>
        window.onload = () => {
          window.print();
          setTimeout(() => {
            window.parent.document.body.removeChild(window.frameElement);
          }, 1000);
        };
      </script>
    </body>
    </html>
  `;

  doc.open();
  doc.write(content);
  doc.close();
}
