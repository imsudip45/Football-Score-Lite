'use client';

import type { FillConfig, ComponentStyle, TextStyle } from '@/lib/graphics-customization-store';

// Team colors interface for dynamic color resolution
export interface TeamColors {
  home?: { primary?: string; secondary?: string };
  away?: { primary?: string; secondary?: string };
  tournament?: string;
}

function isElectronRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    (
      !!(window as any).electronAPI ||
      (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent))
    )
  );
}

function toHttpAssetsUrl(src: string): string {
  // Convert app-assets://... to http://<host>:3002/app-assets/<rel>
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
}

function resolveAssetUrl(url?: string): string | undefined {
  if (!url) return url;
  // Electron can load app-assets:// directly; browsers cannot.
  if (!isElectronRuntime() && url.startsWith('app-assets://')) return toHttpAssetsUrl(url);
  return url;
}

// Resolve team color reference to actual color value
export function resolveTeamColor(
  useTeamColor: FillConfig['useTeamColor'],
  fallbackColor: string,
  teamColors?: TeamColors
): string {
  if (!useTeamColor || !teamColors) return fallbackColor;
  
  switch (useTeamColor) {
    case 'home1':
    case 'team1': // team1 defaults to home primary
      return teamColors.home?.primary || fallbackColor;
    case 'home2':
    case 'team2': // team2 defaults to home secondary
      return teamColors.home?.secondary || fallbackColor;
    case 'away1':
      return teamColors.away?.primary || fallbackColor;
    case 'away2':
      return teamColors.away?.secondary || fallbackColor;
    case 'tournament':
      return teamColors.tournament || fallbackColor;
    default:
      return fallbackColor;
  }
}

// Helper to generate CSS from FillConfig with optional team color resolution
export function getFillStyle(fill: FillConfig, teamColors?: TeamColors): React.CSSProperties {
  // Resolve the base color (may be a team color reference)
  const resolvedColor = resolveTeamColor(fill.useTeamColor, fill.color, teamColors);
  if (fill.type === 'solid') {
    return { backgroundColor: resolvedColor };
  }
  if (fill.type === 'gradient' && fill.gradient) {
    const { type, angle, stops } = fill.gradient;
    const stopsStr = stops.map(s => `${s.color} ${s.position}%`).join(', ');
    if (type === 'linear') {
      return { background: `linear-gradient(${angle}deg, ${stopsStr})` };
    }
    return { background: `radial-gradient(circle, ${stopsStr})` };
  }
  if (fill.type === 'pattern' && fill.pattern) {
    const { type, color, opacity, size, angle, customUrl } = fill.pattern;
    const baseColor = resolvedColor;
    
    if (type === 'custom' && customUrl) {
      const resolvedCustomUrl = resolveAssetUrl(customUrl);
      // For custom PNG patterns with transparent backgrounds
      // Use a semi-transparent overlay of the BASE COLOR to control opacity
      // This ensures the pattern fades into the background color, not white
      if (opacity < 1) {
        // Convert base color to rgba for the overlay
        const overlayOpacity = 1 - opacity;
        let overlayColor = `rgba(255, 255, 255, ${overlayOpacity})`; // fallback to white
        
        // Parse the base color to create an rgba overlay
        if (baseColor.startsWith('#')) {
          const r = parseInt(baseColor.slice(1, 3), 16);
          const g = parseInt(baseColor.slice(3, 5), 16);
          const b = parseInt(baseColor.slice(5, 7), 16);
          overlayColor = `rgba(${r}, ${g}, ${b}, ${overlayOpacity})`;
        } else if (baseColor.startsWith('rgb')) {
          // Handle rgb/rgba colors
          const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) {
            overlayColor = `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${overlayOpacity})`;
          }
        }
        
        return { 
          backgroundColor: baseColor,
          backgroundImage: `linear-gradient(${overlayColor}, ${overlayColor}), url(${resolvedCustomUrl})`,
          // IMPORTANT: Both layers need the same size for animation to work correctly
          // The overlay gradient will tile seamlessly, and the pattern will animate
          backgroundSize: `${size}px ${size}px, ${size}px ${size}px`,
          backgroundRepeat: 'repeat, repeat',
          backgroundPosition: '0 0, 0 0',
          '--pattern-opacity': opacity,
          '--pattern-url': `url(${resolvedCustomUrl})`,
          '--pattern-size': `${size}px`,
        } as React.CSSProperties;
      }
      
      // Full opacity - just show the pattern
      return { 
        backgroundColor: baseColor,
        backgroundImage: `url(${resolvedCustomUrl})`,
        backgroundSize: `${size}px ${size}px`,
        backgroundRepeat: 'repeat',
        backgroundPosition: '0 0',
        '--pattern-opacity': opacity,
        '--pattern-url': `url(${resolvedCustomUrl})`,
        '--pattern-size': `${size}px`,
      } as React.CSSProperties;
    }
    
    // Convert hex color to rgba with opacity
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const patternColor = color.startsWith('rgba') || color.startsWith('rgb') 
      ? color 
      : hexToRgba(color, opacity);
    
    if (type === 'stripes') {
      return {
        backgroundColor: baseColor,
        backgroundImage: `repeating-linear-gradient(${angle || 45}deg, transparent, transparent ${size/2}px, ${patternColor} ${size/2}px, ${patternColor} ${size}px)`
      };
    }
    if (type === 'dots') {
      const dotSize = Math.max(2, size / 10);
      return {
        backgroundColor: baseColor,
        backgroundImage: `radial-gradient(circle, ${patternColor} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${size}px ${size}px`
      };
    }
    if (type === 'chevron') {
      const strokeWidth = Math.max(2, size / 10);
      return {
        backgroundColor: baseColor,
        backgroundImage: `repeating-linear-gradient(${angle || 45}deg, ${patternColor} 0px, ${patternColor} ${strokeWidth}px, transparent ${strokeWidth}px, transparent ${size}px)`
      };
    }
    if (type === 'maze') {
      // Original maze/chevron pattern using SVG
      const darkerColor = hexToRgba(color.startsWith('#') ? color : '#000000', opacity);
      const svgPattern = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
          <rect width="${size}" height="${size}" fill="${baseColor}"/>
          <path d="M0 ${size/2} L${size/2} 0 L${size} ${size/2}" fill="none" stroke="${darkerColor}" stroke-width="${size/5}" stroke-linecap="square"/>
          <path d="M0 ${size*1.5} L${size/2} ${size} L${size} ${size*1.5}" fill="none" stroke="${darkerColor}" stroke-width="${size/5}" stroke-linecap="square"/>
        </svg>
      `.replace(/\s+/g, ' ').trim();
      const encodedSvg = encodeURIComponent(svgPattern);
      return {
        backgroundColor: baseColor,
        backgroundImage: `url("data:image/svg+xml,${encodedSvg}")`,
        backgroundSize: `${size}px ${size}px`,
        backgroundRepeat: 'repeat'
      };
    }
    if (type === 'grid') {
      return {
        backgroundColor: baseColor,
        backgroundImage: `linear-gradient(${patternColor} 1px, transparent 1px), linear-gradient(90deg, ${patternColor} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`
      };
    }
  }
  return { backgroundColor: resolvedColor };
}

// Helper to get component style from customization
export function getComponentStyle(customization: any, id: string, teamColors?: TeamColors): React.CSSProperties {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  return comp ? getFillStyle(comp.fill, teamColors) : {};
}

// Helper to get text color from customization
export function getTextColor(customization: any, id: string): string | undefined {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  return comp?.textColor;
}

// Helper to get font size from customization
export function getFontSize(customization: any, id: string): number | undefined {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  return comp?.fontSize;
}

// Helper to get text style from customization
export function getTextStyle(customization: any, id: string): TextStyle | undefined {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  return comp?.textStyle;
}

// Helper to convert TextStyle to React.CSSProperties
export function getTextStyleCSS(textStyle?: TextStyle): React.CSSProperties {
  if (!textStyle) return {};
  
  const style: React.CSSProperties = {};
  
  // Font weight mapping - always include if defined (even 'normal' to override defaults)
  if (textStyle.fontWeight !== undefined) {
    const weightMap: Record<string, number | string> = {
      'light': 300,
      'normal': 400,
      'medium': 500,
      'semibold': 600,
      'bold': 700,
      'extrabold': 800,
      'black': 900,
    };
    style.fontWeight = weightMap[textStyle.fontWeight] || textStyle.fontWeight;
  }
  
  // Font style (italic) - always include if defined
  if (textStyle.fontStyle !== undefined) {
    style.fontStyle = textStyle.fontStyle;
  }
  
  // Text transform - always include if defined (even 'none' to override defaults)
  if (textStyle.textTransform !== undefined) {
    style.textTransform = textStyle.textTransform === 'none' ? 'none' : textStyle.textTransform;
  }
  
  // Letter spacing (in em) - always include if defined
  if (textStyle.letterSpacing !== undefined) {
    style.letterSpacing = `${textStyle.letterSpacing}em`;
  }
  
  // Text decoration - always include if defined
  if (textStyle.textDecoration !== undefined) {
    style.textDecoration = textStyle.textDecoration === 'none' ? 'none' : textStyle.textDecoration;
  }
  
  // Text shadow
  if (textStyle.textShadow) {
    style.textShadow = '0 2px 4px rgba(0,0,0,0.3)';
  }
  
  return style;
}

// Combined helper to get all text-related styles at once
export function getFullTextStyle(customization: any, id: string): React.CSSProperties {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  if (!comp) return {};
  
  const style: React.CSSProperties = {};
  
  // Add text color
  if (comp.textColor) {
    style.color = comp.textColor;
  }
  
  // Add font size
  if (comp.fontSize) {
    style.fontSize = `${comp.fontSize}px`;
  }
  
  // Add text style properties
  const textStyleCSS = getTextStyleCSS(comp.textStyle);
  Object.assign(style, textStyleCSS);
  
  return style;
}

// Helper to get pattern animation CSS
export function getPatternAnimation(customization: any, id: string): { 
  animationName?: string; 
  animationDuration?: string;
  animationTimingFunction?: string;
  animationIterationCount?: string;
} {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  const pattern = comp?.fill?.pattern;
  
  if (!pattern?.animation?.enabled || pattern.animation.direction === 'none') {
    return {};
  }
  
  const { direction, speed } = pattern.animation;
  const animationName = `pattern-move-${direction}`;
  
  return {
    animationName,
    animationDuration: `${speed}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  };
}

// Generate CSS keyframes for pattern animations (to be injected into component)
export function getPatternAnimationKeyframes(size: number = 40): string {
  return `
    @keyframes pattern-move-up { 
      0% { background-position: 0 0; } 
      100% { background-position: 0 -${size}px; } 
    }
    @keyframes pattern-move-down { 
      0% { background-position: 0 0; } 
      100% { background-position: 0 ${size}px; } 
    }
    @keyframes pattern-move-left { 
      0% { background-position: 0 0; } 
      100% { background-position: -${size}px 0; } 
    }
    @keyframes pattern-move-right { 
      0% { background-position: 0 0; } 
      100% { background-position: ${size}px 0; } 
    }
  `;
}

// Helper to get pattern config from customization
export function getPatternConfig(customization: any, id: string) {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  return comp?.fill?.pattern;
}

// Helper to check if a component has a custom pattern with opacity
export function hasCustomPatternWithOpacity(customization: any, id: string): boolean {
  const pattern = getPatternConfig(customization, id);
  return pattern?.type === 'custom' && pattern?.customUrl && pattern?.opacity < 1;
}

// Generate CSS for custom pattern overlay (to be used with position: relative container)
// Usage: Add this as a ::before pseudo-element style
export function getCustomPatternOverlayCSS(pattern: any): string {
  if (!pattern || pattern.type !== 'custom' || !pattern.customUrl) return '';
  
  return `
    content: '';
    position: absolute;
    inset: 0;
    background-image: url(${pattern.customUrl});
    background-size: ${pattern.size}px ${pattern.size}px;
    background-repeat: repeat;
    opacity: ${pattern.opacity};
    pointer-events: none;
    ${pattern.animation?.enabled && pattern.animation.direction !== 'none' ? `
      animation: pattern-move-${pattern.animation.direction} ${pattern.animation.speed}s linear infinite;
    ` : ''}
  `;
}

// Get inline style for pattern with animation
export function getPatternStyleWithAnimation(customization: any, id: string, teamColors?: TeamColors): React.CSSProperties {
  const comp = customization?.components?.find((c: ComponentStyle) => c.id === id);
  if (!comp) return {};
  
  const baseStyle = getFillStyle(comp.fill, teamColors);
  const pattern = comp.fill?.pattern;
  
  if (comp.fill?.type === 'pattern' && pattern?.animation?.enabled && pattern.animation.direction !== 'none') {
    const size = pattern.size || 40;
    const speed = pattern.animation.speed || 4;
    const direction = pattern.animation.direction;
    
    // Check if this is a custom PNG pattern with opacity (has two background layers)
    const isCustomWithOpacity = pattern.type === 'custom' && pattern.customUrl && pattern.opacity < 1;
    
    // Use CSS custom properties for dynamic animation
    // The animation moves the background-position by the pattern size
    let animationValue = '';
    
    if (isCustomWithOpacity) {
      // For custom patterns with opacity overlay, use special animation that keeps overlay fixed
      switch (direction) {
        case 'up':
          animationValue = `patternAnimCustomUp ${speed}s linear infinite`;
          break;
        case 'down':
          animationValue = `patternAnimCustomDown ${speed}s linear infinite`;
          break;
        case 'left':
          animationValue = `patternAnimCustomLeft ${speed}s linear infinite`;
          break;
        case 'right':
          animationValue = `patternAnimCustomRight ${speed}s linear infinite`;
          break;
      }
    } else {
      // Standard single-layer pattern animation
      switch (direction) {
        case 'up':
          animationValue = `patternAnimUp ${speed}s linear infinite`;
          break;
        case 'down':
          animationValue = `patternAnimDown ${speed}s linear infinite`;
          break;
        case 'left':
          animationValue = `patternAnimLeft ${speed}s linear infinite`;
          break;
        case 'right':
          animationValue = `patternAnimRight ${speed}s linear infinite`;
          break;
      }
    }
    
    // Preserve all background properties and add animation
    // IMPORTANT: Don't use the 'background' shorthand if we have individual properties
    const animatedStyle: React.CSSProperties = {
      animation: animationValue,
    };
    // Add CSS custom property using type assertion
    (animatedStyle as any)['--pattern-anim-size'] = `${size}px`;
    
    // Copy individual background properties (avoid 'background' shorthand which can override everything)
    if (baseStyle.backgroundColor) animatedStyle.backgroundColor = baseStyle.backgroundColor;
    if (baseStyle.backgroundImage) animatedStyle.backgroundImage = baseStyle.backgroundImage;
    if (baseStyle.backgroundSize) animatedStyle.backgroundSize = baseStyle.backgroundSize;
    if (baseStyle.backgroundRepeat) animatedStyle.backgroundRepeat = baseStyle.backgroundRepeat;
    if (baseStyle.backgroundBlendMode) animatedStyle.backgroundBlendMode = baseStyle.backgroundBlendMode;
    
    // Set initial background-position for animation (important for gradients/patterns)
    // For custom patterns with opacity, we have two backgrounds so need two positions
    if (isCustomWithOpacity) {
      animatedStyle.backgroundPosition = '0 0, 0 0';
    } else {
      animatedStyle.backgroundPosition = baseStyle.backgroundPosition || '0 0';
    }
    
    // Only use 'background' shorthand if no individual properties exist
    if (baseStyle.background && !baseStyle.backgroundColor && !baseStyle.backgroundImage) {
      animatedStyle.background = baseStyle.background;
    }
    return animatedStyle;
  }
  
  return baseStyle;
}

// Generate dynamic keyframes CSS string for pattern animations
// This should be included in a <style> tag in components that use pattern animations
export function getPatternAnimationCSS(): string {
  return `
    @keyframes patternAnimUp {
      from { background-position: 0 0; }
      to { background-position: 0 calc(-1 * var(--pattern-anim-size, 40px)); }
    }
    @keyframes patternAnimDown {
      from { background-position: 0 0; }
      to { background-position: 0 var(--pattern-anim-size, 40px); }
    }
    @keyframes patternAnimLeft {
      from { background-position: 0 0; }
      to { background-position: calc(-1 * var(--pattern-anim-size, 40px)) 0; }
    }
    @keyframes patternAnimRight {
      from { background-position: 0 0; }
      to { background-position: var(--pattern-anim-size, 40px) 0; }
    }
    
    /* Custom pattern animations with opacity overlay - both layers move together */
    /* This keeps the overlay in sync with the pattern for seamless tiling */
    @keyframes patternAnimCustomUp {
      from { background-position: 0 0, 0 0; }
      to { background-position: 0 calc(-1 * var(--pattern-anim-size, 40px)), 0 calc(-1 * var(--pattern-anim-size, 40px)); }
    }
    @keyframes patternAnimCustomDown {
      from { background-position: 0 0, 0 0; }
      to { background-position: 0 var(--pattern-anim-size, 40px), 0 var(--pattern-anim-size, 40px); }
    }
    @keyframes patternAnimCustomLeft {
      from { background-position: 0 0, 0 0; }
      to { background-position: calc(-1 * var(--pattern-anim-size, 40px)) 0, calc(-1 * var(--pattern-anim-size, 40px)) 0; }
    }
    @keyframes patternAnimCustomRight {
      from { background-position: 0 0, 0 0; }
      to { background-position: var(--pattern-anim-size, 40px) 0, var(--pattern-anim-size, 40px) 0; }
    }
  `;
}
