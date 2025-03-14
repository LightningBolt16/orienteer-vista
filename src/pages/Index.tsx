
import React from 'react';
import ComingSoon from '../components/ComingSoon';
import RouteSelector from '../components/RouteSelector';
import Leaderboard from '../components/Leaderboard';

const Index: React.FC = () => {
  return (
    <div className="pb-20 space-y-16">
      {/* Main Features Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RouteSelector />
        </div>
        <div>
          <ComingSoon />
        </div>
      </section>
      
      {/* Leaderboard Section */}
      <section className="max-w-2xl mx-auto">
        <Leaderboard />
      </section>
    </div>
  );
};

export default Index;
