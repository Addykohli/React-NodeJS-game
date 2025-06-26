import React, { useState, useEffect } from 'react';
import cash500 from '../assets/cash500.png';
import cash1000 from '../assets/cash1000.png';
import cash5000 from '../assets/cash5000.png';
import cash10000 from '../assets/cash10000.png';
import cashBehind from '../assets/cashBehind.png';

// Define cash amounts separately to ensure random order
const cashAmounts = [
  { amount: 500, image: cash500 },
  { amount: 1000, image: cash1000 },
  { amount: 5000, image: cash5000 },
  { amount: 10000, image: cash10000 }
].sort(() => Math.random() - 0.5);

const RoadCash = ({ isMyTurn, socket }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [revealedAmount, setRevealedAmount] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [cardOrder] = useState(cashAmounts);
  const [hasEntered, setHasEntered] = useState(false);
  const [cashDimensions, setCashDimensions] = useState({ width: 0, height: 0 });

  // Get dimensions of cashBehind image
  useEffect(() => {
    const img = new Image();
    img.src = cashBehind;
    img.onload = () => {
      setCashDimensions({
        width: img.width,
        height: img.height
      });
    };
  }, []);

  // Start entrance animation after mount
  useEffect(() => {
    setTimeout(() => {
      setHasEntered(true);
    }, 100);
  }, []);

  const handleCashClick = (index) => {
    if (!isMyTurn || selectedIndex !== null) return;

    setSelectedIndex(index);
    const amount = cardOrder[index].amount;
    setRevealedAmount(amount);
    socket.emit('roadCashSelected', { amount });

    // After 3 seconds, show all cards
    setTimeout(() => {
      setShowAll(true);
      // After another 3 seconds, trigger exit animations
      setTimeout(() => {
        setIsExiting(true);
        // Remove from DOM after exit animation completes (1s)
        setTimeout(() => {
          setIsActive(false);
        }, 1000);
      }, 3000);
    }, 3000);
  };

  if (!isActive) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'row',
      gap: '20px',
      padding: '20px',
      zIndex: 1000
    }}>
      {cardOrder.map((card, index) => {
        const isSelected = index === selectedIndex;
        
        // Determine which image to show
        let currentImage = cashBehind;
        if (isSelected) {
          // Show revealed amount for selected card immediately
          currentImage = card.image;
        } else if (showAll) {
          // Show actual amounts for other cards after delay
          currentImage = card.image;
        }

        return (
          <img
            key={index}
            src={currentImage}
            alt={`Cash ${card.amount}`}
            onClick={() => handleCashClick(index)}
            style={{
              cursor: isMyTurn && selectedIndex === null ? 'pointer' : 'default',
              transform: `translateY(${hasEntered ? '0' : '-100vh'}) 
                         ${isExiting ? `translateY(${isSelected ? '100vh' : '-100vh'})` : ''}`,
              transition: 'transform 1s ease',
              position: 'relative',
              width: cashDimensions.width ? `${cashDimensions.width}px` : 'auto',
              height: cashDimensions.height ? `${cashDimensions.height}px` : 'auto',
              objectFit: 'fill'
            }}
          />
        );
      })}
    </div>
  );
};

export default RoadCash;