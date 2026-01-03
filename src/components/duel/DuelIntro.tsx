import React from 'react';
import { Button } from '../ui/button';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Users, Swords } from 'lucide-react';

interface DuelIntroProps {
  onStart: () => void;
}

const DuelIntro: React.FC<DuelIntroProps> = ({ onStart }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-8 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Swords className="h-10 w-10 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              Duel Mode
            </h2>
            <Swords className="h-10 w-10 text-primary scale-x-[-1]" />
          </div>
          <p className="text-muted-foreground text-lg">
            Compete head-to-head in a split-screen route choice battle!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Player 1 Controls */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-lg text-red-500">Player 1</h3>
            </div>
            <p className="text-sm text-muted-foreground">Use WASD keys to select routes</p>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <div className="w-10 h-10 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center font-bold">
                  W
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-10 h-10 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center">
                  <ChevronLeft className="h-5 w-5 text-red-500" />
                </div>
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center font-bold text-muted-foreground">
                  S
                </div>
                <div className="w-10 h-10 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center">
                  <ChevronRight className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Press <span className="font-bold">A</span> for left route, <span className="font-bold">D</span> for right route
            </p>
          </div>

          {/* Player 2 Controls */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-lg text-blue-500">Player 2</h3>
            </div>
            <p className="text-sm text-muted-foreground">Use Arrow keys to select routes</p>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <div className="w-10 h-10 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                  <ChevronUp className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-10 h-10 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                  <ChevronLeft className="h-5 w-5 text-blue-500" />
                </div>
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="w-10 h-10 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                  <ChevronRight className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Press <span className="font-bold">←</span> for left route, <span className="font-bold">→</span> for right route
            </p>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-primary/10 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            🎯 How to Win
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Both players see the same routes at the same time</li>
            <li>• Choose the shortest route as fast as you can</li>
            <li>• Correct answers earn you a point</li>
            <li>• The player with the most points after all routes wins!</li>
          </ul>
        </div>

        <Button 
          onClick={onStart} 
          className="w-full"
          size="lg"
        >
          <Swords className="h-5 w-5 mr-2" />
          Start Setup
        </Button>
      </div>
    </div>
  );
};

export default DuelIntro;
