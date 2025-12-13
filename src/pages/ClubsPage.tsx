import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Trophy, Plus, LogIn, Building2, Medal, Clock } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_approved: boolean;
  member_count: number;
  total_score: number;
  average_score: number;
}

interface ClubMember {
  user_id: string;
  role: string;
  user_profile: {
    name: string;
    profile_image: string | null;
    accuracy: number;
    speed: number;
  } | null;
}

const ClubsPage: React.FC = () => {
  const { user, session } = useUser();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [userClub, setUserClub] = useState<Club | null>(null);
  const [userMembership, setUserMembership] = useState<{ club_id: string; role: string } | null>(null);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDescription, setNewClubDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ club_name: string; status: string } | null>(null);

  const isAuthenticated = user && user.id !== '1' && session;

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all approved clubs with member stats
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .eq('is_approved', true);

      if (clubsError) throw clubsError;

      // Fetch member counts and scores for each club
      const clubsWithStats = await Promise.all((clubsData || []).map(async (club) => {
        const { data: members } = await supabase
          .from('club_members')
          .select('user_id')
          .eq('club_id', club.id);

        const memberIds = members?.map(m => m.user_id) || [];
        
        let totalScore = 0;
        let averageScore = 0;
        
        if (memberIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('accuracy, speed')
            .in('user_id', memberIds);
          
          if (profiles && profiles.length > 0) {
            const scores = profiles.map(p => {
              const accuracy = Number(p.accuracy) || 0;
              const speed = Number(p.speed) || 1;
              return accuracy * (1000 / speed);
            });
            totalScore = scores.reduce((a, b) => a + b, 0);
            averageScore = totalScore / scores.length;
          }
        }

        return {
          ...club,
          member_count: memberIds.length,
          total_score: totalScore,
          average_score: averageScore,
        };
      }));

      setClubs(clubsWithStats);

      // Fetch user's club membership
      if (user?.id) {
        const { data: membership } = await supabase
          .from('club_members')
          .select('club_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        setUserMembership(membership);

        if (membership) {
          const club = clubsWithStats.find(c => c.id === membership.club_id);
          setUserClub(club || null);

          // Fetch club members
          const { data: membersData } = await supabase
            .from('club_members')
            .select('user_id, role')
            .eq('club_id', membership.club_id);

          if (membersData) {
            const memberDetails = await Promise.all(membersData.map(async (member) => {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('name, profile_image, accuracy, speed')
                .eq('user_id', member.user_id)
                .maybeSingle();
              
              return {
                ...member,
                user_profile: profile,
              };
            }));
            setClubMembers(memberDetails);
          }
        }

        // Check for pending club request
        const { data: request } = await supabase
          .from('club_requests')
          .select('club_name, status')
          .eq('requested_by', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        setPendingRequest(request);
      }
    } catch (error) {
      console.error('Error fetching clubs data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('club_members')
        .insert({ club_id: clubId, user_id: user.id, role: 'member' });

      if (error) throw error;

      toast({ title: t('success'), description: t('joinedClub') });
      fetchData();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleLeaveClub = async () => {
    if (!user?.id || !userMembership) return;

    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('user_id', user.id)
        .eq('club_id', userMembership.club_id);

      if (error) throw error;

      toast({ title: t('success'), description: t('leftClub') });
      setUserClub(null);
      setUserMembership(null);
      setClubMembers([]);
      fetchData();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleRequestClub = async () => {
    if (!user?.id || !newClubName.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('club_requests')
        .insert({ 
          club_name: newClubName.trim(), 
          description: newClubDescription.trim() || null,
          requested_by: user.id 
        });

      if (error) throw error;

      toast({ title: t('success'), description: t('clubRequestSubmitted') });
      setRequestDialogOpen(false);
      setNewClubName('');
      setNewClubDescription('');
      fetchData();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateScore = (accuracy: number, speed: number) => {
    if (!speed || speed === 0) return 0;
    return accuracy * (1000 / speed);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orienteering" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">{t('loginRequired')}</h1>
          <p className="text-muted-foreground mb-6">{t('loginToViewClubs')}</p>
          <Button onClick={() => navigate('/auth')}>
            <LogIn className="h-4 w-4 mr-2" />
            {t('signIn')}
          </Button>
        </div>
      </div>
    );
  }

  const sortedByAverage = [...clubs].sort((a, b) => b.average_score - a.average_score);
  const sortedByTotal = [...clubs].sort((a, b) => b.total_score - a.total_score);

  const sortedMembers = [...clubMembers].sort((a, b) => {
    const scoreA = a.user_profile ? calculateScore(Number(a.user_profile.accuracy), Number(a.user_profile.speed)) : 0;
    const scoreB = b.user_profile ? calculateScore(Number(b.user_profile.accuracy), Number(b.user_profile.speed)) : 0;
    return scoreB - scoreA;
  });

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('clubs')}</h1>
          <p className="text-muted-foreground">{t('clubsDescription')}</p>
        </div>

        <Tabs defaultValue={userClub ? 'my-club' : 'leaderboard'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">{t('clubLeaderboard')}</TabsTrigger>
            <TabsTrigger value="all-clubs">{t('allClubs')}</TabsTrigger>
            <TabsTrigger value="my-club">{t('myClub')}</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <Tabs defaultValue="average">
              <TabsList>
                <TabsTrigger value="average">{t('averageScore')}</TabsTrigger>
                <TabsTrigger value="total">{t('totalScore')}</TabsTrigger>
              </TabsList>

              <TabsContent value="average" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-orienteering" />
                      {t('clubLeaderboardAverage')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sortedByAverage.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">{t('noClubsYet')}</p>
                    ) : (
                      <div className="space-y-3">
                        {sortedByAverage.map((club, index) => (
                          <div 
                            key={club.id} 
                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => navigate(`/clubs/${club.id}`)}
                          >
                            <span className="text-lg font-bold w-8">{index + 1}</span>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={club.logo_url || ''} />
                              <AvatarFallback>{club.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{club.name}</p>
                              <p className="text-sm text-muted-foreground">{club.member_count} {t('members')}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{club.average_score.toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground">{t('avgScore')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="total" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-orienteering" />
                      {t('clubLeaderboardTotal')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sortedByTotal.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">{t('noClubsYet')}</p>
                    ) : (
                      <div className="space-y-3">
                        {sortedByTotal.map((club, index) => (
                          <div 
                            key={club.id} 
                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => navigate(`/clubs/${club.id}`)}
                          >
                            <span className="text-lg font-bold w-8">{index + 1}</span>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={club.logo_url || ''} />
                              <AvatarFallback>{club.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{club.name}</p>
                              <p className="text-sm text-muted-foreground">{club.member_count} {t('members')}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{club.total_score.toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground">{t('totalScore')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="all-clubs" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('allClubs')}</h2>
              {!userMembership && !pendingRequest && (
                <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('requestNewClub')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('requestNewClub')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium">{t('clubName')}</label>
                        <Input 
                          value={newClubName} 
                          onChange={(e) => setNewClubName(e.target.value)} 
                          placeholder={t('enterClubName')}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t('description')}</label>
                        <Textarea 
                          value={newClubDescription} 
                          onChange={(e) => setNewClubDescription(e.target.value)} 
                          placeholder={t('enterDescription')}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{t('clubRequestApprovalNote')}</p>
                      <Button onClick={handleRequestClub} disabled={submitting || !newClubName.trim()}>
                        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {t('submitRequest')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {pendingRequest && (
              <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <p>{t('pendingClubRequest')}: <strong>{pendingRequest.club_name}</strong></p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => (
                <Card key={club.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={club.logo_url || ''} />
                      <AvatarFallback>{club.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{club.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{club.member_count} {t('members')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {club.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{club.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t('avgScore')}: </span>
                        <span className="font-medium">{club.average_score.toFixed(1)}</span>
                      </div>
                      {!userMembership ? (
                        <Button size="sm" onClick={() => handleJoinClub(club.id)}>
                          {t('join')}
                        </Button>
                      ) : userMembership.club_id === club.id ? (
                        <span className="text-sm text-orienteering font-medium">{t('yourClub')}</span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {clubs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">{t('noClubsYet')}</p>
            )}
          </TabsContent>

          <TabsContent value="my-club" className="space-y-6">
            {userClub ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={userClub.logo_url || ''} />
                      <AvatarFallback className="text-xl">{userClub.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{userClub.name}</CardTitle>
                      <p className="text-muted-foreground">{userClub.member_count} {t('members')}</p>
                    </div>
                    <Button variant="outline" onClick={handleLeaveClub}>
                      {t('leaveClub')}
                    </Button>
                  </CardHeader>
                  {userClub.description && (
                    <CardContent>
                      <p className="text-muted-foreground">{userClub.description}</p>
                    </CardContent>
                  )}
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Medal className="h-5 w-5 text-orienteering" />
                      {t('clubMemberLeaderboard')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sortedMembers.map((member, index) => {
                        const score = member.user_profile 
                          ? calculateScore(Number(member.user_profile.accuracy), Number(member.user_profile.speed))
                          : 0;
                        
                        return (
                          <div 
                            key={member.user_id} 
                            className={`flex items-center gap-4 p-3 rounded-lg bg-muted/50 ${
                              member.user_id !== user?.id ? 'hover:bg-muted cursor-pointer' : ''
                            }`}
                            onClick={() => member.user_id !== user?.id && navigate(`/user/${member.user_id}`)}
                          >
                            <span className="text-lg font-bold w-8">{index + 1}</span>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.user_profile?.profile_image || ''} />
                              <AvatarFallback>{member.user_profile?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">
                                {member.user_profile?.name || 'Unknown'}
                                {member.user_id === user?.id && <span className="text-orienteering ml-2">({t('you')})</span>}
                              </p>
                              <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{score.toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground">{t('overall')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">{t('notInClub')}</h2>
                <p className="text-muted-foreground mb-4">{t('joinClubPrompt')}</p>
                <Button onClick={() => document.querySelector('[value="all-clubs"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>
                  {t('browseClubs')}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClubsPage;
