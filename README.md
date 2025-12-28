# Football Score Lite

Professional football graphics control system for local tournaments, built with Electron, React, and WebSocket-synced graphics.

## Features

- **Match Management**: Create and manage football matches with teams, lineups, and officials
- **Live Control**: Real-time score bug, timer, events, and graphics control
- **Graphics Output**: Unified React renderer output for OBS / browser sources
- **WebSocket Sync**: Real-time synchronization across all renderer windows
- **Local Persistence**: Save/load matches, teams, and assets locally
- **Modern UI**: Beautiful dark theme with glassy effects

## Development

### Prerequisites

- Node.js 18+
- pnpm (or npm)

### Setup

```bash
# Install dependencies
pnpm install

# Note: If Electron fails to start, manually run:
# node node_modules/.pnpm/electron@*/node_modules/electron/install.js

# Start Next.js dev server
pnpm dev

# In another terminal, build and run Electron
pnpm electron:build
pnpm electron

# Or use the combined dev command
pnpm dev:electron
```

**Troubleshooting Electron Installation:**
If you see "Electron failed to install correctly", run:
```bash
node node_modules/.pnpm/electron@*/node_modules/electron/install.js
```
This downloads the Electron binary manually (pnpm sometimes skips postinstall scripts).

### Project Structure

```
Football-Score-Lite/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry
│   ├── preload.ts     # Preload script (IPC bridge)
│   └── server.ts      # WebSocket server
├── public/            # Static assets
├── app/               # Next.js app directory
├── components/        # React components
├── hooks/            # React hooks (WebSocket, file persistence)
└── lib/              # Store and utilities
```

## Building

```bash
# Build Next.js app
pnpm build

# Build Electron TypeScript
pnpm electron:build

# Run Electron
pnpm electron

# Build distributable packages
pnpm dist:win    # Windows
pnpm dist:mac    # macOS
pnpm dist:linux  # Linux
```

## Usage

1. **Start the app**: Run `pnpm dev:electron`
2. **Select Sport**: Choose Football or Futsal
3. **Create Match**: Set up teams, lineups, and match details
4. **Go Live**: Use Live Control to manage the match
5. **Graphics**: Open renderer windows for OBS integration

## Renderer URLs

For OBS Browser Sources, use these URLs:
- Main Renderer Output: `http://localhost:3000/renderer`

## WebSocket Server

The WebSocket server runs on `ws://localhost:8080` and synchronizes graphics state across all renderer windows.

## License

MIT

## About

Football Score Lite is a professional-grade graphics control system designed for local football tournaments and live streaming productions.
