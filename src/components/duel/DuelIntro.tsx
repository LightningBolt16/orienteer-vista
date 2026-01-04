import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronLeft, ChevronRight, Users, Swords, Smartphone, Monitor, Globe } from 'lucide-react';

interface DuelIntroProps {
  onStart: () => void;
  isMobile?: boolean;
  isOnline?: boolean;
}

const DuelIntro: React.FC<DuelIntroProps> = ({ onStart, isMobile: propIsMobile, isOnline = false }) => {
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = useState(propIsMobile ?? false);

  // Auto-detect mobile if not provided
  useEffect(() => {
    if (propIsMobile === undefined) {
      const mobile = window.innerWidth <= 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
    }
  }, [propIsMobile]);

  // Mobile Local Instructions
  const MobileLocalInstructions = () => (
    <div className="space-y-4">
      <div className="bg-primary/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">📱 How to Play</h3>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Hold phone in <strong>portrait mode</strong>:</p>
          <ul className="space-y-1 ml-4">
            <li>• <span className="text-red-500 font-medium">Player 1</span> sits at the <strong>bottom</strong> (charging port end)</li>
            <li>• <span className="text-blue-500 font-medium">Player 2</span> sits at the <strong>top</strong> (notch/camera end, upside down)</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <h4 className="font-bold text-red-500 mb-2">Player 1</h4>
          <div className="flex justify-center gap-2 mb-2">
            <div className="w-12 h-12 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center text-red-500 font-bold text-sm">
              TAP LEFT
            </div>
            <div className="w-12 h-12 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center text-blue-500 font-bold text-sm">
              TAP RIGHT
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Tap your half of the screen</p>
        </div>
        
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
          <h4 className="font-bold text-blue-500 mb-2">Player 2</h4>
          <div className="flex justify-center gap-2 mb-2 rotate-180">
            <div className="w-12 h-12 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center text-red-500 font-bold text-sm rotate-180">
              TAP LEFT
            </div>
            <div className="w-12 h-12 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center text-blue-500 font-bold text-sm rotate-180">
              TAP RIGHT
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Screen is flipped for you</p>
        </div>
      </div>
    </div>
  );

  // Desktop Local Instructions
  const DesktopLocalInstructions = () => (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Player 1 Controls */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-red-500" />
          <h3 className="font-bold text-lg text-red-500">Player 1</h3>
        </div>
        <p className="text-sm text-muted-foreground">Use A/D keys to select routes</p>
        <div className="flex justify-center gap-4">
          <div className="w-14 h-14 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center font-bold text-xl">
            A
          </div>
          <div className="w-14 h-14 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center font-bold text-xl">
            D
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Press <span className="font-bold">A</span> for left, <span className="font-bold">D</span> for right
        </p>
      </div>

      {/* Player 2 Controls */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          <h3 className="font-bold text-lg text-blue-500">Player 2</h3>
        </div>
        <p className="text-sm text-muted-foreground">Use Arrow keys to select routes</p>
        <div className="flex justify-center gap-4">
          <div className="w-14 h-14 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center">
            <ChevronLeft className="h-7 w-7 text-blue-500" />
          </div>
          <div className="w-14 h-14 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center">
            <ChevronRight className="h-7 w-7 text-blue-500" />
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Press <span className="font-bold">←</span> for left, <span className="font-bold">→</span> for right
        </p>
      </div>
    </div>
  );

  // Online Instructions (same for mobile/desktop, just control method differs)
  const OnlineInstructions = () => (
    <div className="space-y-4">
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">🌐 Online Duel</h3>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Compete against a remote opponent in real-time!</p>
          <p>One player creates a room and shares the code, the other joins.</p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-xl p-4">
        <h4 className="font-semibold mb-2">Controls</h4>
        {isMobile ? (
          <div className="text-sm text-muted-foreground">
            <p>• Tap the <span className="text-red-500 font-medium">left side</span> for left route</p>
            <p>• Tap the <span className="text-blue-500 font-medium">right side</span> for right route</p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>• Press <span className="font-bold">← Arrow</span> or <span className="font-bold">A</span> for left route</p>
            <p>• Press <span className="font-bold">→ Arrow</span> or <span className="font-bold">D</span> for right route</p>
            <p>• Or click the on-screen buttons</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Swords className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Duel Mode
            </h2>
            <Swords className="h-8 w-8 md:h-10 md:w-10 text-primary scale-x-[-1]" />
          </div>
          <p className="text-muted-foreground text-sm md:text-lg">
            {isOnline 
              ? 'Challenge friends to a remote route choice battle!' 
              : isMobile 
                ? 'Split-screen battle on one device!'
                : 'Compete head-to-head in a split-screen route choice battle!'
            }
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {isMobile ? (
              <><Smartphone className="h-4 w-4" /> Mobile Mode</>
            ) : (
              <><Monitor className="h-4 w-4" /> Desktop Mode</>
            )}
            {isOnline && <><span className="mx-2">•</span><Globe className="h-4 w-4" /> Online</>}
          </div>
        </div>

        {isOnline ? (
          <OnlineInstructions />
        ) : isMobile ? (
          <MobileLocalInstructions />
        ) : (
          <DesktopLocalInstructions />
        )}

        {/* Rules */}
        <div className="bg-primary/10 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            🎯 How to Win
          </h3>
          <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
            {isOnline ? (
              <>
                <li>• Race your opponent - no waiting for their answer</li>
                <li>• +1 point for correct, -0.5 for wrong</li>
                <li>• Most points when time's up or routes are done wins!</li>
              </>
            ) : (
              <>
                <li>• Both players see the same routes at the same time</li>
                <li>• Choose the shortest route as fast as you can</li>
                <li>• Correct answers earn you points</li>
                <li>• The player with the most points wins!</li>
              </>
            )}
          </ul>
        </div>

        <Button 
          onClick={onStart} 
          className="w-full"
          size="lg"
        >
          <Swords className="h-5 w-5 mr-2" />
          Continue to Setup
        </Button>
      </div>
    </div>
  );
};

export default DuelIntro;
