import React, { useEffect, useRef } from 'react';
import './CasinoDice.css';

// Helper component to render dots for dice faces
const DiceFace = ({ value }) => {
  const dots = [];
  
  // Generate dots based on the face value (1-6)
  switch(value) {
    case 1:
      dots.push(<div key="center" className="dot center"></div>);
      break;
    case 2:
      dots.push(<div key="top-left" className="dot"></div>);
      dots.push(<div key="bottom-right" className="dot"></div>);
      break;
    case 3:
      dots.push(<div key="top-left" className="dot"></div>);
      dots.push(<div key="center" className="dot center"></div>);
      dots.push(<div key="bottom-right" className="dot"></div>);
      break;
    case 4:
      dots.push(<div key="top-left" className="dot"></div>);
      dots.push(<div key="top-right" className="dot"></div>);
      dots.push(<div key="bottom-left" className="dot"></div>);
      dots.push(<div key="bottom-right" className="dot"></div>);
      break;
    case 5:
      dots.push(<div key="top-left" className="dot"></div>);
      dots.push(<div key="top-right" className="dot"></div>);
      dots.push(<div key="center" className="dot center"></div>);
      dots.push(<div key="bottom-left" className="dot"></div>);
      dots.push(<div key="bottom-right" className="dot"></div>);
      break;
    case 6:
      dots.push(<div key="top-left" className="dot"></div>);
      dots.push(<div key="top-right" className="dot"></div>);
      dots.push(<div key="middle-left" className="dot"></div>);
      dots.push(<div key="middle-right" className="dot"></div>);
      dots.push(<div key="bottom-left" className="dot"></div>);
      dots.push(<div key="bottom-right" className="dot"></div>);
      break;
    default:
      break;
  }

  return <>{dots}</>;
};

const Dice = ({ value, diceRef }) => (
  <div className="dice" ref={diceRef}>
    <div className="side front"><DiceFace value={1} /></div>
    <div className="side back"><DiceFace value={6} /></div>
    <div className="side right"><DiceFace value={4} /></div>
    <div className="side left"><DiceFace value={3} /></div>
    <div className="side top"><DiceFace value={5} /></div>
    <div className="side bottom"><DiceFace value={2} /></div>
  </div>
);

const DiceAnimation = ({ values, onComplete, delay = 0 }) => {
  const dice1Ref = useRef(null);
  const dice2Ref = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!values) return;

    const [die1, die2] = values;
    const dice1 = dice1Ref.current;
    const dice2 = dice2Ref.current;
    const container = containerRef.current;

    // Add a small delay before starting animation if needed
    const startTimer = setTimeout(() => {
      // Reset and show container
      container.style.display = 'flex';
      container.style.opacity = '1';
      
      // Set the final values
      if (dice1) dice1.className = `dice show-${die1}`;
      if (dice2) dice2.className = `dice show-${die2}`;

      // Hide after 3 seconds
      const hideTimer = setTimeout(() => {
        container.style.opacity = '0';
        setTimeout(() => {
          container.style.display = 'none';
          if (onComplete) onComplete();
        }, 500);
      }, 3000);

      return () => clearTimeout(hideTimer);
    }, delay);

    return () => {
      clearTimeout(startTimer);
    };
  }, [values, onComplete, delay]);

  if (!values) return null;

  return (
    <div className="dice-container" ref={containerRef}>
      <div className="dice-wrapper">
        <Dice value={values[0]} diceRef={dice1Ref} />
        <Dice value={values[1]} diceRef={dice2Ref} />
      </div>
    </div>
  );
};

// Export both the animation and the dice component for reuse
export { Dice, DiceAnimation };

// Default export maintains backward compatibility
const CasinoDice = (props) => <DiceAnimation {...props} />;
export default CasinoDice;
