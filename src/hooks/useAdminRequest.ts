import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from '@/components/ui/use-toast';

export interface AdminRequest {
  id: string;
  user_id: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export function useAdminRequest() {
  const { user } = useUser();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin requests:', error);
      } else {
        setRequests((data || []) as AdminRequest[]);
      }
    } catch (error) {
      console.error('Error fetching admin requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Latest request — drives the current status display
  const existingRequest = requests[0] ?? null;

  // Past attempts (everything older than the latest)
  const pastAttempts = requests.slice(1);

  // The user can submit a new request if they have none, or their latest was rejected.
  const canSubmitNew = !existingRequest || existingRequest.status === 'rejected';

  const submitRequest = useCallback(async (reason: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a request',
        variant: 'destructive',
      });
      return false;
    }

    // Enforce a different reason than the most recent rejection
    if (existingRequest?.status === 'rejected') {
      const previous = (existingRequest.reason || '').trim().toLowerCase();
      const next = reason.trim().toLowerCase();
      if (!next) {
        toast({
          title: 'Reason required',
          description: 'Please provide a new reason for re-applying.',
          variant: 'destructive',
        });
        return false;
      }
      if (next === previous) {
        toast({
          title: 'New reason required',
          description: 'Please provide a different reason than your previous request.',
          variant: 'destructive',
        });
        return false;
      }
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .insert({
          user_id: user.id,
          reason,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setRequests((prev) => [data as AdminRequest, ...prev]);
      toast({
        title: 'Request Submitted',
        description: 'Your pro access request has been submitted for review.',
      });
      return true;
    } catch (error) {
      console.error('Error submitting admin request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, existingRequest]);

  return {
    existingRequest,
    pastAttempts,
    canSubmitNew,
    loading,
    submitting,
    submitRequest,
    refetch: fetchRequests,
  };
}
