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
    : `Utkal Skill Centre | Odisha Board AI Learning App | Class 10 Selection Question`);

  // Dynamic Description Construction (Hinglish optimized)
  const seoDescription = description || (subject
    ? `Get important MCQs for ${className} ${subject} Odia medium. Perfect for your ${currentMonth} monthly test and Odisha Board Exam ${year}. Download PDF selection questions.`
    : `Utkal Skill Centre is the #1 Odisha learning platform for Class 3 to 10. Get Odia medium notes, selection questions, and practice sets for May 5th monthly tests.`);

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
      <meta name="keywords" content={`${subject || ''}, ${className}, Odisha Board, ${currentMonth} monthly test, selection question 2026, Odia medium notes, class 10 question paper PDF, BSE Odisha result date, Utkal Skill Centre`} />

      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify(schemaOrgJSONLD)}
      </script>
    </Helmet>
  );
};
