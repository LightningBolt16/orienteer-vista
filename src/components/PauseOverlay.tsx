import React from 'react';
import { Play, Clock, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

interface PauseOverlayProps {
  reason: 'inactivity' | 'visibility' | null;
  onResume: () => void;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ reason, onResume }) => {
  const { t } = useLanguage();

  return (
    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
      <div className="text-center p-8 max-w-md">
        {reason === 'inactivity' ? (
          <>
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('gamePaused')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('inactivityPauseMessage')}
            </p>
          </>
        ) : (
          <>
            <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('welcomeBack')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('visibilityPauseMessage')}
            </p>
          </>
        )}
        
        <Button 
          size="lg" 
          onClick={onResume}
          className="gap-2"
        >
          <Play className="h-5 w-5" />
          {t('continue')}
        </Button>
      </div>
    </div>
  );
};

export default PauseOverlay;
