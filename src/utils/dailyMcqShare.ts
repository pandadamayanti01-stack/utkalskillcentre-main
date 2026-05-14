export interface DailyMcqShareOptions {
  language: 'en' | 'or';
  subjectLabel?: string;
  classLabel?: string;
  scoreText?: string;
}

export const getDailyMcqShareUrl = () => `${window.location.origin}${window.location.pathname}#daily_mcqs`;

export const getDailyMcqShareText = ({ subjectLabel, classLabel, scoreText }: DailyMcqShareOptions) => {
  const odiaSubject = subjectLabel ? `ବିଷୟ (Subject): ${subjectLabel} | ` : '';
  const odiaClass = classLabel ? `ଶ୍ରେଣୀ (Class): ${classLabel} | ` : '';
  const scoreMsg = scoreText 
    ? `🏆 ମୁଁ ଆଜିର ଟେଷ୍ଟରେ ${scoreText} ସ୍କୋର କରିଛି! (I scored ${scoreText}!)\nତୁମେ ମୋଠାରୁ ଅଧିକ ସ୍କୋର କରିପାରିବ କି? (Can you beat my score?)\n\n`
    : '';

  return `${scoreMsg}👉 ଆଜିର Utkal Skill Centre Daily Test ଦିଅ!\n${odiaSubject}${odiaClass}\nଲିଙ୍କ ଖୋଲି ଲଗିନ୍ କରି ତୁମେ ମଧ୍ୟ ଟେଷ୍ଟ ଦିଅ (Open link & attempt now):\n${getDailyMcqShareUrl()}`;
};

export const openDailyMcqWhatsAppShare = (options: DailyMcqShareOptions) => {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(getDailyMcqShareText(options))}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};

export const copyTextToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};