"use client"

import type React from "react"

import { useAppStore } from "@/lib/store"
import type { NavigationPage } from "@/lib/types"
import {
  Trophy,
  FileEdit,
  Users,
  Gamepad2,
  MonitorPlay,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Custom VS Icon component using the vs.svg from public folder
const VSIcon = ({ className }: { className?: string }) => (
  <img src="./vs.svg" alt="VS" className={cn("object-contain", className)} />
)

const navItems: { id: NavigationPage; label: string; icon: React.ElementType | null; customIcon?: boolean }[] = [
  { id: "tournaments", label: "Tournaments & Teams", icon: Trophy },
  { id: "fixtures", label: "Fixtures & Officials", icon: null, customIcon: true },
  { id: "lineup-setup", label: "Match Setup", icon: FileEdit },
  { id: "live-control", label: "Live Control", icon: Gamepad2 },
  { id: "graphics", label: "Graphics Output", icon: MonitorPlay },
  { id: "graphics-customization", label: "Customize Graphics", icon: Palette },
  { id: "assets", label: "Assets", icon: FolderOpen },
  { id: "settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, canAccessPage } = useAppStore()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <svg className="h-5 w-5 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.5 8h-3l-1.5-3 1.5-2.5A8 8 0 0 1 18.5 10zM12 4a7.9 7.9 0 0 1 1.5.15L12 7l-1.5-2.85A7.9 7.9 0 0 1 12 4zM8.5 4.5L10 7 8.5 10h-3a8 8 0 0 1 3-5.5zM5 12a7.9 7.9 0 0 1 .5-2.5h3L10 12l-1.5 2.5h-3A7.9 7.9 0 0 1 5 12zm3.5 7.5L10 17l1.5 2.85A7.9 7.9 0 0 1 10 20a8 8 0 0 1-1.5-.5zm6.5.5a7.9 7.9 0 0 1-1.5-.15L12 17l1.5 2.85a7.9 7.9 0 0 1 1 .15zm3-2L15 17l1.5-2.5h3a8 8 0 0 1-3 5.5zm.5-5.5h-3L14 10l1.5-2.5h3A7.9 7.9 0 0 1 19 12z" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Football Score Pro</span>
            <span className="text-xs text-primary">Lite</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          const isLocked = !canAccessPage(item.id)
          
          return (
            <button
              key={item.id}
              onClick={() => !isLocked && setCurrentPage(item.id)}
              disabled={isLocked}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
                "hover:bg-sidebar-accent",
                isActive ? "bg-sidebar-accent text-primary" : "text-muted-foreground hover:text-foreground",
                isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
              title={isLocked ? "Complete previous steps to unlock" : undefined}
            >
              {item.customIcon ? (
                <VSIcon className={cn("h-5 w-5 shrink-0", isActive && "opacity-100")} />
              ) : Icon ? (
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              ) : null}
              {!sidebarCollapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
              {!sidebarCollapsed && isLocked && (
                <svg className="h-3 w-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
