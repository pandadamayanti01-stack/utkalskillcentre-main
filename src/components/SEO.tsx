import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  subject?: string;
  className?: string;
}

/**
 * Utility to get the current or upcoming monthly test name.
 * On or after the 6th of the month, it points to the NEXT month's test.
 */
const getMonthlyTestName = () => {
  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // If it's the 6th or later, students are looking for next month's test
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
  className = "Class 10" 
}) => {
  const currentMonth = getMonthlyTestName();
  const year = new Date().getFullYear();
  
  // Dynamic Title Construction (Hinglish optimized)
  const seoTitle = title || (subject 
    ? `${className} ${subject} Selection Question ${year} | Odisha Board MCQ | Utkal Skill Centre`
    : `BSE Odisha 10th Result 2026 Today (LIVE) | Check Matric Result Link`);

  // Dynamic Description Construction (Hinglish optimized)
  const seoDescription = description || (subject
    ? `Get important MCQs for ${className} ${subject} Odia medium. Perfect for your ${currentMonth} monthly test and Odisha Board Exam ${year}. Download PDF selection questions.`
    : `BSE Odisha 10th Result 2026 published today. Check your Odisha Matric result live link, marksheet, and pass percentage here. Join Utkal Skill Centre for next-step career guidance.`);

  // JSON-LD Schema for Course/Educational Content
  const schemaOrgJSONLD = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": seoTitle,
    "description": seoDescription,
    "provider": {
      "@type": "Organization",
      "name": "Utkal Skill Centre",
      "sameAs": "https://utkalskillcentre.com"
    },
    "courseCode": subject || "OdishaBoard",
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "Online",
      "instructor": {
        "@type": "Person",
        "name": "Gundulu AI"
      }
    }
  };

  return (
    <Helmet>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      
      {/* Hinglish Keywords Strategy */}
      <meta name="keywords" content={`${subject || ''}, ${className}, Odisha Board 10th result 2026, matric result odisha today, BSE Odisha result link, check 10th result Odisha, orissaresults.nic.in, ${currentMonth} monthly test, selection question 2026, Odia medium notes, class 10 question paper PDF, Utkal Skill Centre`} />

      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify(schemaOrgJSONLD)}
      </script>
    </Helmet>
  );
};
