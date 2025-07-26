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
    if (!cube || value < 1 || value > 6) return;

    setIsAnimating(true);
    
    // Set initial position above the viewport
    cube.style.top = `-200px`;
    cube.style.left = `${position * 120 - 60}px`; // Center the dice based on position
    cube.style.opacity = '1';
    cube.style.position = 'fixed';
    cube.style.zIndex = '1000';
    
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
      cube.style.transition = `top 0.8s cubic-bezier(0.2, 0.7, 0.3, 1.2), transform 0.8s ease-out`;
      cube.style.top = '50%';
      
      // Add a bouncing effect
      setTimeout(() => {
        cube.style.transition = 'top 0.2s ease-out, transform 0.2s ease-out';
        cube.style.top = '48%';
        
        setTimeout(() => {
          cube.style.transition = 'top 0.3s ease-out, transform 0.3s ease-out';
          cube.style.top = '50%';
        }, 200);
      }, 800);
    }, delay);
    
    // Set the dice to show the correct face after the drop
    setTimeout(() => {
      const [x, y, z] = faceAngles[value - 1];
      cube.style.transition = 'transform 1s ease-out';
      cube.style.transform = `translate(-50%, -50%) rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
    }, delay + 1000);
    
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

  if (!isAnimating) return null;
  
  return (
    <div className="dice-container">
      <div className="cube" ref={cubeRef}>
        {/* Front face (1) */}
        <div className="face front">
          <div className="dot"></div>
        </div>
        
        {/* Back face (6) */}
        <div className="face back">
          {[...Array(6)].map((_, i) => (
            <div key={`back-${i}`} className="dot"></div>
          ))}
        </div>
        
        {/* Top face (2) */}
        <div className="face top">
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        
        {/* Left face (3) */}
        <div className="face left">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        
        {/* Right face (4) */}
        <div className="face right">
          {[...Array(4)].map((_, i) => (
            <div key={`right-${i}`} className="dot"></div>
          ))}
        </div>
        
        {/* Bottom face (5) */}
        <div className="face bottom">
          {[...Array(5)].map((_, i) => (
            <div key={`bottom-${i}`} className="dot"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dice;
