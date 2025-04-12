import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, User, CheckCircle, Trophy, Award, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from '../components/ui/use-toast';
import { Club } from '../types/club';

const ClubsPage: React.FC = () => {
  const { user, joinClub } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  
  useEffect(() => {
    fetchClubs();
    if (user) {
      fetchUserPendingRequests();
    }
  }, [user]);
  
  const fetchClubs = async () => {
    try {
      setLoading(true);
      
      // Use a stored procedure to fetch clubs with member count
      const { data, error } = await supabase.rpc('get_clubs_with_member_count');
        
      if (error) throw error;
      
      setClubs(data as Club[]);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      toast({
        title: t('error'),
        description: t('errorFetchingClubs'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserPendingRequests = async () => {
    if (!user) return;
    
    try {
      // Use a stored procedure to get user's pending requests
      const { data, error } = await supabase.rpc('get_user_pending_requests', {
        p_user_id: user.id
      });
        
      if (error) throw error;
      
      if (data) {
        setPendingRequests(data.map((req: any) => req.club_id));
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };
  
  const handleJoinClub = async (clubId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user.clubId) {
      toast({
        title: t('alreadyInClub'),
        description: t('leaveCurrentClubFirst'),
        variant: 'destructive'
      });
      return;
    }
    
    const success = await joinClub(clubId);
    if (success) {
      setPendingRequests([...pendingRequests, clubId]);
    }
  };
  
  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orienteering"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto py-12 animate-fade-in">
      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold">{t('allClubs')}</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchClubs')}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button onClick={() => navigate('/clubs/new')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>{t('createClub')}</span>
            </Button>
          </div>
        </div>
        
        {filteredClubs.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('noClubsFound')}</h2>
            <p className="text-muted-foreground mb-6">{t('noClubsFoundDesc')}</p>
            <Button onClick={() => navigate('/clubs/new')}>
              {t('createYourClub')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map(club => (
              <div key={club.id} className="border rounded-lg overflow-hidden transition-all hover:shadow-md flex flex-col">
                <Link to={`/club/${club.id}`} className="block">
                  <div className="h-32 w-full bg-muted relative">
                    {club.logo_url ? (
                      <img 
                        src={club.logo_url} 
                        alt={club.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {club.is_subscribed && (
                      <div className="absolute top-2 right-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full px-2 py-1 text-xs font-medium flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('subscribed')}
                      </div>
                    )}
                  </div>
                </Link>
                
                <div className="p-4 flex-grow flex flex-col">
                  <Link to={`/club/${club.id}`} className="block hover:underline mb-2">
                    <h3 className="text-lg font-semibold">{club.name}</h3>
                  </Link>
                  
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <User className="h-4 w-4 mr-1" />
                    <span>{club.member_count} {t('members')}</span>
                  </div>
                  
                  <div className="mt-auto">
                    {user?.clubId === club.id ? (
                      <Button disabled className="w-full">
                        {t('yourClub')}
                      </Button>
                    ) : pendingRequests.includes(club.id) ? (
                      <Button disabled variant="outline" className="w-full">
                        {t('pendingRequest')}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleJoinClub(club.id)}
                      >
                        {t('requestToJoin')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsPage;
