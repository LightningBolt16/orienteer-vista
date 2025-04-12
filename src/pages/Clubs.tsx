
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Search, User, CheckCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Club } from '../types/club';

const ClubsPage: React.FC = () => {
  const { user, fetchClubs } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchClubsData();
  }, [user]);
  
  const fetchClubsData = async () => {
    try {
      setLoading(true);
      
      // Fetch clubs with member count
      const clubsData = await fetchClubs();
      setClubs(clubsData);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
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
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchClubs')}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {filteredClubs.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('noClubsFound')}</h2>
            <p className="text-muted-foreground">{t('noClubsFoundDesc')}</p>
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
                        className="w-full h-full object-contain p-2"
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
                      <div className="w-full px-4 py-2 bg-orienteering/10 text-orienteering rounded-md text-center">
                        {t('yourClub')}
                      </div>
                    ) : (
                      <div className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-md text-center">
                        {t('contactAdminToJoin')}
                      </div>
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
