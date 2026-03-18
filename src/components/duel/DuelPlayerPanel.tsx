import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, CheckCircle, XCircle } from 'lucide-react';

const ROUTE_COLORS = ['#FF5733', '#3357FF', '#33CC33', '#9933FF'];

interface DuelPlayerPanelProps {
  playerNumber: 1 | 2;
  imageUrl: string;
  isImageLoaded: boolean;
  showResult: 'win' | 'lose' | null;
  resultMessage: string;
  isTransitioning: boolean;
  onSelectAnswer: (answerIndex: number) => void;
  disabled: boolean;
  hasAnswered: boolean;
  totalOptions?: number;
}

const DuelPlayerPanel: React.FC<DuelPlayerPanelProps> = ({
  playerNumber,
  imageUrl,
  isImageLoaded,
  showResult,
  resultMessage,
  isTransitioning,
  onSelectAnswer,
  disabled,
  hasAnswered,
  totalOptions = 2,
}) => {
  const borderColor = playerNumber === 1 ? 'border-red-500' : 'border-blue-500';

  const getArrowIcon = (index: number) => {
    if (index === 0) return <ChevronLeft className="h-6 w-6" />;
    if (index === 1) return <ChevronRight className="h-6 w-6" />;
    if (index === 2) return <ChevronUp className="h-6 w-6" />;
    return <ChevronDown className="h-6 w-6" />;
  };

  const getButtonPosition = (index: number, total: number) => {
    if (total === 2) {
      // Left/Right at bottom
      if (index === 0) return 'bottom-4 left-4';
      return 'bottom-4 right-4';
    }
    // 3-4 options: positioned at edges
    if (index === 0) return 'left-2 top-1/2 -translate-y-1/2';
    if (index === 1) return 'right-2 top-1/2 -translate-y-1/2';
    if (index === 2) return 'top-10 left-1/2 -translate-x-1/2';
    return 'bottom-10 left-1/2 -translate-x-1/2';
  };

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
        
        {/* Waiting indicator */}
        {hasAnswered && !showResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="px-4 py-2 bg-primary/80 rounded-full text-white font-bold animate-pulse">
              Waiting...
            </div>
          </div>
        )}
      </div>

      {/* Direction Buttons - dynamic 2-4 */}
      {isImageLoaded && !showResult && !hasAnswered && (
        <>
          {Array.from({ length: totalOptions }, (_, i) => (
            <button
              key={i}
              onClick={() => onSelectAnswer(i)}
              style={{ backgroundColor: `${ROUTE_COLORS[i]}CC` }}
              className={`absolute ${getButtonPosition(i, totalOptions)} text-foreground p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 z-10`}
              disabled={disabled}
            >
              {getArrowIcon(i)}
            </button>
          ))}
        </>
      )}

      {/* Control hint */}
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70 font-medium ${
        showResult || hasAnswered ? 'hidden' : ''
      }`}>
        {playerNumber === 1 
          ? (totalOptions >= 3 ? 'A/D/W/S' : 'A / D')
          : (totalOptions >= 3 ? '←/→/↑/↓' : '← / →')
        }
      </div>
    </div>
  );
};

export default DuelPlayerPanel;
