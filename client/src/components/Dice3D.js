import React, { useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';
import './Dice3D.css';

const angleArray = [
  [0, 0, 0],
  [-310, -362, -38],
  [-400, -320, -2],
  [135, -217, -88],
  [-224, -317, 5],
  [-47, -219, -81],
  [-133, -360, -53]
];

const Dice3D = ({ value, position = 'left', onAnimationEnd }) => {
  const cubeRef = useRef(null);
  const animationEndHandler = useCallback(() => {
    if (onAnimationEnd) onAnimationEnd();
  }, [onAnimationEnd]);

  useEffect(() => {
    if (!cubeRef.current || !value) return;
    
    // Set initial position above the viewport
    const cube = cubeRef.current;
    cube.style.top = '-200px';
    cube.style.opacity = '1';
    
    // Trigger the drop animation
    const dropTimer = setTimeout(() => {
      if (!cube) return;
      cube.style.top = '50%';
      cube.style.transform = `translateY(-50%) rotateX(${angleArray[value][0]}deg) rotateY(${angleArray[value][1]}deg) rotateZ(${angleArray[value][2]}deg)`;
      cube.style.transition = 'top 1s cubic-bezier(0.25, 0.1, 0.25, 1), transform 1s ease-out';
    }, 100);

    // Hide after 3 seconds
    const hideTimer = setTimeout(() => {
      if (!cube) return;
      cube.style.opacity = '0';
      cube.style.transition = 'opacity 0.5s ease-out';
      animationEndHandler();
    }, 3000);

    return () => {
      clearTimeout(dropTimer);
      clearTimeout(hideTimer);
    };
  }, [value, animationEndHandler]);

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
