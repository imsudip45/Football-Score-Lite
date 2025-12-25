"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"

export function useKeyboardShortcuts() {
  const { timerRunning, setTimerRunning, currentMatch, updateMatch, setCurrentPage, createNewMatch, undo, redo } =
    useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      // Ctrl/Cmd + N - New Match
      if (isMod && e.key === "n") {
        e.preventDefault()
        createNewMatch()
        setCurrentPage("match-setup")
      }

      // Ctrl/Cmd + S - Save (placeholder)
      if (isMod && e.key === "s") {
        e.preventDefault()
        // Save is automatic with persist
      }

      // Ctrl/Cmd + Z - Undo
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Ctrl/Cmd + Shift + Z - Redo
      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault()
        redo()
      }

      // Space - Toggle Timer
      if (e.key === " " && !isMod) {
        e.preventDefault()
        setTimerRunning(!timerRunning)
      }

      // 1 - Home Score +
      if (e.key === "1" && !e.shiftKey && !isMod) {
        e.preventDefault()
        if (currentMatch) {
          updateMatch({ homeScore: currentMatch.homeScore + 1 })
        }
      }

      // Shift + 1 - Home Score -
      if (e.key === "!" || (e.key === "1" && e.shiftKey)) {
        e.preventDefault()
        if (currentMatch) {
          updateMatch({ homeScore: Math.max(0, currentMatch.homeScore - 1) })
        }
      }

      // 2 - Away Score +
      if (e.key === "2" && !e.shiftKey && !isMod) {
        e.preventDefault()
        if (currentMatch) {
          updateMatch({ awayScore: currentMatch.awayScore + 1 })
        }
      }

      // Shift + 2 - Away Score -
      if (e.key === "@" || (e.key === "2" && e.shiftKey)) {
        e.preventDefault()
        if (currentMatch) {
          updateMatch({ awayScore: Math.max(0, currentMatch.awayScore - 1) })
        }
      }

      // L - Lower Third (go to live control)
      if (e.key === "l" && !isMod) {
        e.preventDefault()
        setCurrentPage("live-control")
      }

      // T - Ticker (go to graphics)
      if (e.key === "t" && !isMod) {
        e.preventDefault()
        setCurrentPage("graphics")
      }

      // B - Breaking Banner
      if (e.key === "b" && !isMod) {
        e.preventDefault()
        setCurrentPage("graphics")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [timerRunning, setTimerRunning, currentMatch, updateMatch, setCurrentPage, createNewMatch, undo, redo])
}
