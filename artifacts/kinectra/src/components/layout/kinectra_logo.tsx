import React from "react";

interface KinectraLogoProps {
  className?: string;
}

export function KinectraLogoSVG({ className = "w-8 h-8" }: KinectraLogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dark Hexagon Background */}
      <polygon 
        points="50,10 85,30 85,70 50,90 15,70 15,30" 
        fill="#090d16" 
        stroke="#1e293b" 
        strokeWidth="2.5" 
      />
      
      {/* Cyan Corner Target Crosshairs */}
      {/* Top Left */}
      <path d="M35 38 H38 V41" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Top Right */}
      <path d="M65 38 H62 V41" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom Left */}
      <path d="M35 62 H38 V59" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom Right */}
      <path d="M65 62 H62 V59" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Red Center Ball (Cricket Ball) */}
      <circle cx="50" cy="50" r="13" fill="#ef4444" />
      
      {/* Vertical Seam of the cricket ball */}
      <line x1="48.5" y1="37" x2="48.5" y2="63" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 1.5" strokeOpacity="0.8" />
      <line x1="51.5" y1="37" x2="51.5" y2="63" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 1.5" strokeOpacity="0.8" />

      {/* Cyan sensor tracking lines extending left/right */}
      <line x1="15" y1="50" x2="35" y2="50" stroke="#06b6d4" strokeWidth="2" strokeDasharray="1.5 2" />
      <line x1="65" y1="50" x2="85" y2="50" stroke="#06b6d4" strokeWidth="2" strokeDasharray="1.5 2" />

      {/* Left indicator bar (gold/brown) */}
      <rect x="5" y="38" width="5" height="24" rx="2" fill="#d97706" />
      {/* Right indicator bar (red/light grey) */}
      <rect x="90" y="38" width="5" height="24" rx="2" fill="#ef4444" />
    </svg>
  );
}
