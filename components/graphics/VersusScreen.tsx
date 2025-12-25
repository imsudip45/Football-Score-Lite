'use client';

import React, { useRef, useEffect, useState } from 'react';

import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getFontSize, getTextStyle, getTextStyleCSS, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

// Shield fallback component when no logo is available
const ShieldFallback = ({ primaryColor, secondaryColor, size = 420 }: { primaryColor: string; secondaryColor?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
    <defs>
      <linearGradient id={`shield-grad-${primaryColor.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={secondaryColor || primaryColor} />
        <stop offset="100%" stopColor={primaryColor} />
      </linearGradient>
    </defs>
    {/* Shield shape */}
    <path 
      d="M50 5 L90 15 L90 45 C90 70 70 90 50 95 C30 90 10 70 10 45 L10 15 Z" 
      fill={`url(#shield-grad-${primaryColor.replace('#', '')})`}
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="2"
    />
    {/* Inner highlight */}
    <path 
      d="M50 12 L82 20 L82 45 C82 65 65 82 50 87 C35 82 18 65 18 45 L18 20 Z" 
      fill="none"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
    />
  </svg>
);

// Auto-scaling text component that fits within a boundary box
const AutoScaleText = ({ text, maxWidth, maxFontSize = 120, className = '', color, textStyle = {} }: { text: string; maxWidth: number; maxFontSize?: number; className?: string; color?: string; textStyle?: React.CSSProperties }) => {
  const textRef = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    if (textRef.current) {
      let currentSize = maxFontSize;
      textRef.current.style.fontSize = `${currentSize}px`;
      
      while (textRef.current.scrollWidth > maxWidth && currentSize > 40) {
        currentSize -= 4;
        textRef.current.style.fontSize = `${currentSize}px`;
      }
      setFontSize(currentSize);
    }
  }, [text, maxWidth, maxFontSize]);

  return (
    <h1 
      ref={textRef}
      className={`leading-[0.85] font-condensed drop-shadow-lg whitespace-nowrap ${className}`}
      style={{ 
        fontSize: `${fontSize}px`, 
        color: color || '#ffffff',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        ...textStyle
      }}
    >
      {text}
    </h1>
  );
};

interface VersusScreenProps {
  animate?: 'in' | 'out';
  variant?: 'vs' | 'halftime' | 'fulltime';
  homeTeam?: { name?: string; color?: string; secondaryColor?: string; logo?: string; score?: number };
  awayTeam?: { name?: string; color?: string; secondaryColor?: string; logo?: string; score?: number };
  matchInfo?: string;
  competition?: string;
  competitionLogo?: string;
  tournamentColor?: string;
}

const StarShape = () => (
  <svg 
    version="1.0" 
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 940 788"
    className="w-[900px] h-[600px]"
  >
    <g transform="translate(0,788) scale(0.1,-0.1)">
      <path 
        d="M4625 5305 c-30 -11 -99 -75 -280 -258 -282 -287 -301 -301 -651 -475 -132 -66 -255 -133 -273 -147 -47 -40 -71 -95 -72 -164 -1 -57 4 -70 139 -333 189 -372 199 -404 261 -836 29 -199 44 -279 60 -310 25 -49 92 -97 150 -107 24 -4 137 11 332 44 393 68 425 68 819 0 316 -54 336 -55 407 -13 79 46 88 74 139 419 58 398 71 440 255 800 134 263 139 275 139 334 0 72 -23 125 -71 165 -17 15 -151 87 -298 161 -185 93 -292 154 -352 199 -49 37 -175 158 -294 281 -115 119 -222 223 -238 232 -43 22 -125 26 -172 8z"
        fill="white"
      />
    </g>
  </svg>
);

// Football icon SVG component matching the original
const FootballIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 opacity-80 shrink-0">
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M2.78199 11.2247L3.17811 10.9628C3.77244 10.57 4.16501 10.3091 4.44321 10.0759C4.70659 9.855 4.80654 9.70729 4.85896 9.56902C4.9114 9.43069 4.93452 9.25362 4.88378 8.91324C4.83021 8.55381 4.70933 8.09777 4.52501 7.40909L4.35773 6.78408C3.48023 8.06855 2.9178 9.58592 2.78199 11.2247ZM5.53164 5.38427C5.54096 5.40862 5.54911 5.43368 5.556 5.45942L5.98476 7.06144C6.15548 7.69921 6.29973 8.23811 6.3674 8.69211C6.40211 8.92503 6.41975 9.15288 6.40887 9.37862L8.90873 10.4321C8.96485 10.3754 9.02531 10.322 9.08995 10.2726L10.9265 8.86802C11.025 8.79263 11.1297 8.72909 11.2385 8.6774V5.96784C11.0301 5.89602 10.8296 5.79841 10.6306 5.68392C10.233 5.45513 9.78446 5.12398 9.25371 4.73217L7.87565 3.71494C7.00795 4.14758 6.21779 4.71286 5.53164 5.38427ZM9.53929 3.07858L10.111 3.50061C10.6843 3.92375 11.0642 4.20276 11.3788 4.38379C11.6767 4.5552 11.8494 4.59806 11.9966 4.59965C12.1438 4.60125 12.3174 4.56214 12.6189 4.39721C12.9373 4.22303 13.3231 3.9523 13.9054 3.54166L14.5266 3.1035C13.7201 2.87326 12.8687 2.75 11.9885 2.75C11.1406 2.75 10.3193 2.86438 9.53929 3.07858ZM16.1849 3.75719C16.156 3.78563 16.1245 3.81211 16.0903 3.83623L14.7359 4.79146C14.1968 5.1717 13.7412 5.49307 13.3387 5.7132C13.1416 5.82099 12.9435 5.9126 12.7385 5.97954V8.6774C12.8472 8.72909 12.9519 8.79263 13.0504 8.86802L14.887 10.2726C14.9527 10.3229 15.0142 10.3773 15.0711 10.4351L17.6319 9.37469C17.6214 9.15027 17.6391 8.92375 17.6736 8.6922C17.7412 8.23821 17.8855 7.6993 18.0562 7.06152L18.485 5.45951C18.4875 5.45005 18.4902 5.44067 18.4931 5.4314C17.8179 4.76108 17.0399 4.19442 16.1849 3.75719ZM19.6651 6.85194L19.516 7.40918C19.3316 8.09787 19.2108 8.5539 19.1572 8.91333C19.1065 9.25372 19.1296 9.43078 19.182 9.56911C19.2344 9.70739 19.3344 9.85509 19.5978 10.0759C19.876 10.3092 20.2685 10.5701 20.8629 10.9629L21.1911 11.1799C21.0514 9.58702 20.5084 8.11008 19.6651 6.85194ZM22.7195 12.402C22.7244 12.2686 22.7269 12.1346 22.7269 12C22.7269 6.06376 17.92 1.25 11.9885 1.25C6.05695 1.25 1.25 6.06376 1.25 12C1.25 17.9362 6.05695 22.75 11.9885 22.75C17.6136 22.75 22.2273 18.4207 22.6889 12.9104C22.7598 12.7465 22.7678 12.5665 22.7195 12.402ZM21.1769 12.9686L20.001 12.1913C19.4507 11.8276 18.9855 11.5201 18.634 11.2253C18.4652 11.0839 18.3106 10.9358 18.1756 10.7731L15.5633 11.8548C15.5513 11.9636 15.529 12.0722 15.4959 12.1794L14.7746 14.5164C14.7495 14.5978 14.7188 14.6764 14.683 14.7517L16.1511 16.4498C16.3756 16.3748 16.6105 16.3301 16.8555 16.302C17.3112 16.25 17.8686 16.25 18.528 16.25H20.1847C20.1886 16.25 20.1924 16.25 20.1962 16.2501C20.7142 15.2492 21.055 14.1415 21.1769 12.9686ZM19.2256 17.75H18.5696C17.8574 17.75 17.3863 17.7511 17.0258 17.7923C16.6846 17.8313 16.5201 17.8994 16.4006 17.9857C16.2809 18.072 16.1643 18.2069 16.0193 18.5189C15.8662 18.8484 15.7161 19.2956 15.4909 19.972L15.2647 20.6515C16.834 20.0554 18.1991 19.0434 19.2256 17.75ZM13.5269 21.1223L14.0808 19.4587C14.2894 18.8323 14.4656 18.303 14.659 17.8868C14.746 17.6995 14.8419 17.5226 14.9542 17.3589L13.5198 15.6998C13.3857 15.7327 13.2462 15.75 13.1036 15.75H10.8733C10.741 15.75 10.6114 15.7351 10.4863 15.7067L9.20983 17.3323C9.33009 17.5034 9.43168 17.6893 9.52346 17.8868C9.71686 18.303 9.89306 18.8323 10.1016 19.4587L10.6667 21.156C11.0984 21.218 11.5397 21.25 11.9885 21.25C12.5126 21.25 13.0266 21.2063 13.5269 21.1223ZM8.94614 20.7367L8.69154 19.972C8.46634 19.2956 8.31624 18.8484 8.16314 18.5189C8.01815 18.2069 7.90148 18.072 7.78185 17.9857C7.66228 17.8994 7.49784 17.8313 7.15658 17.7923C6.79611 17.7511 6.325 17.75 5.61279 17.75H4.75133C5.8285 19.1073 7.2785 20.1546 8.94614 20.7367ZM3.79507 16.2777C3.85952 16.2597 3.92748 16.25 3.99769 16.25H5.65443C6.31385 16.25 6.87124 16.25 7.32692 16.302C7.56165 16.3289 7.78702 16.371 8.00291 16.4405L9.30734 14.7793C9.26578 14.6956 9.23053 14.6078 9.20232 14.5164L8.48098 12.1794C8.44751 12.071 8.42506 11.9611 8.41316 11.851L5.86271 10.7762C5.72828 10.9376 5.57461 11.0847 5.407 11.2252C5.05544 11.52 4.59031 11.8275 4.03997 12.1912L2.80423 13.0081C2.93076 14.1772 3.27484 15.2808 3.79507 16.2777ZM11.9885 10.0084C11.935 10.0084 11.8824 10.0253 11.8377 10.0595L10.0012 11.4641C9.95905 11.4963 9.9294 11.5399 9.91426 11.589C9.89961 11.6364 9.89899 11.6876 9.91426 11.737L10.6356 14.074C10.651 14.1241 10.6807 14.166 10.7197 14.1967C10.7629 14.2308 10.8162 14.25 10.8733 14.25H13.1036C13.1607 14.25 13.214 14.2308 13.2572 14.1967C13.2962 14.166 13.3259 14.1241 13.3413 14.074L14.0626 11.737C14.0779 11.6876 14.0773 11.6364 14.0627 11.589C14.0475 11.5399 14.0179 11.4963 13.9757 11.4641L12.1392 10.0595C12.0945 10.0253 12.0419 10.0084 11.9885 10.0084Z" 
      fill={color}
    />
  </svg>
);

const SidebarStrip = ({ text, color, reverse, animationSpeed = 50, fontSize = 40, textStyle = {} }: { text: string; color: string; reverse?: boolean; animationSpeed?: number; fontSize?: number; textStyle?: React.CSSProperties }) => {
  const rotation = reverse ? 'rotate(90deg)' : 'rotate(-90deg)';
  
  const ContentBlock = () => (
    <div className="flex items-center shrink-0">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center px-12">
            <span className="mr-8">{text}</span>
            <FootballIcon color={color} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
      <div style={{ transform: rotation, width: '300vh', display: 'flex', justifyContent: 'flex-start' }}>
        <div 
          className="flex items-center whitespace-nowrap font-condensed will-change-transform" 
          style={{ 
            color,
            fontSize: `${fontSize}px`,
            animation: `ticker ${animationSpeed}s linear infinite`,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            ...textStyle
          }}
        >
          <ContentBlock />
          <ContentBlock />
        </div>
      </div>
    </div>
  );
};

const VersusScreen: React.FC<VersusScreenProps> = ({ 
  animate = 'in',
  variant = 'vs',
  homeTeam = {},
  awayTeam = {},
  matchInfo = '',
  competition = '',
  competitionLogo = '',
  tournamentColor = ''
}) => {
  // Get customization settings from store
  const customization = useGraphicsCustomizationStore(state => state.vsGraphic);
  
  // Create teamColors object for dynamic color resolution
  const teamColors = {
    home: { primary: homeTeam.color, secondary: homeTeam.secondaryColor || homeTeam.color },
    away: { primary: awayTeam.color, secondary: awayTeam.secondaryColor || awayTeam.color },
    tournament: tournamentColor || undefined,
  };
  
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);
  const getFontSizeValue = (id: string) => getFontSize(customization, id);
  const getTextStyleValue = (id: string) => getTextStyleCSS(getTextStyle(customization, id));
  const getAnimationSpeed = (id: string) => {
    const comp = customization?.components?.find((c: { id: string }) => c.id === id);
    return comp?.animationSpeed;
  };

  const home = {
    name: homeTeam.name || 'HOME TEAM',
    color: homeTeam.color || '#A50044',
    secondaryColor: homeTeam.secondaryColor || homeTeam.color || '#A50044',
    logo: homeTeam.logo || '',
    score: homeTeam.score ?? 0
  };
  const away = {
    name: awayTeam.name || 'AWAY TEAM',
    color: awayTeam.color || '#00529F',
    secondaryColor: awayTeam.secondaryColor || awayTeam.color || '#00529F',
    logo: awayTeam.logo || '',
    score: awayTeam.score ?? 0
  };

  // Get center badge text based on variant
  const getCenterText = () => {
    switch (variant) {
      case 'halftime': return 'HALF TIME';
      case 'fulltime': return 'FULL TIME';
      default: return 'VS';
    }
  };

  const showScores = variant === 'halftime' || variant === 'fulltime';

  return (
    <div className={`w-[1920px] h-[1080px] flex relative font-condensed overflow-hidden ${animate === 'out' ? 'anim-vs-container-out' : ''}`}>
      <style>{`
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-ticker { animation: ticker 50s linear infinite; }
        
        /* Container fade out - ensures no black screen remains */
        @keyframes vsContainerOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .anim-vs-container-out { animation: vsContainerOut 0.8s ease-in forwards 0.6s; }
        
        /* Dynamic pattern animation keyframes using CSS variables */
        ${getPatternAnimationCSS()}
        
        @keyframes vsSlideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes vsSlideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes vsContentIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes vsBadgeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        
        @keyframes vsSlideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes vsSlideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
        @keyframes vsContentOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }
        @keyframes vsBadgeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }

        .anim-vs-left-in { animation: vsSlideInLeft 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-vs-left-out { animation: vsSlideOutLeft 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-vs-right-in { animation: vsSlideInRight 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-vs-right-out { animation: vsSlideOutRight 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-vs-content-in { opacity: 0; animation: vsContentIn 0.8s ease-out forwards 0.4s; }
        .anim-vs-content-out { animation: vsContentOut 0.4s ease-in forwards 0.15s; }
        .anim-vs-badge-in { opacity: 0; animation: vsBadgeIn 0.3s ease-out forwards 0.4s; }
        .anim-vs-badge-out { animation: vsBadgeOut 0.15s ease-in forwards; }
      `}</style>

      {/* LEFT SIDE (HOME TEAM) */}
      <div 
        className={`w-1/2 h-full relative flex overflow-hidden ${animate === 'in' ? 'anim-vs-left-in' : 'anim-vs-left-out'}`} 
        style={{ background: home.color }}
      >
        {/* Background pattern layer - separate from slide animation */}
        {Object.keys(getStyle('home-background')).length > 0 && (
          <div 
            className="absolute inset-0 z-0"
            style={getStyle('home-background')}
          />
        )}
        
        {/* Sidebar - Black with White Text/Icons */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-[90px] z-30 border-r border-white/10 shadow-[5px_0_15px_rgba(0,0,0,0.3)]"
          style={Object.keys(getStyle('home-sidebar')).length > 0 ? getStyle('home-sidebar') : { backgroundColor: '#000000' }}
        >
          <SidebarStrip text={home.name} color={getColor('home-sidebar') || '#ffffff'} fontSize={getFontSizeValue('home-sidebar') || 40} animationSpeed={getAnimationSpeed('home-sidebar') || 50} textStyle={getTextStyleValue('home-sidebar')} />
        </div>



        {/* Content Area */}
        <div className={`flex-1 ml-[90px] relative z-20 flex flex-col items-center justify-center pb-16 ${animate === 'in' ? 'anim-vs-content-in' : 'anim-vs-content-out'}`}>
          <div className="w-[400px] h-[400px] mt-28 flex items-center justify-center transform hover:scale-105 transition-transform duration-700">
            {home.logo ? (
              <img src={home.logo} className="max-w-full max-h-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" alt="Home" />
            ) : (
              <ShieldFallback 
                primaryColor={home.color} 
                secondaryColor={home.secondaryColor} 
                size={400} 
              />
            )}
          </div>
          {/* Score below logo */}
          {showScores && (
            <div className="mt-12">
              <div className="font-condensed leading-none" style={{ 
                textShadow: '0 4px 20px rgba(0,0,0,0.5)', 
                color: getColor('score-text') || '#ffffff',
                fontSize: `${getFontSizeValue('score-text') || 180}px`,
                fontWeight: 900,
                ...getTextStyleValue('score-text')
              }}>
                {home.score}
              </div>
            </div>
          )}
          <div className="absolute bottom-[80px] w-full flex justify-center px-4">
            <div style={{ maxWidth: '750px' }}>
              <AutoScaleText text={home.name.toUpperCase()} maxWidth={750} maxFontSize={getFontSizeValue('team-name') || 120} color={getColor('team-name') || '#ffffff'} textStyle={getTextStyleValue('team-name')} />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (AWAY TEAM) */}
      <div 
        className={`w-1/2 h-full relative flex overflow-hidden ${animate === 'in' ? 'anim-vs-right-in' : 'anim-vs-right-out'}`} 
        style={{ background: away.color }}
      >
        {/* Background pattern layer - separate from slide animation */}
        {Object.keys(getStyle('away-background')).length > 0 && (
          <div 
            className="absolute inset-0 z-0"
            style={getStyle('away-background')}
          />
        )}
        
        {/* Sidebar - Black with White Text/Icons */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-[90px] z-30 border-l border-white/10 shadow-[-5px_0_15px_rgba(0,0,0,0.3)]"
          style={Object.keys(getStyle('away-sidebar')).length > 0 ? getStyle('away-sidebar') : { backgroundColor: '#000000' }}
        >
          <SidebarStrip text={away.name} color={getColor('away-sidebar') || '#ffffff'} fontSize={getFontSizeValue('away-sidebar') || 40} animationSpeed={getAnimationSpeed('away-sidebar') || 50} textStyle={getTextStyleValue('away-sidebar')} reverse />
        </div>



        {/* Content Area */}
        <div className={`flex-1 mr-[90px] relative z-20 flex flex-col items-center justify-center pb-16 ${animate === 'in' ? 'anim-vs-content-in' : 'anim-vs-content-out'}`}>
          <div className="w-[400px] h-[400px] mt-28 flex items-center justify-center transform hover:scale-105 transition-transform duration-700">
            {away.logo ? (
              <img src={away.logo} className="max-w-full max-h-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" alt="Away" />
            ) : (
              <ShieldFallback 
                primaryColor={away.color} 
                secondaryColor={away.secondaryColor} 
                size={400} 
              />
            )}
          </div>
          {/* Score below logo */}
          {showScores && (
            <div className="mt-12">
              <div className="font-condensed leading-none" style={{ 
                textShadow: '0 4px 20px rgba(0,0,0,0.5)', 
                color: getColor('score-text') || '#ffffff',
                fontSize: `${getFontSizeValue('score-text') || 180}px`,
                fontWeight: 900,
                ...getTextStyleValue('score-text')
              }}>
                {away.score}
              </div>
            </div>
          )}
          <div className="absolute bottom-[80px] w-full flex justify-center px-4">
            <div style={{ maxWidth: '750px' }}>
              <AutoScaleText text={away.name.toUpperCase()} maxWidth={750} maxFontSize={getFontSizeValue('team-name') || 120} color={getColor('team-name') || '#ffffff'} textStyle={getTextStyleValue('team-name')} />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER BADGE - all elements centered horizontally */}
      {/* Tournament Logo - fixed position above tournament name */}
      {competitionLogo && (
        <div 
          className={`absolute z-50 ${animate === 'in' ? 'anim-vs-badge-in' : 'anim-vs-badge-out'}`}
          style={{ 
            left: '930px', 
            top: '30px',
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }}
        >
          <img 
            src={competitionLogo} 
            alt="Tournament" 
            className="h-16 w-auto object-contain drop-shadow-lg"
          />
        </div>
      )}
      
      {/* Tournament Name - fixed position */}
      {competition && (
        <div 
          className={`absolute z-50 ${animate === 'in' ? 'anim-vs-badge-in' : 'anim-vs-badge-out'}`}
          style={{ 
            left: '580px', 
            top: competitionLogo ? '110px' : '80px',
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }}
        >
          <div className="font-condensed whitespace-nowrap" style={{ 
            color: getColor('competition-text') || '#ffffff',
            fontSize: `${getFontSizeValue('competition-text') || 60}px`,
            fontWeight: 300,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            ...getTextStyleValue('competition-text')
          }}>
            {competition}
          </div>
        </div>
      )}
      
      {/* Star Badge with VS/HALFTIME/FULLTIME - centered horizontally and vertically */}
      <div 
        className={`absolute z-50 ${animate === 'in' ? 'anim-vs-badge-in' : 'anim-vs-badge-out'}`}
        style={{ 
          left: '510px', 
          top: '160px',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }}
      >
        <div className="relative flex items-center justify-center">
          <StarShape />
          <div 
            className={`absolute font-condensed font-black leading-none tracking-tighter ${showScores ? 'text-[36px]' : 'text-[60px]'}`} 
            style={{ color: '#6b6a6aff' }}
          >
            {getCenterText()}
          </div>
        </div>
      </div>
      
      {/* Round/Match Info - fixed position below badge, centered horizontally */}
      <div 
        className={`absolute z-50 ${animate === 'in' ? 'anim-vs-badge-in' : 'anim-vs-badge-out'}`}
        style={{ 
          left: '900px', 
          top: '570px',
          transform: 'translateX(-50%)',
          pointerEvents: 'none'
        }}
      >
        <div className="font-condensed whitespace-nowrap" style={{ 
          color: getColor('round-text') || '#ffffff',
          fontSize: `${getFontSizeValue('round-text') || 32}px`,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          ...getTextStyleValue('round-text')
        }}>
          {matchInfo || 'MATCH DAY'}
        </div>
      </div>
    </div>
  );
};

export default VersusScreen;
