import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';
import './Dice3D.css';

const Dice3D = ({ value, position = 'left', onAnimationEnd }) => {
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
    if (cubeRef.current && value) {
      // Set initial position above the viewport
      cubeRef.current.style.top = '-200px';
      cubeRef.current.style.opacity = '1';
      
      // Trigger the drop animation
      setTimeout(() => {
        if (cubeRef.current) {
          cubeRef.current.style.top = '50%';
          cubeRef.current.style.transform = `translateY(-50%) rotateX(${angleArray[value][0]}deg) rotateY(${angleArray[value][1]}deg) rotateZ(${angleArray[value][2]}deg)`;
          cubeRef.current.style.transition = 'top 1s cubic-bezier(0.25, 0.1, 0.25, 1), transform 1s ease-out';
        }
      }, 100);

      // Hide after 3 seconds
      const timer = setTimeout(() => {
        if (cubeRef.current) {
          cubeRef.current.style.opacity = '0';
          cubeRef.current.style.transition = 'opacity 0.5s ease-out';
          if (onAnimationEnd) onAnimationEnd();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div 
      className={`dice-container ${position}`}
      style={{
        position: 'fixed',
        left: position === 'left' ? '35%' : '65%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100px',
        height: '100px',
        perspective: '1000px',
        zIndex: 1000,
        opacity: 0,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <div 
        ref={cubeRef}
        className="cube"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(135deg) rotateY(-217deg) rotateZ(-88deg)',
          transition: 'transform 1s ease-out',
        }}
      >
        <div className="front face">
          <FontAwesomeIcon icon={faCircle} />
        </div>
        <div className="back face">
          <pre className="firstPre">
            <FontAwesomeIcon icon={faCircle} />    <FontAwesomeIcon icon={faCircle} />    <FontAwesomeIcon icon={faCircle} />
          </pre>
          <pre className="secondPre">
            <FontAwesomeIcon icon={faCircle} />    <FontAwesomeIcon icon={faCircle} />    <FontAwesomeIcon icon={faCircle} />
          </pre>
        </div>
        <div className="right face">
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
        </div>
        <div className="left face">
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
        </div>
        <div className="top face">
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
        </div>
        <div className="bottom face">
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
          <FontAwesomeIcon icon={faCircle} />
        </div>
      </div>
    </div>
  );
};

export default Dice3D;
