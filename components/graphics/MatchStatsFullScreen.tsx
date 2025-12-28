'use client';

import React from 'react';
import { useGraphicsCustomizationStore } from '@/lib/graphics-customization-store';
import {
  getTextColor,
  getFontSize,
  getTextStyle,
  getTextStyleCSS,
  getPatternStyleWithAnimation,
  getPatternAnimationCSS,
} from './customization-utils';

type AnimateState = 'in' | 'out';

export interface MatchStatsFullScreenProps {
  animate?: AnimateState;
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
  title?: string;
}

const TeamPanel = ({
  name,
  logo,
  color,
  side,
  style,
}: {
  name: string;
  logo?: string;
  color: string;
  side: 'left' | 'right';
  style?: React.CSSProperties;
}) => {
  return (
    <div
      className={`relative h-full ${side === 'left' ? 'rounded-l-[6px]' : 'rounded-r-[6px]'} overflow-hidden`}
      style={{ backgroundColor: color, ...style }}
    >
      {/* logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="w-[360px] h-[360px] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            draggable={false}
          />
        ) : (
          <div className="w-[360px] h-[360px] rounded-full bg-black/25 flex items-center justify-center">
            <span className="text-white/90 font-bold text-6xl tracking-widest">
              {name.slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatRow = ({
  label,
  home,
  away,
  labelStyle,
  valueStyle,
}: {
  label: string;
  home: number;
  away: number;
  labelStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
}) => {
  return (
    <div className="grid grid-cols-[140px_1fr_140px] items-center h-[74px] px-10">
      <div className="tabular-nums" style={valueStyle}>
        {home}
      </div>
      <div className="text-center uppercase" style={labelStyle}>
        {label}
      </div>
      <div className="text-right tabular-nums" style={valueStyle}>
        {away}
      </div>
    </div>
  );
};

export default function MatchStatsFullScreen({
  animate = 'in',
  homeTeam,
  awayTeam,
  stats,
  title = 'MATCH STATS',
}: MatchStatsFullScreenProps) {
  const customization = useGraphicsCustomizationStore((s) => (s as any).matchStatsFullScreen);

  const teamColors = {
    home: { primary: homeTeam.color, secondary: homeTeam.secondaryColor || homeTeam.color },
    away: { primary: awayTeam.color, secondary: awayTeam.secondaryColor || awayTeam.color },
  };

  const getStyle = (id: string) => getPatternStyleWithAnimation(customization, id, teamColors);
  const getColor = (id: string) => getTextColor(customization, id);
  const getFontSizeValue = (id: string) => getFontSize(customization, id);
  const getTextStyleValue = (id: string) => getTextStyleCSS(getTextStyle(customization, id));

  const valueStyle: React.CSSProperties = {
    color: getColor('stat-value') || '#111827',
    fontSize: `${getFontSizeValue('stat-value') || 54}px`,
    fontWeight: 800,
    ...getTextStyleValue('stat-value'),
  };

  const labelStyle: React.CSSProperties = {
    color: getColor('stat-label') || '#4b5563',
    fontSize: `${getFontSizeValue('stat-label') || 22}px`,
    letterSpacing: '0.18em',
    fontWeight: 600,
    ...getTextStyleValue('stat-label'),
  };

  const titleStyle: React.CSSProperties = {
    color: getColor('title-text') || '#ffffff',
    fontSize: `${getFontSizeValue('title-text') || 64}px`,
    ...getTextStyleValue('title-text'),
  };

  return (
    <div className={`w-[1920px] h-[1080px] relative overflow-hidden ${animate === 'out' ? 'anim-msfs-out' : 'anim-msfs-in'}`}>
      <style>{`
        ${getPatternAnimationCSS()}

        /* Fade-only IN/OUT (requested) */
        @keyframes msfsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes msfsFadeOut { from { opacity: 1; } to { opacity: 0; } }
        .anim-msfs-in { animation: msfsFadeIn 0.35s ease-out forwards; }
        .anim-msfs-out { animation: msfsFadeOut 0.35s ease-in forwards; }
      `}</style>

      {/* background */}
      <div className="absolute inset-0" style={getStyle('background')} />
      {Object.keys(getStyle('background-pattern')).length > 0 && (
        <div className="absolute inset-0" style={getStyle('background-pattern')} />
      )}

      {/* title */}
      <div className="absolute top-[70px] left-1/2 -translate-x-1/2">
        <div className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]" style={titleStyle}>
          {title}
        </div>
      </div>

      {/* main card */}
      <div className="absolute left-1/2 top-[170px] -translate-x-1/2 w-[1420px] h-[760px]">
        <div className="w-full h-full rounded-[8px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-[420px_580px_420px] h-full">
            <TeamPanel
              name={homeTeam.name}
              logo={homeTeam.logo}
              color={homeTeam.color}
              side="left"
              style={getStyle('home-panel')}
            />

            <div className="h-full relative" style={getStyle('card')}>
              <div className="absolute left-0 right-0 top-[88px] bottom-[88px]">
                <div className="h-full flex flex-col justify-center">
                  <StatRow label="Shots" home={stats.shots.home} away={stats.shots.away} labelStyle={labelStyle} valueStyle={valueStyle} />
                  <div className="h-[1px]" style={getStyle('divider')} />
                  <StatRow label="Shots On Target" home={stats.shotsOnTarget.home} away={stats.shotsOnTarget.away} labelStyle={labelStyle} valueStyle={valueStyle} />
                  <div className="h-[1px]" style={getStyle('divider')} />
                  <StatRow label="Foul" home={stats.fouls.home} away={stats.fouls.away} labelStyle={labelStyle} valueStyle={valueStyle} />
                  <div className="h-[1px]" style={getStyle('divider')} />
                  <StatRow label="Yellow Card" home={stats.yellowCards.home} away={stats.yellowCards.away} labelStyle={labelStyle} valueStyle={valueStyle} />
                  <div className="h-[1px]" style={getStyle('divider')} />
                  <StatRow label="Red Card" home={stats.redCards.home} away={stats.redCards.away} labelStyle={labelStyle} valueStyle={valueStyle} />
                  <div className="h-[1px]" style={getStyle('divider')} />
                  <StatRow label="Offside" home={stats.offsides.home} away={stats.offsides.away} labelStyle={labelStyle} valueStyle={valueStyle} />
                  <div className="h-[1px]" style={getStyle('divider')} />
                  <StatRow label="Corner" home={stats.corners.home} away={stats.corners.away} labelStyle={labelStyle} valueStyle={valueStyle} />
                </div>
              </div>
            </div>

            <TeamPanel
              name={awayTeam.name}
              logo={awayTeam.logo}
              color={awayTeam.color}
              side="right"
              style={getStyle('away-panel')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


