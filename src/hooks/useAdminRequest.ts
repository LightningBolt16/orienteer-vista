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
  const [existingRequest, setExistingRequest] = useState<AdminRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchExistingRequest = useCallback(async () => {
    if (!user) {
      setExistingRequest(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin request:', error);
      } else {
        setExistingRequest(data as AdminRequest | null);
      }
    } catch (error) {
      console.error('Error fetching admin request:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExistingRequest();
  }, [fetchExistingRequest]);

  const submitRequest = useCallback(async (reason: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a request',
        variant: 'destructive',
      });
      return false;
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

      setExistingRequest(data as AdminRequest);
      toast({
        title: 'Request Submitted',
        description: 'Your admin access request has been submitted for review.',
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
  }, [user]);

  return {
    existingRequest,
    loading,
    submitting,
    submitRequest,
    refetch: fetchExistingRequest,
  };
}
