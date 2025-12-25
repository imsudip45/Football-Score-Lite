"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface GraphicTriggerButtonProps {
  /** Button label text */
  label: string
  /** Optional icon to display */
  icon?: React.ReactNode
  /** Whether the graphic is currently active/visible */
  isActive: boolean
  /** Whether there's a pending event for this graphic type */
  hasPending?: boolean
  /** Click handler */
  onClick: () => void
  /** Button variant for different graphic types */
  variant?: "default" | "primary" | "success" | "warning" | "danger"
  /** Additional class names */
  className?: string
  /** Whether the button is disabled */
  disabled?: boolean
  /** Reason for being disabled (shown in tooltip) */
  disabledReason?: string
}

const variantStyles = {
  default: {
    base: "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
    active: "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
  },
  primary: {
    base: "border-blue-500/30 text-foreground hover:bg-blue-500/20 hover:text-foreground",
    active: "bg-blue-500 text-white border-blue-500 hover:bg-blue-600",
  },
  success: {
    base: "border-green-500/30 text-foreground hover:bg-green-500/20 hover:text-foreground",
    active: "bg-green-500 text-white border-green-500 hover:bg-green-600",
  },
  warning: {
    base: "border-amber-500/30 text-foreground hover:bg-amber-500/20 hover:text-foreground",
    active: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600",
  },
  danger: {
    base: "border-red-500/30 text-foreground hover:bg-red-500/20 hover:text-foreground",
    active: "bg-red-500 text-white border-red-500 hover:bg-red-600",
  },
}

/**
 * GraphicTriggerButton - A button component for triggering broadcast graphics
 * 
 * Features:
 * - Active state styling with colored background when graphic is visible
 * - Pending indicator (pulsing badge/glow) when events need attention
 * - Accessible with proper focus states and aria labels
 * - Consistent styling with the rest of the Live Control page
 * - Responsive sizing for tablet (768px-1279px) and desktop (1280px+)
 * 
 * Accessibility Features:
 * - aria-pressed indicates toggle state for screen readers
 * - aria-label provides full context including active/pending/disabled states
 * - focus-visible ring for keyboard navigation visibility
 * - Decorative elements (icons, indicators) marked with aria-hidden
 * - Keyboard accessible (Enter/Space to activate)
 * - Color contrast meets WCAG AA standards
 * 
 * Requirements: 7.2, 7.4 - Responsive layout adjustments
 * Requirements: Accessibility section - WCAG AA compliant
 */
export function GraphicTriggerButton({
  label,
  icon,
  isActive,
  hasPending = false,
  onClick,
  variant = "default",
  className,
  disabled = false,
  disabledReason,
}: GraphicTriggerButtonProps) {
  const styles = variantStyles[variant]

  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      aria-label={`${label}${isActive ? " (active)" : ""}${hasPending ? " (pending event)" : ""}${disabled && disabledReason ? ` (${disabledReason})` : ""}`}
      data-testid={`graphic-trigger-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        // Base styles with responsive sizing
        // Requirements: 7.2 - Small button sizes appropriate for quick access
        "relative font-medium transition-all duration-200",
        // Responsive height: smaller on tablet, normal on desktop
        "h-7 lg:h-8",
        // Responsive padding: tighter on tablet, normal on desktop
        "px-2 lg:px-3",
        // Responsive gap
        "gap-1 lg:gap-1.5",
        // Focus states for accessibility
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Variant-specific styles
        isActive ? styles.active : styles.base,
        // Pending indicator glow
        hasPending && !isActive && "ring-2 ring-amber-500/50 animate-pulse",
        // Disabled styling
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Pending indicator badge */}
      {hasPending && (
        <span
          className={cn(
            "absolute -top-1 -right-1 rounded-full",
            // Responsive badge size
            "h-2 w-2 lg:h-2.5 lg:w-2.5",
            "bg-amber-500 animate-pulse",
            "ring-2 ring-background"
          )}
          aria-hidden="true"
        />
      )}
      
      {/* Icon - decorative, responsive sizing */}
      {icon && (
        <span 
          className="shrink-0 [&>svg]:h-3 [&>svg]:w-3 lg:[&>svg]:h-3.5 lg:[&>svg]:w-3.5"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      
      {/* Label - responsive text size */}
      <span className="truncate text-[10px] lg:text-xs">{label}</span>
      
      {/* Active indicator dot - responsive sizing */}
      {isActive && (
        <span
          className="h-1 w-1 lg:h-1.5 lg:w-1.5 rounded-full bg-current animate-pulse ml-0.5"
          aria-hidden="true"
        />
      )}
    </Button>
  )

  // Wrap in tooltip if disabled with a reason
  // Error Handling: Show tooltip explaining why button is disabled
  if (disabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">{button}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

export default GraphicTriggerButton
