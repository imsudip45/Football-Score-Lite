'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LiveScoreBug from '@/components/graphics/LiveScoreBug';
import SubstitutionOverlay from '@/components/graphics/SubstitutionOverlay';
import EventOverlay from '@/components/graphics/EventOverlay';
import VersusScreen from '@/components/graphics/VersusScreen';
import StartingLineup from '@/components/graphics/StartingLineup';
import LowerThird from '@/components/graphics/LowerThird';
import MatchStatsLowerThird from '@/components/graphics/MatchStatsLowerThird';
import BreakingBanner from '@/components/graphics/BreakingBanner';
import MatchOfficials from '@/components/graphics/MatchOfficials';
import { useGraphicsCustomizationSync } from '@/lib/graphics-customization-store';

const WS_URL = 'ws://localhost:8080';

interface GraphicsState {
  scoreBug: {
    visible: boolean;
    leagueName?: string;
    leagueShortName?: string;
    leagueLogo?: string;
    leagueColor?: string;
    homeTeam: { name: string; shortName: string; score: number; color: string; secondaryColor?: string; logo?: string; yellowCards?: number; redCards?: number };
    awayTeam: { name: string; shortName: string; score: number; color: string; secondaryColor?: string; logo?: string; yellowCards?: number; redCards?: number };
    timer: { minutes: number; seconds: number; period: string; extra?: number };
    penalties?: { home: number; away: number };
    possession?: 'home' | 'away' | null;
  };
  lowerThird: {
    visible: boolean;
    title: string;
    subtitle: string;
    teamColor: string;
  };
  ticker: {
    visible: boolean;
    items: { id: string; primary: string; secondary?: string }[];
    scrollSpeed: number;
  };
  breakingBanner: {
    visible: boolean;
    text: string;
  };
  goal: {
    visible: boolean;
    playerName: string;
    playerNumber: string;
    goalTime: string;
    teamColor: string;
    teamLogo?: string;
    isOwnGoal: boolean;
    isPenalty: boolean;
    team: 'home' | 'away';
    tournamentColor?: string;
    homeColors?: { primary: string; secondary: string };
    awayColors?: { primary: string; secondary: string };
  };
  card: {
    visible: boolean;
    playerName: string;
    playerNumber: string;
    cardType: 'yellow' | 'red';
    cardTime: string;
    teamColor: string;
    teamLogo?: string;
    team: 'home' | 'away';
    homeColors?: { primary: string; secondary: string };
    awayColors?: { primary: string; secondary: string };
  };
  substitution: {
    visible: boolean;
    playerIn: string;
    playerOut: string;
    numberIn: string;
    numberOut: string;
    teamColor: string;
    teamLogo?: string;
    team: 'home' | 'away';
    homeColors?: { primary: string; secondary: string };
    awayColors?: { primary: string; secondary: string };
  };
  vsGraphic: {
    visible: boolean;
    variant?: 'vs' | 'halftime' | 'fulltime';
    homeTeam: { name: string; color: string; secondaryColor?: string; logo?: string; score?: number };
    awayTeam: { name: string; color: string; secondaryColor?: string; logo?: string; score?: number };
    matchInfo: string;
    venue?: string;
    competition?: string;
    competitionLogo?: string;
    tournamentColor?: string;
  };
  nameplate: {
    visible: boolean;
    playerName: string;
    position: string;
    number: string;
    teamColor: string;
    teamLogo?: string;
    team: 'home' | 'away';
    homeColors?: { primary: string; secondary: string };
    awayColors?: { primary: string; secondary: string };
  };
  lineup: {
    visible: boolean;
    team: 'home' | 'away';
    teamName: string;
    teamColor: string;
    teamSecondaryColor?: string;
    teamLogo?: string;
    formation: string;
    players: any[];
    subs: any[];
    coach: string;
  };
  matchStatsLowerThird: {
    visible: boolean;
    homeTeam: { name: string; logo?: string; color: string; secondaryColor?: string; score: number; scorers?: string[] };
    awayTeam: { name: string; logo?: string; color: string; secondaryColor?: string; score: number; scorers?: string[] };
    leagueName?: string;
    leagueShortName?: string;
    leagueLogo?: string;
    leagueColor?: string;
    matchDay?: string;
    showScorers?: 'home' | 'away' | 'none';
    timer?: { minutes: number; seconds: number; isRunning: boolean; period: string };
  };
  matchOfficials: {
    visible: boolean;
    officials: { role: string; name: string }[];
    leagueName?: string;
    leagueLogo?: string;
    tournamentColor?: string;
  };
  customization?: any;
}

const defaultState: GraphicsState = {
  scoreBug: {
    visible: false,
    leagueName: 'NSL',
    leagueShortName: 'NSL',
    leagueLogo: '',
    leagueColor: '#EF3E42',
    homeTeam: { name: 'Home', shortName: 'HOM', score: 0, color: '#A50044', secondaryColor: '#A50044', logo: '', yellowCards: 0, redCards: 0 },
    awayTeam: { name: 'Away', shortName: 'AWY', score: 0, color: '#00529F', secondaryColor: '#00529F', logo: '', yellowCards: 0, redCards: 0 },
    timer: { minutes: 0, seconds: 0, period: '1st', extra: 0 },
    penalties: { home: 0, away: 0 },
    possession: null,
  },
  lowerThird: { visible: false, title: '', subtitle: '', teamColor: '#14b8a6' },
  ticker: { visible: false, items: [], scrollSpeed: 80 },
  breakingBanner: { visible: false, text: '' },
  goal: { visible: false, playerName: '', playerNumber: '', goalTime: '', teamColor: '#14b8a6', teamLogo: '', isOwnGoal: false, isPenalty: false, team: 'home' as 'home' | 'away', tournamentColor: '#EF3E42', homeColors: { primary: '#A50044', secondary: '#A50044' }, awayColors: { primary: '#00529F', secondary: '#00529F' } },
  card: { visible: false, playerName: '', playerNumber: '', cardType: 'yellow', cardTime: '', teamColor: '#14b8a6', teamLogo: '', team: 'home' as 'home' | 'away', homeColors: { primary: '#A50044', secondary: '#A50044' }, awayColors: { primary: '#00529F', secondary: '#00529F' } },
  substitution: { visible: false, playerIn: '', playerOut: '', numberIn: '', numberOut: '', teamColor: '#14b8a6', teamLogo: '', team: 'home' as 'home' | 'away', homeColors: { primary: '#A50044', secondary: '#A50044' }, awayColors: { primary: '#00529F', secondary: '#00529F' } },
  vsGraphic: { visible: false, variant: 'vs', homeTeam: { name: 'Home', color: '#A50044', secondaryColor: '#A50044', logo: '', score: 0 }, awayTeam: { name: 'Away', color: '#00529F', secondaryColor: '#00529F', logo: '', score: 0 }, matchInfo: '', competition: '', competitionLogo: '', tournamentColor: '' },
  nameplate: { visible: false, playerName: '', position: '', number: '', teamColor: '#14b8a6', teamLogo: '', team: 'home' as 'home' | 'away', homeColors: { primary: '#A50044', secondary: '#A50044' }, awayColors: { primary: '#00529F', secondary: '#00529F' } },
  lineup: { visible: false, team: 'home', teamName: '', teamColor: '#14b8a6', teamSecondaryColor: '#14b8a6', formation: '4-3-3', players: [], subs: [], coach: '' },
  matchStatsLowerThird: { 
    visible: false, 
    homeTeam: { name: 'Home', color: '#EF3E42', secondaryColor: '#EF3E42', score: 0, scorers: [] }, 
    awayTeam: { name: 'Away', color: '#004F9F', secondaryColor: '#004F9F', score: 0, scorers: [] },
    leagueName: 'LEAGUE',
    leagueShortName: 'NSL',
    leagueLogo: '',
    leagueColor: '#EF3E42',
    matchDay: 'MATCH DAY',
    showScorers: 'none'
  },
  matchOfficials: {
    visible: false,
    officials: [],
    leagueName: 'NSL',
    leagueLogo: '',
    tournamentColor: '#EF3E42',
  },
};

export default function RendererPage() {
  // Sync customization store across tabs/windows
  useEffect(() => {
    const cleanup = useGraphicsCustomizationSync();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const [state, setState] = useState<GraphicsState>(defaultState);
  const [animate, setAnimate] = useState<Record<string, 'in' | 'out' | 'hidden'>>({
    scoreBug: 'hidden',
    lowerThird: 'hidden',
    ticker: 'hidden',
    breakingBanner: 'hidden',
    goal: 'hidden',
    card: 'hidden',
    substitution: 'hidden',
    vsGraphic: 'hidden',
    nameplate: 'hidden',
    lineup: 'hidden',
    matchStatsLowerThird: 'hidden',
    matchOfficials: 'hidden',
  });
  const [prevVisible, setPrevVisible] = useState<Record<string, boolean>>({
    scoreBug: false,
    lowerThird: false,
    ticker: false,
    breakingBanner: false,
    goal: false,
    card: false,
    substitution: false,
    vsGraphic: false,
    nameplate: false,
    lineup: false,
    matchStatsLowerThird: false,
    matchOfficials: false,
  });
  
  // Track timeouts to clear them on rapid toggles
  const timeoutsRef = React.useRef<Record<string, NodeJS.Timeout | null>>({
    scoreBug: null,
    lowerThird: null,
    ticker: null,
    breakingBanner: null,
    goal: null,
    card: null,
    substitution: null,
    vsGraphic: null,
    nameplate: null,
    lineup: null,
    matchStatsLowerThird: null,
    matchOfficials: null,
  });

  // Handle visibility changes with animation
  const updateAnimations = useCallback((newState: GraphicsState) => {
    const graphicKeys = ['scoreBug', 'lowerThird', 'ticker', 'breakingBanner', 'goal', 'card', 'substitution', 'vsGraphic', 'nameplate', 'lineup', 'matchStatsLowerThird', 'matchOfficials'] as const;
    
    setPrevVisible(prev => {
      graphicKeys.forEach(key => {
        const isVisible = newState[key]?.visible;
        const wasVisible = prev[key];
        
        if (isVisible && !wasVisible) {
          // Becoming visible - clear any pending hide timeout and animate in
          if (timeoutsRef.current[key]) {
            clearTimeout(timeoutsRef.current[key]!);
            timeoutsRef.current[key] = null;
          }
          setAnimate(a => ({ ...a, [key]: 'in' }));
        } else if (!isVisible && wasVisible) {
          // Becoming hidden - animate out, then hide after animation
          if (timeoutsRef.current[key]) {
            clearTimeout(timeoutsRef.current[key]!);
          }
          setAnimate(a => ({ ...a, [key]: 'out' }));
          // Hide after animation completes - different graphics need different durations
          const getAnimationDuration = (graphicKey: string) => {
            switch (graphicKey) {
              case 'matchStatsLowerThird': return 4000; // Complex multi-phase animation (timer-out + merge + league exit)
              case 'vsGraphic': return 1500; // Slide out + container fade
              case 'lineup': return 1500; // Multiple elements + container fade
              case 'matchOfficials': return 1200; // Sidebar + content wipe out
              default: return 1000; // Standard graphics
            }
          };
          const animationDuration = getAnimationDuration(key);
          timeoutsRef.current[key] = setTimeout(() => {
            setAnimate(a => ({ ...a, [key]: 'hidden' }));
            timeoutsRef.current[key] = null;
          }, animationDuration);
        }
      });

      const newPrev = { ...prev };
      graphicKeys.forEach(key => {
        newPrev[key] = newState[key]?.visible || false;
      });
      return newPrev;
    });
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connect = () => {
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('[Renderer] Connected to WebSocket');
        ws?.send(JSON.stringify({ type: 'register', client: 'renderer-react' }));
        ws?.send(JSON.stringify({ type: 'REQUEST_STATE' }));
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'state' && msg.data) {
            console.log('[Renderer] Received state:', Object.keys(msg.data).filter(k => msg.data[k]?.visible));
            setState(prev => {
              const newState = { ...prev };
              
              // Merge each graphic's state
              Object.keys(msg.data).forEach(key => {
                if (newState[key as keyof GraphicsState] && msg.data[key]) {
                  // Special-case scoreBug: deep-merge teams so locally-maintained fields (e.g., card counts)
                  // aren't wiped by frequent timer/score updates that don't include those fields.
                  if (key === 'scoreBug') {
                    const prevSB = (newState as any).scoreBug;
                    const incomingSB = msg.data.scoreBug;
                    (newState as any).scoreBug = {
                      ...prevSB,
                      ...incomingSB,
                      homeTeam: { ...prevSB.homeTeam, ...(incomingSB?.homeTeam || {}) },
                      awayTeam: { ...prevSB.awayTeam, ...(incomingSB?.awayTeam || {}) },
                    };
                  } else {
                  (newState as any)[key] = { ...(newState as any)[key], ...msg.data[key] };
                }
                }
              });

              // Auto-accumulate team card counts for scorebug when a NEW card overlay is triggered.
              // (Control/server doesn't currently send aggregated card totals.)
              const prevCardVisible = prev.card?.visible;
              const nextCardVisible = newState.card?.visible;
              if (!prevCardVisible && nextCardVisible) {
                const team = newState.card?.team;
                const cardType = newState.card?.cardType;
                const isYellow = cardType === 'yellow';
                const isRed = cardType === 'red';
                if (team === 'home' || team === 'away') {
                  const teamObj = team === 'home' ? newState.scoreBug.homeTeam : newState.scoreBug.awayTeam;
                  if (isYellow) teamObj.yellowCards = (teamObj.yellowCards ?? 0) + 1;
                  if (isRed) teamObj.redCards = (teamObj.redCards ?? 0) + 1;
                }
              }
              
              updateAnimations(newState);
              return newState;
            });
          }
        } catch (e) {
          console.error('[Renderer] Parse error:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('[Renderer] Disconnected, reconnecting in 2s...');
        reconnectTimeout = setTimeout(connect, 2000);
      };
      
      ws.onerror = (err) => {
        console.error('[Renderer] WebSocket error:', err);
      };
    };
    
    connect();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [updateAnimations]);

  // Check if graphic should render (visible or animating out, but not if never shown)
  const shouldRender = (key: string) => {
    const animState = animate[key];
    // Render if animating in or out (but not if 'hidden' - never was shown or animation completed)
    return animState === 'in' || animState === 'out';
  };
  
  // Get animation state for component
  const getAnimateState = (key: string): 'in' | 'out' => {
    return animate[key] === 'in' ? 'in' : 'out';
  };

  return (
    <div 
      className="relative"
      style={{ 
        width: '1920px', 
        height: '1080px', 
        background: 'transparent',
        fontFamily: '"Oswald", "Arial Narrow", sans-serif',
        overflow: 'visible', // Allow graphics to overflow during animations
      }}
    >
      {/* Score Bug - Top Left */}
      {shouldRender('scoreBug') && (
        <div className="absolute top-12 left-16 z-50" style={{ overflow: 'visible', minWidth: '800px', position: 'relative' }}>
          <LiveScoreBug 
            animate={getAnimateState('scoreBug')}
            homeTeam={{
              shortName: state.scoreBug.homeTeam.shortName,
              score: state.scoreBug.homeTeam.score,
              logo: state.scoreBug.homeTeam.logo,
              color: state.scoreBug.homeTeam.color,
              secondaryColor: state.scoreBug.homeTeam.secondaryColor,
              yellowCards: state.scoreBug.homeTeam.yellowCards,
              redCards: state.scoreBug.homeTeam.redCards,
            }}
            awayTeam={{
              shortName: state.scoreBug.awayTeam.shortName,
              score: state.scoreBug.awayTeam.score,
              logo: state.scoreBug.awayTeam.logo,
              color: state.scoreBug.awayTeam.color,
              secondaryColor: state.scoreBug.awayTeam.secondaryColor,
              yellowCards: state.scoreBug.awayTeam.yellowCards,
              redCards: state.scoreBug.awayTeam.redCards,
            }}
            timer={{
              minutes: state.scoreBug.timer.minutes,
              seconds: state.scoreBug.timer.seconds,
              extra: state.scoreBug.timer.extra || 0,
              period: state.scoreBug.timer.period,
            }}
            penalties={{
              home: state.scoreBug.penalties?.home || 0,
              away: state.scoreBug.penalties?.away || 0,
            }}
            leagueName={state.scoreBug.leagueName || 'NSL'}
            leagueShortName={state.scoreBug.leagueShortName}
            leagueLogo={state.scoreBug.leagueLogo}
            leagueColor={state.scoreBug.leagueColor}
          />
        </div>
      )}

      {/* Goal Graphic - Bottom Left */}
      {shouldRender('goal') && (
        <div className="absolute bottom-52 left-16 z-40">
          <EventOverlay 
            animate={getAnimateState('goal')}
            variant="player-highlight"
            mainText={state.goal.playerNumber ? `${state.goal.playerNumber}. ${state.goal.playerName}` : state.goal.playerName}
            teamLogo={state.goal.teamLogo}
            teamColor={state.goal.teamColor}
            team={state.goal.team}
            homeColors={state.goal.homeColors}
            awayColors={state.goal.awayColors}
            tournamentColor={state.goal.tournamentColor}
          />
        </div>
      )}

      {/* Card Graphic - Bottom Left */}
      {shouldRender('card') && (
        <div className="absolute bottom-52 left-16 z-40">
          <EventOverlay 
            animate={getAnimateState('card')}
            variant={state.card.cardType === 'red' ? 'red-card' : 'yellow-card'}
            mainText={state.card.playerNumber ? `${state.card.playerNumber}. ${state.card.playerName}` : state.card.playerName}
            teamLogo={state.card.teamLogo}
            teamColor={state.card.teamColor}
            team={state.card.team}
            homeColors={state.card.homeColors}
            awayColors={state.card.awayColors}
          />
        </div>
      )}

      {/* Substitution Graphic - Bottom Left */}
      {shouldRender('substitution') && (
        <div className="absolute bottom-52 left-16 z-40">
          <SubstitutionOverlay 
            animate={getAnimateState('substitution')}
            playerIn={state.substitution.numberIn ? `${state.substitution.numberIn}. ${state.substitution.playerIn}` : state.substitution.playerIn}
            playerOut={state.substitution.numberOut ? `${state.substitution.numberOut}. ${state.substitution.playerOut}` : state.substitution.playerOut}
            teamLogo={state.substitution.teamLogo}
            teamColor={state.substitution.teamColor}
            team={state.substitution.team}
            homeColors={state.substitution.homeColors}
            awayColors={state.substitution.awayColors}
          />
        </div>
      )}

      {/* Nameplate - Bottom Left */}
      {shouldRender('nameplate') && (
        <div className="absolute bottom-40 left-16 z-40">
          <EventOverlay 
            animate={getAnimateState('nameplate')}
            variant="coach"
            mainText={state.nameplate.playerName}
            subText={state.nameplate.position}
            teamLogo={state.nameplate.teamLogo}
            teamColor={state.nameplate.teamColor}
            team={state.nameplate.team}
            homeColors={state.nameplate.homeColors}
            awayColors={state.nameplate.awayColors}
          />
        </div>
      )}

      {/* VS Graphic - Full Screen */}
      {shouldRender('vsGraphic') && (
        <div className="absolute inset-0 z-30">
          <VersusScreen 
            animate={getAnimateState('vsGraphic')}
            variant={state.vsGraphic.variant || 'vs'}
            homeTeam={{
              name: state.vsGraphic.homeTeam.name,
              color: state.vsGraphic.homeTeam.color,
              secondaryColor: state.vsGraphic.homeTeam.secondaryColor,
              logo: state.vsGraphic.homeTeam.logo,
              score: state.vsGraphic.homeTeam.score,
            }}
            awayTeam={{
              name: state.vsGraphic.awayTeam.name,
              color: state.vsGraphic.awayTeam.color,
              secondaryColor: state.vsGraphic.awayTeam.secondaryColor,
              logo: state.vsGraphic.awayTeam.logo,
              score: state.vsGraphic.awayTeam.score,
            }}
            matchInfo={state.vsGraphic.matchInfo || ''}
            competition={state.vsGraphic.competition || ''}
            competitionLogo={state.vsGraphic.competitionLogo || ''}
            tournamentColor={state.vsGraphic.tournamentColor}
          />
        </div>
      )}

      {/* Lineup - Full Screen */}
      {shouldRender('lineup') && (
        <div className="absolute inset-0 z-30">
          <StartingLineup 
            animate={getAnimateState('lineup')}
            teamName={state.lineup.teamName}
            teamColor={state.lineup.teamColor}
            teamSecondaryColor={state.lineup.teamSecondaryColor}
            teamLogo={state.lineup.teamLogo}
            formation={state.lineup.formation}
            players={state.lineup.players.map((p: any) => ({
              name: p.name,
              shortName: p.shortName,
              number: p.number,
              // Positions are now direct percentages (x=left%, y=top%)
              top: p.top || (p.position ? `${p.position.y}%` : '50%'),
              left: p.left || (p.position ? `${p.position.x}%` : '50%'),
              photo: p.photo,
            }))}
            subs={state.lineup.subs}
            coach={state.lineup.coach}
          />
        </div>
      )}

      {/* Lower Third - Bottom Left */}
      {shouldRender('lowerThird') && (
        <div className="absolute bottom-40 left-16 z-40">
          <LowerThird 
            animate={getAnimateState('lowerThird')}
            title={state.lowerThird.title}
            subtitle={state.lowerThird.subtitle}
            teamColor={state.lowerThird.teamColor}
          />
        </div>
      )}

      {/* Match Stats Lower Third - Bottom Center */}
      {shouldRender('matchStatsLowerThird') && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 overflow-visible">
          <MatchStatsLowerThird 
            animate={getAnimateState('matchStatsLowerThird')}
            homeTeam={{
              name: state.matchStatsLowerThird.homeTeam.name,
              logo: state.matchStatsLowerThird.homeTeam.logo,
              color: state.matchStatsLowerThird.homeTeam.color,
              secondaryColor: state.matchStatsLowerThird.homeTeam.secondaryColor,
              score: state.matchStatsLowerThird.homeTeam.score,
              scorers: state.matchStatsLowerThird.homeTeam.scorers,
            }}
            awayTeam={{
              name: state.matchStatsLowerThird.awayTeam.name,
              logo: state.matchStatsLowerThird.awayTeam.logo,
              color: state.matchStatsLowerThird.awayTeam.color,
              secondaryColor: state.matchStatsLowerThird.awayTeam.secondaryColor,
              score: state.matchStatsLowerThird.awayTeam.score,
              scorers: state.matchStatsLowerThird.awayTeam.scorers,
            }}
            leagueName={state.matchStatsLowerThird.leagueName}
            leagueShortName={state.matchStatsLowerThird.leagueShortName}
            leagueLogo={state.matchStatsLowerThird.leagueLogo}
            leagueColor={state.matchStatsLowerThird.leagueColor}
            matchDay={state.matchStatsLowerThird.matchDay}
            showScorers={state.matchStatsLowerThird.showScorers}
            timer={state.matchStatsLowerThird.timer}
          />
        </div>
      )}

      {/* Match Officials - Bottom Left (same position as cards/substitution) */}
      {shouldRender('matchOfficials') && (
        <div className="absolute bottom-10 left-16 z-40">
          <MatchOfficials 
            animate={getAnimateState('matchOfficials')}
            officials={state.matchOfficials.officials}
            leagueName={state.matchOfficials.leagueName}
            leagueLogo={state.matchOfficials.leagueLogo}
            tournamentColor={state.matchOfficials.tournamentColor}
          />
        </div>
      )}

      {/* Breaking Banner - Bottom */}
      {shouldRender('breakingBanner') && (
        <div className="absolute bottom-0 left-0 right-0 z-60">
          <BreakingBanner 
            animate={getAnimateState('breakingBanner')}
            text={state.breakingBanner.text}
          />
        </div>
      )}
    </div>
  );
}
