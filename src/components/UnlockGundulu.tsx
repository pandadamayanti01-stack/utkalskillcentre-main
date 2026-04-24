import React, { useState } from 'react';
import './UnlockGundulu.css';

const UnlockGundulu = () => {
  // 1. Manage Selected Grade
  const [selectedGrade, setSelectedGrade] = useState<'junior' | 'board' | null>('junior');

  // 2. Define Pricing Tiers
  const pricingData = {
    junior: {
      name: "Gundulu Junior",
      grades: "Class 1-5",
      price: "₹99 / mo",
      features: [
        "✅ Math & Odia Made Fun",
        "✅ Gentle Analogy Learning",
        "✅ Parent Progress Reports"
      ],
    },
    board: {
      name: "Gundulu Pro",
      grades: "Class 10 (Board Prep)",
      price: "₹99 / mo",
      features: [
        "✅ PYQ (Previous Year Questions) Help",
        "✅ Expert Physics & Math Theorems",
        "✅ Exam Stress-Buster Chats",
        "✅ Marks-Winning Strategies"
      ],
    }
  };

  // Get the data for the currently selected plan
  const currentPlan = selectedGrade ? pricingData[selectedGrade] : pricingData['junior'];

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        {/* 3. The Locked Header */}
        <div className="header-locked">
          <div className="locked-wrapper">
            <img src="/gundulu.png" alt="Locked Gundulu" className="gundulu-locked" />
            <span className="lock-icon">🔒</span>
          </div>
          <h2>Unlock Gundulu’s Brain! ✨</h2>
        </div>

        {/* 4. Grade Selector Buttons */}
        <div className="plan-selector">
          <button 
            className={`plan-tab ${selectedGrade === 'junior' ? 'active' : ''}`}
            onClick={() => setSelectedGrade('junior')}
          >
            Class 1-5 (Junior)
          </button>
          <button 
            className={`plan-tab ${selectedGrade === 'board' ? 'active' : ''}`}
            onClick={() => setSelectedGrade('board')}
          >
            Class 10 (Board Prep)
          </button>
        </div>

        {/* 5. Dynamic Pricing Card */}
        <div className="pricing-card">
          <span className="grade-tag">{currentPlan.grades}</span>
          <h3>{currentPlan.name}</h3>
          <p className="price-text">{currentPlan.price}</p>
          <ul className="feature-list">
            {currentPlan.features.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>

        {/* 6. Call to Action Button */}
        <button className="cta-button pulse-btn">
          Start Unlimited Learning
        </button>
        <button className="close-btn">Maybe Later</button>
      </div>
    </div>
  );
};

export default UnlockGundulu;
