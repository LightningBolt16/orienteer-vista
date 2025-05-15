
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Map, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const MobileMessage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  return (
    <div className="flex flex-col items-center justify-center px-4 pt-6 pb-20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t('desktopFeatureOnly') || "Desktop Feature Only"}</CardTitle>
          <CardDescription>
            {t('courseSetter.requiresLargerScreen') || "The course setter requires a larger screen for the map editor."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm">
              {t('courseSetter.designedForDesktop') || 
                "Our course setter tool is designed for desktop computers with larger screens and precision mouse input for creating detailed orienteering courses."}
            </p>
          </div>
          
          <p className="text-center font-medium">
            {t('tryRouteGameMobile') || "Try our route choice game instead!"}
          </p>
          
          <div className="flex flex-col space-y-4 mt-6">
            <Button 
              onClick={() => navigate('/route-game')}
              className="bg-orienteering hover:bg-orienteering/90 w-full"
            >
              <Map className="h-4 w-4 mr-2" />
              {t('goToRouteGame') || "Go to Route Choice Game"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="w-full"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {t('returnHome') || "Return to Home"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileMessage;
