
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ExternalLink } from 'lucide-react';

const MobileMessage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="pb-20 px-4 max-w-md mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Desktop Feature Only</CardTitle>
          <CardDescription>
            The course setter requires a larger screen for the map editor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Our course setter tool is designed for desktop computers with larger screens
            and precision mouse input for creating detailed orienteering courses.
          </p>
          
          <p>
            We recommend trying our route choice game which is fully optimized for mobile devices!
          </p>
          
          <div className="flex flex-col space-y-2 mt-4">
            <Button 
              onClick={() => navigate('/route-game')}
              className="bg-orienteering hover:bg-orienteering/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Route Choice Game
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileMessage;
