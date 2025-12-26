'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import { getTextColor, getPatternStyleWithAnimation, getPatternAnimationCSS } from './customization-utils';

// Timer box animation variants
const timerVariants = {
  hidden: {
    y: 120,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
  exit: {
    y: 120,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: [0.7, 0, 0.84, 0] as [number, number, number, number],
    },
  },
};

// League badge animation variants (intro and outro)
const leagueIntroVariants = {
  hidden: { y: -60, opacity: 0, scale: 0.85 },
  enter: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { y: 160, opacity: 0, scale: 0.95, transition: { duration: 0.45, ease: [0.7, 0, 0.84, 0] as [number, number, number, number] } },
};

const leagueOutroVariants = {
  hidden: { scale: 0, opacity: 0 },
  enter: { scale: 1, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { y: 160, opacity: 0, scale: 0.95, transition: { duration: 0.45, ease: [0.7, 0, 0.84, 0] as [number, number, number, number] } },
};

// Logo center pop variants
const logosCenterVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] as [number, number, number, number] } },
};

// Logo split/merge variants
const logoSplitLeftVariants = {
  hidden: { x: 484, opacity: 0 },
  split: { x: 0, opacity: 1, transition: { duration: 0.95, ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number] } },
  merge: { x: 484, opacity: 1, transition: { duration: 0.95, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

const logoSplitRightVariants = {
  hidden: { x: -484, opacity: 0 },
  split: { x: 0, opacity: 1, transition: { duration: 0.95, ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number] } },
  merge: { x: -484, opacity: 1, transition: { duration: 0.95, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

// Center bar visibility
const centerBarVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// Scorers slide variants
const scorersVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { y: 40, opacity: 0, transition: { duration: 0.25, ease: [0.7, 0, 0.84, 0] as [number, number, number, number] } },
};

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
      // scorers-out (scorers go down first) -> timer-out -> logos-merge -> logos-center-out -> league-in-out -> league-exit
      setPhase('scorers-out');
      const timer0 = setTimeout(() => setPhase('timer-out'), 400); // After scorers go down
      const timer1 = setTimeout(() => setPhase('logos-merge'), 700); // After timer box goes down (400 + 300)
      const timer2 = setTimeout(() => setPhase('logos-center-out'), 1600); // 700 + 900
      const timer3 = setTimeout(() => setPhase('league-in-out'), 2000); // After logos disappear
      const timer4 = setTimeout(() => setPhase('league-exit'), 2600); // Give league badge 600ms visible time (faster exit)
      
      return () => {
        clearTimeout(timer0);
        clearTimeout(timer1);
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
          src: url('./Snasm-W05-Regular.ttf') format('truetype');
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
        
        /* Dynamic pattern animation keyframes */
        ${getPatternAnimationCSS()}
      `}</style>

      {/* TIMER OVERLAY — kept outside bar to avoid clipping/stacking issues */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-[999] pointer-events-none overflow-visible" style={{ height: '200px' }}>
        <AnimatePresence initial={false}>
          {timer && (phase === 'logos-split' || phase === 'content') && (
            <motion.div
              key="timer-box"
              variants={timerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="h-10 flex items-center justify-center"
              style={{
                ...(Object.keys(getStyle('timer-box')).length > 0
                  ? getStyle('timer-box')
                  : { backgroundColor: '#292a2bff' }),
              }}
            >
              <span
                className="font-sans font-bold text-2xl tracking-wider"
                style={{ color: getColor('timer-box') || '#ffffff' }}
              >
                {timer.isRunning
                  ? `${String(timer.minutes).padStart(2, '0')}:${String(timer.seconds).padStart(2, '0')}`
                  : timer.period === 'ht'
                  ? 'HALF TIME'
                  : timer.period === 'ft'
                  ? 'FULL TIME'
                  : timer.period === 'pre'
                  ? 'PRE MATCH'
                  : timer.period === 'et1' || timer.period === 'et2'
                  ? 'EXTRA TIME'
                  : `${String(timer.minutes).padStart(2, '0')}:${String(timer.seconds).padStart(2, '0')}`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {(phase === 'league' || phase === 'league-out') && (
          <motion.div
            key="league-intro"
            className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center z-50 overflow-visible"
            variants={leagueIntroVariants}
            initial="hidden"
            animate={phase === 'league' ? 'enter' : 'exit'}
            exit="hidden"
          >
            <div
              className="px-8 h-20 flex items-center justify-center"
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
          </motion.div>
        )}

        {(phase === 'league-in-out' || phase === 'league-exit') && (
          <motion.div
            key="league-outro"
            className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center z-50 overflow-visible"
            variants={leagueOutroVariants}
            initial="hidden"
            animate={phase === 'league-in-out' ? 'enter' : 'exit'}
            exit="hidden"
          >
            <div
              className="px-8 h-20 flex items-center justify-center"
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        {(phase === 'logos-center' || phase === 'logos-center-out') && (
          <motion.div
            key="logos-center"
            className="absolute inset-0 flex items-center justify-center z-40 gap-2"
            variants={logosCenterVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div 
              className="w-28 h-20 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: homeTeam.color }}
            >
              {homeTeam.logo && (
                <img src={homeTeam.logo} alt="Home" className="h-16 w-16 object-contain drop-shadow-md" />
              )}
            </div>
            <div 
              className="w-28 h-20 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: awayTeam.color }}
            >
              {awayTeam.logo && (
                <img src={awayTeam.logo} alt="Away" className="h-16 w-16 object-contain drop-shadow-md" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content - visible during logos-split, content, timer-out, and logos-merge phases */}
      <div className={`w-full ${
        phase === 'league' || phase === 'league-out' || phase === 'logos-center' || 
        phase === 'logos-center-out' || phase === 'league-in-out' || phase === 'league-exit'
          ? 'opacity-0' : 'opacity-100'
      }`}>
        {/* Home Scorers - Attached to top of L3 (from logo box to team name area) */}
        <AnimatePresence initial={false} mode="wait">
          {(showScorers === 'home' || showScorers === 'both') && homeTeam.scorers && homeTeam.scorers.length > 0 && (phase === 'logos-split' || phase === 'content' || phase === 'scorers-out') && (
            <motion.div
              key="home-scorers"
              className="absolute bottom-full z-0 flex flex-col justify-center items-end shadow-sm min-h-[40px] left-28 right-[calc(50%+100px)] px-4 py-2 overflow-visible"
              style={Object.keys(getStyle('scorers-box')).length > 0 ? getStyle('scorers-box') : { backgroundColor: '#6D6E71' }}
              variants={scorersVariants}
              initial="hidden"
              animate={(phase === 'logos-split' || phase === 'content') ? 'visible' : 'exit'}
              exit="exit"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Away Scorers - Attached to top of L3 (from team name area to logo box) */}
        <AnimatePresence initial={false} mode="wait">
          {(showScorers === 'away' || showScorers === 'both') && awayTeam.scorers && awayTeam.scorers.length > 0 && (phase === 'logos-split' || phase === 'content' || phase === 'scorers-out') && (
            <motion.div
              key="away-scorers"
              className="absolute bottom-full z-0 flex flex-col justify-center items-start shadow-sm min-h-[40px] left-[calc(50%+100px)] right-28 px-4 py-2 overflow-visible"
              style={Object.keys(getStyle('scorers-box')).length > 0 ? getStyle('scorers-box') : { backgroundColor: '#6D6E71' }}
              variants={scorersVariants}
              initial="hidden"
              animate={(phase === 'logos-split' || phase === 'content') ? 'visible' : 'exit'}
              exit="exit"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Bar */}
        <div className="flex w-full h-20 z-10 overflow-visible">
          {/* Left Logo Box - always uses team color directly, full height */}
          <motion.div
            className="w-28 flex items-center justify-center relative shadow-[inset_-4px_0_10px_rgba(0,0,0,0.1)] z-20 overflow-visible"
            style={{ backgroundColor: homeTeam.color }}
            variants={logoSplitLeftVariants}
            initial="hidden"
            animate={
              phase === 'logos-merge' ? 'merge' :
              (phase === 'logos-split' || phase === 'content' || phase === 'scorers-out' || phase === 'timer-out') ? 'split' : 'hidden'
            }
          >
            {homeTeam.logo && (
              <img src={homeTeam.logo} alt="Home" className="h-16 w-16 object-contain drop-shadow-md relative z-10" />
            )}
          </motion.div>

          {/* Center Section - Team Names and Scores */}
          <motion.div 
            className="flex flex-1 h-full relative z-20 overflow-visible"
            style={Object.keys(getStyle('center-bar')).length > 0 ? getStyle('center-bar') : { backgroundColor: '#ffffff' }}
            variants={centerBarVariants}
            initial="hidden"
            animate={(phase === 'logos-split' || phase === 'content' || phase === 'scorers-out' || phase === 'timer-out' || phase === 'logos-merge') ? 'visible' : 'hidden'}
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

            {/* Score Block */}
            <div className="relative flex h-full gap-1 overflow-visible">
              <div 
                className="w-24 flex items-center justify-center relative z-10"
                style={Object.keys(getStyle('score-box')).length > 0 ? getStyle('score-box') : { backgroundColor: '#E6E7E8' }}
              >
                <span 
                  className="font-sans font-bold text-6xl pt-1"
                  style={{ color: getColor('score-box') || '#000000' }}
                >{homeTeam.score}</span>
              </div>
              <div 
                className="w-24 flex items-center justify-center relative z-10"
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
          </motion.div>

          {/* Right Logo Box - always uses team color directly, full height */}
          <motion.div
            className="w-28 flex items-center justify-center relative shadow-[inset_4px_0_10px_rgba(0,0,0,0.1)] z-20 overflow-visible"
            style={{ backgroundColor: awayTeam.color }}
            variants={logoSplitRightVariants}
            initial="hidden"
            animate={
              phase === 'logos-merge' ? 'merge' :
              (phase === 'logos-split' || phase === 'content' || phase === 'scorers-out' || phase === 'timer-out') ? 'split' : 'hidden'
            }
          >
            {awayTeam.logo && (
              <img src={awayTeam.logo} alt="Away" className="h-16 w-16 object-contain drop-shadow-md relative z-10" />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
