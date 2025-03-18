
import React, { useState } from 'react';
import RouteSelector from '../components/RouteSelector';
import MobileRouteSelector from '../components/MobileRouteSelector';
import Leaderboard from '../components/Leaderboard';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/use-mobile';

const RouteGame: React.FC = () => {
  const { t } = useLanguage();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const isMobile = useIsMobile();
  
  return (
    <div className="pb-20 space-y-8">
      {/* Route Selector Section - conditionally render mobile or desktop version */}
      <section className="max-w-4xl mx-auto">
        {isMobile ? <MobileRouteSelector /> : <RouteSelector />}
      </section>
      
      {/* Toggle Leaderboard Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="bg-orienteering hover:bg-orienteering/90"
        >
          {showLeaderboard ? t('route.choose') : t('leaderboard')}
        </Button>
      </div>
      
      {/* Leaderboard Section */}
      {showLeaderboard && (
        <section className="max-w-2xl mx-auto animate-fade-in">
          <Leaderboard />
        </section>
      )}
    </div>
  );
};

export default RouteGame;
