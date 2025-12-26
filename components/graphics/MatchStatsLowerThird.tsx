'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

interface MatchStatsLowerThirdProps {
  animate: 'in' | 'out';
  homeTeam: {
    name: string;
    logo?: string;
    color: string;
    secondaryColor?: string;
    score: number;
    scorers?: string[]; // e.g., ["Messi 25'", "Depaul 90+6'"]
  };
  awayTeam: {
    name: string;
    logo?: string;
    color: string;
    secondaryColor?: string;
    score: number;
    scorers?: string[];
  };
  leagueName?: string;
  leagueShortName?: string; // Short name for intro animation (e.g., "NSL", "EPL")
  leagueLogo?: string;
  leagueColor?: string;
  matchDay?: string;
  showScorers?: 'home' | 'away' | 'both' | 'none';
  timer?: {
    minutes: number;
    seconds: number;
    isRunning: boolean;
    period: string;
  };
}

export default function MatchStatsLowerThird({
  animate,
  homeTeam,
  awayTeam,
  leagueName = 'LEAGUE',
  leagueShortName = 'NSL',
  leagueLogo = '',
  leagueColor = '#EF3E42',
  matchDay = 'MATCH DAY',
  showScorers = 'none',
  timer,
}: MatchStatsLowerThirdProps) {
  const isIn = animate === 'in';
  
  // Animation phase state for intro/outro sequence
  // In: league -> league-out -> logos-center -> logos-split -> content
  // Out: scorers-out -> timer-out -> logos-merge -> logos-center-out -> league-in-out -> league-exit
  // Initialize with the correct starting phase based on animate prop
  const [phase, setPhase] = useState<
    'league' | 'league-out' | 'logos-center' | 'logos-split' | 'content' |
    'scorers-out' | 'timer-out' | 'logos-merge' | 'logos-center-out' | 'league-in-out' | 'league-exit'
  >(isIn ? 'league' : 'scorers-out');
  
  // Get customization from store
  const customization = useGraphicsCustomizationStore(state => state.matchStats);
  const scoreBugCustomization = useGraphicsCustomizationStore(state => state.scoreBug);
  
  // Create teamColors object for dynamic color resolution
  const teamColors = {
    home: { primary: homeTeam.color, secondary: homeTeam.secondaryColor || homeTeam.color },
    away: { primary: awayTeam.color, secondary: awayTeam.secondaryColor || awayTeam.color },
    tournament: leagueColor,
  };
  
  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);
  const getScoreBugStyle = (id: string) => getPatternStyleWithAnimation(scoreBugCustomization, id, teamColors);
  const getScoreBugColor = (id: string) => getTextColor(scoreBugCustomization, id);

  // Immediately set the starting phase when animate changes (before paint)
  useLayoutEffect(() => {
    if (isIn) {
      setPhase('league');
    } else {
      setPhase('scorers-out');
    }
  }, [isIn]);

  // Handle animation phases for intro/outro
  useEffect(() => {
    if (isIn) {
      // IN animation sequence (slowed down)
      setPhase('league');
      const timer1 = setTimeout(() => setPhase('league-out'), 400);
      const timer2 = setTimeout(() => setPhase('logos-center'), 900);
      const timer3 = setTimeout(() => setPhase('logos-split'), 1600);
      const timer4 = setTimeout(() => setPhase('content'), 2500);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    } else {
      // OUT animation sequence:
      // scorers-out (scorers + timer go down AND bar starts merging/clipping) -> logos-center-out -> league-in-out -> league-exit
      setPhase('scorers-out');
      const timer2 = setTimeout(() => setPhase('logos-center-out'), 900); // match logo merge/center clip out duration
      const timer3 = setTimeout(() => setPhase('league-in-out'), 1300); // 900 + 400 (logos-center-out)
      const timer4 = setTimeout(() => setPhase('league-exit'), 1900); // give league badge ~600ms then exit
      
      return () => {
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [isIn]);

  return (
    <div className="w-[1200px] font-sans flex flex-col items-center relative drop-shadow-2xl overflow-visible min-h-[80px]">
      <style>{`
        /* Custom font for tournament name - same as scorebug */
        @font-face {
          font-family: 'Snasm';
          src: url('/Snasm-W05-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        
        /* League badge intro animations */
        @keyframes leagueBadgeIn { 
          from { transform: translateY(-100%) scale(0.8); opacity: 0; } 
          to { transform: translateY(0) scale(1); opacity: 1; } 
        }
        @keyframes leagueBadgeOut { 
          from { transform: scale(1); opacity: 1; } 
          to { transform: scale(0.8); opacity: 0; } 
        }
        
        /* Logos center appear */
        @keyframes logosCenterIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        /* Logos split to sides - start from center (484px offset) and move to final position */
        @keyframes logoSplitLeft {
          from { transform: translateX(484px); }
          to { transform: translateX(0); }
        }
        @keyframes logoSplitRight {
          from { transform: translateX(-484px); }
          to { transform: translateX(0); }
        }
        
        /* Logos merge to center (reverse of split) - move 484px each to meet with small gap */
        @keyframes logoMergeLeft {
          from { transform: translateX(0); }
          to { transform: translateX(484px); }
        }
        @keyframes logoMergeRight {
          from { transform: translateX(0); }
          to { transform: translateX(-484px); }
        }
        
        /* Logos center out */
        @keyframes logosCenterOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0); opacity: 0; }
        }
        
        /* Logos exit up from center */
        @keyframes logosExitUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-150%); opacity: 0; }
        }
        
        /* League badge exit (slides down) */
        @keyframes leagueBadgeExit {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(150%); opacity: 0; }
        }
        
        /* League badge pop out (scale up from center) */
        @keyframes leagueBadgePopIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        /* Original animations */
        @keyframes ltPillarIn { from { transform: translateY(-120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes ltPillarOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-120%); opacity: 0; } }
        @keyframes ltCenterIn { from { clip-path: inset(0 50% 0 50%); } to { clip-path: inset(0 0 0 0); } }
        @keyframes ltCenterOut { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 50% 0 50%); } }

        @keyframes ltTopIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes ltTopOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }

        .anim-league-badge-in { animation: leagueBadgeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-league-badge-out { animation: leagueBadgeOut 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
        .anim-league-badge-exit { animation: leagueBadgeExit 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
        .anim-league-badge-pop-in { animation: leagueBadgePopIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-logos-center-in { animation: logosCenterIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-logos-center-out { animation: logosCenterOut 0.4s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
        .anim-logo-split-left { animation: logoSplitLeft 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-logo-split-right { animation: logoSplitRight 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-logo-merge-left { animation: logoMergeLeft 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .anim-logo-merge-right { animation: logoMergeRight 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .anim-logos-exit-up { animation: logosExitUp 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
        
        .anim-lt-pillar-in { animation: ltPillarIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .anim-lt-pillar-out { animation: ltPillarOut 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards 0.4s; }
        .anim-lt-center-in { animation: ltCenterIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; clip-path: inset(0 50% 0 50%); }
        .anim-lt-center-out { animation: ltCenterOut 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .anim-lt-top-in { animation: ltTopIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards 0s; transform: translateY(100%); opacity: 0; }
        .anim-lt-top-out { animation: ltTopOut 0.25s cubic-bezier(0.7, 0, 0.84, 0) forwards 0s; }
        
        /* Timer box animation - comes up with scorers during logos-split */
        @keyframes timerBoxIn {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes timerBoxOut {
           from { transform: translateY(0); }
           to   { transform: translateY(100%); }
         }
        /* Important: use fill-mode: both so the FIRST painted frame uses the 0% keyframe (prevents "flash") */
        .anim-timer-box-in { 
          transform: translateY(100%);
          animation: timerBoxIn 0.30s cubic-bezier(0.22, 1, 0.36, 1) both; 
          will-change: transform;
        }
        .anim-timer-box-out { 
          transform: translateY(0);
          animation: timerBoxOut 0.25s cubic-bezier(0.7, 0, 0.84, 0) both; 
          will-change: transform;
        }
        
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
      `}</style>

      {/* League Badge - IN: drops in then fades, OUT: appears then exits down */}
      {/* For IN animation: league (drop in) -> league-out (fade out) */}
      {(phase === 'league' || phase === 'league-out') && (
        <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center z-50 overflow-visible">
          <div
            className={`px-8 h-20 flex items-center justify-center ${
              phase === 'league' ? 'anim-league-badge-in' : 'anim-league-badge-out'
            }`}
            style={leagueLogo ? getScoreBugStyle('league-box') : { backgroundColor: leagueColor }}
          >
            {leagueLogo ? (
              <img 
                src={leagueLogo} 
                alt={leagueName} 
                className="h-16 w-auto object-contain drop-shadow-md"
              />
            ) : (
              <span 
                className="uppercase tracking-wider text-center italic font-bold text-white"
                style={{ 
                  fontFamily: "'Snasm', sans-serif",
                  fontSize: (leagueShortName || leagueName).length <= 3 ? '2.5rem' : (leagueShortName || leagueName).length <= 5 ? '1.75rem' : '1.25rem',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                {(leagueShortName || leagueName).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* For OUT animation: league-in-out (league pops in after logos disappear) -> league-exit (exit down) */}
      {(phase === 'league-in-out' || phase === 'league-exit') && (
        <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center z-50 overflow-visible">
          <div
            className={`px-8 h-20 flex items-center justify-center ${
              phase === 'league-in-out' ? 'anim-league-badge-pop-in' : 'anim-league-badge-exit'
            }`}
            style={leagueLogo ? getScoreBugStyle('league-box') : { backgroundColor: leagueColor }}
          >
            {leagueLogo ? (
              <img 
                src={leagueLogo} 
                alt={leagueName} 
                className="h-16 w-auto object-contain drop-shadow-md"
              />
            ) : (
              <span 
                className="uppercase tracking-wider text-center italic font-bold text-white"
                style={{ 
                  fontFamily: "'Snasm', sans-serif",
                  fontSize: (leagueShortName || leagueName).length <= 3 ? '2.5rem' : (leagueShortName || leagueName).length <= 5 ? '1.75rem' : '1.25rem',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                {(leagueShortName || leagueName).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Logo boxes in center - IN: appear then split, OUT: after merge, scale down */}
      {(phase === 'logos-center' || phase === 'logos-center-out') && (
        <div className="absolute inset-0 flex items-center justify-center z-40 gap-2">
          {/* Home Logo Box - always uses team color directly */}
          <div 
            className={`w-28 h-20 flex items-center justify-center shadow-lg ${
              phase === 'logos-center' ? 'anim-logos-center-in' : 'anim-logos-center-out'
            }`}
            style={{ backgroundColor: homeTeam.color }}
          >
            {homeTeam.logo && (
              <img src={homeTeam.logo} alt="Home" className="h-16 w-16 object-contain drop-shadow-md" />
            )}
          </div>
          {/* Away Logo Box - always uses team color directly */}
          <div 
            className={`w-28 h-20 flex items-center justify-center shadow-lg ${
              phase === 'logos-center' ? 'anim-logos-center-in' : 'anim-logos-center-out'
            }`}
            style={{ backgroundColor: awayTeam.color }}
          >
            {awayTeam.logo && (
              <img src={awayTeam.logo} alt="Away" className="h-16 w-16 object-contain drop-shadow-md" />
            )}
          </div>
        </div>
      )}

      {/* Timer overlay (kept OUTSIDE the center-bar clip-path to avoid IN clipping/popping) */}
      {(timer && (phase === 'logos-split' || phase === 'content' || phase === 'scorers-out')) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-10 w-[196px] h-10 overflow-hidden pointer-events-none"
          style={{ zIndex: 15 }}
        >
          <div
            className={`h-10 flex items-center justify-center ${
              (phase === 'logos-split' || phase === 'content')
                ? 'anim-timer-box-in'
                : phase === 'scorers-out'
                ? 'anim-timer-box-out'
                : ''
            }`}
            style={{
              ...(Object.keys(getStyle('timer-box')).length > 0 ? getStyle('timer-box') : { backgroundColor: '#292a2bff' }),
            }}
          >
            <span
              className="font-sans font-bold text-2xl tracking-wider"
              style={{ color: getColor('timer-box') || '#ffffff' }}
            >
              {timer.isRunning ? (
                `${String(timer.minutes).padStart(2, '0')}:${String(timer.seconds).padStart(2, '0')}`
              ) : (
                timer.period === 'ht' ? 'HALF TIME' :
                timer.period === 'ft' ? 'FULL TIME' :
                timer.period === 'pre' ? 'PRE MATCH' :
                timer.period === 'et1' ? 'EXTRA TIME' :
                timer.period === 'et2' ? 'EXTRA TIME' :
                `${String(timer.minutes).padStart(2, '0')}:${String(timer.seconds).padStart(2, '0')}`
              )}
            </span>
          </div>
        </div>
      )}

      {/* Main content - visible during logos-split, content, timer-out, and logos-merge phases */}
      <div className={`w-full ${
        phase === 'league' || phase === 'league-out' || phase === 'logos-center' || 
        phase === 'logos-center-out' || phase === 'league-in-out' || phase === 'league-exit'
          ? 'opacity-0' : 'opacity-100'
      }`}>
        {/* Home Scorers - Attached to top of L3 (from logo box to team name area) */}
        {(showScorers === 'home' || showScorers === 'both') && homeTeam.scorers && homeTeam.scorers.length > 0 && (
          <div
            className={`absolute bottom-full z-0 flex flex-col justify-center items-end shadow-sm min-h-[40px] left-28 right-[calc(50%+100px)] px-4 py-2 overflow-hidden ${
              phase === 'logos-split' || phase === 'content' ? 'anim-lt-top-in' : 
              phase === 'scorers-out' ? 'anim-lt-top-out' : 
              (phase === 'timer-out' || phase === 'logos-merge') ? 'opacity-0' : 'opacity-0'
            }`}
            style={Object.keys(getStyle('scorers-box')).length > 0 ? getStyle('scorers-box') : { backgroundColor: '#6D6E71' }}
          >
            {homeTeam.scorers.map((scorer, i) => (
              <div 
                key={i} 
                className="text-lg font-bold leading-snug tracking-wide whitespace-nowrap text-right w-full"
                style={{ color: getColor('scorers-box') || '#ffffff'}}
              >
                {scorer}
              </div>
            ))}
          </div>
        )}

        {/* Away Scorers - Attached to top of L3 (from team name area to logo box) */}
        {(showScorers === 'away' || showScorers === 'both') && awayTeam.scorers && awayTeam.scorers.length > 0 && (
          <div
            className={`absolute bottom-full z-0 flex flex-col justify-center items-start shadow-sm min-h-[40px] left-[calc(50%+100px)] right-28 px-4 py-2 overflow-hidden ${
              phase === 'logos-split' || phase === 'content' ? 'anim-lt-top-in' : 
              phase === 'scorers-out' ? 'anim-lt-top-out' : 
              (phase === 'timer-out' || phase === 'logos-merge') ? 'opacity-0' : 'opacity-0'
            }`}
            style={Object.keys(getStyle('scorers-box')).length > 0 ? getStyle('scorers-box') : { backgroundColor: '#6D6E71' }}
          >
            {awayTeam.scorers.map((scorer, i) => (
              <div 
                key={i} 
                className="text-lg font-bold leading-snug tracking-wide whitespace-nowrap text-left w-full"
                style={{ color: getColor('scorers-box') || '#ffffff'}}
              >
                {scorer}
              </div>
            ))}
          </div>
        )}

        {/* Main Bar */}
        <div className="flex w-full h-20 z-10">
          {/* Left Logo Box - always uses team color directly, full height */}
          <div
            className={`w-28 flex items-center justify-center relative shadow-[inset_-4px_0_10px_rgba(0,0,0,0.1)] z-20 overflow-hidden ${
              phase === 'logos-split' ? 'anim-logo-split-left' : 
              phase === 'content' ? '' :
              (phase === 'scorers-out' || phase === 'logos-merge') ? 'anim-logo-merge-left' :
              'opacity-0'
            }`}
            style={{ backgroundColor: homeTeam.color }}
          >
            {homeTeam.logo && (
              <img src={homeTeam.logo} alt="Home" className="h-16 w-16 object-contain drop-shadow-md relative z-10" />
            )}
          </div>

          {/* Center Section - Team Names and Scores */}
          <div 
            className={`flex flex-1 h-full relative z-20 ${
              phase === 'logos-split' ? 'anim-lt-center-in' : 
              phase === 'content' ? '' :
              (phase === 'scorers-out' || phase === 'logos-merge') ? 'anim-lt-center-out' :
              ''
            }`}
            style={{
              ...(Object.keys(getStyle('center-bar')).length > 0 ? getStyle('center-bar') : { backgroundColor: '#ffffff' }),
              clipPath: (phase !== 'logos-split' && phase !== 'content' && phase !== 'scorers-out' && phase !== 'timer-out' && phase !== 'logos-merge') ? 'inset(0 50% 0 50%)' : undefined
            }}
          >
            {/* Home Name */}
            <div className="flex-1 flex items-center justify-center">
              <span 
                className="font-sans font-bold text-4xl uppercase tracking-tight"
                style={{ color: getColor('center-bar') || '#000000' }}
              >
                {homeTeam.name}
              </span>
            </div>

            {/* Score Block with Timer Box above */}
            <div className="relative flex h-full gap-1">
              <div 
                className="w-24 flex items-center justify-center"
                style={Object.keys(getStyle('score-box')).length > 0 ? getStyle('score-box') : { backgroundColor: '#E6E7E8' }}
              >
                <span 
                  className="font-sans font-bold text-6xl pt-1"
                  style={{ color: getColor('score-box') || '#000000' }}
                >{homeTeam.score}</span>
              </div>
              <div 
                className="w-24 flex items-center justify-center"
                style={Object.keys(getStyle('score-box')).length > 0 ? getStyle('score-box') : { backgroundColor: '#E6E7E8' }}
              >
                <span 
                  className="font-sans font-bold text-6xl pt-1"
                  style={{ color: getColor('score-box') || '#000000' }}
                >{awayTeam.score}</span>
              </div>
            </div>

            {/* Away Name */}
            <div className="flex-1 flex items-center justify-center">
              <span 
                className="font-sans font-bold text-4xl uppercase tracking-tight"
                style={{ color: getColor('center-bar') || '#000000' }}
              >
                {awayTeam.name}
              </span>
            </div>
          </div>

          {/* Right Logo Box - always uses team color directly, full height */}
          <div
            className={`w-28 flex items-center justify-center relative shadow-[inset_4px_0_10px_rgba(0,0,0,0.1)] z-20 overflow-hidden ${
              phase === 'logos-split' ? 'anim-logo-split-right' : 
              phase === 'content' ? '' :
              (phase === 'scorers-out' || phase === 'logos-merge') ? 'anim-logo-merge-right' :
              'opacity-0'
            }`}
            style={{ backgroundColor: awayTeam.color }}
          >
            {awayTeam.logo && (
              <img src={awayTeam.logo} alt="Away" className="h-16 w-16 object-contain drop-shadow-md relative z-10" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
