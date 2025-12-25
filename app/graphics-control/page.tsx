'use client';

import { useEffect } from 'react';
import { FootballGraphicsControl } from '@/components/pages/football-graphics-control';
import { useWebSocket } from '@/hooks/use-websocket';

export default function GraphicsControlPage() {
  // Initialize WebSocket connection for standalone window
  useWebSocket();

  // Override body overflow-hidden for this page to enable scrolling
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <FootballGraphicsControl />
    </div>
  );
}
