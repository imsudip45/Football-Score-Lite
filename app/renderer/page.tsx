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
import MatchStatsFullScreen from '@/components/graphics/MatchStatsFullScreen';
import { useGraphicsCustomizationSync } from '@/lib/graphics-customization-store';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import type { GraphicCustomization, GraphicPosition } from '@/lib/graphics-customization-store';

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8080';
  const host = window.location.hostname;
  // file:// in Electron production has empty hostname
  if (!host || host === 'localhost' || host === '127.0.0.1') return 'ws://localhost:8080';
  return `ws://${host}:8080`;
}

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
    tournamentShortName?: string;
    tournamentLogo?: string;
    tournamentColor?: string;
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
  matchStatsFullScreen: {
    visible: boolean;
    homeTeam: { name: string; logo?: string; color: string; secondaryColor?: string };
    awayTeam: { name: string; logo?: string; color: string; secondaryColor?: string };
    stats: {
      shots: { home: number; away: number };
      shotsOnTarget: { home: number; away: number };
      fouls: { home: number; away: number };
      yellowCards: { home: number; away: number };
      redCards: { home: number; away: number };
      offsides: { home: number; away: number };
      corners: { home: number; away: number };
    };
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
  lineup: { visible: false, team: 'home', teamName: '', teamColor: '#14b8a6', teamSecondaryColor: '#14b8a6', teamLogo: '', tournamentShortName: 'NSL', tournamentLogo: '', tournamentColor: '#EF3E42', formation: '4-3-3', players: [], subs: [], coach: '' },
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
  matchStatsFullScreen: {
    visible: false,
    homeTeam: { name: 'Home', color: '#A50044', secondaryColor: '#A50044', logo: '' },
    awayTeam: { name: 'Away', color: '#00529F', secondaryColor: '#00529F', logo: '' },
    stats: {
      shots: { home: 0, away: 0 },
      shotsOnTarget: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
      offsides: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
    },
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

  // Apply customization updates received via WebSocket (production-safe: works across file:// origins)
  const applyCustomizationFromWs = useCallback((incoming: any) => {
    if (!incoming) return;
    try {
      const storeAny = useGraphicsCustomizationStore as any;

      // Apply immediately (do not rely solely on localStorage, which may behave differently across
      // Electron/file:// and OBS Browser Source). Use merge mode so action functions remain.
      storeAny.setState?.(incoming, false);

      // Also persist so the renderer stays consistent across reloads.
      const version = storeAny.persist?.getOptions?.().version ?? 24;
      localStorage.setItem('localmatch-graphics-customization', JSON.stringify({ state: incoming, version }));
      storeAny.persist?.rehydrate?.();
    } catch (e) {
      console.warn('[Renderer] Failed to apply customization from WS:', e);
    }
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
    matchStatsFullScreen: 'hidden',
    matchOfficials: 'hidden',
  });

  const scoreBugCustomization = useGraphicsCustomizationStore((s) => s.scoreBug);
  const lowerThirdCustomization = useGraphicsCustomizationStore((s) => s.lowerThird);
  const goalHomeCustomization = useGraphicsCustomizationStore((s) => s.goalHome);
  const goalAwayCustomization = useGraphicsCustomizationStore((s) => s.goalAway);
  const cardHomeCustomization = useGraphicsCustomizationStore((s) => s.cardHome);
  const cardAwayCustomization = useGraphicsCustomizationStore((s) => s.cardAway);
  const substitutionHomeCustomization = useGraphicsCustomizationStore((s) => s.substitutionHome);
  const substitutionAwayCustomization = useGraphicsCustomizationStore((s) => s.substitutionAway);
  const nameplateHomeCustomization = useGraphicsCustomizationStore((s) => s.nameplateHome);
  const nameplateAwayCustomization = useGraphicsCustomizationStore((s) => s.nameplateAway);
  const vsGraphicCustomization = useGraphicsCustomizationStore((s) => s.vsGraphic);
  const lineupCustomization = useGraphicsCustomizationStore((s) => s.lineup);
  const breakingBannerCustomization = useGraphicsCustomizationStore((s) => s.breakingBanner);
  const matchStatsCustomization = useGraphicsCustomizationStore((s) => s.matchStats);
  const matchStatsFullScreenCustomization = useGraphicsCustomizationStore((s) => s.matchStatsFullScreen);
  const matchOfficialsCustomization = useGraphicsCustomizationStore((s) => s.matchOfficials);

  const getTransformOrigin = (pos?: Partial<GraphicPosition>): React.CSSProperties['transformOrigin'] => {
    const hasTop = pos?.top !== undefined;
    const hasBottom = pos?.bottom !== undefined;
    const hasLeft = pos?.left !== undefined;
    const hasRight = pos?.right !== undefined;

    const y = hasBottom && !hasTop ? 'bottom' : 'top';
    const x = hasRight && !hasLeft ? 'right' : 'left';
    return `${y} ${x}`;
  };

  const getWrapperStyle = (
    customization: GraphicCustomization | undefined,
    fallbackAnchors: Partial<GraphicPosition>,
    options?: { baseTransform?: string; transformOrigin?: React.CSSProperties['transformOrigin'] }
  ): React.CSSProperties => {
    const position = customization?.position;
    const scale = customization?.scale ?? 1;
    const opacity = customization?.opacity ?? 1;

    // Normalize anchors:
    // - If bottom is set, ignore top (prevents accidental pinning/stretching)
    // - If right is set, ignore left
    // This matches how the renderer wrappers were historically positioned.
    const resolvedBottom = position?.bottom ?? fallbackAnchors.bottom;
    const resolvedTop = resolvedBottom !== undefined ? undefined : (position?.top ?? fallbackAnchors.top);
    const resolvedRight = position?.right ?? fallbackAnchors.right;
    const resolvedLeft = resolvedRight !== undefined ? undefined : (position?.left ?? fallbackAnchors.left);

    const anchors: Partial<GraphicPosition> = {
      ...(resolvedTop !== undefined ? { top: resolvedTop } : {}),
      ...(resolvedBottom !== undefined ? { bottom: resolvedBottom } : {}),
      ...(resolvedLeft !== undefined ? { left: resolvedLeft } : {}),
      ...(resolvedRight !== undefined ? { right: resolvedRight } : {}),
    };

    const baseTransform = options?.baseTransform?.trim();
    const transform = baseTransform ? `${baseTransform} scale(${scale})` : `scale(${scale})`;

    return {
      ...anchors,
      overflow: 'visible',
      transform,
      transformOrigin: options?.transformOrigin ?? getTransformOrigin(position ?? fallbackAnchors),
      opacity,
    };
  };
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
    matchStatsFullScreen: false,
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
    matchStatsFullScreen: null,
    matchOfficials: null,
  });

  // Handle visibility changes with animation
  const updateAnimations = useCallback((newState: GraphicsState) => {
    const graphicKeys = ['scoreBug', 'lowerThird', 'ticker', 'breakingBanner', 'goal', 'card', 'substitution', 'vsGraphic', 'nameplate', 'lineup', 'matchStatsLowerThird', 'matchStatsFullScreen', 'matchOfficials'] as const;
    
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
              case 'matchStatsFullScreen': return 500; // Fade-only
              case 'matchOfficials': return 850; // Sidebar + content wipe out (+ container fade)
              case 'goal': return 600; // Wipe/slide out + container fade
              case 'card': return 600; // Wipe/slide out + container fade
              case 'substitution': return 600; // Wipe/slide out + container fade
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
      ws = new WebSocket(getWsUrl());
      
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
            if (msg.data.customization) {
              applyCustomizationFromWs(msg.data.customization);
            }
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
        fontFamily: 'var(--font-oswald), "Arial Narrow", sans-serif',
        overflow: 'visible', // Allow graphics to overflow during animations
      }}
    >
      {/* Score Bug - Top Left */}
      {shouldRender('scoreBug') && (
        <div
          className="absolute z-50"
          style={{
            ...(scoreBugCustomization?.position?.top !== undefined
              ? { top: scoreBugCustomization.position.top }
              : { top: 70 }),
            ...(scoreBugCustomization?.position?.bottom !== undefined
              ? { bottom: scoreBugCustomization.position.bottom }
              : {}),
            ...(scoreBugCustomization?.position?.left !== undefined
              ? { left: scoreBugCustomization.position.left }
              : { left: 64 }),
            ...(scoreBugCustomization?.position?.right !== undefined
              ? { right: scoreBugCustomization.position.right }
              : {}),
            overflow: 'visible',
            minWidth: '800px',
            position: 'relative',
            transform: `scale(${scoreBugCustomization?.scale ?? 1})`,
            transformOrigin: 'top left',
            opacity: scoreBugCustomization?.opacity ?? 1,
          }}
        >
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
        <div
          className="absolute z-40"
          style={getWrapperStyle(
            state.goal.team === 'home' ? goalHomeCustomization : goalAwayCustomization,
            { left: 64, bottom: 208 }
          )}
        >
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
        <div
          className="absolute z-40"
          style={getWrapperStyle(
            state.card.team === 'home' ? cardHomeCustomization : cardAwayCustomization,
            { left: 64, bottom: 208 }
          )}
        >
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
        <div
          className="absolute z-40"
          style={getWrapperStyle(
            state.substitution.team === 'home' ? substitutionHomeCustomization : substitutionAwayCustomization,
            { left: 64, bottom: 208 }
          )}
        >
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
        <div
          className="absolute z-40"
          style={getWrapperStyle(
            state.nameplate.team === 'home' ? nameplateHomeCustomization : nameplateAwayCustomization,
            { left: 64, bottom: 160 }
          )}
        >
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
        <div
          className="absolute z-30"
          style={getWrapperStyle(vsGraphicCustomization, { top: 0, left: 0, right: 0, bottom: 0 })}
        >
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
        <div
          className="absolute z-30"
          style={getWrapperStyle(lineupCustomization, { top: 0, left: 0, right: 0, bottom: 0 })}
        >
          <StartingLineup 
            animate={getAnimateState('lineup')}
            teamName={state.lineup.teamName}
            teamColor={state.lineup.teamColor}
            teamSecondaryColor={state.lineup.teamSecondaryColor}
            teamLogo={state.lineup.teamLogo}
            tournamentShortName={state.lineup.tournamentShortName}
            tournamentLogo={state.lineup.tournamentLogo}
            tournamentColor={state.lineup.tournamentColor}
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

      {/* Match Stats - Full Screen */}
      {shouldRender('matchStatsFullScreen') && (
        <div
          className="absolute z-30"
          style={getWrapperStyle(matchStatsFullScreenCustomization, { top: 0, left: 0, right: 0, bottom: 0 })}
        >
          <MatchStatsFullScreen
            animate={getAnimateState('matchStatsFullScreen')}
            homeTeam={state.matchStatsFullScreen.homeTeam}
            awayTeam={state.matchStatsFullScreen.awayTeam}
            stats={state.matchStatsFullScreen.stats}
          />
        </div>
      )}

      {/* Lower Third - Bottom Left */}
      {shouldRender('lowerThird') && (
        <div
          className="absolute z-40"
          style={getWrapperStyle(lowerThirdCustomization, { left: 64, bottom: 160 })}
        >
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
        <div
          className="absolute z-40 overflow-visible"
          style={getWrapperStyle(
            matchStatsCustomization,
            // Match Stats Lower Third is centered; left = center X in px
            { left: 960, bottom: 64 },
            { baseTransform: 'translateX(-50%)', transformOrigin: 'bottom center' }
          )}
        >
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
        <div
          className="absolute z-40"
          style={getWrapperStyle(matchOfficialsCustomization, { left: 64, bottom: 40 })}
        >
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
        <div
          className="absolute z-60"
          style={getWrapperStyle(breakingBannerCustomization, { left: 0, right: 0, bottom: 0 })}
        >
          <BreakingBanner 
            animate={getAnimateState('breakingBanner')}
            text={state.breakingBanner.text}
          />
        </div>
      )}
    </div>
  );
}
