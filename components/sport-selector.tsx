"use client"

import { useAppStore } from "@/lib/store"
import { SPORT_CONFIGS } from "@/lib/sport-config"
import type { SportType } from "@/lib/types"

export function SportSelector() {
  const { setSportType } = useAppStore()

  const handleSelect = (sport: SportType) => {
    setSportType(sport)
  }

  const sportOrder: SportType[] = ["futsal", "football"]

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="w-full max-w-2xl px-6">
        {/* Logo / Title */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <svg className="h-10 w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Football Score Pro</h1>
          <p className="text-lg text-primary font-medium">Lite</p>
          <p className="mt-2 text-muted-foreground">Match graphics controller for local tournaments</p>
        </div>

        {/* Sport Selection */}
        <div className="mb-8">
          <h2 className="mb-6 text-center text-lg font-medium text-foreground">Select your sport to get started</h2>
          <div className="grid grid-cols-2 gap-4">
            {sportOrder.map((sportType) => {
              const config = SPORT_CONFIGS[sportType]
              return (
                <button
                  key={config.type}
                  onClick={() => handleSelect(config.type)}
                  className="group relative flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                  {/* Sport Icon */}
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-secondary/50 text-5xl transition-transform group-hover:scale-110">
                    {config.type === "futsal" ? (
                      <svg className="h-14 w-14 text-primary" viewBox="0 0 24 24" fill="currentColor">
                        <rect
                          x="2"
                          y="6"
                          width="20"
                          height="12"
                          rx="2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ) : (
                      <svg className="h-14 w-14 text-primary" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-.52.07-1.06.07-1.59.07-.53 0-1.06 0-1.59-.07V17h3.18v2.93zM7 14.5L5.5 12 7 9.5h10l1.5 2.5-1.5 2.5H7zm5-9.43c.53 0 1.06 0 1.59.07V8h-3.18V5.07c.53-.07 1.06-.07 1.59-.07z" />
                      </svg>
                    )}
                  </div>

                  {/* Sport Name */}
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {config.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {config.minLineupSize === config.maxLineupSize
                        ? `${config.maxLineupSize}v${config.maxLineupSize}`
                        : `${config.minLineupSize}v${config.minLineupSize} to ${config.maxLineupSize}v${config.maxLineupSize}`}{" "}
                      • {config.defaultPeriodLength} min halves
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-xs font-medium text-primary">Click to select</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">You can change this later in Settings</p>
      </div>
    </div>
  )
}
