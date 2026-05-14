export interface DailyMcqShareOptions {
  language: 'en' | 'or';
  subjectLabel?: string;
  classLabel?: string;
  scoreText?: string;
}

export const getDailyMcqShareUrl = () => `${window.location.origin}${window.location.pathname}#daily_mcqs`;

export const getDailyMcqShareText = ({ language, subjectLabel, classLabel, scoreText }: DailyMcqShareOptions) => {
  const subjectPart = subjectLabel ? `Subject: ${subjectLabel}. ` : '';
  const classPart = classLabel ? `Class: ${classLabel}. ` : '';
  const scorePart = scoreText ? `🏆 I just scored ${scoreText}! Can you beat my score? ` : '';

  if (language === 'or') {
    const odiaSubjectPart = subjectLabel ? `ବିଷୟ: ${subjectLabel} | ` : '';
    const odiaClassPart = classLabel ? `ଶ୍ରେଣୀ: ${classLabel} | ` : '';
    const odiaScorePart = scoreText ? `🏆 ମୁଁ ଆଜିର ଟେଷ୍ଟରେ ${scoreText} ସ୍କୋର କରିଛି! ତୁମେ ମୋଠାରୁ ଅଧିକ ସ୍କୋର କରିପାରିବ କି? ` : '';
    return `${odiaScorePart}ଆଜିର Utkal Skill Centre daily test ଦିଅ | ${odiaSubjectPart}${odiaClassPart}ଲିଙ୍କ ଖୋଲି ଲଗିନ୍ କରି ତୁମେ ମଧ୍ୟ ଟେଷ୍ଟ ଦିଅ: ${getDailyMcqShareUrl()}`;
  }

  return `${scorePart}Try today's Utkal Skill Centre daily test. ${subjectPart}${classPart}Open the link, log in, and attempt it here: ${getDailyMcqShareUrl()}`;
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