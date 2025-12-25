'use client';

import React from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

interface BreakingBannerProps {
  animate: 'in' | 'out';
  text: string;
  label?: string;
}

export default function BreakingBanner({ animate, text, label = 'BREAKING' }: BreakingBannerProps) {
  const isIn = animate === 'in';
  
  // Get customization settings
  const customization = useGraphicsCustomizationStore(state => state.breakingBanner);
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id);
  const getColor = (id: string) => getTextColor(customization, id);

  return (
    <div
      className="w-full"
      style={{
        transform: isIn ? 'translateY(0)' : 'translateY(100%)',
        opacity: isIn ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        willChange: 'transform, opacity',
      }}
    >
      <div 
        className="flex items-stretch w-full"
        style={Object.keys(getStyle('background')).length > 0 ? { ...getStyle('background'), boxShadow: '0 -4px 20px rgba(220,38,38,0.3)' } : { 
          background: 'rgba(0,0,0,0.95)',
          boxShadow: '0 -4px 20px rgba(220,38,38,0.3)',
        }}
      >
        {/* Breaking label */}
        <div 
          className="flex items-center justify-center px-6 py-4"
          style={{ minWidth: '140px', ...(Object.keys(getStyle('label-box')).length > 0 ? getStyle('label-box') : { backgroundColor: '#dc2626' }) }}
        >
          <span 
            className="font-bold text-lg tracking-widest uppercase"
            style={{ 
              fontFamily: '"Oswald", "Arial Narrow", sans-serif',
              animation: isIn ? 'pulse 2s infinite' : 'none',
              color: getColor('label-box') || '#ffffff'
            }}
          >
            {label}
          </span>
        </div>
        
        {/* Text content */}
        <div className="flex-1 flex items-center px-6 py-4 overflow-hidden">
          <p 
            className="text-xl font-semibold whitespace-nowrap"
            style={{ 
              fontFamily: '"Oswald", "Arial Narrow", sans-serif',
              animation: isIn ? 'scroll-text 15s linear infinite' : 'none',
              color: getColor('text') || '#ffffff'
            }}
          >
            {text}
          </p>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes scroll-text {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <style>{`
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
      `}</style>
    </div>
  );
}
