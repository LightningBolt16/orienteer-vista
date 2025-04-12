
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Club, ClubMember, ClubRequest, ClubRole } from '../types/club';
import { getClubById, getClubMembers, getClubRequests, updateClubName, updateClubLogo, handleClubRequest, updateMemberRole } from '../helpers/supabaseQueries';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '../components/ui/use-toast';
import { supabase } from '../integrations/supabase/client';
import { 
  Building2, Users, Award, Edit2, Save, UserPlus, 
  UserMinus, ShieldAlert, MoreHorizontal, LogOut, Camera,
  Check, X, Clock, ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger 
} from '../components/ui/dialog';

const ClubPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, leaveClub } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [clubName, setClubName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchClubData();
    }
  }, [id]);
  
  const fetchClubData = async () => {
    if (!id) return;
    
    setLoading(true);
    
    try {
      // Fetch club details
      const clubData = await getClubById(id);
      if (clubData) {
        setClub(clubData);
        setClubName(clubData.name);
      }
      
      // Fetch club members
      const membersData = await getClubMembers(id);
      setMembers(membersData);
      
      // Fetch join requests
      const requestsData = await getClubRequests(id);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching club data:', error);
      toast({
        title: t('error'),
        description: t('errorFetchingClubData'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveName = async () => {
    if (!id || !clubName.trim()) return;
    
    try {
      const success = await updateClubName(id, clubName);
      
      if (success) {
        setClub(prev => prev ? { ...prev, name: clubName } : null);
        setEditMode(false);
        
        toast({
          title: t('success'),
          description: t('clubNameUpdated')
        });
      } else {
        throw new Error('Failed to update club name');
      }
    } catch (error) {
      console.error('Error updating club name:', error);
      toast({
        title: t('error'),
        description: t('errorUpdatingClubName'),
        variant: 'destructive'
      });
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;
    
    // Validate file size and type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('invalidFileType'),
        description: t('logoTypeLimit'),
        variant: 'destructive'
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: t('fileTooLarge'),
        description: t('logoSizeLimit'),
        variant: 'destructive'
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `club_logos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile_images')
        .getPublicUrl(filePath);
        
      // Update club logo
      const success = await updateClubLogo(id, publicUrl);
      
      if (success) {
        setClub(prev => prev ? { ...prev, logo_url: publicUrl } : null);
        
        toast({
          title: t('success'),
          description: t('logoUpdated')
        });
      } else {
        throw new Error('Failed to update club logo');
      }
    } catch (error) {
      console.error('Error updating club logo:', error);
      toast({
        title: t('error'),
        description: t('errorUpdatingLogo'),
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleLeaveClub = async () => {
    if (!user) return;
    
    try {
      const success = await leaveClub();
      
      if (success) {
        navigate('/clubs');
      }
    } catch (error) {
      console.error('Error leaving club:', error);
    }
  };
  
  const handleRequestAction = async (requestId: string, userId: string, action: 'approve' | 'reject') => {
    if (!id) return;
    
    try {
      const success = await handleClubRequest(requestId, userId, id, action);
      
      if (success) {
        // Update UI
        setRequests(prev => prev.filter(req => req.id !== requestId));
        
        if (action === 'approve') {
          // Refresh members list
          const membersData = await getClubMembers(id);
          setMembers(membersData);
          
          toast({
            title: t('success'),
            description: t('memberAdded')
          });
        } else {
          toast({
            title: t('success'),
            description: t('requestRejected')
          });
        }
      }
    } catch (error) {
      console.error('Error handling request:', error);
      toast({
        title: t('error'),
        description: t('errorHandlingRequest'),
        variant: 'destructive'
      });
    }
  };
  
  const handleChangeRole = async (userId: string, newRole: ClubRole) => {
    if (!id) return;
    
    try {
      const success = await updateMemberRole(userId, id, newRole);
      
      if (success) {
        // Update UI
        setMembers(prev => 
          prev.map(member => 
            member.id === userId 
              ? { ...member, club_role: newRole } 
              : member
          )
        );
        
        toast({
          title: t('success'),
          description: t('roleUpdated')
        });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: t('error'),
        description: t('errorUpdatingRole'),
        variant: 'destructive'
      });
    }
  };
  
  const isAdmin = user?.clubRole === 'admin';
  const isManager = user?.clubRole === 'manager' || isAdmin;
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orienteering"></div>
      </div>
    );
  }
  
  if (!club) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="glass-card p-8 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('clubNotFound')}</h1>
          <p className="text-muted-foreground mb-6">{t('clubNotFoundDesc')}</p>
          <Button onClick={() => navigate('/clubs')}>
            {t('backToClubs')}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto py-12 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/clubs')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToClubs')}
        </Button>
      </div>
      
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Club Logo */}
          <div className="relative">
            <div 
              className="w-32 h-32 relative rounded-lg overflow-hidden bg-muted cursor-pointer group"
              onClick={() => isManager ? document.getElementById('club-logo-input')?.click() : null}
            >
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-white rounded-full"></div>
                </div>
              ) : (
                <>
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
                  
                  {isManager && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}
                </>
              )}
            </div>
            <input 
              type="file"
              id="club-logo-input"
              className="hidden"
              accept="image/png,image/jpeg,image/gif"
              onChange={handleFileChange}
            />
          </div>
          
          {/* Club Info */}
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div className="flex-grow">
                {editMode ? (
                  <div className="flex items-center">
                    <Input
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="text-2xl font-bold mr-2"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleSaveName} 
                      disabled={!clubName.trim()}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('save')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <h1 className="text-2xl font-bold">{club.name}</h1>
                    {isManager && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditMode(true)}
                        className="ml-2"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Users className="h-4 w-4 mr-1" />
                  <span>
                    {members.length} {t('members')}
                  </span>
                </div>
              </div>
              
              {user?.clubId === id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleLeaveClub} className="text-red-500">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('leaveClub')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {/* Club members preview */}
            {members.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">{t('topMembers')}</h3>
                <div className="flex -space-x-2">
                  {members.slice(0, 5).map(member => (
                    <Avatar key={member.id} className="border-2 border-background">
                      {member.profile_image ? (
                        <AvatarImage src={member.profile_image} alt={member.name} />
                      ) : (
                        <AvatarFallback>
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  ))}
                  {members.length > 5 && (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-background text-sm">
                      +{members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            {t('members')}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="requests" className="relative">
              <UserPlus className="h-4 w-4 mr-2" />
              {t('joinRequests')}
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="members">
          <div className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(member => (
                <div key={member.id} className="p-4 border rounded-lg flex items-center">
                  <Avatar className="h-12 w-12 mr-4">
                    {member.profile_image ? (
                      <AvatarImage src={member.profile_image} alt={member.name} />
                    ) : (
                      <AvatarFallback>
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <span className="font-medium">{member.name}</span>
                      <div className="ml-2 text-xs bg-secondary py-0.5 px-2 rounded-full">
                        {t(member.club_role)}
                      </div>
                    </div>
                    
                    {member.role && (
                      <div className="text-sm text-muted-foreground">
                        {t(member.role)}
                      </div>
                    )}
                  </div>
                  
                  {isAdmin && member.id !== user?.id && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ShieldAlert className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('changeRole')}</DialogTitle>
                          <DialogDescription>
                            {t('changeRoleDesc', { name: member.name })}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-2 gap-4 py-4">
                          <Button 
                            variant="outline" 
                            className={member.club_role === 'member' ? 'border-orienteering ring-2 ring-orienteering/20' : ''}
                            onClick={() => handleChangeRole(member.id, 'member')}
                          >
                            {t('member')}
                          </Button>
                          <Button 
                            variant="outline"
                            className={member.club_role === 'trainer' ? 'border-orienteering ring-2 ring-orienteering/20' : ''}
                            onClick={() => handleChangeRole(member.id, 'trainer')}
                          >
                            {t('trainer')}
                          </Button>
                          <Button 
                            variant="outline"
                            className={member.club_role === 'manager' ? 'border-orienteering ring-2 ring-orienteering/20' : ''}
                            onClick={() => handleChangeRole(member.id, 'manager')}
                          >
                            {t('manager')}
                          </Button>
                          <Button 
                            variant="outline"
                            className={member.club_role === 'admin' ? 'border-orienteering ring-2 ring-orienteering/20' : ''}
                            onClick={() => handleChangeRole(member.id, 'admin')}
                          >
                            {t('admin')}
                          </Button>
                        </div>
                        
                        <DialogFooter>
                          <DialogTrigger asChild>
                            <Button variant="outline">{t('close')}</Button>
                          </DialogTrigger>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ))}
            </div>
            
            {members.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('noMembers')}</h3>
                <p className="text-muted-foreground">{t('noMembersDesc')}</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {isManager && (
          <TabsContent value="requests">
            <div className="glass-card p-6">
              {requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map(request => (
                    <div key={request.id} className="p-4 border rounded-lg flex items-center">
                      <div className="flex-grow">
                        <div className="font-medium">{request.user_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleRequestAction(request.id, request.user_id, 'approve')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {t('approve')}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRequestAction(request.id, request.user_id, 'reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('reject')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('noJoinRequests')}</h3>
                  <p className="text-muted-foreground">{t('noJoinRequestsDesc')}</p>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ClubPage;
