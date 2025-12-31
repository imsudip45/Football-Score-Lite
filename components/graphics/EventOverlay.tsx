'use client';

import React from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternStyleWithAnimation, getPatternAnimationCSS, getFullTextStyle } from './customization-utils';

// NSL Color Palette
const NSL_COLORS = {
  red: '#EF3E42',
  darkRed: '#A50044',
  blue: '#00529F',
  grey: '#E6E7E8',
  darkGrey: '#D1D3D4',
  yellow: '#FFCC00',
};

type Variant = 'yellow-card' | 'red-card' | 'player-highlight' | 'coach';
type Team = 'home' | 'away' | 'neutral';

interface EventOverlayProps {
  animate?: 'in' | 'out';
  variant: Variant;
  mainText: string;
  subText?: string;
  teamLogo?: string;
  teamColor?: string;
  team?: Team; // Which team this event is for
  homeColors?: { primary: string; secondary: string };
  awayColors?: { primary: string; secondary: string };
  tournamentColor?: string;
}

const EventOverlay: React.FC<EventOverlayProps> = ({ 
  animate = 'in',
  variant, 
  mainText, 
  subText, 
  teamLogo,
  teamColor,
  team = 'home',
  homeColors,
  awayColors,
  tournamentColor
}) => {
  // Only use fallback if teamLogo is undefined/null - empty string means no logo intentionally
  // If no logo is provided, show team color box instead
  const logo = teamLogo !== undefined && teamLogo !== null && teamLogo !== '' ? teamLogo : null;
  const showLogo = logo !== null;
  
  // Get customization based on variant and team
  const goalHomeCustomization = useGraphicsCustomizationStore(state => state.goalHome);
  const goalAwayCustomization = useGraphicsCustomizationStore(state => state.goalAway);
  const cardHomeCustomization = useGraphicsCustomizationStore(state => state.cardHome);
  const cardAwayCustomization = useGraphicsCustomizationStore(state => state.cardAway);
  const nameplateHomeCustomization = useGraphicsCustomizationStore(state => state.nameplateHome);
  const nameplateAwayCustomization = useGraphicsCustomizationStore(state => state.nameplateAway);
  
  // Select appropriate customization based on variant and team
  const getCustomizationForVariant = () => {
    if (variant === 'player-highlight') {
      return team === 'away' ? goalAwayCustomization : goalHomeCustomization;
    }
    if (variant === 'yellow-card' || variant === 'red-card') {
      return team === 'away' ? cardAwayCustomization : cardHomeCustomization;
    }
    // coach variant uses nameplate
    return team === 'away' ? nameplateAwayCustomization : nameplateHomeCustomization;
  };
  
  const customization = getCustomizationForVariant();
  
  // Create teamColors object for dynamic color resolution
  // Use actual team colors passed from renderer for proper resolution of home1, home2, away1, away2
  const teamColors = {
    home: { 
      primary: homeColors?.primary || teamColor, 
      secondary: homeColors?.secondary || teamColor 
    },
    away: { 
      primary: awayColors?.primary || teamColor, 
      secondary: awayColors?.secondary || teamColor 
    },
    tournament: tournamentColor,
  };
  
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);

  return (
    <div className={`relative w-fit ${animate === 'out' ? 'anim-eo-container-out' : ''}`}>
      <style>{`
        @keyframes eoLogoIn { from { transform: translateY(-105%); } to { transform: translateY(0); } }
        @keyframes eoLogoOut { from { transform: translateY(0); } to { transform: translateY(-105%); } }
        @keyframes eoWipeIn { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes eoWipeOut { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 100% 0 0); } }
        @keyframes eoCardIn { 
          0% { transform: translateY(-50%) scale(0) rotate(-45deg); opacity: 0; } 
          60% { transform: translateY(-50%) scale(1.2) rotate(12deg); opacity: 1; }
          100% { transform: translateY(-50%) scale(1) rotate(12deg); opacity: 1; } 
        }
        @keyframes eoCardOut { 
          from { transform: translateY(-50%) scale(1) rotate(12deg); opacity: 1; } 
          to { transform: translateY(-50%) scale(0) rotate(-45deg); opacity: 0; } 
        }
        @keyframes eoContainerOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .anim-eo-logo-in { animation: eoLogoIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-eo-logo-out { animation: eoLogoOut 0.4s cubic-bezier(0.7, 0, 0.84, 0) forwards 0s; }
        /* Start wiping immediately to avoid showing an empty "box" area before content reveals */
        .anim-eo-wipe-in { animation: eoWipeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards 0s; clip-path: inset(0 100% 0 0); }
        .anim-eo-wipe-out { animation: eoWipeOut 0.4s cubic-bezier(0.7, 0, 0.84, 0) forwards 0s; }
        .anim-eo-card-in { animation: eoCardIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 0.5s; opacity: 0; }
        .anim-eo-card-out { animation: eoCardOut 0.4s ease-in forwards 0s; }
        .anim-eo-container-out { animation: eoContainerOut 0.45s ease-in forwards; }
        
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
      `}</style>

      {/* Player Highlight: Solid Red Bar (Goal graphic) */}
      {variant === 'player-highlight' && (
        <div className="flex h-14 shadow-lg w-[500px] overflow-hidden">
          <div 
            className={`w-14 flex items-center justify-center relative z-20 ${animate === 'in' ? 'anim-eo-logo-in' : 'anim-eo-logo-out'}`}
            style={getStyle('background')}
          >
            {showLogo ? (
              <img src={logo} className="h-10 w-10 object-contain" alt="Team" />
            ) : (
              <div className="h-10 w-10 flex items-center justify-center">
                <span className="text-white text-xs font-bold">⚽</span>
              </div>
            )}
          </div>
          <div 
            className={`flex-1 flex items-center px-6 relative z-10 ${animate === 'in' ? 'anim-eo-wipe-in' : 'anim-eo-wipe-out'}`}
            style={Object.keys(getStyle('accent')).length > 0 ? getStyle('accent') : { backgroundColor: tournamentColor || NSL_COLORS.red }}
          >
            <span 
              className="font-condensed uppercase tracking-wide leading-none pt-1"
              style={getFullTextStyle(customization, 'text')}
            >{mainText}</span>
          </div>
        </div>
      )}

      {/* Coach/Nameplate: Logo Box / Name Box / Position Box */}
      {variant === 'coach' && (
        <div className="flex h-20 shadow-xl w-[450px] overflow-hidden">
          {/* Logo Box - uses customization, falls back to background or team color */}
          <div 
            className={`w-20 flex items-center justify-center relative z-20 ${animate === 'in' ? 'anim-eo-logo-in' : 'anim-eo-logo-out'}`}
            style={Object.keys(getStyle('logo-box')).length > 0 ? getStyle('logo-box') : (Object.keys(getStyle('background')).length > 0 ? getStyle('background') : { backgroundColor: team === 'neutral' ? '#ffffff' : (teamColor || NSL_COLORS.darkRed) })}
          >
            {showLogo ? (
              <img src={logo} className="h-14 w-14 object-contain" alt="Team" />
            ) : (
              <div className="h-14 w-14 flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
            )}
          </div>
          <div className={`flex-1 flex flex-col relative z-10 ${animate === 'in' ? 'anim-eo-wipe-in' : 'anim-eo-wipe-out'}`}>
            {/* Name Box - uses 'accent' customization */}
            <div 
              className="flex-1 flex items-center px-5" 
              style={Object.keys(getStyle('accent')).length > 0 ? getStyle('accent') : { backgroundColor: NSL_COLORS.darkGrey }}
            >
              <span 
                className="font-condensed font-semibold uppercase tracking-tight leading-none pt-1" 
                style={getFullTextStyle(customization, 'name-text')}
              >
                {mainText}
              </span>
            </div>
            {/* Position Box - uses 'bottom-box' customization, falls back to 'background' */}
            <div 
              className="h-8 flex items-center px-5" 
              style={Object.keys(getStyle('bottom-box')).length > 0 
                ? getStyle('bottom-box') 
                : Object.keys(getStyle('background')).length > 0 
                  ? getStyle('background') 
                  : { backgroundColor: teamColor || NSL_COLORS.red }}
            >
              <span className="font-condensed font-semibold uppercase tracking-wider leading-none pt-0.5" style={getFullTextStyle(customization, 'position-text')}>{subText}</span>
            </div>
          </div>
        </div>
      )}

      {/* Yellow & Red Cards */}
      {(variant === 'yellow-card' || variant === 'red-card') && (
        <div className="flex h-20 shadow-xl w-[450px] overflow-hidden relative">
          <div 
            className={`w-20 flex items-center justify-center relative z-20 ${animate === 'in' ? 'anim-eo-logo-in' : 'anim-eo-logo-out'}`}
            style={getStyle('background')}
          >
            {showLogo ? (
              <img src={logo} className="h-14 w-14 object-contain" alt="Team" />
            ) : (
              <div className="h-14 w-14 flex items-center justify-center">
                <span className="text-white text-lg font-bold">⚽</span>
              </div>
            )}
            <div className="absolute bottom-0 w-full h-1 bg-black/20"></div>
          </div>
          <div 
            className={`flex-1 flex flex-col relative z-10 ${animate === 'in' ? 'anim-eo-wipe-in' : 'anim-eo-wipe-out'}`}
            style={{ borderBottom: `4px solid ${NSL_COLORS.blue}` }}
          >
            <div 
              className="flex-1 flex items-center justify-center pl-13" 
              style={Object.keys(getStyle('accent')).length > 0 ? getStyle('accent') : { backgroundColor: NSL_COLORS.darkGrey }}
            >
              <span 
                className="font-condensed uppercase tracking-tight"
                style={getFullTextStyle(customization, 'text')}
              >
                {variant === 'yellow-card' ? 'YELLOW CARD' : 'RED CARD'}
              </span>
            </div>
            <div className="h-10 bg-white flex items-center justify-center pl-10">
              <span 
                className="font-condensed uppercase tracking-wide leading-none pt-1"
                // Player row sits on a light background; don't reuse the header "text" color (often white).
                // Allow an optional override via 'player-text', otherwise default to dark for readability.
                style={getFullTextStyle(customization, 'player-text')}
              >{mainText}</span>
            </div>
            <div className={`absolute left-6 top-1/2 z-30 drop-shadow-md ${animate === 'in' ? 'anim-eo-card-in' : 'anim-eo-card-out'}`}>
              <div 
                className="w-10 h-14 rounded-[2px] border border-white/10"
                style={{ backgroundColor: variant === 'yellow-card' 
                  ? (getStyle('yellow-card').backgroundColor as string || NSL_COLORS.yellow) 
                  : (getStyle('red-card').backgroundColor as string || NSL_COLORS.red) }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventOverlay;
