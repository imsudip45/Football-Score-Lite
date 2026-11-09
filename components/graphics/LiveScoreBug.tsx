'use client';

import React, { useState, useEffect } from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternConfig, getPatternStyleWithAnimation, getPatternAnimationCSS, getFullTextStyle } from './customization-utils';

// NSL Color Palette (defaults)
const NSL_COLORS = {
  red: '#EF3E42',
  darkRed: '#A50044',
  blue: '#00529F',
  grey: '#E6E7E8',
  darkGrey: '#D1D3D4',
};

interface LiveScoreBugProps {
  animate?: 'in' | 'out';
  homeTeam?: { name?: string; shortName?: string; score?: number; logo?: string; color?: string; secondaryColor?: string; yellowCards?: number; redCards?: number };
  awayTeam?: { name?: string; shortName?: string; score?: number; logo?: string; color?: string; secondaryColor?: string; yellowCards?: number; redCards?: number };
  timer?: { minutes?: number; seconds?: number; extra?: number; period?: string };
  penalties?: { home?: number; away?: number };
  leagueName?: string;
  leagueShortName?: string;
  leagueLogo?: string;
  leagueColor?: string;
}

const LiveScoreBug: React.FC<LiveScoreBugProps> = ({ 
  animate = 'in',
  homeTeam = {},
  awayTeam = {},
  timer = {},
  penalties = {},
  leagueName = 'NSL',
  leagueShortName = '',
  leagueLogo = '',
  leagueColor = ''
}) => {
  // In dev (http://) we can load public assets from `/...`.
  // In Electron production (file://.../out/renderer/index.html) absolute `/...` resolves to the filesystem root,
  // so we must use a relative path up to `out/`.
  const snasmFontUrl =
    typeof window !== 'undefined' && window.location.protocol === 'file:'
      ? '../Snasm-W05-Regular.ttf'
      : '/Snasm-W05-Regular.ttf';

  // Get customization settings from store (synced across tabs via localStorage)
  const customization = useGraphicsCustomizationStore(state => state.scoreBug);

  const home = {
    shortName: (homeTeam.shortName || 'HOM').toUpperCase(),
    score: homeTeam.score ?? 0,
    logo: homeTeam.logo || '',
    color1: homeTeam.color || NSL_COLORS.darkRed,
    color2: homeTeam.secondaryColor || '#004D98',
    yellowCards: homeTeam.yellowCards ?? 0,
    redCards: homeTeam.redCards ?? 0,
  };
  
  const away = {
    shortName: (awayTeam.shortName || 'AWY').toUpperCase(),
    score: awayTeam.score ?? 0,
    logo: awayTeam.logo || '',
    color1: awayTeam.color || 'black',
    color2: awayTeam.secondaryColor || 'white',
    yellowCards: awayTeam.yellowCards ?? 0,
    redCards: awayTeam.redCards ?? 0,
  };

  const renderCards = (team: 'home' | 'away') => {
    const red = team === 'home' ? home.redCards : away.redCards;
    const redCount = Math.max(0, red ?? 0);

    // In the scorebug team short-name boxes, only show RED cards (no yellow indicators).
    if (redCount === 0) return null;

    // Keep it clean + compact; show up to 6 red cards (extra are just not rendered visually).
    const maxCards = 6;
    const cards: Array<'yellow' | 'red'> = Array(Math.min(redCount, maxCards)).fill('red');

    const alignClass = team === 'home' ? 'left-2 justify-start' : 'right-2 justify-end';

    // "Attached" to the top edge: place the row just outside the box, with its bottom touching the top border.
    return (
      <div className={`absolute top-0 -translate-y-full ${alignClass} flex items-center gap-1 pointer-events-none`}>
        {cards.map((c, idx) => (
          <div
            key={`${team}-card-${c}-${idx}`}
            className="w-4 h-6 rounded-[2px] shadow-[0_1px_0_rgba(0,0,0,0.35)]"
            style={{ backgroundColor: c === 'yellow' ? '#FFCC00' : NSL_COLORS.red }}
          />
        ))}
      </div>
    );
  };
  
  const teamColors = {
    home: { primary: home.color1, secondary: home.color2 },
    away: { primary: away.color1, secondary: away.color2 },
    tournament: leagueColor || NSL_COLORS.red,
  };
  
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);
  const getPattern = (id: string) => getPatternConfig(customization, id);

  const scoreBoxStyle = (() => {
    const s = getStyle('score-box');
    return Object.keys(s).length > 0 ? s : ({ backgroundColor: '#D1D3D4' } as React.CSSProperties);
  })();
  
  const mins = String(timer.minutes ?? 0).padStart(2, '0');
  const secs = String(timer.seconds ?? 0).padStart(2, '0');
  const extra = timer.extra ?? 0;
  const period = timer.period || '1st';
  const homePenScore = penalties.home ?? 0;
  const awayPenScore = penalties.away ?? 0;
  const isPenaltyShootout = period === 'pen';
  
  const [showExtra, setShowExtra] = useState(false);
  const [extraAnim, setExtraAnim] = useState<'in' | 'out' | 'hidden'>('hidden');
  const [displayExtra, setDisplayExtra] = useState(0);
  
  useEffect(() => {
    if (extra > 0) {
      setDisplayExtra(extra);
      if (!showExtra) {
        setShowExtra(true);
        setExtraAnim('in');
      }
    } else {
      if (showExtra) {
        setExtraAnim('out');
        setTimeout(() => {
          setShowExtra(false);
          setExtraAnim('hidden');
        }, 400);
      }
    }
  }, [extra, showExtra]);
  
  useEffect(() => {
    if (animate === 'out' && showExtra) {
      setExtraAnim('out');
    }
  }, [animate, showExtra]);

  // OBS Browser Source can render at a fractional device scale factor (DPI),
  // which can cause 1–2px rounding differences and clip the right edge.
  // Add a tiny safety margin so the full bar is always visible.
  const BAR_WIDTH = 724;
  const EXTRA_WIDTH = 56;

  return (
    <div className="relative overflow-visible" style={{ minWidth: `${BAR_WIDTH + EXTRA_WIDTH}px` }}>
      <style>{`
        /* Custom font for tournament name */
        @font-face {
          font-family: 'Snasm';
          src: url('${snasmFontUrl}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        
        /* GPU-accelerated 60fps animations using transform3d and will-change */
        /* NSL drops down, holds, then slides left - content follows attached to NSL */
        @keyframes nslIn { 
          0% { transform: translate3d(240px, -80px, 0); }
          30% { transform: translate3d(240px, 0, 0); }
          65% { transform: translate3d(240px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes nslOut { 
          0% { transform: translate3d(0, 0, 0); }
          35% { transform: translate3d(240px, 0, 0); }
          65% { transform: translate3d(240px, 0, 0); }
          100% { transform: translate3d(240px, -150px, 0); }
        }
        
        /* Content slides out from behind NSL - starts hidden, slides right */
        /* Content starts at left:0 with padding-left:96px (NSL width), then slides via margin */
        @keyframes contentSlideIn { 
          0% { 
            transform: translate3d(-464px, 0, 0); /* Hide content behind NSL */
          }
          100% { 
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes contentSlideOut { 
          0% { 
            transform: translate3d(0, 0, 0);
          }
          100% { 
            transform: translate3d(-464px, 0, 0);
          }
        }

        .anim-nsl-in { 
          animation: nslIn 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards 0s;
          will-change: transform;
          backface-visibility: hidden;
        }
        .anim-nsl-out { 
          animation: nslOut 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards 0s;
          will-change: transform;
          backface-visibility: hidden;
        }
        .anim-content-in { 
          transform: translate3d(-464px, 0, 0);
          animation: contentSlideIn 0.42s cubic-bezier(0.25, 0.1, 0.25, 1) forwards 0.78s;
          will-change: transform;
          backface-visibility: hidden;
        }
        .anim-content-out { 
          transform: translate3d(0, 0, 0);
          animation: contentSlideOut 0.42s cubic-bezier(0.25, 0.1, 0.25, 1) forwards 0s;
          will-change: transform;
          backface-visibility: hidden;
        }
        
        /* Wrapper clip animation - clips during animation, then reveals all */
        @keyframes wrapperClipIn {
          0% { clip-path: inset(0 0 0 260px); }
          100% { clip-path: inset(0 0 0 0); }
        }
        @keyframes wrapperClipOut {
          0% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 0 260px); }
        }
        .anim-wrapper-in {
          clip-path: inset(0 0 0 260px);
          animation: wrapperClipIn 0.42s cubic-bezier(0.25, 0.1, 0.25, 1) forwards 0.78s;
          will-change: clip-path;
        }
        .anim-wrapper-out {
          clip-path: inset(0 0 0 0);
          animation: wrapperClipOut 0.42s cubic-bezier(0.25, 0.1, 0.25, 1) forwards 0s;
          will-change: clip-path;
        }
        
        /* Extra time slide animation - slides out from behind the timer to the right */
        @keyframes extraSlideIn {
          0% { 
            transform: translate3d(-56px, 0, 0);
            clip-path: inset(0 0 0 100%);
          }
          100% { 
            transform: translate3d(0, 0, 0);
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes extraSlideOut {
          0% { 
            transform: translate3d(0, 0, 0);
            clip-path: inset(0 0 0 0);
          }
          100% { 
            transform: translate3d(-56px, 0, 0);
            clip-path: inset(0 0 0 100%);
          }
        }
        .anim-extra-in {
          animation: extraSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: transform, clip-path;
          backface-visibility: hidden;
        }
        .anim-extra-out {
          animation: extraSlideOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: transform, clip-path;
          backface-visibility: hidden;
        }
        
        /* Dynamic pattern animation keyframes using CSS variables */
        ${getPatternAnimationCSS()}
        
        /* Custom pattern overlay for opacity support */
        .pattern-overlay {
          position: relative;
        }
        .pattern-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: var(--pattern-url);
          background-size: var(--pattern-size) var(--pattern-size);
          background-repeat: repeat;
          opacity: var(--pattern-opacity, 1);
          pointer-events: none;
        }
      `}</style>

      {/* Main Bar Container - uses relative positioning for layering */}
      <div className="relative font-sans select-none h-14 bg-transparent overflow-visible">
        
        {/* Content wrapper - clips content at NSL's right edge during animation, then reveals all */}
        <div 
          className={`absolute left-0 top-0 h-full z-10 ${animate === 'in' ? 'anim-wrapper-in' : 'anim-wrapper-out'}`}
          // NOTE: card indicators sit slightly above the name boxes; since this wrapper uses clip-path,
          // we must extend the wrapper upward so those indicators don't get clipped.
          style={{ width: `${BAR_WIDTH}px`, overflow: 'visible', top: -20, height: 'calc(100% + 20px)', paddingTop: 20 }}
        >
          {/* Content - slides out from behind NSL using transform */}
          <div className={`flex h-14 ${animate === 'in' ? 'anim-content-in' : 'anim-content-out'}`} style={{ paddingLeft: '96px' }}>
            {/* 2. Home Logo Box - use customization (patterns/gradients/custom fills) with team color fallback */}
            <div
              className="w-16 h-full flex items-center justify-center shrink-0"
              style={Object.keys(getStyle('home-logo-box')).length > 0 ? getStyle('home-logo-box') : { backgroundColor: home.color1 }}
            >
              {home.logo ? (
                <img src={home.logo} className="h-12 w-12 object-contain drop-shadow-sm" alt="Home" />
              ) : (
                <div className="h-12 w-12 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: home.color1 }}>
                  {home.shortName.slice(0, 2)}
                </div>
              )}
            </div>

            {/* 3. Home Team Name */}
            <div className="w-32 h-full flex flex-col shrink-0" style={getStyle('home-name-box')}>
              <div className="flex-1 flex items-center justify-center px-3 relative">
                {renderCards('home')}
                <span
                  className="font-black text-3xl tracking-tighter"
                  style={{ color: getColor('home-name-box') || '#000000', ...getFullTextStyle(customization, 'home-name-box') }}
                >
                  {home.shortName}
                </span>
              </div>
              <div className="h-1.5 flex w-full">
                <div className="w-1/2" style={{ backgroundColor: home.color1 }}></div>
                <div className="w-1/2" style={{ backgroundColor: home.color2 }}></div>
              </div>
            </div>

            {/* 4. Home Score */}
            <div className="w-16 h-full flex flex-col items-center justify-center shrink-0" style={scoreBoxStyle}>
              <span className="text-4xl text-center leading-none" style={{ color: getColor('score-box') || '#000000', ...getFullTextStyle(customization, 'score-box') }}>{home.score}</span>
              {isPenaltyShootout && (
                <span className="text-xs text-red-600 font-bold mt-0.5">({homePenScore})</span>
              )}
            </div>

            {/* 5. Away Score */}
            <div className="w-16 h-full flex flex-col items-center justify-center shrink-0 border-l border-white/40" style={scoreBoxStyle}>
              <span className="text-4xl text-center leading-none" style={{ color: getColor('score-box') || '#000000', ...getFullTextStyle(customization, 'score-box') }}>{away.score}</span>
              {isPenaltyShootout && (
                <span className="text-xs text-red-600 font-bold mt-0.5">({awayPenScore})</span>
              )}
            </div>

            {/* 6. Away Team Name */}
            <div className="w-32 h-full flex flex-col shrink-0" style={getStyle('away-name-box')}>
              <div className="flex-1 flex items-center justify-center px-3 relative">
                {renderCards('away')}
                <span
                  className="font-black text-3xl tracking-tighter"
                  style={{ color: getColor('away-name-box') || '#000000', ...getFullTextStyle(customization, 'away-name-box') }}
                >
                  {away.shortName}
                </span>
              </div>
              <div className="h-1.5 flex w-full">
                <div className="w-1/2" style={{ backgroundColor: away.color1 }}></div>
                <div className="w-1/2" style={{ backgroundColor: away.color2 }}></div>
              </div>
            </div>

            {/* 7. Away Logo Box - use customization (patterns/gradients/custom fills) with team color fallback */}
            <div
              className="w-16 h-full flex items-center justify-center shrink-0"
              style={Object.keys(getStyle('away-logo-box')).length > 0 ? getStyle('away-logo-box') : { backgroundColor: away.color1 }}
            >
              {away.logo ? (
                <img src={away.logo} className="h-12 w-12 object-contain drop-shadow-sm" alt="Away" />
              ) : (
                <div className="h-12 w-12 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: away.color1 }}>
                  {away.shortName.slice(0, 2)}
                </div>
              )}
            </div>

            {/* 8. Timer / Period Indicator */}
            <div className="h-full w-28 flex items-center justify-center shrink-0 relative z-20" style={{ ...getStyle('timer-box'), paddingRight: 0, marginRight: 0 }}>
              {/* Show period text for break periods, timer for playing periods */}
              {['ht', 'ft', 'etht', 'aet', 'pen'].includes(period) ? (
                <span className="font-bold text-2xl tracking-tight" style={{ color: getColor('timer-box') || '#ffffff' }}>
                  {period === 'ht' ? 'HT' : 
                   period === 'ft' ? 'FT' : 
                   period === 'etht' ? 'ET-HT' : 
                   period === 'aet' ? 'AET' : 
                   period === 'pen' ? 'PEN' : period.toUpperCase()}
                </span>
              ) : (
                <span className="font-bold text-3xl tracking-tight" style={{ color: getColor('timer-box') || '#ffffff' }}>{mins}:{secs}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* 9. Extra Time - positioned exactly at timer's right edge, flush with no gap */}
        {showExtra && (
          <div 
            className={`absolute top-0 h-14 w-14 flex items-center justify-center z-10 ${extraAnim === 'in' ? 'anim-extra-in' : extraAnim === 'out' ? 'anim-extra-out' : ''}`}
            style={{ 
              ...getStyle('extra-time-box'), 
              left: `${BAR_WIDTH}px`,
              margin: '0',
              border: 'none',
              boxSizing: 'border-box'
            }}
          >
            <span className="font-bold text-2xl" style={{ color: getColor('extra-time-box') || '#000000' }}>+{displayExtra}</span>
          </div>
        )}

        {/* 1. League Logo - NSL (drops in center, then slides left) - on top of everything */}
        <div 
          className={`absolute top-0 left-0 h-full w-24 flex items-center justify-center z-50 px-1 ${animate === 'in' ? 'anim-nsl-in' : 'anim-nsl-out'}`}
          style={leagueLogo ? { ...getStyle('league-box'), overflow: 'hidden' } : { backgroundColor: leagueColor || NSL_COLORS.red, overflow: 'hidden' }}
        >
          {leagueLogo ? (
            <img 
              src={leagueLogo} 
              alt={leagueName} 
              className="h-10 w-auto max-w-[5rem] object-contain drop-shadow-md"
            />
          ) : (
            <span 
              className="text-center leading-tight italic text-white"
              style={{ 
                fontFamily: "'Snasm', var(--font-bebas), sans-serif",
                fontSize: (leagueShortName || leagueName).length <= 3 ? '2.25rem' : (leagueShortName || leagueName).length <= 5 ? '1.5rem' : (leagueShortName || leagueName).length <= 8 ? '1rem' : '0.75rem',
                wordBreak: 'break-word',
                maxWidth: '100%',
                letterSpacing: '-0.02em',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {(leagueShortName || leagueName).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveScoreBug;
