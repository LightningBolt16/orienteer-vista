
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Club, ClubMember, ClubRole } from '../types/club';
import { getClubById, getClubMembers, updateMemberRole } from '../helpers/supabaseQueries';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from '../components/ui/use-toast';
import { Users, Settings, ChevronLeft, MoreHorizontal, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const ClubDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useLanguage();
  
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState('members');
  
  useEffect(() => {
    if (!id) return;
    
    const fetchClubData = async () => {
      setLoading(true);
      try {
        const clubData = await getClubById(id);
        if (clubData) {
          setClub(clubData);
          
          // Fetch members
          const membersData = await getClubMembers(id);
          setMembers(membersData);
        } else {
          toast({
            title: t('error'),
            description: t('clubNotFound'),
            variant: 'destructive',
          });
          navigate('/clubs');
        }
      } catch (error) {
        console.error('Error fetching club data:', error);
        toast({
          title: t('error'),
          description: t('errorFetchingClubData'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchClubData();
  }, [id, navigate, t]);

  const isAdmin = () => {
    if (!user || !members.length) return false;
    const currentMember = members.find(member => member.id === user.id);
    return currentMember?.club_role === 'admin';
  };
  
  const handleRoleUpdate = async (memberId: string, newRole: ClubRole) => {
    if (!id) return;
    
    try {
      const success = await updateMemberRole(memberId, id, newRole);
      if (success) {
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(member => 
            member.id === memberId ? { ...member, club_role: newRole } : member
          )
        );
        
        toast({
          title: t('success'),
          description: t('roleUpdated'),
        });
      } else {
        toast({
          title: t('error'),
          description: t('roleUpdateFailed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: t('error'),
        description: t('roleUpdateFailed'),
        variant: 'destructive',
      });
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full max-w-sm" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  // Render not found state
  if (!club) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">{t('clubNotFound')}</h1>
          <Button onClick={() => navigate('/clubs')}>{t('backToClubs')}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with club info */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/clubs')}
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={club.logo_url} alt={club.name} />
                <AvatarFallback className="bg-orienteering/10 text-orienteering">
                  {club.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-2xl font-bold">{club.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{club.member_count} {t('members')}</span>
                </div>
              </div>
            </div>
          </div>
          
          {isAdmin() && (
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {t('manageClub')}
            </Button>
          )}
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('members')}
            </TabsTrigger>
            {isAdmin() && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t('settings')}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('clubMembers')}</CardTitle>
                <CardDescription>
                  {t('clubMembersDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('name')}</TableHead>
                        <TableHead>{t('role')}</TableHead>
                        <TableHead>{t('level')}</TableHead>
                        <TableHead>{t('stats')}</TableHead>
                        {isAdmin() && <TableHead className="text-right">{t('actions')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map(member => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.profile_image} alt={member.name} />
                                <AvatarFallback className="bg-secondary text-secondary-foreground">
                                  {member.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {member.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.club_role === 'admin' ? 'default' : 'outline'}>
                              {member.club_role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.role}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              <div>
                                {t('accuracy')}: {member.accuracy || 0}%
                              </div>
                              <div>
                                {t('speed')}: {member.speed || 0}s
                              </div>
                            </div>
                          </TableCell>
                          {isAdmin() && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('changeRole')}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleUpdate(member.id, 'member')}
                                    disabled={member.club_role === 'member'}
                                  >
                                    {t('member')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleUpdate(member.id, 'trainer')}
                                    disabled={member.club_role === 'trainer'}
                                  >
                                    {t('trainer')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleUpdate(member.id, 'manager')}
                                    disabled={member.club_role === 'manager'}
                                  >
                                    {t('manager')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleUpdate(member.id, 'admin')}
                                    disabled={member.club_role === 'admin'}
                                  >
                                    {t('admin')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {isAdmin() && (
            <TabsContent value="settings" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('addMember')}</CardTitle>
                    <CardDescription>
                      {t('addMemberDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg border-muted">
                      <div className="text-center">
                        <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">{t('inviteUsers')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('adminMustAddUsers')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="w-full flex justify-center">
                      <Button 
                        onClick={() => {
                          toast({
                            title: "Not implemented",
                            description: "This feature is coming soon!",
                          });
                        }}
                      >
                        {t('addNewMember')}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default ClubDetailsPage;
