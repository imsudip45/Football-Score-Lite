'use client';

import React from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

// NSL Color Palette
const NSL_COLORS = {
  red: '#EF3E42',
  darkRed: '#A50044',
  blue: '#00529F',
  grey: '#E6E7E8',
  darkGrey: '#D1D3D4',
  green: '#009640',
};

type Team = 'home' | 'away';

interface SubstitutionOverlayProps {
  animate?: 'in' | 'out';
  playerIn?: string;
  playerOut?: string;
  teamLogo?: string;
  teamColor?: string;
  team?: Team; // Which team this substitution is for
  homeColors?: { primary: string; secondary: string };
  awayColors?: { primary: string; secondary: string };
  tournamentColor?: string;
}

const SubstitutionOverlay: React.FC<SubstitutionOverlayProps> = ({ 
  animate = 'in',
  playerIn = '',
  playerOut = '',
  teamLogo,
  teamColor,
  team = 'home',
  homeColors,
  awayColors,
  tournamentColor
}) => {
  // Only use fallback if teamLogo is undefined/null - empty string means no logo intentionally
  const logo = teamLogo !== undefined && teamLogo !== null && teamLogo !== '' ? teamLogo : null;
  const showLogo = logo !== null;
  
  // Get customization settings based on team
  const homeCustomization = useGraphicsCustomizationStore(state => state.substitutionHome);
  const awayCustomization = useGraphicsCustomizationStore(state => state.substitutionAway);
  
  const customization = team === 'away' ? awayCustomization : homeCustomization;
  
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
    <div className={`relative w-fit ${animate === 'out' ? 'anim-sub-container-out' : ''}`}>
      <style>{`
        @keyframes subLogoIn { from { transform: translateY(-105%); } to { transform: translateY(0); } }
        @keyframes subLogoOut { from { transform: translateY(0); } to { transform: translateY(-105%); } }
        @keyframes subContentIn { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes subContentOut { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 100% 0 0); } }
        @keyframes subContainerOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .anim-sub-logo-in { animation: subLogoIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-sub-logo-out { animation: subLogoOut 0.4s cubic-bezier(0.7, 0, 0.84, 0) forwards 0s; }
        /* Start wiping immediately to avoid showing an empty "box" area before content reveals */
        .anim-sub-content-in { animation: subContentIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards 0s; clip-path: inset(0 100% 0 0); }
        .anim-sub-content-out { animation: subContentOut 0.4s cubic-bezier(0.7, 0, 0.84, 0) forwards 0s; }
        .anim-sub-container-out { animation: subContainerOut 0.45s ease-in forwards; }
        
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
      `}</style>

      <div className="flex h-20 shadow-xl w-[450px] overflow-hidden">
        {/* Team Logo Box - uses customization with team color as fallback */}
        <div 
          className={`w-20 flex items-center justify-center relative z-20 ${animate === 'in' ? 'anim-sub-logo-in' : 'anim-sub-logo-out'}`}
          style={Object.keys(getStyle('background')).length > 0 ? getStyle('background') : { backgroundColor: teamColor || NSL_COLORS.darkRed }}
        >
          {showLogo ? (
            <img src={logo} className="h-14 w-14 object-contain" alt="Team" />
          ) : (
            <div className="h-14 w-14 flex items-center justify-center">
              <span className="text-white text-lg font-bold">🔄</span>
            </div>
          )}
        </div>

        {/* Players Section */}
        <div 
          className={`flex-1 flex flex-col relative z-10 ${animate === 'in' ? 'anim-sub-content-in' : 'anim-sub-content-out'}`}
          style={{ borderBottom: `4px solid ${NSL_COLORS.blue}` }}
        >
          {/* Player IN - Grey Background */}
          <div 
            className="flex-1 flex items-center px-4 relative" 
            style={Object.keys(getStyle('player-in')).length > 0 ? getStyle('player-in') : { backgroundColor: NSL_COLORS.darkGrey }}
          >
            {/* Green Triangle Up */}
            <div 
              className="w-0 h-0 mr-3"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: `10px solid ${NSL_COLORS.green}`,
              }}
            ></div>
            <span 
              className="font-condensed text-2xl tracking-wide uppercase pt-1"
              style={{ color: getColor('player-in') || '#111827' }}
            >
              {playerIn || 'Player In'}
            </span>
          </div>

          {/* Player OUT - White Background */}
          <div 
            className="flex-1 flex items-center px-4"
            style={Object.keys(getStyle('player-out')).length > 0 ? getStyle('player-out') : { backgroundColor: '#ffffff' }}
          >
            {/* Red Triangle Down */}
            <div 
              className="w-0 h-0 mr-3"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `10px solid ${NSL_COLORS.red}`,
              }}
            ></div>
            <span 
              className="font-condensed text-2xl tracking-wide uppercase pt-1"
              style={{ color: getColor('player-out') || '#111827' }}
            >
              {playerOut || 'Player Out'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionOverlay;
