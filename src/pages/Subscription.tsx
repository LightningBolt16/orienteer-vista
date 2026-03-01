
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Shield, Users, Award, X, Star, Map, Loader2, Heart, MessageSquare, MapPin, Compass } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, STRIPE_PLANS } from '@/hooks/useSubscription';
import { useUser } from '@/context/UserContext';

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
  const isMobile = useIsMobile();
  const { user } = useUser();
  const { plan, isActive, loading: subLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleSubscribe = async (planType: 'personal' | 'club') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setCheckoutLoading(planType);
    try {
      const priceId = STRIPE_PLANS[planType].price_id;
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Feature comparison data
  const features: PlanFeature[] = [
    {
      title: "Route Game / Route Finder",
      free: "Unlimited",
      personal: "Unlimited",
      club: "Unlimited for all members",
      icon: <Compass className="h-5 w-5 text-orange-500" />
    },
    {
      title: "Private Map Processing",
      free: "Limited (5 lifetime uploads)",
      personal: "Unlimited (Pro parameters)",
      club: "Unlimited for all members",
      icon: <Map className="h-5 w-5 text-green-500" />
    },
    {
      title: "Club-Shared Private Maps",
      free: false,
      personal: false,
      club: true,
      icon: <Users className="h-5 w-5 text-blue-500" />
    },
  ];

  const FeatureCell = ({ value }: { value: boolean | string }) => {
    if (typeof value === 'boolean') {
      return value ? 
        <Check className="mx-auto h-5 w-5 text-green-500" /> : 
        <X className="mx-auto h-5 w-5 text-muted-foreground/40" />;
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight">{t('pricingPlans')}</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Choose the perfect plan to enhance your orienteering training with private map processing and more.
        </p>
      </div>
      
      {/* Feature comparison table - Desktop version */}
      {!isMobile && (
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
              <p className="font-medium text-orienteering">29 kr/mo</p>
            </div>
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold">Club</h3>
              <p className="font-medium text-orienteering">100 kr/mo</p>
            </div>
            
            {/* Feature rows */}
            {features.map((feature, idx) => (
              <React.Fragment key={idx}>
                <div className={`flex items-center gap-3 p-6 border-t border-r ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                  {feature.icon}
                  <span className="font-medium">{feature.title}</span>
                </div>
                <div className={`p-6 text-center border-t border-r ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                  <FeatureCell value={feature.free} />
                </div>
                <div className={`p-6 text-center border-t border-r ${idx % 2 === 0 ? 'bg-muted/20 bg-orienteering/5' : 'bg-orienteering/5'}`}>
                  <FeatureCell value={feature.personal} />
                </div>
                <div className={`p-6 text-center border-t ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                  <FeatureCell value={feature.club} />
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Feature comparison */}
      {isMobile && (
        <div className="mb-16">
          <Carousel className="w-full">
            <CarouselContent>
              {/* Free Plan Card */}
              <CarouselItem className="basis-full">
                <Card className="border-2 mb-4">
                  <CardHeader className="text-center pb-2">
                    <CardTitle>Free Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead>Included</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {features.map((feature, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="flex items-center gap-2">
                              {feature.icon}
                              {feature.title}
                            </TableCell>
                            <TableCell>
                              {typeof feature.free === 'boolean' ? (
                                feature.free ? 
                                  <Check className="h-5 w-5 text-green-500" /> : 
                                  <X className="h-5 w-5 text-muted-foreground/40" />
                              ) : (
                                <span>{feature.free}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
              </CarouselItem>
              
              {/* Personal Plan Card */}
              <CarouselItem className="basis-full">
                <Card className="border-2 border-orienteering/30 mb-4">
                  <CardHeader className="text-center pb-2">
                    <CardTitle>{t('personalPlan')}</CardTitle>
                    <CardDescription className="text-lg font-semibold text-orienteering">
                      29 kr/mo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead>Included</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {features.map((feature, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="flex items-center gap-2">
                              {feature.icon}
                              {feature.title}
                            </TableCell>
                            <TableCell>
                              {typeof feature.personal === 'boolean' ? (
                                feature.personal ? 
                                  <Check className="h-5 w-5 text-green-500" /> : 
                                  <X className="h-5 w-5 text-muted-foreground/40" />
                              ) : (
                                <span>{feature.personal}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSubscribe('personal')} 
                      className="w-full bg-orienteering hover:bg-orienteering/90"
                      disabled={checkoutLoading !== null || (isActive && plan === 'personal')}
                    >
                      {checkoutLoading === 'personal' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                      {isActive && plan === 'personal' ? 'Current Plan' : t('subscribe')}
                    </Button>
                  </CardFooter>
                </Card>
              </CarouselItem>
              
              {/* Club Plan Card */}
              <CarouselItem className="basis-full">
                <Card className="border-2 border-orienteering mb-4">
                  <CardHeader className="text-center pb-2 bg-orienteering/5">
                    <div className="flex justify-between items-center">
                      <CardTitle>{t('clubPlan')}</CardTitle>
                      <span className="bg-orienteering text-white text-xs font-semibold px-2.5 py-1 rounded">
                        Popular
                      </span>
                    </div>
                    <CardDescription className="text-lg font-semibold text-orienteering">
                      100 kr/mo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead>Included</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {features.map((feature, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="flex items-center gap-2">
                              {feature.icon}
                              {feature.title}
                            </TableCell>
                            <TableCell>
                              {typeof feature.club === 'boolean' ? (
                                feature.club ? 
                                  <Check className="h-5 w-5 text-green-500" /> : 
                                  <X className="h-5 w-5 text-muted-foreground/40" />
                              ) : (
                                <span>{feature.club}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSubscribe('club')} 
                      className="w-full bg-orienteering hover:bg-orienteering/90"
                      disabled={checkoutLoading !== null || (isActive && plan === 'club')}
                    >
                      {checkoutLoading === 'club' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                      {isActive && plan === 'club' ? 'Current Plan' : t('subscribe')}
                    </Button>
                  </CardFooter>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <div className="flex justify-center mt-4">
              <CarouselPrevious className="relative static translate-y-0 left-0 mr-2" />
              <CarouselNext className="relative static translate-y-0 right-0" />
            </div>
          </Carousel>
        </div>
      )}
      
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
            <div className="text-4xl font-bold mb-6">0 kr</div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Unlimited route game and route finder plays</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Limited map processing (basic parameters)</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Up to 5 lifetime map uploads</span>
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
            <CardDescription>For dedicated orienteers who want to train on their own maps</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-4xl font-bold mb-6">29 kr/mo</div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Everything in Free</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Unlimited private map processing with pro parameters</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Support development and request features</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Practice on your own maps, prepare for competitions</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSubscribe('personal')} 
              className="w-full bg-orienteering hover:bg-orienteering/90"
              disabled={checkoutLoading !== null || (isActive && plan === 'personal')}
            >
              {checkoutLoading === 'personal' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {isActive && plan === 'personal' ? 'Current Plan' : t('subscribe')}
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
            <CardDescription>Pro access for your entire club with shared maps</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-4xl font-bold mb-6">100 kr/mo</div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Everything in Personal for all club members</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Club-shared private maps (visible only to your club)</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                <span>Manage club training with shared map library</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSubscribe('club')} 
              className="w-full bg-orienteering hover:bg-orienteering/90"
              disabled={checkoutLoading !== null || (isActive && plan === 'club')}
            >
              {checkoutLoading === 'club' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {isActive && plan === 'club' ? 'Current Plan' : t('subscribe')}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Important subscription info */}
      <div className="mt-12 border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center text-amber-700 dark:text-amber-400">
          <Shield className="h-5 w-5 mr-2" />
          Important: What happens if you unsubscribe?
        </h3>
        <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
          <li className="flex items-start">
            <X className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-amber-600" />
            <span>You will <strong>lose access</strong> to all private maps that were processed while on a paid subscription (beyond the 5 free lifetime uploads).</span>
          </li>
          <li className="flex items-start">
            <X className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-amber-600" />
            <span>Maps processed with pro parameters will be <strong>locked</strong> until you re-subscribe.</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-green-600" />
            <span>Your first 5 uploaded maps will always remain accessible on the free tier.</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-green-600" />
            <span>Re-subscribing will instantly restore access to all your maps.</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 bg-muted/50 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Award className="h-6 w-6 text-orienteering mr-3" />
          Premium benefits
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-background p-5 rounded-lg shadow-sm">
            <Heart className="h-8 w-8 text-orienteering mb-3" />
            <h3 className="font-medium text-lg mb-2">Support Development</h3>
            <p className="text-muted-foreground">Help us build new features and improve the platform for the orienteering community.</p>
          </div>
          <div className="bg-background p-5 rounded-lg shadow-sm">
            <MessageSquare className="h-8 w-8 text-orienteering mb-3" />
            <h3 className="font-medium text-lg mb-2">Request Features</h3>
            <p className="text-muted-foreground">Get a voice in what we build next — your input shapes the roadmap.</p>
          </div>
          <div className="bg-background p-5 rounded-lg shadow-sm">
            <Map className="h-8 w-8 text-orienteering mb-3" />
            <h3 className="font-medium text-lg mb-2">Train on Your Maps</h3>
            <p className="text-muted-foreground">Process your own maps for personalized route choice training.</p>
          </div>
          <div className="bg-background p-5 rounded-lg shadow-sm">
            <Compass className="h-8 w-8 text-orienteering mb-3" />
            <h3 className="font-medium text-lg mb-2">Prepare for Competitions</h3>
            <p className="text-muted-foreground">Practice route choices on real competition terrain before race day.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
