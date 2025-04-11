
import React from 'react';
import { Clock, Flag, Map, CreditCard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  const { t } = useLanguage();
  
  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center animate-fade-in">
      <div className="flex items-center mb-4">
        <Map className="h-8 w-8 text-orienteering mr-2" />
        <Flag className="h-7 w-7 text-orienteering" />
      </div>
      
      <h2 className="text-2xl font-medium mb-2 text-balance">{t('courseSettingTitle')}</h2>
      
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="h-5 w-5 text-orienteering/80" />
        <span className="text-sm font-medium text-muted-foreground">{t('comingSoon')}</span>
      </div>
      
      <p className="text-center text-muted-foreground max-w-md mb-6">
        {t('designCourses')}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-radial from-orienteering/20 to-transparent rounded-full animate-pulse-scale"></div>
          <Button className="relative px-4 py-2 rounded-full border border-orienteering/30 text-orienteering hover:bg-orienteering/10 transition-all duration-300">
            {t('getNotified')}
          </Button>
        </div>
        
        <Link to="/subscription">
          <Button variant="outline" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            {t('subscription')}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ComingSoon;
