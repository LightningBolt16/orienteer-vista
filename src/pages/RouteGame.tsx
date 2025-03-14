
import React from 'react';
import RouteSelector from '../components/RouteSelector';
import Leaderboard from '../components/Leaderboard';

const RouteGame: React.FC = () => {
  return (
    <div className="pb-20 space-y-16">
      {/* Route Selector Section */}
      <section className="max-w-4xl mx-auto">
        <RouteSelector />
      </section>
      
      {/* Leaderboard Section */}
      <section className="max-w-2xl mx-auto">
        <Leaderboard />
      </section>
    </div>
  );
};

export default RouteGame;
