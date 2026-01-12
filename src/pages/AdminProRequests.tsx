import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Check, X, Crown, ArrowLeft } from 'lucide-react';

interface ProRequest {
  id: string;
  user_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  requester_name?: string;
  requester_email?: string;
}

const AdminProRequests: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [requests, setRequests] = useState<ProRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each request
      const requestsWithNames = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name')
            .eq('user_id', request.user_id)
            .single();

          return {
            ...request,
            requester_name: profile?.name || 'Unknown User',
          };
        })
      );

      setRequests(requestsWithNames);
    } catch (error) {
      console.error('Error fetching pro requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pro access requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchRequests();
    } else if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [adminLoading, isAdmin, fetchRequests, navigate]);

  const handleApprove = async (request: ProRequest) => {
    setProcessing(request.id);
    try {
      // Add 'pro' role to user_roles table using raw SQL to bypass TypeScript enum restriction
      const { error: roleError } = await supabase.rpc('has_pro_access', { _user_id: request.user_id });
      
      // Insert the pro role directly
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: 'pro' as any, // Cast to any since 'pro' is a new enum value not yet in generated types
        });

      if (insertError) {
        // Check if user already has the role
        if (insertError.code === '23505') {
          toast({
            title: 'Already Pro',
            description: 'This user already has pro access',
          });
        } else {
          throw insertError;
        }
      }

      // Update the request status
      const { error: updateError } = await supabase
        .from('admin_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({
        title: 'Approved',
        description: `Pro access granted to ${request.requester_name}`,
      });

      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: ProRequest) => {
    setProcessing(request.id);
    try {
      const { error } = await supabase
        .from('admin_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Rejected',
        description: 'Pro access request has been rejected',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Pro Access Requests</h1>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending pro access requests
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.requester_name}</CardTitle>
                    <CardDescription>
                      Requested {new Date(request.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {request.reason && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Reason:</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{request.reason}</p>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request)}
                    disabled={processing === request.id}
                  >
                    {processing === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={processing === request.id}
                  >
                    {processing === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProRequests;
