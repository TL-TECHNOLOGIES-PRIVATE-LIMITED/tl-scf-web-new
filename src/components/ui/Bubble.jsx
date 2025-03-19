import { useEffect, useState } from "react";

const BubbleAnimation = () => {
  const bubbles = Array.from({ length: 15 });

  return (
    <div className="absolute  w-full h-full bg-gradient-to-b  overflow-hidden">
     
      {bubbles.map((_, index) => (
        <div
          key={index}
          className={`absolute w-14 h-14 border-2 border-white backdrop-blur-sm rounded-full bg-stone-400 bg-opacity-10 animate-bubble`}
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 7 + 3}s`,
          }}
        >
          <span className="absolute w-2.5 h-2.5 bg-white rounded-full top-1/5 right-1/5"></span>
        </div>
      ))}
      <style>
        {`
          @keyframes bubble {
            0% {
              transform: scale(0) translateY(0) rotate(70deg);
            }
            100% {
              transform: scale(1.3) translateY(-100px) rotate(360deg);
            }
          }
          .animate-bubble {
            animation: bubble linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default BubbleAnimation;
