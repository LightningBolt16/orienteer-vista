import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Medal, Users, Upload, Loader2 } from 'lucide-react';
import ImageCropper from '@/components/ImageCropper';

interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_approved: boolean;
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

const ClubDetailPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { user, session } = useUser();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isAuthenticated = user && user.id !== '1' && session;

  useEffect(() => {
    if (clubId) {
      fetchClubData();
    }
  }, [clubId, isAuthenticated]);

  const fetchClubData = async () => {
    try {
      setLoading(true);

      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .maybeSingle();

      if (clubError) throw clubError;
      if (!clubData) {
        navigate('/clubs');
        return;
      }

      setClub(clubData);

      // Fetch members
      const { data: membersData } = await supabase
        .from('club_members')
        .select('user_id, role')
        .eq('club_id', clubId);

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
        setMembers(memberDetails);

        // Check if current user is admin/member
        if (user?.id) {
          const userMember = memberDetails.find(m => m.user_id === user.id);
          setIsMember(!!userMember);
          setIsAdmin(userMember?.role === 'admin');
        }
      }
    } catch (error) {
      console.error('Error fetching club:', error);
      navigate('/clubs');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!club) return;

    try {
      setUploading(true);
      setCropperOpen(false);

      const fileName = `${club.id}/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('club-logos')
        .upload(fileName, croppedBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('club-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('clubs')
        .update({ logo_url: publicUrl })
        .eq('id', club.id);

      if (updateError) throw updateError;

      setClub({ ...club, logo_url: publicUrl });
      toast({ title: t('success'), description: t('logoUpdated') });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setImageToCrop(null);
    }
  };

  const handleJoinClub = async () => {
    if (!user?.id || !club) return;

    try {
      const { error } = await supabase
        .from('club_members')
        .insert({ club_id: club.id, user_id: user.id, role: 'member' });

      if (error) throw error;

      toast({ title: t('success'), description: t('joinedClub') });
      fetchClubData();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
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

  if (!club) {
    return null;
  }

  const sortedMembers = [...members].sort((a, b) => {
    const scoreA = a.user_profile ? calculateScore(Number(a.user_profile.accuracy), Number(a.user_profile.speed)) : 0;
    const scoreB = b.user_profile ? calculateScore(Number(b.user_profile.accuracy), Number(b.user_profile.speed)) : 0;
    return scoreB - scoreA;
  });

  const totalScore = sortedMembers.reduce((sum, m) => {
    return sum + (m.user_profile ? calculateScore(Number(m.user_profile.accuracy), Number(m.user_profile.speed)) : 0);
  }, 0);
  const avgScore = members.length > 0 ? totalScore / members.length : 0;

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/clubs')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToClubs')}
        </Button>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24">
                <AvatarImage src={club.logo_url || ''} />
                <AvatarFallback className="text-3xl">{club.name[0]}</AvatarFallback>
              </Avatar>
              {isAdmin && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Upload className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{club.name}</CardTitle>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {members.length} {t('members')}
                </span>
                <span>{t('avgScore')}: {avgScore.toFixed(1)}</span>
                <span>{t('totalScore')}: {totalScore.toFixed(1)}</span>
              </div>
            </div>
            {isAuthenticated && !isMember && (
              <Button onClick={handleJoinClub}>
                {t('join')}
              </Button>
            )}
          </CardHeader>
          {club.description && (
            <CardContent>
              <p className="text-muted-foreground">{club.description}</p>
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
            {sortedMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t('noMembers')}</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      <ImageCropper
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setImageToCrop(null);
        }}
        imageSrc={imageToCrop || ''}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default ClubDetailPage;
