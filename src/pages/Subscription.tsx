
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Shield, Users, Award, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { toast } from '@/components/ui/use-toast';

const Subscription: React.FC = () => {
  const { t } = useLanguage();

  const handleSubscribe = (planType: string) => {
    // This would connect to a payment processor in a real implementation
    toast({
      title: t('comingSoon'),
      description: 'Payment functionality will be available soon.',
    });
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight">{t('pricingPlans')}</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Choose the perfect plan to enhance your orienteering experience with premium features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
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
              {t('personalPlanFeatures').split(', ').map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
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
              {t('clubPlanFeatures').split(', ').map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
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
