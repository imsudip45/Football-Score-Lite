'use client';

import React from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

interface LowerThirdProps {
  animate: 'in' | 'out';
  title: string;
  subtitle?: string;
  teamColor?: string;
  teamLogo?: string;
  tournamentColor?: string;
}

export default function LowerThird({ animate, title, subtitle, teamColor = '#14b8a6', teamLogo, tournamentColor }: LowerThirdProps) {
  const isIn = animate === 'in';
  
  // Get customization settings
  const customization = useGraphicsCustomizationStore(state => state.lowerThird);
  
  // Create teamColors object for dynamic color resolution
  const teamColors = {
    home: { primary: teamColor, secondary: teamColor },
    away: { primary: teamColor, secondary: teamColor },
    tournament: tournamentColor,
  };
  
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);

  return (
    <>
      <style>{`
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
      `}</style>
      <div
      className="relative"
      style={{
        transform: isIn ? 'translateX(0)' : 'translateX(-120%)',
        opacity: isIn ? 1 : 0,
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        willChange: 'transform, opacity',
      }}
    >
      <div className="flex items-stretch">
        {/* Accent bar - uses team color as fallback */}
        <div 
          className="w-2 rounded-l-md"
          style={Object.keys(getStyle('accent-bar')).length > 0 ? getStyle('accent-bar') : { backgroundColor: teamColor }}
        />
        
        {/* Main content */}
        <div 
          className="flex items-center gap-4 px-6 py-4 min-w-[400px]"
          style={Object.keys(getStyle('background')).length > 0 ? { ...getStyle('background'), backdropFilter: 'blur(10px)' } : { 
            background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,20,0.9) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Team logo */}
          {teamLogo && (
            <div className="flex-shrink-0">
              <img 
                src={teamLogo} 
                alt="" 
                className="h-14 w-14 object-contain rounded-lg bg-white/10 p-1"
              />
            </div>
          )}
          
          {/* Text content */}
          <div className="flex flex-col justify-center">
            <h3 
              className="text-2xl font-bold uppercase tracking-wide"
              style={{ 
                fontFamily: 'var(--font-oswald), "Arial Narrow", sans-serif',
                color: getColor('title-text') || '#ffffff'
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p 
                className="text-base mt-0.5"
                style={{ 
                  fontFamily: 'var(--font-oswald), "Arial Narrow", sans-serif',
                  color: getColor('subtitle-text') || 'rgba(255,255,255,0.7)'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {/* Right accent */}
        <div 
          className="w-1 rounded-r-md"
          style={Object.keys(getStyle('accent-bar')).length > 0 ? { ...getStyle('accent-bar'), opacity: 0.5 } : { backgroundColor: teamColor, opacity: 0.5 }}
        />
      </div>
    </div>
    </>
  );
}
