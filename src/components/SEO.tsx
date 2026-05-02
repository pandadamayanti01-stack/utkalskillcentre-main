import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  subject?: string;
  className?: string;
  schemaType?: 'Course' | 'FAQPage' | 'HowTo';
  faqs?: Array<{ question: string; answer: string }>;
}

/**
 * Utility to get the current or upcoming monthly test name.
 */
const getMonthlyTestName = () => {
  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  let targetMonthIndex = now.getMonth();
  if (day >= 6) {
    targetMonthIndex = (targetMonthIndex + 1) % 12;
  }
  
  return monthNames[targetMonthIndex];
};

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  subject,
  className = "Class 10",
  schemaType = 'Course',
  faqs
}) => {
  const currentMonth = getMonthlyTestName();
  const year = 2026; // Fixed for current focus
  
  // 2026 Optimized Title (Hinglish + Latest Pattern)
  const seoTitle = title || (subject 
    ? `${className} ${subject} Selection Question 2026 | Latest Odisha Board Pattern MCQ | Utkal Skill Centre`
    : `BSE Odisha 10th Result 2026 Today (LIVE) | Check Matric Result Link Online | orissaresults.nic.in`);

  const seoDescription = description || (subject
    ? `Get 100% selection MCQs for ${className} ${subject} Odia medium. Perfect for ${currentMonth} monthly test and Odisha Board Exam ${year}. Download Latest PDF questions based on new board pattern.`
    : `BSE Odisha 10th Result 2026 published today. Check your Odisha Matric result live link, marksheet, and pass percentage here. Join Utkal Skill Centre for Class 11-12 preparation and career guidance.`);

  // Construct Schemas
  let schemaData: any = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": seoTitle,
    "description": seoDescription,
    "provider": {
      "@type": "Organization",
      "name": "Utkal Skill Centre",
      "url": "https://utkalskillcentre.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Utkal Skill Centre",
      "logo": {
        "@type": "ImageObject",
        "url": "https://utkalskillcentre.com/utkal-192.png"
      }
    }
  };

  if (schemaType === 'FAQPage' && faqs) {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.answer
        }
      }))
    };
  } else if (schemaType === 'HowTo') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": `How to check BSE Odisha 10th Result 2026`,
      "step": [
        { "@type": "HowToStep", "text": "Visit orissaresults.nic.in or bseodisha.ac.in" },
        { "@type": "HowToStep", "text": "Click on 'Annual H.S.C Examination Result 2026'" },
        { "@type": "HowToStep", "text": "Enter your Roll Number and Date of Birth" },
        { "@type": "HowToStep", "text": "Click 'Submit' to view your marksheet" }
      ]
    };
  }

  return (
    <Helmet>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://utkalskillcentre.com" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      
      <meta name="keywords" content={`${subject || ''}, ${className}, Odisha Board 10th result 2026, matric result odisha today, BSE Odisha result link, check 10th result Odisha, orissaresults.nic.in, ${currentMonth} monthly test, selection question 2026, Odia medium notes, class 10 question paper PDF, Utkal Skill Centre, Latest Odisha Board Pattern`} />

      <script type="application/ld+json">
        {JSON.stringify(schemaData, null, 2)}
      </script>
    </Helmet>
  );
};
