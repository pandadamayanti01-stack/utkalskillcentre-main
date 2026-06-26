import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  subject?: string;
  className?: string;
  schemaType?: 'Course' | 'FAQPage' | 'HowTo' | 'WebSite' | 'SoftwareApplication';
  faqs?: Array<{ question: string; answer: string }>;
  canonicalUrl?: string;
  image?: string;
  lang?: string;
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
  faqs,
  canonicalUrl,
  image,
  lang
}) => {
  const currentMonth = getMonthlyTestName();
  const year = 2026; // Fixed for current focus
  
  // High-Performance Bilingual Titles (Optimized for Odisha Google Rank #1)
  const seoTitle = title || (subject 
    ? `${className} ${subject} Selection Question ${year} | BSE Odisha Board MCQ (ଓଡ଼ିଆ ମାଧ୍ୟମ) | Utkal Skill Centre`
    : `BSE Odisha School Books Class 1 to 10 PDF Download 📚 | Odia Medium Digital Library & AI Doubt Solver | Utkal Skill Centre`);

  const seoDescription = description || (subject
    ? `Download latest BSE Odisha ${className} ${subject} study notes and 100% selection questions in Odia medium. BSE Odisha State Board Exam ${year}. ୨୦୨୬ ମାସିକ ପରୀକ୍ଷା ସିଲେକ୍ସନ ପ୍ରଶ୍ନୋତ୍ତର PDF.`
    : `Download official BSE Odisha Class 1 to 10 school books PDF in Odia medium. Get free chapter-wise study notes, class 10 math textbooks, comfortable eye-care mobile reader, and Gundulu AI instant doubt solving tutor on Odisha's best educational digital library (ଓଡ଼ିଶା ବିଦ୍ୟାଳୟ ପାଠ୍ୟପୁସ୍ତକ).`);

  const activeUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://utkalskillcentre.com');
  const seoImage = image || 'https://utkalskillcentre.com/utkal-192.png';
  const pageLang = lang || 'or';

  // Construct Schemas
  let schemaData: any = null;

  if (schemaType === 'FAQPage' && faqs) {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "inLanguage": pageLang,
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
      "inLanguage": pageLang,
      "name": `How to check BSE Odisha 10th Result 2026`,
      "step": [
        { "@type": "HowToStep", "text": "Visit orissaresults.nic.in or bseodisha.ac.in" },
        { "@type": "HowToStep", "text": "Click on 'Annual H.S.C Examination Result 2026'" },
        { "@type": "HowToStep", "text": "Enter your Roll Number and Date of Birth" },
        { "@type": "HowToStep", "text": "Click 'Submit' to view your marksheet" }
      ]
    };
  } else if (schemaType === 'WebSite') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Utkal Skill Centre",
      "url": "https://utkalskillcentre.com",
      "inLanguage": pageLang,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://utkalskillcentre.com/?search={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    };
  } else if (schemaType === 'SoftwareApplication') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": seoTitle,
      "description": seoDescription,
      "operatingSystem": "All",
      "applicationCategory": "EducationalApplication",
      "inLanguage": pageLang,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Utkal Skill Centre",
        "url": "https://utkalskillcentre.com"
      }
    };
  } else {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": seoTitle,
      "description": seoDescription,
      "inLanguage": pageLang,
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
  }

  // High-Density SEO Keywords Refined for Byte Savings
  const keywordsList = [
    "school book odia",
    "odia class 1 to 10 books",
    "odia medium books download",
    "bse odisha school books pdf",
    "Utkal Skill Centre digital library"
  ].join(", ");

  return (
    <Helmet>
      <html lang={pageLang} />
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      
      <link rel="canonical" href={activeUrl} />
      <link rel="alternate" hrefLang="or" href={activeUrl} />
      <link rel="alternate" hrefLang="en" href={activeUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={activeUrl} />
      <meta property="og:image" content={seoImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      
      <meta name="keywords" content={keywordsList} />

      <script type="application/ld+json">
        {JSON.stringify(schemaData, null, 2)}
      </script>
    </Helmet>
  );
};
