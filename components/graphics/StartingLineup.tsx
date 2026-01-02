'use client';

import React, { useState, useRef, useCallback } from 'react';

import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

// Shield fallback component when no logo is available
const ShieldFallback = ({ primaryColor, secondaryColor, size = 400 }: { primaryColor: string; secondaryColor?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
    <defs>
      <linearGradient id={`lineup-shield-grad-${primaryColor.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={secondaryColor || primaryColor} />
        <stop offset="100%" stopColor={primaryColor} />
      </linearGradient>
    </defs>
    {/* Shield shape */}
    <path 
      d="M50 5 L90 15 L90 45 C90 70 70 90 50 95 C30 90 10 70 10 45 L10 15 Z" 
      fill={`url(#lineup-shield-grad-${primaryColor.replace('#', '')})`}
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

interface Player {
  name: string;
  shortName?: string;
  number: number;
  top: string;
  left: string;
  photo?: string;
}

interface Sub {
  num: number;
  name: string;
}

interface StartingLineupProps {
  animate?: 'in' | 'out';
  teamName?: string;
  teamColor?: string;
  teamSecondaryColor?: string;
  teamLogo?: string;
  tournamentShortName?: string;
  tournamentLogo?: string;
  formation?: string;
  players?: Player[];
  subs?: Sub[];
  coach?: string;
  debugMode?: boolean;
  tournamentColor?: string;
}

interface PlayerCardProps extends Player {
  className?: string;
  style?: React.CSSProperties;
  teamColor: string;
  debugMode?: boolean;
  index?: number;
  onPositionChange?: (index: number, top: string, left: string) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  resolveImageSrc?: (src?: string) => string;
  // Customization colors
  numberBgColor?: string;
  numberTextColor?: string;
  infoBgColor?: string;
  nameTextColor?: string;
}

// Helper function to get display name for graphics
// Uses shortName if provided, otherwise extracts last name from full name
const getDisplayName = (name: string, shortName?: string): { firstName: string; lastName: string } => {
  if (shortName) {
    // If shortName is provided, use it as the main display name (lastName)
    return { firstName: '', lastName: shortName.toUpperCase() };
  }
  // Otherwise, split the full name and use last name
  const nameParts = name.split(' ');
  const lastName = nameParts.pop() || name;
  const firstName = nameParts.join(' ');
  return { firstName, lastName };
};

// Calculate font size to fit name within available width
// Base font size is 28px, available width ~100px (after padding)
const getScaledFontSize = (text: string, baseFontSize: number = 28, maxWidth: number = 100): { fontSize: number; scaleX: number } => {
  // Approximate character width ratio for condensed font
  const charWidthRatio = 0.48;
  const estimatedWidth = text.length * baseFontSize * charWidthRatio;
  
  if (estimatedWidth <= maxWidth) {
    return { fontSize: baseFontSize, scaleX: 1 };
  }
  
  // For long names, keep font size readable (min 20px) and use scaleX to compress
  const minFontSize = 20;
  let fontSize = Math.floor((maxWidth / estimatedWidth) * baseFontSize);
  
  if (fontSize >= minFontSize) {
    return { fontSize, scaleX: 1 };
  }
  
  // If font would be too small, use minFontSize with horizontal compression
  fontSize = minFontSize;
  const newEstimatedWidth = text.length * fontSize * charWidthRatio;
  const scaleX = Math.max(0.7, maxWidth / newEstimatedWidth); // Don't compress more than 70%
  
  return { fontSize, scaleX };
};

const DraggablePlayerCard: React.FC<PlayerCardProps> = ({ 
  name, shortName, number, top, left, photo, className, style, teamColor, debugMode, index, onPositionChange, containerRef,
  resolveImageSrc,
  numberBgColor, numberTextColor, infoBgColor, nameTextColor
}) => {
  const { firstName, lastName } = getDisplayName(name, shortName);
  const { fontSize: lastNameFontSize, scaleX: lastNameScaleX } = getScaledFontSize(lastName.toUpperCase());
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ top, left });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!debugMode) return;
    e.preventDefault();
    setIsDragging(true);
  }, [debugMode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef?.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newLeft = `${Math.max(0, Math.min(100, x)).toFixed(1)}%`;
    const newTop = `${Math.max(0, Math.min(100, y)).toFixed(1)}%`;
    
    setPosition({ top: newTop, left: newLeft });
  }, [isDragging, containerRef]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && onPositionChange && index !== undefined) {
      onPositionChange(index, position.top, position.left);
    }
    setIsDragging(false);
  }, [isDragging, onPositionChange, index, position]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    setPosition({ top, left });
  }, [top, left]);

  return (
    <div 
      ref={cardRef}
      className={`absolute transform -translate-x-1/2 flex flex-col shadow-[0_5px_15px_rgba(0,0,0,0.3)] z-20 group ${className || ''} ${debugMode ? 'cursor-move' : ''} ${isDragging ? 'z-50 scale-105' : ''}`} 
      style={{ top: position.top, left: position.left, width: '150px', ...style }}
      onMouseDown={handleMouseDown}
    >
      {/* Photo Area */}
      <div className="h-[115px] relative overflow-hidden" style={{ background: teamColor }}>
        {photo && photo.length > 0 ? (
          <img 
            src={resolveImageSrc ? resolveImageSrc(photo) : photo} 
            alt={name} 
            className="w-full h-full object-cover object-top drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-4xl font-bold">
            {number}
          </div>
        )}
      </div>
      
      {/* Info Bar */}
      <div className="h-[52px] flex" style={{ backgroundColor: infoBgColor || '#ffffff' }}>
        <div 
          className="w-[40px] h-full font-condensed text-[30px] flex items-center justify-center shrink-0 pt-1 leading-none"
          style={{ backgroundColor: numberBgColor || '#000000', color: numberTextColor || '#ffffff' }}
        >
          {number}
        </div>
        <div className="flex-1 flex flex-col justify-center pl-2 pr-1 leading-none h-full overflow-hidden">
          {firstName && (
            <span 
              className="font-condensed text-[16px] uppercase tracking-wider mb-[1px] block"
              style={{ color: nameTextColor || '#000000' }}
            >
              {firstName}
            </span>
          )}
          <span 
            className="font-condensed uppercase tracking-tight w-full block -mt-1"
            style={{ 
              color: nameTextColor || '#000000',
              fontSize: `${lastNameFontSize}px`,
              lineHeight: 1.1,
              transform: lastNameScaleX < 1 ? `scaleX(${lastNameScaleX})` : undefined,
              transformOrigin: 'left center'
            }}
          >
            {lastName}
          </span>
        </div>
      </div>
      
      {/* Debug Coordinates */}
      {debugMode && (
        <div className="bg-black/80 text-white text-[11px] font-mono px-2 py-1 text-center">
          L:{position.left} T:{position.top}
        </div>
      )}
    </div>
  );
};

const PitchGraphic = () => (
  <div className="absolute inset-0 flex items-start justify-center z-0">
    <img 
      src="./ground.svg" 
      alt="Football Pitch" 
      className="w-[100%] h-[100%] object-fill"
    />
  </div>
);

// Default players for 4-3-3 formation layout
const defaultPlayers: Player[] = [
  { name: 'GOALKEEPER', number: 1, top: '79%', left: '50%' },
  { name: 'LEFT BACK', number: 3, top: '60%', left: '15%' },
  { name: 'CENTER BACK', number: 4, top: '60%', left: '38.3%' },
  { name: 'CENTER BACK', number: 5, top: '60%', left: '61.6%' },
  { name: 'RIGHT BACK', number: 2, top: '60%', left: '85%' },
  { name: 'MIDFIELDER', number: 6, top: '38%', left: '26%' },
  { name: 'MIDFIELDER', number: 8, top: '38%', left: '50%' },
  { name: 'MIDFIELDER', number: 10, top: '38%', left: '74%' },
  { name: 'LEFT WING', number: 11, top: '16%', left: '20%' },
  { name: 'STRIKER', number: 9, top: '16%', left: '50%' },
  { name: 'RIGHT WING', number: 7, top: '16%', left: '80%' },
];

const defaultSubs: Sub[] = [
  { num: 12, name: 'SUB 1' },
  { num: 13, name: 'SUB 2' },
  { num: 14, name: 'SUB 3' },
  { num: 15, name: 'SUB 4' },
  { num: 16, name: 'SUB 5' },
  { num: 17, name: 'SUB 6' },
  { num: 18, name: 'SUB 7' },
];

const StartingLineup: React.FC<StartingLineupProps> = ({
  animate = 'in',
  teamName = 'TEAM NAME',
  teamColor = '#D6002A',
  teamSecondaryColor,
  teamLogo = '',
  tournamentShortName = '',
  tournamentLogo = '',
  formation = '4-3-3',
  players = defaultPlayers,
  subs = defaultSubs,
  coach = 'HEAD COACH',
  debugMode = false, // Set to true for position debugging
  tournamentColor
}) => {
  // In dev (http://) we can load public assets from `/...`.
  // In Electron production (file://.../out/renderer/index.html) absolute `/...` resolves to the filesystem root,
  // so we must use a relative path up to `out/`.
  const snasmFontUrl =
    typeof window !== 'undefined' && window.location.protocol === 'file:'
      ? '../Snasm-W05-Regular.ttf'
      : '/Snasm-W05-Regular.ttf';

  // Get customization settings from store
  const customization = useGraphicsCustomizationStore(state => state.lineup);
  
  // Create teamColors object for dynamic color resolution
  const teamColors = {
    home: { primary: teamColor, secondary: teamSecondaryColor || teamColor },
    away: { primary: teamColor, secondary: teamSecondaryColor || teamColor },
    tournament: tournamentColor,
  };
  
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);

  const isElectron =
    typeof window !== 'undefined' &&
    (
      !!(window as any).electronAPI ||
      (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent))
    );
  const toHttpAssetsUrl = useCallback((src: string): string => {
    if (!src.startsWith('app-assets://')) return src;
    const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';

    let rel = '';
    if (src.startsWith('app-assets:///')) rel = src.replace('app-assets:///', '');
    else rel = src.replace('app-assets://', '').replace(/^\/+/, '');

    const encoded = rel
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');

    return `http://${host}:3002/app-assets/${encoded}`;
  }, []);

  const resolveImageSrc = useCallback((src?: string): string => {
    if (!src) return '';
    if (!isElectron && src.startsWith('app-assets://')) return toHttpAssetsUrl(src);
    return src;
  }, [isElectron, toHttpAssetsUrl]);

  const logo = teamLogo || '';
  const pitchRef = useRef<HTMLDivElement>(null);
  const [playerPositions, setPlayerPositions] = useState<{top: string, left: string}[]>([]);

  // Initialize positions from players prop
  React.useEffect(() => {
    setPlayerPositions(players.map(p => ({ top: p.top, left: p.left })));
  }, [players]);

  const handlePositionChange = useCallback((index: number, top: string, left: string) => {
    setPlayerPositions(prev => {
      const newPositions = [...prev];
      newPositions[index] = { top, left };
      // Log all positions for easy copy-paste
      console.log('=== PLAYER POSITIONS ===');
      newPositions.forEach((pos, i) => {
        console.log(`Player ${i + 1}: top: '${pos.top}', left: '${pos.left}'`);
      });
      console.log('========================');
      return newPositions;
    });
  }, []);

  // Split coach name for display
  const coachParts = coach.split(' ');
  const coachLastName = coachParts.pop() || '';
  const coachFirstName = coachParts.join(' ');

  return (
    <div className={`w-[1920px] h-[1080px] flex shadow-2xl font-sans relative overflow-hidden ${animate === 'out' ? 'anim-lineup-container-out' : ''}`}>
      <style>{`
        @font-face {
          font-family: 'Snasm';
          src: url('${snasmFontUrl}') format('truetype');
          font-weight: 400;
          font-style: normal;
        }

        @keyframes lineupContainerOut { 
          0% { opacity: 1; } 
          100% { opacity: 0; } 
        }
        .anim-lineup-container-out { animation: lineupContainerOut 1.2s ease-in forwards; }
        .anim-sidebar-left-in { animation: slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-sidebar-left-out { animation: slideOutLeft 0.6s ease-in forwards; animation-delay: 0.4s; }
        .anim-sidebar-right-in { animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-sidebar-right-out { animation: slideOutRight 0.6s ease-in forwards; animation-delay: 0.4s; }
        .anim-title-in { opacity: 0; animation: slideInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-title-out { animation: slideOutUp 0.6s ease-in forwards; animation-delay: 0.35s; }
        .anim-logo-in { opacity: 0; animation: logoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-logo-out { animation: logoOut 0.6s ease-in forwards; animation-delay: 0.35s; }
        .anim-pitch-in { opacity: 0; animation: pitchIn 0.6s ease-out forwards; }
        .anim-pitch-out { animation: pitchOut 0.4s ease-out forwards; }
        .anim-player-in { opacity: 0; animation: playerIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .anim-player-out { animation: playerOut 0.25s ease-out forwards; }


        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-150%); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(150%); } }
        @keyframes slideInDown { from { opacity: 0; transform: translateY(-200px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideOutUp { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-300px); opacity: 0; } }
        @keyframes logoIn { from { opacity: 0; transform: translateX(-100px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes logoOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-200px); opacity: 0; } }
        @keyframes pitchIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pitchOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes playerIn { 
          from { opacity: 0; transform: translateX(-50%) translateY(50px) scale(0.8); } 
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } 
        }
        @keyframes playerOut { 
          from { opacity: 1; transform: translateX(-50%) scale(1); } 
          to { opacity: 0; transform: translateX(-50%) scale(0.7); } 
        }
        
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
      `}</style>

      {/* Left Sidebar (Team Color) */}
      <div 
        className={`w-[300px] relative h-full flex flex-col z-20 overflow-visible ${animate === 'in' ? 'anim-sidebar-left-in' : 'anim-sidebar-left-out'}`} 
        style={Object.keys(getStyle('left-sidebar')).length > 0 ? getStyle('left-sidebar') : { background: teamColor }}
      >

        <div className={`absolute top-[50%] transform -translate-y-1/2 left-[50px] z-20 ${animate === 'in' ? 'anim-logo-in' : 'anim-logo-out'}`} style={{ animationDelay: animate === 'in' ? '0.3s' : '0s' }}>
          {logo && logo.length > 0 ? (
            <img src={resolveImageSrc(logo)} style={{ width: '320px', height: '320px', objectFit: 'contain', filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))' }} alt="Crest" />
          ) : (
            <ShieldFallback primaryColor={teamColor} secondaryColor={teamSecondaryColor} size={320} />
          )}
        </div>
      </div>

      {/* Title Box */}
      <div 
        className={`absolute top-[120px] left-0 z-40 shadow-[0_5px_25px_rgba(0,0,0,0.15)] px-8 py-5 w-[350px] ${animate === 'in' ? 'anim-title-in' : 'anim-title-out'}`}
        style={{ 
          animationDelay: animate === 'in' ? '0.4s' : '0s',
          ...(Object.keys(getStyle('title-box')).length > 0 ? getStyle('title-box') : { backgroundColor: '#ffffff' })
        }}
      >
        <h1 className="text-[80px] leading-[0.8] tracking-tight font-normal relative z-10" style={{ color: teamColor, fontFamily: 'var(--font-bebas), sans-serif' }}>
          {teamName}
        </h1>
        <h2 className="text-[50px] text-black leading-[0.9] tracking-tight font-normal relative z-10" style={{ fontFamily: 'var(--font-bebas), sans-serif' }}>
          STARTING LINEUP
        </h2>
      </div>

      {/* Center Pitch */}
      <div 
        className={`flex-1 relative z-10 ${animate === 'in' ? 'anim-pitch-in' : 'anim-pitch-out'}`}
        style={{ backgroundColor: '#EBEBEB' }}
      >
        {/* Pattern background layer - separate from entrance animation */}
        <div 
          className="absolute inset-0 z-0"
          style={Object.keys(getStyle('pitch-background')).length > 0 ? getStyle('pitch-background') : {}}
        />
        <PitchGraphic />
        <div ref={pitchRef} className="absolute inset-0 z-10">
          {players.map((p, i) => (
            <DraggablePlayerCard 
              key={i} 
              {...p}
              top={playerPositions[i]?.top || p.top}
              left={playerPositions[i]?.left || p.left}
              teamColor={teamColor}
              debugMode={debugMode}
              index={i}
              onPositionChange={handlePositionChange}
              containerRef={pitchRef}
              resolveImageSrc={resolveImageSrc}
              numberBgColor={getStyle('player-number').backgroundColor as string}
              numberTextColor={getColor('player-number')}
              infoBgColor={getStyle('player-card-info').backgroundColor as string}
              nameTextColor={getColor('player-card-info')}
              className={debugMode ? '' : (animate === 'in' ? 'anim-player-in' : 'anim-player-out')}
              style={debugMode ? {} : {
                animationDelay: animate === 'in' ? `${0.6 + (i * 0.1)}s` : '0s'
              }}
            />
          ))}
        </div>
        {/* Debug info panel */}
        {debugMode && (
          <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-mono p-2 rounded z-50 max-h-[200px] overflow-auto">
            <div className="font-bold mb-1">Positions (drag players to adjust):</div>
            {playerPositions.map((pos, i) => (
              <div key={i}>P{i+1}: L:{pos.left} T:{pos.top}</div>
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar (White) */}
      <div 
        className={`w-[360px] flex flex-col h-full border-l border-gray-300 relative z-20 ${animate === 'in' ? 'anim-sidebar-right-in' : 'anim-sidebar-right-out'}`}
        style={Object.keys(getStyle('right-sidebar')).length > 0 ? getStyle('right-sidebar') : { backgroundColor: '#F8F8F8' }}
      >

        {/* Tournament header */}
        {(tournamentShortName || tournamentLogo) && (
          <div className="pt-[36px] relative z-10">
            <div className="px-8">
              <div className={`flex items-end gap-4 ${tournamentLogo ? 'justify-between' : 'justify-center'}`}>
                {tournamentLogo ? (
                  <img src={resolveImageSrc(tournamentLogo)} alt="Tournament" className="h-10 w-auto object-contain" />
                ) : null}
                {tournamentShortName && (
                  <div
                    className="text-[58px] leading-none uppercase whitespace-nowrap italic"
                    style={{
                      fontFamily: "'Snasm', sans-serif",
                      color: tournamentColor || '#EF3E42',
                    }}
                  >
                    {tournamentShortName}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 h-px w-full bg-black/80" />
          </div>
        )}

        {/* Manager + formation */}
        <div className="px-8 pt-6 relative z-10">
          <div className="text-[18px] font-condensed uppercase tracking-wider" style={{ color: '#000000' }}>
            MANAGER
          </div>

          <div className="mt-2">
            {coachFirstName && (
              <div className="text-[44px] font-condensed uppercase leading-[0.9] tracking-tight" style={{ color: '#000000', fontWeight: 700 }}>
                {coachFirstName}
              </div>
            )}
            <div className="text-[44px] font-condensed uppercase leading-[0.9] tracking-tight" style={{ color: '#000000', fontWeight: 700 }}>
              {coachLastName}
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="text-[78px] font-condensed leading-none" style={{ color: '#000000', fontWeight: 700, letterSpacing: '0.08em' }}>
              {formation}
            </div>
          </div>
        </div>

        <div className="mt-8 h-px w-full bg-black/80" />

        {/* Substitutions */}
        <div className="flex-1 px-8 pt-5 overflow-hidden relative z-10">
          <div className="text-[24px] font-condensed italic" style={{ color: '#000000' }}>
            SUBSTITUTION
          </div>
          <div className="mt-3 h-px bg-black/80 -mx-8" />

          <ul className="mt-5 space-y-3">
            {subs.map((sub, i) => (
              <li key={i} className="flex items-baseline">
                <span className="w-16 text-[22px] font-condensed" style={{ color: '#000000' }}>
                  {sub.num}.
                </span>
                <span className="text-[22px] font-condensed uppercase tracking-wide" style={{ color: '#000000' }}>
                  {sub.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StartingLineup;
