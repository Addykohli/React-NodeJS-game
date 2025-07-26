import React, { useEffect, useRef, useState } from 'react';
import './Dice.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';

const Dice = ({ value, position, animationComplete }) => {
  const cubeRef = useRef(null);
  const angleArray = [
    [0, 0, 0],
    [-310, -362, -38],
    [-400, -320, -2],
    [135, -217, -88],
    [-224, -317, 5],
    [-47, -219, -81],
    [-133, -360, -53]
  ];

  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;

    // Set initial position above the viewport
    cube.style.top = `-200px`;
    cube.style.left = `${position * 120 - 60}px`; // Center the dice based on position
    cube.style.opacity = '1';
    cube.style.position = 'fixed';
    cube.style.zIndex = '1000';
    
    // Add a slight delay between dice animations
    const delay = position * 100;

    // Trigger the drop animation
    setTimeout(() => {
      cube.style.transition = 'top 1s cubic-bezier(0.2, 0.7, 0.3, 1.2)';
      cube.style.top = '50%';
      
      // Add a bouncing effect
      setTimeout(() => {
        cube.style.transition = 'top 0.2s ease-out';
        cube.style.top = '48%';
        
        setTimeout(() => {
          cube.style.transition = 'top 0.3s ease-out';
          cube.style.top = '50%';
        }, 200);
      }, 1000);
    }, delay);

    // Set the dice face based on the value with a spinning effect
    setTimeout(() => {
      // First, spin the dice randomly
      cube.style.transition = 'transform 0.5s ease-out';
      cube.style.transform = `rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg) rotateZ(${Math.random() * 360}deg)`;
      
      // Then set to the final value
      setTimeout(() => {
        cube.style.transition = 'transform 1s ease-out';
        cube.style.transform = `rotateX(${angleArray[value][0]}deg) rotateY(${angleArray[value][1]}deg) rotateZ(${angleArray[value][2]}deg)`;
      }, 500);
    }, delay + 100);

    // Remove dice after delay
    const timer = setTimeout(() => {
      cube.style.opacity = '0';
      cube.style.transition = 'opacity 0.5s ease-out';
      setTimeout(() => {
        if (animationComplete) animationComplete();
      }, 500);
    }, 3000 + delay);

    return () => clearTimeout(timer);
  }, [value, position, angleArray, animationComplete]);

  return (
    <div className="dice-container">
      <div className="cube" ref={cubeRef}>
        {/* Front face (1) */}
        <div className="front">
          <FontAwesomeIcon icon={faCircle} className="dot" />
        </div>
        
        {/* Back face (6) */}
        <div className="back">
          <div className="dot-row">
            <FontAwesomeIcon icon={faCircle} className="dot" />
            <FontAwesomeIcon icon={faCircle} className="dot" />
          </div>
          <div className="dot-row">
            <FontAwesomeIcon icon={faCircle} className="dot" />
            <FontAwesomeIcon icon={faCircle} className="dot" />
          </div>
          <div className="dot-row">
            <FontAwesomeIcon icon={faCircle} className="dot" />
            <FontAwesomeIcon icon={faCircle} className="dot" />
          </div>
        </div>
        
        {/* Top face (2) */}
        <div className="top">
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '25%', left: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ bottom: '25%', right: '25%' }} />
        </div>
        
        {/* Left face (3) */}
        <div className="left">
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '25%', left: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ bottom: '25%', right: '25%' }} />
        </div>
        
        {/* Right face (4) */}
        <div className="right">
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '25%', left: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '25%', right: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ bottom: '25%', left: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ bottom: '25%', right: '25%' }} />
        </div>
        
        {/* Bottom face (5) */}
        <div className="bottom">
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '25%', left: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '25%', right: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ bottom: '25%', left: '25%' }} />
          <FontAwesomeIcon icon={faCircle} className="dot" style={{ bottom: '25%', right: '25%' }} />
        </div>
      </div>
    </div>
  );
};

export default Dice;
