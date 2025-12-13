import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Clock, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClubRequest {
  id: string;
  club_name: string;
  description: string | null;
  requested_by: string;
  status: string;
  created_at: string;
  requester_name?: string;
}

const AdminClubRequests: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
    
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from('club_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch requester names
      const requestsWithNames = await Promise.all(
        (requestsData || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name')
            .eq('user_id', req.requested_by)
            .single();
          
          return {
            ...req,
            requester_name: profile?.name || 'Unknown User'
          };
        })
      );

      setRequests(requestsWithNames);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: ClubRequest) => {
    setProcessing(request.id);
    
    try {
      // 1. Create the club
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .insert({
          name: request.club_name,
          description: request.description,
          created_by: request.requested_by,
          is_approved: true
        })
        .select()
        .single();

      if (clubError) throw clubError;

      // 2. Add requester as admin member
      const { error: memberError } = await supabase
        .from('club_members')
        .insert({
          club_id: club.id,
          user_id: request.requested_by,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // 3. Update request status
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('club_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success(t('clubApproved'));
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(t('error'));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: ClubRequest) => {
    setProcessing(request.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('club_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success(t('clubRejected'));
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(t('error'));
    } finally {
      setProcessing(null);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orienteering" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-8 w-8 text-orienteering" />
          <h1 className="text-3xl font-bold">{t('adminClubRequests')}</h1>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('noPendingRequests')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{request.club_name}</CardTitle>
                      <CardDescription className="mt-1">
                        {t('requestedBy')}: {request.requester_name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      {t('pending')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {request.description && (
                    <p className="text-muted-foreground mb-4">{request.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-4">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(request)}
                      disabled={processing === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {t('approve')}
                    </Button>
                    <Button
                      onClick={() => handleReject(request)}
                      disabled={processing === request.id}
                      variant="destructive"
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      {t('reject')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClubRequests;
