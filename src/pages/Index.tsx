
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Map, PenTool, Trophy, ArrowRight } from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useLogger } from '../hooks/useLogger';

const Index: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Log component lifecycle for debugging
  useLogger('IndexPage');

  useEffect(() => {
    // Simulate loading to ensure everything is ready
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orienteering"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto mt-8">
        <h2 className="text-xl font-semibold text-red-500 mb-4">{t('errorLoadingPage')}</h2>
        <p className="mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>{t('reloadPage')}</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-12">
      {/* Route Choice Champions Header */}
      <div className="glass-card mb-12 p-8 md:p-12 rounded-3xl">
        <div className="flex items-center justify-center mb-8">
          <Trophy className="h-10 w-10 text-orienteering mr-4" />
          <h1 className="text-4xl md:text-5xl font-bold">{t('routeChoiceChampions')}</h1>
        </div>
        
        <p className="text-xl text-muted-foreground text-center mb-8">
          {t('competeWithOthers')}
        </p>
        
        <div className="flex justify-center mb-8">
          <Link to="/route-game">
            <Button size="lg">
              {t('joinCompetition')}
            </Button>
          </Link>
        </div>
        
        <div className="w-full">
          <Leaderboard />
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link 
          to="/route-game" 
          className="glass-card p-6 rounded-xl hover:shadow-lg transition-all hover:scale-[1.01] hover:bg-white/90 cursor-pointer"
        >
          <div className="flex items-center">
            <div className="w-14 h-14 rounded-full bg-orienteering/10 flex items-center justify-center mr-4">
              <Map className="h-6 w-6 text-orienteering" />
            </div>
            <div>
              <h3 className="text-xl font-medium mb-1">{t('routeGame')}</h3>
              <p className="text-muted-foreground">
                {t('testImproveSkills')}
              </p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        
        <Link 
          to="/course-setter" 
          className="glass-card p-6 rounded-xl hover:shadow-lg transition-all hover:scale-[1.01] hover:bg-white/90 cursor-pointer"
        >
          <div className="flex items-center">
            <div className="w-14 h-14 rounded-full bg-orienteering/10 flex items-center justify-center mr-4">
              <PenTool className="h-6 w-6 text-orienteering" />
            </div>
            <div>
              <h3 className="text-xl font-medium mb-1">{t('courseSetter')}</h3>
              <p className="text-muted-foreground">
                {t('createCourses')}
              </p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Index;
