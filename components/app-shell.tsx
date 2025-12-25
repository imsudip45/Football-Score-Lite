"use client"
import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { Sidebar } from "./sidebar"
import { Tournaments } from "./pages/tournaments"
import { Fixtures } from "./pages/fixtures"
import { LineupSetup } from "./pages/lineup-setup"
import { LiveControl } from "./pages/live-control"
import { FootballGraphicsControl } from "./pages/football-graphics-control"
import { Assets } from "./pages/assets"
import { Settings } from "./pages/settings"
import { GraphicsCustomization } from "./pages/graphics-customization"
import { SportSelector } from "./sport-selector"
import { MatchRecoveryModal } from "./match-recovery-modal"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useWebSocket } from "@/hooks/use-websocket"
import { Toaster } from "sonner"
import { getInterruptedMatches, abandonMatch } from "@/lib/database"
import { validateMatchData, type MatchValidationResult } from "@/lib/database-error-handler"
import type { Match } from "@/lib/types"

export function AppShell() {
  const { 
    currentPage, 
    sidebarCollapsed, 
    sportType,
    setCurrentMatch,
    setCurrentPage,
    setMatchTime,
    setTimerRunning,
  } = useAppStore()
  
  // Recovery state - Requirements 2.1, 2.2
  const [interruptedMatch, setInterruptedMatch] = useState<Match | null>(null)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [recoveryChecked, setRecoveryChecked] = useState(false)
  // Corrupted data state - Requirements 12.2
  const [matchValidation, setMatchValidation] = useState<MatchValidationResult | null>(null)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()
  // Initialize WebSocket connection
  useWebSocket()

  // Check for interrupted matches on app startup - Requirements 2.1, 12.2
  useEffect(() => {
    const checkForInterruptedMatches = async () => {
      try {
        const interrupted = await getInterruptedMatches()
        if (interrupted.length > 0) {
          const match = interrupted[0]
          
          // Validate match data on load - Requirements 12.2
          const validation = validateMatchData(match)
          setMatchValidation(validation)
          
          // Store the first interrupted match and show recovery modal
          setInterruptedMatch(match)
          setShowRecoveryModal(true)
          
          // Show warning if data is incomplete but still usable
          if (validation.warnings.length > 0) {
            console.warn("[AppShell] Match data has warnings:", validation.warnings)
          }
        }
      } catch (error) {
        console.error("Error checking for interrupted matches:", error)
      } finally {
        setRecoveryChecked(true)
      }
    }

    // Only check once on mount
    if (!recoveryChecked) {
      checkForInterruptedMatches()
    }
  }, [recoveryChecked])

  // Handle resume action - Requirements 2.4
  const handleResume = () => {
    if (!interruptedMatch) return
    
    // Load match state from database to store
    setCurrentMatch(interruptedMatch)
    
    // Restore timer position
    if (interruptedMatch.matchTime !== undefined) {
      setMatchTime(interruptedMatch.matchTime)
    }
    
    // Start timer if it was running
    if (interruptedMatch.timerRunning) {
      setTimerRunning(true)
    }
    
    // Navigate to Live Control page
    setCurrentPage("live-control")
    
    // Close modal and clear interrupted match state
    setShowRecoveryModal(false)
    setInterruptedMatch(null)
  }

  // Handle discard action - Requirements 2.5
  const handleDiscard = async () => {
    if (!interruptedMatch) return
    
    try {
      // Mark match as abandoned in database
      await abandonMatch(interruptedMatch.id)
    } catch (error) {
      console.error("Error abandoning match:", error)
    }
    
    // Clear interrupted match state and close modal
    setShowRecoveryModal(false)
    setInterruptedMatch(null)
  }

  if (!sportType) {
    return (
      <>
        <SportSelector />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "glass-card border-border",
            style: {
              background: "var(--card)",
              color: "var(--card-foreground)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case "tournaments":
      case "teams":
        return <Tournaments />
      case "fixtures":
        return <Fixtures />
      case "lineup-setup":
        return <LineupSetup />
      case "live-control":
        return <LiveControl />
      case "graphics":
        return <FootballGraphicsControl />
      case "graphics-customization":
        return <GraphicsCustomization/>
      case "assets":
        return <Assets/>
      case "settings":
        return <Settings/>
      default:
        return <Tournaments/>
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <main
          className={`flex-1 overflow-auto pt-2 px-6 pb-6 transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-64"}`}
        >
          {renderPage()}
        </main>
      </div>
      
      {/* Recovery Modal - Requirements 2.2, 12.2 */}
      {interruptedMatch && (
        <MatchRecoveryModal
          open={showRecoveryModal}
          onOpenChange={setShowRecoveryModal}
          match={interruptedMatch}
          onResume={handleResume}
          onDiscard={handleDiscard}
          validation={matchValidation}
        />
      )}
      
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "glass-card border-border",
          style: {
            background: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
          },
        }}
      />
    </div>
  )
}
