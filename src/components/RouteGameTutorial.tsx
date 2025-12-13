import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';
import { ChevronLeft, ChevronRight, Keyboard, MousePointer, Hand } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '../context/UserContext';

interface RouteGameTutorialProps {
  isMobile: boolean;
  onClose: () => void;
}

export const useRouteGameTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('tutorial_seen')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking tutorial status:', error);
          setIsLoading(false);
          return;
        }

        if (data && !data.tutorial_seen) {
          setShowTutorial(true);
        }
      } catch (err) {
        console.error('Error checking tutorial:', err);
      }
      
      setIsLoading(false);
    };

    checkTutorialStatus();
  }, [user]);

  const closeTutorial = async () => {
    if (!user) return;
    
    setShowTutorial(false);

    try {
      await supabase
        .from('user_profiles')
        .update({ tutorial_seen: true })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error updating tutorial status:', err);
    }
  };

  return { showTutorial: !isLoading && showTutorial, closeTutorial };
};

const RouteGameTutorial: React.FC<RouteGameTutorialProps> = ({ isMobile, onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {t('tutorialTitle')}
          </h2>
          <p className="text-muted-foreground">
            {t('tutorialSubtitle')}
          </p>
        </div>

        <div className="space-y-4">
          {/* Goal explanation */}
          <div className="bg-primary/10 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              🎯 {t('tutorialGoal')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('tutorialGoalDesc')}
            </p>
          </div>

          {/* Controls explanation */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {isMobile ? <Hand className="h-5 w-5" /> : <Keyboard className="h-5 w-5" />}
              {t('tutorialControls')}
            </h3>
            
            {isMobile ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{t('tutorialMobileDesc')}</p>
                <div className="flex justify-center gap-4 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-16 h-24 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center justify-center">
                      <ChevronLeft className="h-6 w-6 text-red-500" />
                    </div>
                    <span className="text-xs">{t('tutorialTapLeft')}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-16 h-24 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                      <ChevronRight className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="text-xs">{t('tutorialTapRight')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <MousePointer className="h-4 w-4 flex-shrink-0" />
                  <p>{t('tutorialDesktopClick')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Keyboard className="h-4 w-4 flex-shrink-0" />
                  <p>{t('tutorialDesktopKeys')}</p>
                </div>
                <div className="flex justify-center gap-4 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#FF5733CC' }}
                    >
                      <ChevronLeft className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs">{t('tutorialLeftRoute')}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#3357FFCC' }}
                    >
                      <ChevronRight className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs">{t('tutorialRightRoute')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scoring tip */}
          <div className="bg-accent/30 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              ⚡ {t('tutorialTip')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('tutorialTipDesc')}
            </p>
          </div>
        </div>

        <Button 
          onClick={onClose} 
          className="w-full"
          size="lg"
        >
          {t('tutorialStart')}
        </Button>
      </div>
    </div>
  );
};

export default RouteGameTutorial;
