import React, { useState, useEffect } from 'react';
import cash500 from '../assets/cash500.png';
import cash1000 from '../assets/cash1000.png';
import cash5000 from '../assets/cash5000.png';
import cash10000 from '../assets/cash10000.png';
import cashBehind from '../assets/cashBehind.png';


const cashAmounts = [
  { amount: 500, image: cash500 },
  { amount: 1000, image: cash1000 },
  { amount: 5000, image: cash5000 },
  { amount: 10000, image: cash10000 }
];

const RPSTieResolver = ({ maxAmount, gameId, tiedPlayerId, tiedPlayerName, socket, onResolved }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [revealedAmount, setRevealedAmount] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [availableAmounts] = useState(() => 
    cashAmounts
      .filter(card => card.amount <= maxAmount)
      .sort(() => Math.random() - 0.5)
  );

  
  useEffect(() => {
    if (maxAmount < 500) {
      socket.emit('stonePaperScissorsTieAmount', { 
        gameId, 
        amount: maxAmount,
        tiedPlayerId 
      });
      if (onResolved) onResolved();
      return;
    }

    setTimeout(() => {
      setHasEntered(true);
    }, 100);

    return () => {

    };
  }, [maxAmount, gameId, tiedPlayerId, tiedPlayerName, socket, onResolved]);

  const handleCashClick = (index) => {
    if (selectedIndex !== null) {
      return;
    }

    setSelectedIndex(index);
    const amount = availableAmounts[index].amount;
    setRevealedAmount(amount);

    setTimeout(() => {
      
      setShowAll(true);
      
      
      setTimeout(() => {      
        
        socket.emit('stonePaperScissorsTieAmount', { 
          gameId, 
          amount,
          tiedPlayerId 
        });
        
        
        setTimeout(() => {
          setIsExiting(true);
          
          
          setTimeout(() => {
            setIsActive(false);
            if (onResolved) onResolved();
          }, 1000);
        }, 500);
      }, 3000);
    }, 3000);
  };

  
  if (maxAmount < 500 || !isActive) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      zIndex: 1000
    }}>
      <div style={{
        color: '#fff',
        fontSize: '1.4em',
        textAlign: 'center',
        marginBottom: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 20px',
        borderRadius: '8px'
      }}>
        Choose amount to take from {tiedPlayerName}:
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '20px',
        padding: '20px'
      }}>
        {availableAmounts.map((card, index) => {
          const isSelected = index === selectedIndex;
          
          
          let currentImage = cashBehind;
          if (isSelected && selectedIndex !== null) {
            
            currentImage = card.image;
          } else if (showAll) {
            
            currentImage = card.image;
          }

          return (
            <img
              key={index}
              src={currentImage}
              alt={`Cash ${card.amount}`}
              onClick={() => handleCashClick(index)}
              style={{
                cursor: !selectedIndex ? 'pointer' : 'default',
                width: '150px',
                height: '220px', 
                objectFit: 'contain',
                transform: `translateY(${hasEntered ? '0' : '-100vh'}) 
                           ${isExiting ? `translateY(${isSelected ? '100vh' : '-100vh'})` : ''}`,
                transition: 'transform 1s ease',
                position: 'relative'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RPSTieResolver;