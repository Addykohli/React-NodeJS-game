import React, { useEffect, useState } from 'react';
import './DiceRoll.css';

const DiceRoll = ({ diceValues, onAnimationComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationClass, setAnimationClass] = useState('dice-roll');
  const [currentDiceValues, setCurrentDiceValues] = useState([1, 1]);

  useEffect(() => {
    if (diceValues && diceValues.length === 2) {
      setCurrentDiceValues(diceValues);
      setIsVisible(true);
      setAnimationClass('dice-roll');
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setAnimationClass('dice-hide');
        setTimeout(() => {
          setIsVisible(false);
          onAnimationComplete?.();
        }, 500);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [diceValues, onAnimationComplete]);

  if (!isVisible || !currentDiceValues || currentDiceValues.length !== 2) return null;

  // Angles for each face of the dice (1-6)
  const angleArray = [
    [0, 0, 0],
    [-310, -362, -38],
    [-400, -320, -2],
    [135, -217, -88],
    [-224, -317, 5],
    [-47, -219, -81],
    [-133, -360, -53]
  ];

  const getDiceTransform = (value) => {
    const safeValue = Math.max(1, Math.min(6, value || 1));
    return `rotateX(${angleArray[safeValue][0]}deg) rotateY(${angleArray[safeValue][1]}deg) rotateZ(${angleArray[safeValue][2]}deg)`;
  };

  return (
    <div className={`dice-container ${animationClass}`}>
      {[0, 1].map((index) => (
        <div key={index} className="dice-wrapper">
          <div 
            className="dice" 
            style={{ transform: getDiceTransform(diceValues[index]) }}
          >
            <div className="side front">
              <span className="fas fa-circle"></span>
            </div>
            <div className="side back">
              <pre className="firstPre">
                <span className="fas fa-circle"></span>    <span className="fas fa-circle"></span>    <span className="fas fa-circle"></span>
              </pre>
              <pre className="secondPre">
                <span className="fas fa-circle"></span>    <span className="fas fa-circle"></span>    <span className="fas fa-circle"></span>
              </pre>
            </div>
            <div className="side top">
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
            </div>
            <div className="side left">
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
            </div>
            <div className="side right">
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
            </div>
            <div className="side bottom">
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
              <span className="fas fa-circle"></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DiceRoll;
