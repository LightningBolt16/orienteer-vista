
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
      {/* Hero Section */}
      <div className="glass-card mb-12 p-8 md:p-12 rounded-3xl">
        <div className="text-center md:text-left max-w-3xl mx-auto md:mx-0">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-orienteering">Orienteering</span> {t('orienteeringTools')}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 md:pr-12">
            {t('improvementText')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link to="/route-game">
              <Button size="lg" className="w-full sm:w-auto">
                <Map className="mr-2 h-5 w-5" />
                {t('routeGame')}
              </Button>
            </Link>
            <Link to="/course-setter">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <PenTool className="mr-2 h-5 w-5" />
                {t('courseSetter')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
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
      
      {/* Leaderboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 rounded-xl">
          <div className="flex items-center mb-8">
            <Trophy className="h-6 w-6 text-orienteering mr-3" />
            <h2 className="text-2xl font-medium">{t('routeChoiceChampions')}</h2>
          </div>
          
          <p className="text-muted-foreground mb-6">
            {t('competeWithOthers')}
          </p>
          
          <Link to="/route-game">
            <Button>
              {t('joinCompetition')}
            </Button>
          </Link>
        </div>
        
        <div className="lg:col-span-1">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Index;
