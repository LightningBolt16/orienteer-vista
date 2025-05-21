
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Compass, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getNetworkStatus, subscribeToNetworkStatus } from '@/lib/networkUtils';

const AuthPage: React.FC = () => {
  const { signIn, signUp, loading } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>('login');
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(getNetworkStatus());
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  // Subscribe to network status changes
  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus((online) => {
      setIsOnline(online);
      if (online && error?.includes('offline')) {
        setError(null);
      }
    });
    
    return () => unsubscribe();
  }, [error]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Check network status first
    if (!isOnline) {
      setError(t('offlineError') || 'You are currently offline. Please check your internet connection and try again.');
      return;
    }
    
    try {
      await signIn(loginEmail, loginPassword);
      navigate('/');
    } catch (error: any) {
      // Error may already be handled in signIn method, but set a backup error
      if (error.message) {
        setError(error.message);
      }
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Check network status first
    if (!isOnline) {
      setError(t('offlineError') || 'You are currently offline. Please check your internet connection and try again.');
      return;
    }
    
    try {
      await signUp(registerEmail, registerPassword, registerName);
      setActiveTab('login');
    } catch (error: any) {
      // Error may already be handled in signUp method, but set a backup error
      if (error.message) {
        setError(error.message);
      }
    }
  };

  // Clear error when switching tabs
  const handleTabChange = (value: string) => {
    setError(null);
    setActiveTab(value);
  };
  
  // Retry connection
  const handleRetryConnection = () => {
    setError(null);
    window.location.reload();
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-4">
            <Compass className="h-10 w-10 text-orienteering" />
            <span className="text-2xl font-bold">OL.se</span>
          </div>
          <CardTitle className="text-2xl">{t('welcomeTo')} OL.se</CardTitle>
          <CardDescription>
            {t('authDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isOnline && (
            <Alert variant="destructive" className="mb-4">
              <WifiOff className="h-4 w-4 mr-2" />
              <AlertDescription className="flex justify-between items-center">
                <span>{t('offlineError') || 'You are currently offline'}</span>
                <Button size="sm" variant="outline" onClick={handleRetryConnection}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription className="flex justify-between items-center">
                <span>{error}</span>
                {error.includes('fetch') && (
                  <Button size="sm" variant="outline" onClick={handleRetryConnection}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {t('retry')}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('signIn')}</TabsTrigger>
              <TabsTrigger value="register">{t('register')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="example@example.com"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">{t('password')}</Label>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !isOnline}>
                  {loading ? t('signingIn') : t('signIn')}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">{t('name')}</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder={t('fullName')}
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">{t('email')}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="example@example.com"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">{t('password')}</Label>
                  <Input
                    id="register-password"
                    type="password"
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !isOnline}>
                  {loading ? t('registering') : t('register')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground text-center">{t('authDisclaimer')}</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
