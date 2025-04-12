
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getClubsWithMemberCount } from '../helpers/supabaseQueries';
import { Club } from '../types/club';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from '../components/ui/use-toast';
import { Users, Search, Info } from 'lucide-react';
import { Input } from '../components/ui/input';

const ClubsPage: React.FC = () => {
  const { user } = useUser();
  const { t } = useLanguage();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      setLoading(true);
      try {
        const clubsData = await getClubsWithMemberCount();
        setClubs(clubsData);
      } catch (error) {
        console.error('Error fetching clubs:', error);
        toast({
          title: t('error'),
          description: t('errorFetchingClubs'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, [t]);

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading skeleton
  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-60" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">{t('clubs')}</h1>
          <div className="flex w-full sm:w-auto max-w-sm space-x-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchClubs')}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredClubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('noClubsFound')}</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              {searchQuery 
                ? t('noClubsMatchingSearch') 
                : t('clubsAdminManaged')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map(club => (
              <Link key={club.id} to={`/club/${club.id}`} className="transition-transform hover:scale-[1.01]">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-bold">{club.name}</CardTitle>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={club.logo_url} alt={club.name} />
                      <AvatarFallback className="bg-orienteering/10 text-orienteering">
                        {club.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{club.member_count} {t('members')}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      {t('viewDetails')}
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClubsPage;
