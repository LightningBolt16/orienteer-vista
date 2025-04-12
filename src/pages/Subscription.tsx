
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Shield, Users, Award, Clock, X, Star, MapPin, FolderPlus, Share2, Trophy, Crown, Map } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

// Feature comparison type
interface PlanFeature {
  title: string;
  free: boolean | string;
  personal: boolean | string;
  club: boolean | string;
  icon: React.ReactNode;
}

const Subscription: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubscribe = (planType: string) => {
    // This would connect to a payment processor in a real implementation
    toast({
      title: t('comingSoon'),
      description: 'Payment functionality will be available soon.',
    });
  };

  // Feature comparison data
  const features: PlanFeature[] = [
    {
      title: "Route Choice Game",
      free: "Up to 100 selections",
      personal: "Unlimited",
      club: "Unlimited for all members",
      icon: <Trophy className="h-5 w-5 text-orange-500" />
    },
    {
      title: "Course Projects",
      free: "Up to 5 projects",
      personal: "Unlimited",
      club: "Unlimited for all members",
      icon: <FolderPlus className="h-5 w-5 text-blue-500" />
    },
    {
      title: "Map Storage",
      free: "Up to 3 maps",
      personal: "Unlimited",
      club: "Unlimited",
      icon: <Map className="h-5 w-5 text-green-500" />
    },
    {
      title: "Project Sharing",
      free: false,
      personal: true,
      club: true,
      icon: <Share2 className="h-5 w-5 text-purple-500" />
    },
    {
      title: "Role-Based Access Control",
      free: false,
      personal: false,
      club: true,
      icon: <Crown className="h-5 w-5 text-yellow-500" />
    },
    {
      title: "Project Manager Access",
      free: false,
      personal: "Basic",
      club: "Advanced",
      icon: <MapPin className="h-5 w-5 text-red-500" />
    }
  ];

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight">{t('pricingPlans')}</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Choose the perfect plan to enhance your orienteering experience with premium features.
        </p>
      </div>
      
      {/* Feature comparison table */}
      <div className="mb-16 overflow-hidden rounded-xl border bg-background shadow">
        <div className="grid grid-cols-4 gap-0">
          {/* Header row */}
          <div className="p-6 border-r bg-muted/50">
            <h3 className="text-lg font-semibold text-foreground">Features</h3>
          </div>
          <div className="p-6 border-r text-center">
            <h3 className="text-lg font-semibold">Free</h3>
            <p className="text-sm text-muted-foreground">Getting Started</p>
          </div>
          <div className="p-6 border-r text-center bg-orienteering/5">
            <h3 className="text-lg font-semibold">Personal</h3>
            <p className="font-medium text-orienteering">{t('personalPlanPrice')}</p>
          </div>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold">Club</h3>
            <p className="font-medium text-orienteering">{t('clubPlanPrice')}</p>
          </div>
          
          {/* Feature rows */}
          {features.map((feature, idx) => (
            <React.Fragment key={idx}>
              <div className={`flex items-center gap-3 p-6 border-t border-r ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                {feature.icon}
                <span className="font-medium">{feature.title}</span>
              </div>
              {/* Free plan */}
              <div className={`p-6 text-center border-t border-r ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                {typeof feature.free === 'boolean' ? (
                  feature.free ? 
                    <Check className="mx-auto h-5 w-5 text-green-500" /> : 
                    <X className="mx-auto h-5 w-5 text-red-500" />
                ) : (
                  <span className="text-sm">{feature.free}</span>
                )}
              </div>
              {/* Personal plan */}
              <div className={`p-6 text-center border-t border-r ${idx % 2 === 0 ? 'bg-muted/20 bg-orienteering/5' : 'bg-orienteering/5'}`}>
                {typeof feature.personal === 'boolean' ? (
                  feature.personal ? 
                    <Check className="mx-auto h-5 w-5 text-green-500" /> : 
                    <X className="mx-auto h-5 w-5 text-red-500" />
                ) : (
                  <span className="text-sm">{feature.personal}</span>
                )}
              </div>
              {/* Club plan */}
              <div className={`p-6 text-center border-t ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                {typeof feature.club === 'boolean' ? (
                  feature.club ? 
                    <Check className="mx-auto h-5 w-5 text-green-500" /> : 
                    <X className="mx-auto h-5 w-5 text-red-500" />
                ) : (
                  <span className="text-sm">{feature.club}</span>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Plan */}
        <Card className="flex flex-col border-2 hover:border-orienteering/30 transition-all">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Star className="h-5 w-5 text-yellow-500 mr-2" />
              Free Plan
            </CardTitle>
            <CardDescription>Perfect for beginners to try the platform</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-4xl font-bold mb-6">₀ kr</div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Access to route choice game (100 selections)</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Create up to 5 course projects</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Upload up to 3 maps</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/route-game')} 
              variant="outline"
              className="w-full"
            >
              Get Started
            </Button>
          </CardFooter>
        </Card>

        {/* Personal Plan */}
        <Card className="flex flex-col border-2 hover:border-orienteering/50 transition-all">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Shield className="h-5 w-5 text-orienteering mr-2" />
              {t('personalPlan')}
            </CardTitle>
            <CardDescription>{t('personalPlanDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-4xl font-bold mb-6">{t('personalPlanPrice')}</div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Unlimited route choice selections</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Unlimited course projects</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Unlimited map uploads</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Share projects with others</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSubscribe('personal')} 
              className="w-full bg-orienteering hover:bg-orienteering/90"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('subscribe')}
            </Button>
          </CardFooter>
        </Card>

        {/* Club Plan */}
        <Card className="flex flex-col border-2 border-orienteering shadow-lg">
          <CardHeader className="bg-orienteering/5">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl flex items-center">
                <Users className="h-5 w-5 text-orienteering mr-2" />
                {t('clubPlan')}
              </CardTitle>
              <span className="bg-orienteering text-white text-xs font-semibold px-2.5 py-1 rounded">
                Popular
              </span>
            </div>
            <CardDescription>{t('clubPlanDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-4xl font-bold mb-6">{t('clubPlanPrice')}</div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Everything in Personal Plan for all club members</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Role-based access control</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Advanced project management</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSubscribe('club')} 
              className="w-full bg-orienteering hover:bg-orienteering/90"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('subscribe')}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-8 flex items-center">
          <Award className="h-6 w-6 text-orienteering mr-3" />
          Role-Based Access in Club Plan
        </h2>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Club Roles</h3>
                <p className="text-muted-foreground mb-4">
                  The Club Plan includes a sophisticated permission system that allows for granular control over who can access what:
                </p>
                
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Shield className="h-4 w-4 text-orienteering mr-2" />
                      Admin
                    </h4>
                    <p className="text-sm text-muted-foreground">Full access to all club projects, maps, and member management</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Users className="h-4 w-4 text-blue-500 mr-2" />
                      Coach
                    </h4>
                    <p className="text-sm text-muted-foreground">Can manage training projects and share with members</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Map className="h-4 w-4 text-green-500 mr-2" />
                      Course Setter
                    </h4>
                    <p className="text-sm text-muted-foreground">Can create/edit projects according to assigned category</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                      Event Organizer
                    </h4>
                    <p className="text-sm text-muted-foreground">Can manage competition projects and event schedules</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Clock className="h-4 w-4 text-purple-500 mr-2" />
                      Reviewer
                    </h4>
                    <p className="text-sm text-muted-foreground">Can view and suggest changes to projects</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Star className="h-4 w-4 text-orange-500 mr-2" />
                      Member
                    </h4>
                    <p className="text-sm text-muted-foreground">Basic access to club resources as assigned by other roles</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Project Access Categories</h3>
                <p className="text-muted-foreground mb-4">
                  Different project types have different access requirements:
                </p>
                
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <FolderPlus className="h-4 w-4 text-blue-500 mr-2" />
                      Training
                    </h4>
                    <p className="text-sm text-muted-foreground">Broadly shared within the club, coaches can manage</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <FolderPlus className="h-4 w-4 text-green-500 mr-2" />
                      Club Events
                    </h4>
                    <p className="text-sm text-muted-foreground">Controlled access with review process</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <FolderPlus className="h-4 w-4 text-red-500 mr-2" />
                      Competitions
                    </h4>
                    <p className="text-sm text-muted-foreground">Restricted access with manually assigned permissions</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-16 bg-muted/50 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Award className="h-6 w-6 text-orienteering mr-3" />
          Premium benefits
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-background p-5 rounded-lg shadow-sm">
            <Clock className="h-8 w-8 text-orienteering mb-3" />
            <h3 className="font-medium text-lg mb-2">Early Access</h3>
            <p className="text-muted-foreground">Get access to new features and maps before they're publicly available.</p>
          </div>
          <div className="bg-background p-5 rounded-lg shadow-sm">
            <Users className="h-8 w-8 text-orienteering mb-3" />
            <h3 className="font-medium text-lg mb-2">Community Sharing</h3>
            <p className="text-muted-foreground">Share your courses and route choices with the community.</p>
          </div>
          <div className="bg-background p-5 rounded-lg shadow-sm">
            <Shield className="h-8 w-8 text-orienteering mb-3" />
            <h3 className="font-medium text-lg mb-2">Priority Support</h3>
            <p className="text-muted-foreground">Get dedicated support for any questions or issues.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
