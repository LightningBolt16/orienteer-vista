
import React, { useState } from 'react';
import RouteSelector from '../components/RouteSelector';
import Leaderboard from '../components/Leaderboard';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';

const RouteGame: React.FC = () => {
  const { t } = useLanguage();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  return (
    <div className="pb-20 space-y-8">
      {/* Route Selector Section */}
      <section className="max-w-4xl mx-auto">
        <RouteSelector />
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
