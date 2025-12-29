'use client';

import React from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getFontSize, getTextStyle, getTextStyleCSS, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

// Icons (PNG assets under /public/officials-icons)
const ICONS = {
  referee: '/officials-icons/Refree.png',
  fourth: '/officials-icons/Match_refree.png',
  assistant: '/officials-icons/linesman.png',
};

interface Official {
  role: string;
  name: string;
}

interface MatchOfficialsProps {
  animate?: 'in' | 'out';
  officials: Official[];
  leagueName?: string;
  leagueLogo?: string;
  tournamentColor?: string;
}

const MatchOfficials: React.FC<MatchOfficialsProps> = ({
  animate = 'in',
  officials = [],
  leagueName = 'MATCH',
  leagueLogo,
  tournamentColor = '#EF3E42',
}) => {
  // Get customization settings from store
  const customization = useGraphicsCustomizationStore((state) => state.matchOfficials);
  
  // Helper functions for customization - include tournament color for dynamic resolution
  const teamColors = { tournament: tournamentColor };
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);
  const getFontSizeValue = (id: string) => getFontSize(customization, id);
  const getTextStyleValue = (id: string) => getTextStyleCSS(getTextStyle(customization, id));
  
  // Default officials if none provided
  const displayOfficials = officials.length > 0 ? officials : [
    { role: 'REFEREE', name: 'TBD' },
    { role: 'LINESMAN 1', name: 'TBD' },
    { role: 'LINESMAN 2', name: 'TBD' },
    { role: '4TH OFFICIAL', name: 'TBD' },
  ];

  const getIcon = (role: string) => {
    const lowerRole = role.toLowerCase();
    const src =
      lowerRole.includes('4th')
        ? ICONS.fourth
        : lowerRole.includes('assistant') || lowerRole.includes('linesman') || lowerRole.includes('ar')
          ? ICONS.assistant
          : ICONS.referee;

    return <img src={src} alt="" className="w-6 h-6 object-contain" />;
  };

  // Check if role is a referee/official type (for color highlighting)
  const isRefereeRole = (role: string) => {
    const lowerRole = role.toLowerCase();
    return lowerRole.includes('referee') || lowerRole.includes('official') || lowerRole.includes('4th');
  };
  
  // Get styles from customization
  const sidebarStyle = getStyle('sidebar');
  const headerStyle = getStyle('header');
  const rowEvenStyle = getStyle('row-even');
  const rowOddStyle = getStyle('row-odd');
  
  // Get text colors
  const headerTextColor = getColor('header') || '#ffffff';
  const rowTextColor = getColor('row-even') || '#374151';
  
  // Get role highlight color - use textColor from role-highlight component
  const roleHighlightColor = getColor('role-highlight') || tournamentColor;
  
  // Icon colors are baked into the PNGs; keep this here in case we later switch to SVG/mask.

  return (
    <div className={`relative w-fit ${animate === 'out' ? 'anim-mo-container-out' : ''}`}>
      <style>{`
        /* Snasm font for tournament name */
        @font-face {
          font-family: 'Snasm';
          src: url('./Snasm-W05-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
        
        /* Sidebar Drop */
        @keyframes moSidebarIn { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes moSidebarOut { from { transform: translateY(0); } to { transform: translateY(-100%); } }

        /* Content Wipe */
        @keyframes moContentIn { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes moContentOut { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 100% 0 0); } }
        
        /* Container fade out */
        @keyframes moContainerOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        /* Classes */
        .anim-mo-sidebar-in { animation: moSidebarIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-mo-sidebar-out { animation: moSidebarOut 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards 0.3s; }

        /* Start wiping immediately to avoid showing an empty "box" area before content reveals */
        .anim-mo-content-in { animation: moContentIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards 0s; clip-path: inset(0 100% 0 0); }
        .anim-mo-content-out { animation: moContentOut 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards 0s; }
        
        .anim-mo-container-out { animation: moContainerOut 0.8s ease-in forwards; }
      `}</style>

      <div className="flex w-[450px] shadow-2xl overflow-hidden">
        {/* Left Sidebar Branding - White/Grey solid (Drops In) */}
        <div 
          className={`w-28 flex flex-col items-center justify-center border-r border-gray-200 relative z-20 overflow-hidden ${animate === 'in' ? 'anim-mo-sidebar-in' : 'anim-mo-sidebar-out'}`}
        >
          {/* Sidebar background layer for customization */}
          <div 
            className="absolute inset-0 z-0"
            style={sidebarStyle}
          />
          
          {leagueLogo ? (
            /* If logo exists: show name at top, logo at bottom */
            <div className="flex flex-col items-center justify-between h-full py-5 relative z-10">
              <div 
                className="tracking-tight text-center px-2"
                style={{ 
                  color: getColor('sidebar') || tournamentColor,
                  fontFamily: "'Snasm', sans-serif",
                  fontSize: `${getFontSizeValue('sidebar') || 30}px`,
                  fontStyle: 'italic',
                  ...getTextStyleValue('sidebar'),
                }}
              >
                {leagueName}
              </div>
              <img src={leagueLogo} className="w-16 h-16 object-contain" alt="League" />
            </div>
          ) : (
            /* If no logo: show football icon, name, football icon vertically centered */
            <div className="flex flex-col items-center justify-center h-full py-4 gap-7 relative z-10">
             
              <div 
                className="tracking-tight text-center px-2"
                style={{ 
                  color: getColor('sidebar') || tournamentColor,
                  fontSize: `${getFontSizeValue('sidebar') || 30}px`,
                  fontFamily: "'Snasm', sans-serif",
                  fontStyle: 'italic',
                  ...getTextStyleValue('sidebar'),
                }}
              >
                {leagueName}
              </div>
             
            </div>
          )}
        </div>

        {/* Right Content Section (Wipes In) */}
        <div className={`flex-1 flex flex-col relative z-10 ${animate === 'in' ? 'anim-mo-content-in' : 'anim-mo-content-out'}`}>
          {/* Header */}
          <div 
            className="font-condensed px-5 py-3 uppercase tracking-wide relative overflow-hidden"
            style={{ fontSize: `${getFontSizeValue('header') || 24}px` }}
          >
            {/* Header background layer */}
            <div 
              className="absolute inset-0 z-0"
              style={headerStyle}
            />
            <span className="relative z-10" style={{ color: headerTextColor, ...getTextStyleValue('header') }}>Match Officials</span>
          </div>

          {/* Rows - Alternating */}
          <div className="flex flex-col">
            {displayOfficials.map((official, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between px-5 h-16 relative overflow-hidden"
              >
                {/* Row background layer */}
                <div 
                  className="absolute inset-0 z-0"
                  style={idx % 2 === 0 ? rowEvenStyle : rowOddStyle}
                />
                
                <div className="flex flex-col relative z-10 gap-0" style={{ marginTop: '-4px' }}>
                  <span 
                    className="font-sans"
                    style={{ 
                      color: isRefereeRole(official.role) ? roleHighlightColor : rowTextColor,
                      fontSize: `${getFontSizeValue('role-highlight') || 11}px`,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      lineHeight: 1.2,
                      ...getTextStyleValue('role-highlight'),
                    }}
                  >
                    {official.role}
                  </span>
                  <span 
                    className="font-condensed"
                    style={{ 
                      color: rowTextColor,
                      fontSize: `${getFontSizeValue('row-even') || 30}px`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      lineHeight: 1.1,
                      ...getTextStyleValue('row-even'),
                    }}
                  >
                    {official.name}
                  </span>
                </div>
                
                {/* Icon */}
                <div className="w-6 h-6 relative z-10">
                  {getIcon(official.role)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchOfficials;
