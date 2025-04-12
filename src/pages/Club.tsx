import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { supabase } from '../integrations/supabase/client';
import { useLanguage } from '../context/LanguageContext';
import { toast } from '../components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { 
  Building2, 
  Users, 
  User, 
  Settings, 
  Edit, 
  Trophy, 
  Award, 
  Zap,
  CheckCircle,
  XCircle,
  Upload,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ClubMember, ClubRequest, ClubRole } from '../types/club';

const ClubPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, fetchUserProfile } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [clubName, setClubName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [memberRoleDialog, setMemberRoleDialog] = useState<{open: boolean, member: ClubMember | null}>({
    open: false,
    member: null
  });

  useEffect(() => {
    if (id) {
      fetchClubDetails();
      fetchClubMembers();
    }
  }, [id]);

  useEffect(() => {
    if (user && club) {
      const isUserAdmin = user.clubRole === 'admin' && user.clubId === id;
      const isUserManager = (user.clubRole === 'manager' || user.clubRole === 'admin') && user.clubId === id;
      
      setIsAdmin(isUserAdmin);
      setIsManager(isUserManager);
      
      if (isUserManager) {
        fetchJoinRequests();
      }
    }
  }, [user, club, id]);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);
      // Use a direct query to fetch club details
      const { data, error } = await supabase.rpc('get_club_by_id', {
        p_club_id: id
      });
        
      if (error) throw error;
      
      if (data) {
        setClub(data);
        setClubName(data.name);
      }
    } catch (error) {
      console.error('Error fetching club:', error);
      toast({
        title: t('error'),
        description: t('errorFetchingClub'),
        variant: 'destructive'
      });
      navigate('/clubs');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubMembers = async () => {
    try {
      // Use a stored procedure to get club members
      const { data, error } = await supabase.rpc('get_club_members', {
        p_club_id: id
      });
        
      if (error) throw error;
      
      if (data) {
        setMembers(data as ClubMember[]);
      }
    } catch (error) {
      console.error('Error fetching club members:', error);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      // Use a stored procedure to get pending requests
      const { data, error } = await supabase.rpc('get_club_requests', {
        p_club_id: id
      });
        
      if (error) throw error;
      
      if (data) {
        setRequests(data as ClubRequest[]);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const handleUpdateClub = async () => {
    if (!club || !isAdmin) return;
    
    try {
      // Use a stored procedure to update club
      const { error } = await supabase.rpc('update_club_name', {
        p_club_id: club.id,
        p_name: clubName
      });
        
      if (error) throw error;
      
      setClub({
        ...club,
        name: clubName
      });
      
      setIsEditing(false);
      
      toast({
        title: t('success'),
        description: t('clubUpdated')
      });
    } catch (error) {
      console.error('Error updating club:', error);
      toast({
        title: t('error'),
        description: t('errorUpdatingClub'),
        variant: 'destructive'
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !club || !isAdmin) return;

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `club_logos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profile_images')
        .getPublicUrl(filePath);
      
      // Use stored procedure to update club logo  
      const { error } = await supabase.rpc('update_club_logo', {
        p_club_id: club.id,
        p_logo_url: publicUrl
      });
        
      if (error) throw error;
      
      setClub({
        ...club,
        logo_url: publicUrl
      });
      
      toast({
        title: t('success'),
        description: t('logoUpdated')
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: t('error'),
        description: t('errorUploadingLogo'),
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!user || user.clubId !== id) return;
    
    try {
      // Use stored procedure to leave club
      const { error } = await supabase.rpc('leave_club', {
        p_user_id: user.id
      });
        
      if (error) throw error;
      
      toast({
        title: t('success'),
        description: t('leftClub')
      });
      
      await fetchUserProfile();
      navigate('/profile');
    } catch (error) {
      console.error('Error leaving club:', error);
      toast({
        title: t('error'),
        description: t('errorLeavingClub'),
        variant: 'destructive'
      });
    }
  };

  const handleRequestAction = async (requestId: string, userId: string, action: 'approve' | 'reject') => {
    try {
      // Use stored procedure to handle request
      const { error } = await supabase.rpc('handle_club_request', {
        p_request_id: requestId,
        p_user_id: userId,
        p_club_id: id,
        p_action: action
      });
        
      if (error) throw error;
      
      // Update requests list
      setRequests(requests.filter(req => req.id !== requestId));
      
      // If approved, refresh members list
      if (action === 'approve') {
        fetchClubMembers();
      }
      
      toast({
        title: t('success'),
        description: action === 'approve' ? t('userAdded') : t('requestRejected')
      });
    } catch (error) {
      console.error(`Error ${action === 'approve' ? 'approving' : 'rejecting'} request:`, error);
      toast({
        title: t('error'),
        description: t('errorProcessingRequest'),
        variant: 'destructive'
      });
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: ClubRole) => {
    if (!isAdmin) return;
    
    try {
      // Use stored procedure to update member role
      const { error } = await supabase.rpc('update_member_role', {
        p_user_id: memberId,
        p_club_id: id,
        p_role: newRole
      });
        
      if (error) throw error;
      
      // Update local state
      setMembers(members.map(member => 
        member.id === memberId 
          ? { ...member, club_role: newRole } 
          : member
      ));
      
      // Close dialog
      setMemberRoleDialog({ open: false, member: null });
      
      toast({
        title: t('success'),
        description: t('roleUpdated')
      });
      
      // If current user's role was updated, refresh user profile
      if (user?.id === memberId) {
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: t('error'),
        description: t('errorUpdatingRole'),
        variant: 'destructive'
      });
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'elite':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'accurate':
        return <Award className="h-4 w-4 text-blue-500" />;
      case 'fast':
        return <Zap className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

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
          <h1 className="text-2xl font-bold mb-4">{t('clubNotFound')}</h1>
          <p className="mb-6">{t('clubNotFoundDesc')}</p>
          <Button onClick={() => navigate('/clubs')}>
            {t('browseClubs')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 animate-fade-in">
      <div className="glass-card p-8">
        {/* Club Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Club Logo */}
          <div className="shrink-0 relative">
            <div className={`w-32 h-32 relative rounded-lg overflow-hidden bg-muted flex items-center justify-center ${isAdmin ? 'cursor-pointer hover:opacity-90' : ''}`}>
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
                      onClick={isAdmin ? () => document.getElementById('logo-upload')?.click() : undefined}
                    />
                  ) : (
                    <div 
                      className="w-full h-full bg-muted flex items-center justify-center"
                      onClick={isAdmin ? () => document.getElementById('logo-upload')?.click() : undefined}
                    >
                      <Building2 className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {isAdmin && (
                    <div className="absolute bottom-0 right-0 bg-orienteering rounded-full p-2 shadow-md">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                  )}
                </>
              )}
            </div>
            {isAdmin && (
              <input 
                type="file" 
                id="logo-upload" 
                className="hidden" 
                accept="image/*" 
                onChange={handleLogoUpload}
              />
            )}
          </div>
          
          {/* Club Info */}
          <div className="flex-grow space-y-4 text-center md:text-left">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="text-2xl font-bold w-full bg-transparent border-b border-muted focus:border-orienteering focus:outline-none pb-1"
                  autoFocus
                />
                <button 
                  onClick={handleUpdateClub}
                  className="p-2 text-orienteering hover:bg-orienteering/10 rounded-full transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => {
                    setClubName(club.name);
                    setIsEditing(false);
                  }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center md:justify-start">
                <h1 className="text-2xl font-bold">{club.name}</h1>
                {isAdmin && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="ml-2 p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/50">
                <Users className="h-4 w-4 mr-1" />
                <span>{members.length} {t('members')}</span>
              </div>
              
              {club.is_subscribed && (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>{t('subscribed')}</span>
                </div>
              )}
            </div>
            
            {user?.clubId === id ? (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {(isAdmin || isManager) && (
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setShowRequestsDialog(true)}
                  >
                    <Users className="h-4 w-4" />
                    <span>{t('requests')} {requests.length > 0 && `(${requests.length})`}</span>
                  </Button>
                )}
                
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t('manageClub')}</span>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-red-500 hover:text-red-600"
                  onClick={handleLeaveClub}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('leaveClub')}</span>
                </Button>
              </div>
            ) : (
              <Button
                className="flex items-center gap-1"
                onClick={() => {/* Join club logic */}}
              >
                <User className="h-4 w-4" />
                <span>{t('joinClub')}</span>
              </Button>
            )}
          </div>
        </div>
        
        <Separator className="my-8" />
        
        {/* Members List */}
        <div>
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {t('members')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <div key={member.id} className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {member.profile_image ? (
                      <AvatarImage src={member.profile_image} alt={member.name} />
                    ) : (
                      <AvatarFallback className="bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{member.name}</div>
                      {isAdmin && member.id !== user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 text-muted-foreground hover:text-foreground rounded-full">
                              <Settings className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('manageUser')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setMemberRoleDialog({ open: true, member })}>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              {t('changeRole')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500">
                              <LogOut className="h-4 w-4 mr-2" />
                              {t('removeFromClub')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-1">
                      <div className="flex items-center text-xs px-2 py-1 rounded-full bg-secondary">
                        {getRoleIcon(member.role)}
                        <span className="ml-1">{member.role || 'beginner'}</span>
                      </div>
                      
                      {member.club_role && member.club_role !== 'member' && (
                        <div className="flex items-center text-xs px-2 py-1 rounded-full bg-orienteering/10 text-orienteering">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          <span>{member.club_role}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Join Requests Dialog */}
      <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('joinRequests')}</DialogTitle>
            <DialogDescription>
              {t('pendingRequestsDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noRequests')}
              </div>
            ) : (
              requests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{request.user_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-500"
                      onClick={() => handleRequestAction(request.id, request.user_id, 'approve')}
                    >
                      {t('approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500"
                      onClick={() => handleRequestAction(request.id, request.user_id, 'reject')}
                    >
                      {t('reject')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestsDialog(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Member Role Dialog */}
      <Dialog 
        open={memberRoleDialog.open} 
        onOpenChange={(open) => setMemberRoleDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeRole')}</DialogTitle>
            <DialogDescription>
              {memberRoleDialog.member?.name && t('changeRoleFor').replace('{name}', memberRoleDialog.member.name)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className={`justify-start ${memberRoleDialog.member?.club_role === 'member' ? 'bg-secondary' : ''}`}
                onClick={() => memberRoleDialog.member && handleUpdateMemberRole(memberRoleDialog.member.id, 'member')}
              >
                <User className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{t('member')}</div>
                  <div className="text-xs text-muted-foreground">{t('memberDesc')}</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className={`justify-start ${memberRoleDialog.member?.club_role === 'trainer' ? 'bg-secondary' : ''}`}
                onClick={() => memberRoleDialog.member && handleUpdateMemberRole(memberRoleDialog.member.id, 'trainer')}
              >
                <Award className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{t('trainer')}</div>
                  <div className="text-xs text-muted-foreground">{t('trainerDesc')}</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className={`justify-start ${memberRoleDialog.member?.club_role === 'manager' ? 'bg-secondary' : ''}`}
                onClick={() => memberRoleDialog.member && handleUpdateMemberRole(memberRoleDialog.member.id, 'manager')}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{t('manager')}</div>
                  <div className="text-xs text-muted-foreground">{t('managerDesc')}</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className={`justify-start ${memberRoleDialog.member?.club_role === 'admin' ? 'bg-secondary' : ''}`}
                onClick={() => memberRoleDialog.member && handleUpdateMemberRole(memberRoleDialog.member.id, 'admin')}
              >
                <Trophy className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{t('admin')}</div>
                  <div className="text-xs text-muted-foreground">{t('adminDesc')}</div>
                </div>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberRoleDialog({ open: false, member: null })}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubPage;
