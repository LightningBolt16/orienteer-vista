import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { MapPin, Navigation, ArrowUpRight, Trophy } from 'lucide-react';

interface NavigatorTutorialProps {
  onClose: () => void;
}

export const useNavigatorTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('navigator_tutorial_seen')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && !(data as any).navigator_tutorial_seen) {
          setShowTutorial(true);
        }
      } catch (err) {
        console.error('Error checking navigator tutorial:', err);
      }
      setIsLoading(false);
    };
    check();
  }, [user]);

  const dismissTutorial = async () => {
    setShowTutorial(false);
    if (!user) return;
    await supabase
      .from('user_profiles')
      .update({ navigator_tutorial_seen: true } as any)
      .eq('user_id', user.id);
  };

  return { showTutorial, isLoading, dismissTutorial };
};

const STEPS = [
  {
    icon: MapPin,
    title: 'Overview',
    description: 'Each challenge shows a map with a start (triangle) and finish (double circle). Study the terrain before starting.',
  },
  {
    icon: Navigation,
    title: 'Navigate',
    description: 'At each junction, choose a direction by tapping an arrow. You can move freely — even the "wrong" way.',
  },
  {
    icon: ArrowUpRight,
    title: 'Find the shortest route',
    description: 'Your goal is to follow the optimal path from start to finish. Every correct junction counts toward your score.',
  },
  {
    icon: Trophy,
    title: 'Results',
    description: 'After reaching the finish, you\'ll see your route compared to the optimal path. Try to improve!',
  },
];

const NavigatorTutorial: React.FC<NavigatorTutorialProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep(s => s + 1)}>
              Next
            </Button>
          ) : (
            <Button className="flex-1" onClick={onClose}>
              Got it!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigatorTutorial;
