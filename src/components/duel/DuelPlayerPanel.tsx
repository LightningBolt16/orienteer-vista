import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

interface DuelPlayerPanelProps {
  playerNumber: 1 | 2;
  imageUrl: string;
  isImageLoaded: boolean;
  showResult: 'win' | 'lose' | null;
  resultMessage: string;
  isTransitioning: boolean;
  onSelectDirection: (direction: 'left' | 'right') => void;
  disabled: boolean;
  hasAnswered: boolean;
}

const DuelPlayerPanel: React.FC<DuelPlayerPanelProps> = ({
  playerNumber,
  imageUrl,
  isImageLoaded,
  showResult,
  resultMessage,
  isTransitioning,
  onSelectDirection,
  disabled,
  hasAnswered,
}) => {
  const playerColor = playerNumber === 1 ? 'red' : 'blue';
  const borderColor = playerNumber === 1 ? 'border-red-500' : 'border-blue-500';
  
  const RED_COLOR = '#FF5733';
  const BLUE_COLOR = '#3357FF';

  return (
    <div className={`relative flex-1 h-full border-2 ${borderColor} rounded-lg overflow-hidden bg-black`}>
      {/* Player Label */}
      <div className={`absolute top-2 left-2 z-10 px-3 py-1 rounded-full text-white text-sm font-bold ${
        playerNumber === 1 ? 'bg-red-500' : 'bg-blue-500'
      }`}>
        P{playerNumber}
      </div>

      {/* Image Container */}
      <div className="h-full flex items-center justify-center">
        {isImageLoaded && !showResult && (
          <img 
            src={imageUrl} 
            alt="Orienteering route" 
            className={`max-w-full max-h-full object-contain transition-all duration-300 ${
              isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            }`}
          />
        )}
        
        {/* Result Overlay */}
        {showResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            {showResult === 'win' ? (
              <>
                <CheckCircle className="text-green-500 w-20 h-20 animate-[win-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                <div className="mt-3 px-3 py-1 bg-green-500/80 rounded-full text-white font-bold text-sm animate-fade-in shadow-lg">
                  {resultMessage}
                </div>
              </>
            ) : (
              <>
                <XCircle className="text-red-500 w-20 h-20 animate-[lose-animation_0.4s_ease-out] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <div className="mt-3 px-3 py-1 bg-red-500/80 rounded-full text-white font-bold text-sm animate-fade-in shadow-lg">
                  {resultMessage}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Waiting indicator when player has answered */}
        {hasAnswered && !showResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="px-4 py-2 bg-primary/80 rounded-full text-white font-bold animate-pulse">
              Waiting...
            </div>
          </div>
        )}
      </div>

      {/* Direction Buttons */}
      {isImageLoaded && !showResult && !hasAnswered && (
        <div className="absolute inset-x-0 bottom-0 p-4 flex justify-between">
          <button 
            onClick={() => onSelectDirection('left')} 
            style={{ backgroundColor: `${RED_COLOR}CC` }}
            className="hover:bg-opacity-100 text-foreground p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            disabled={disabled}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button 
            onClick={() => onSelectDirection('right')} 
            style={{ backgroundColor: `${BLUE_COLOR}CC` }}
            className="hover:bg-opacity-100 text-foreground p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            disabled={disabled}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Control hint */}
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70 font-medium ${
        showResult || hasAnswered ? 'hidden' : ''
      }`}>
        {playerNumber === 1 ? 'A / D' : '← / →'}
      </div>
    </div>
  );
};

export default DuelPlayerPanel;
