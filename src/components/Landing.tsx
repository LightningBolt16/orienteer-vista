
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  const { t } = useLanguage();
  
  const showEnvWarning = () => {
    toast({
      title: t('configurationRequired') || "Configuration Required",
      description: t('supabaseConnectionMessage') || "Supabase connection not configured",
      action: (
        <Button variant="outline" onClick={() => toast({ description: t('environmentVariables') || "Environment variables needed" })}>
          {t('learnMore') || "Learn More"}
        </Button>
      ),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Compass className="h-16 w-16 text-orienteering" />
          </div>
          <CardTitle className="text-3xl font-bold">Ljungdell.uk</CardTitle>
          <CardDescription className="text-lg">
            {t('orienteeringToolsPlatform') || "Orienteering Tools Platform"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 text-amber-800 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">{t('developmentMode') || "Development Mode"}</h3>
              <p className="text-sm">
                {t('developmentModeInfo') || "This application is currently in development mode."}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Link to="/route-game" className="w-full">
              <Button variant="default" className="w-full">
                {t('routeGame') || "Route Game"}
              </Button>
            </Link>
            <Link to="/course-setter" className="w-full">
              <Button variant="outline" className="w-full">
                {t('courseSetter') || "Course Setter"}
              </Button>
            </Link>
            <Button variant="outline" className="w-full" onClick={showEnvWarning}>
              {t('signIn') || "Sign In"} / {t('register') || "Register"}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {t('version') || "Version 0.1.0"}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Landing;
