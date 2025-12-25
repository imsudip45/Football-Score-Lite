"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Radio } from "lucide-react"

export interface GraphicsGroupBoxProps {
  title: string
  borderColor: string
  children: React.ReactNode
  activeGraphics: string[]
  icon: React.ReactNode
}

/**
 * Group box component with colored border and active indicator.
 * Used to group related graphics controls with visual feedback for active state.
 * 
 * Requirements: 4.1, 8.1 - Reusable component for graphics grouping
 * Requirements: 3.2, 3.3, 3.4, 3.5 - Active state indicators
 * Requirements: 7.2, 7.4 - Responsive layout adjustments for tablet and desktop
 * Requirements: Accessibility section - WCAG AA compliant with proper ARIA attributes
 */
export function GraphicsGroupBox({ 
  title, 
  borderColor, 
  children, 
  activeGraphics,
  icon
}: GraphicsGroupBoxProps) {
  const hasActive = activeGraphics.length > 0
  
  // Generate accessible description for screen readers
  const accessibleDescription = hasActive 
    ? `${title} graphics group, ${activeGraphics.length} active: ${activeGraphics.join(', ')}`
    : `${title} graphics group, no active graphics`
  
  return (
    <Card 
      className={`relative overflow-hidden transition-all ${hasActive ? 'ring-2' : ''}`} 
      style={{ 
        borderColor, 
        ...(hasActive ? { ringColor: borderColor } : {}) 
      }}
      data-testid="graphics-group-box"
      data-has-active={hasActive}
      data-border-color={borderColor}
      role="group"
      aria-label={accessibleDescription}
    >
      {/* Color bar - decorative, hidden from screen readers */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.5 lg:h-1" 
        style={{ backgroundColor: borderColor }}
        data-testid="color-bar"
        aria-hidden="true"
      />
      {/* Header - responsive padding */}
      <CardHeader className="pb-1.5 pt-2 lg:pb-2 lg:pt-3 px-2 lg:px-4">
        <div className="flex items-center justify-between gap-1">
          {/* Title with icon - responsive text and icon size */}
          <CardTitle className="text-xs lg:text-sm flex items-center gap-1 lg:gap-2 [&>svg]:h-3 [&>svg]:w-3 lg:[&>svg]:h-4 lg:[&>svg]:w-4">
            {/* Icon is decorative, title provides meaning */}
            <span aria-hidden="true">{icon}</span>
            <span className="truncate">{title}</span>
          </CardTitle>
          {/* Indicators section - responsive spacing */}
          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            {/* LIVE indicator - announces state changes to screen readers */}
            {hasActive && (
              <div 
                className="flex items-center gap-0.5 lg:gap-1" 
                data-testid="live-indicator"
                role="status"
                aria-live="polite"
                aria-label={`${title} is live with ${activeGraphics.length} active graphic${activeGraphics.length > 1 ? 's' : ''}`}
              >
                <Radio 
                  className="h-2.5 w-2.5 lg:h-3 lg:w-3 animate-pulse" 
                  style={{ color: borderColor }} 
                  aria-hidden="true"
                />
                <span className="text-[8px] lg:text-[10px] font-medium" style={{ color: borderColor }}>LIVE</span>
              </div>
            )}
            {/* Active graphics badges - responsive sizing, hide on very small screens */}
            {activeGraphics.length > 0 && (
              <div 
                className="hidden md:flex gap-0.5 lg:gap-1 flex-wrap max-w-[120px] lg:max-w-none" 
                data-testid="active-badges"
                aria-hidden="true"
              >
                {activeGraphics.map(g => (
                  <Badge 
                    key={g} 
                    className="text-[7px] lg:text-[9px] px-1 lg:px-1.5 py-0" 
                    style={{ backgroundColor: borderColor }}
                    data-testid={`badge-${g.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {/* Content - responsive padding */}
      <CardContent className="pb-2 lg:pb-3 px-2 lg:px-4" role="toolbar" aria-label={`${title} graphics controls`}>
        {children}
      </CardContent>
    </Card>
  )
}
