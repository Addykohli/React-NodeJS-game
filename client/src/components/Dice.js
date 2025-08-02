import React, { useEffect, useRef, useState } from 'react';
import './Dice.css';

const Dice = ({ value, position, animationComplete }) => {
  const cubeRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Angles for each face (1-6)
  const faceAngles = [
    [0, 0, 0],          // 1 (front)
    [90, 0, 0],         // 2 (top)
    [0, 0, -90],        // 3 (right)
    [0, 0, 90],         // 4 (left)
    [-90, 0, 0],        // 5 (bottom)
    [0, 180, 0]         // 6 (back)
  ];

  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube || value < 1 || value > 6) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    
        // Set initial position above the viewport
    cube.style.opacity = '1';
    cube.style.position = 'absolute';
    cube.style.zIndex = '1000';
    cube.style.transform = 'translateZ(-50px)';
    
    // Set initial position
    const container = document.querySelector('.dice-animation-container');
    if (!container) return;
    
    // Reset any previous transforms
    cube.style.transition = 'none';
    cube.style.transform = `translateZ(-50px) rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg) rotateZ(${Math.random() * 360}deg)`;
    
    // Add a slight delay between dice animations
    const delay = position * 100;
    const animationDuration = 1000; // ms
    
    // Initial random rotation for the drop
    const startRotation = {
      x: Math.random() * 360,
      y: Math.random() * 360,
      z: Math.random() * 360
    };
    
    // Set initial rotation
    cube.style.transition = 'none';
    cube.style.transform = `translate(-50%, -50%) rotateX(${startRotation.x}deg) rotateY(${startRotation.y}deg) rotateZ(${startRotation.z}deg)`;
    
    // Trigger the drop animation
    setTimeout(() => {
      // First, set up the drop animation
      cube.style.transition = 'transform 0.8s cubic-bezier(0.2, 0.7, 0.3, 1.2)';
      cube.style.transform = `translateZ(-50px) rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg) rotateZ(${Math.random() * 360}deg)`;
      
      // After the drop, show the correct face
      setTimeout(() => {
        const [x, y, z] = faceAngles[value - 1];
        cube.style.transition = 'transform 1s ease-out';
        cube.style.transform = `translateZ(-50px) rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
      }, 800);
    }, delay);
    
  
    
    // Remove dice after delay
    const timer = setTimeout(() => {
      cube.style.transition = 'opacity 0.5s ease-out';
      cube.style.opacity = '0';
      
      setTimeout(() => {
        setIsAnimating(false);
        if (animationComplete) animationComplete();
      }, 500);
    }, 3000 + delay);
    
    return () => {
      clearTimeout(timer);
      setIsAnimating(false);
    };
  }, [value, position, animationComplete]);

  // Always render the dice container, but control visibility with opacity
  return (
    <div className="dice-container" style={{
      position: 'absolute',
      left: position === 1 ? 'calc(50% - 60px)' : 'calc(50% + 60px)', // Position dice with proper spacing
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80px', // Slightly smaller dice
      height: '80px',
      perspective: '1000px',
      opacity: isAnimating ? 1 : 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
      zIndex: 1001 // Ensure dice are above other elements
    }}>
      <div className="cube" ref={cubeRef} style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: 'translateZ(-40px)', // Adjusted for smaller dice
        animation: isAnimating ? 'spin 1.5s ease-out' : 'none',
        animationFillMode: 'forwards'
      }}>
        {/* Front face (1) */}
        <div className="face front" style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          background: 'white',
          border: '2px solid #333',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'rotateY(0deg) translateZ(50px)'
        }}>
          <div className="dot" style={{
            width: '20px',
            height: '20px',
            background: '#333',
            borderRadius: '50%',
            position: 'absolute'
          }}></div>
        </div>
        
        {/* Back face (6) */}
        <div className="face back" style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          background: 'white',
          border: '2px solid #333',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          padding: '10px',
          transform: 'rotateY(180deg) translateZ(50px)'
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={`back-${i}`} className="dot" style={{
              width: '15px',
              height: '15px',
              background: '#333',
              borderRadius: '50%',
              margin: 'auto'
            }}></div>
          ))}
        </div>
        
        {/* Top face (2) */}
        <div className="face top" style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          background: 'white',
          border: '2px solid #333',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '20px',
          transform: 'rotateX(90deg) translateZ(50px)'
        }}>
          <div className="dot" style={{
            width: '20px',
            height: '20px',
            background: '#333',
            borderRadius: '50%',
            alignSelf: 'flex-start'
          }}></div>
          <div className="dot" style={{
            width: '20px',
            height: '20px',
            background: '#333',
            borderRadius: '50%',
            alignSelf: 'flex-end'
          }}></div>
        </div>
        
        {/* Bottom face (5) */}
        <div className="face bottom" style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          background: 'white',
          border: '2px solid #333',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          padding: '15px',
          transform: 'rotateX(-90deg) translateZ(50px)'
        }}>
          {[...Array(5)].map((_, i) => (
            <div key={`bottom-${i}`} className="dot" style={{
              width: '15px',
              height: '15px',
              background: '#333',
              borderRadius: '50%',
              margin: 'auto',
              ...(i === 4 && { gridColumn: '1 / -1' })
            }}></div>
          ))}
        </div>
        
        {/* Left face (3) */}
        <div className="face left" style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          background: 'white',
          border: '2px solid #333',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '15px',
          transform: 'rotateY(-90deg) translateZ(50px)'
        }}>
          <div className="dot" style={{
            width: '20px',
            height: '20px',
            background: '#333',
            borderRadius: '50%',
            alignSelf: 'flex-start'
          }}></div>
          <div className="dot" style={{
            width: '20px',
            height: '20px',
            background: '#333',
            borderRadius: '50%',
            alignSelf: 'center'
          }}></div>
          <div className="dot" style={{
            width: '20px',
            height: '20px',
            background: '#333',
            borderRadius: '50%',
            alignSelf: 'flex-end'
          }}></div>
        </div>
        
        {/* Right face (4) */}
        <div className="face right" style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          background: 'white',
          border: '2px solid #333',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          padding: '15px',
          transform: 'rotateY(90deg) translateZ(50px)'
        }}>
          {[...Array(4)].map((_, i) => (
            <div key={`right-${i}`} className="dot" style={{
              width: '15px',
              height: '15px',
              background: '#333',
              borderRadius: '50%',
              margin: 'auto'
            }}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dice;
