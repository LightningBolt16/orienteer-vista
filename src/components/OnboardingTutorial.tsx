import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, PenTool, Users, User, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingTutorialProps {
  userId: string;
  onComplete: () => void;
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ userId, onComplete }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Trophy,
      title: t('onboardingWelcomeTitle') || 'Welcome to Route Choice Champions!',
      description: t('onboardingWelcomeDesc') || 'Train your orienteering route choice skills and compete with orienteers worldwide.',
    },
    {
      icon: Trophy,
      title: t('onboardingRouteChoiceTitle') || 'Route Choice Game',
      description: t('onboardingRouteChoiceDesc') || 'Pick the fastest route between two control points. The quicker and more accurate you are, the higher you score!',
    },
    {
      icon: PenTool,
      title: t('onboardingRouteFinderTitle') || 'Route Finder',
      description: t('onboardingRouteFinderDesc') || 'Draw your own route on the map and compare it to the optimal path. Test your navigation skills!',
    },
    {
      icon: Users,
      title: t('onboardingDuelTitle') || 'Duel Mode',
      description: t('onboardingDuelDesc') || 'Challenge friends to real-time route choice duels. See who makes better decisions under pressure!',
    },
    {
      icon: User,
      title: t('onboardingProfileTitle') || 'Set Up Your Profile',
      description: t('onboardingProfileDesc') || 'Add your country to appear on national leaderboards and track your progress over time.',
    },
  ];

  const handleComplete = async () => {
    try {
      await (supabase
        .from('user_profiles' as any)
        .update({ onboarding_completed: true })
        .eq('user_id', userId) as any);
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
    onComplete();
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleFinish = async () => {
    await handleComplete();
    navigate('/profile');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardContent className="pt-6">
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tutorial"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-orienteering w-6'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-orienteering/10 flex items-center justify-center">
              <CurrentIcon className="h-10 w-10 text-orienteering" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold mb-3">{steps[currentStep].title}</h2>
            <p className="text-muted-foreground">{steps[currentStep].description}</p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('back') || 'Back'}
            </Button>

            {isLastStep ? (
              <Button onClick={handleFinish} className="bg-orienteering hover:bg-orienteering/90">
                {t('onboardingSetupProfile') || 'Set Up Profile'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleNext} className="bg-orienteering hover:bg-orienteering/90">
                {t('next') || 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTutorial;
