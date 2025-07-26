import React, { useEffect, useRef, forwardRef } from 'react';
import './CasinoDice.css';

const CasinoDice = forwardRef(({ diceValues, onAnimationComplete }, ref) => {
  const dice1Ref = useRef(null);
  const dice2Ref = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!diceValues) return;

    const [die1, die2] = diceValues;
    const dice1 = dice1Ref.current;
    const dice2 = dice2Ref.current;
    const container = containerRef.current;

    // Reset and show container
    container.style.display = 'flex';
    container.style.opacity = '1';
    
    // Set the final values
    dice1.className = `dice show-${die1}`;
    dice2.className = `dice show-${die2}`;

    // Hide after 3 seconds
    const timer = setTimeout(() => {
      container.style.opacity = '0';
      setTimeout(() => {
        container.style.display = 'none';
        if (onAnimationComplete) onAnimationComplete();
      }, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [diceValues, onAnimationComplete]);

  if (!diceValues) return null;

  return (
    <div className="dice-container" ref={ref || containerRef}>
      <div className="dice-wrapper">
        <div className="dice" ref={dice1Ref}>
          <div className="side front"><div className="dot"></div></div>
          <div className="side back">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side right">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side left">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side top">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side bottom">
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        <div className="dice" ref={dice2Ref}>
          <div className="side front"><div className="dot"></div></div>
          <div className="side back">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side right">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side left">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side top">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <div className="side bottom">
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CasinoDice;
