
import React from 'react';
import { Clock, Flag, Map } from 'lucide-react';

const ComingSoon: React.FC = () => {
  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center animate-fade-in">
      <div className="flex items-center mb-4">
        <Map className="h-8 w-8 text-orienteering mr-2" />
        <Flag className="h-7 w-7 text-orienteering" />
      </div>
      
      <h2 className="text-2xl font-medium mb-2 text-balance">Course Setting</h2>
      
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="h-5 w-5 text-orienteering/80" />
        <span className="text-sm font-medium text-muted-foreground">Coming Soon</span>
      </div>
      
      <p className="text-center text-muted-foreground max-w-md mb-6">
        Design your own orienteering courses, share them with friends, and compete for the best times.
      </p>
      
      <div className="relative mt-4">
        <div className="absolute inset-0 bg-gradient-radial from-orienteering/20 to-transparent rounded-full animate-pulse-scale"></div>
        <button className="relative px-4 py-2 rounded-full border border-orienteering/30 text-orienteering hover:bg-orienteering/10 transition-all duration-300">
          Get Notified
        </button>
      </div>
    </div>
  );
};

export default ComingSoon;
