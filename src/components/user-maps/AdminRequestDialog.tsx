import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2, Unlock, Check, Clock, X } from 'lucide-react';
import { useAdminRequest, AdminRequest } from '@/hooks/useAdminRequest';

interface AdminRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusBadge = (status: AdminRequest['status']) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending Review</Badge>;
    case 'approved':
      return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Rejected</Badge>;
    default:
      return null;
  }
};

const AdminRequestDialog: React.FC<AdminRequestDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { existingRequest, pastAttempts, canSubmitNew, submitting, submitRequest } = useAdminRequest();
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    const success = await submitRequest(reason);
    if (success) {
      setReason('');
      onOpenChange(false);
    }
  };

  // Show the form when there's no existing request, or when the latest was rejected
  const showForm = canSubmitNew;

  // Combine the latest + past for the history list (only show history if there's at least one previous attempt)
  const allAttempts: AdminRequest[] = existingRequest
    ? [existingRequest, ...pastAttempts]
    : [];
  const hasHistory = allAttempts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Request Pro Access</DialogTitle>
          </div>
          <DialogDescription>
            Pro access unlocks advanced features for power users.
          </DialogDescription>
        </DialogHeader>

        {/* Current status — only when there's an existing request and we're NOT showing the form
            (i.e. status is pending or approved). For rejected, we surface history below the form. */}
        {existingRequest && !showForm && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Request Status:</span>
              {statusBadge(existingRequest.status)}
            </div>

            {existingRequest.reason && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Your Reason:</span>
                <p className="text-sm bg-muted p-3 rounded-lg">{existingRequest.reason}</p>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Submitted: {new Date(existingRequest.created_at).toLocaleDateString()}
            </div>

            {existingRequest.status === 'pending' && (
              <p className="text-sm text-muted-foreground italic">
                Your request is being reviewed. You'll receive admin access once approved.
              </p>
            )}
          </div>
        )}

        {/* Submission form — for first-time requests OR re-applying after rejection */}
        {showForm && (
          <div className="space-y-4 py-4">
            {existingRequest?.status === 'rejected' && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                <p className="text-sm font-medium text-destructive">Your previous request was rejected</p>
                <p className="text-xs text-muted-foreground">
                  You can re-apply, but you must provide a different reason than before.
                </p>
              </div>
            )}

            <div className="space-y-2 bg-muted p-4 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Unlock className="h-4 w-4" />
                Pro Benefits
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Multi-route images:</strong> Generate 2-3 alternate routes per image</li>
                <li>• <strong>More routes:</strong> Up to 500 output routes (vs 100)</li>
                <li>• <strong>Larger calculations:</strong> Up to 100,000 candidate pairs (vs 50,000)</li>
                <li>• <strong>Priority processing:</strong> Your maps get processed first</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                {existingRequest?.status === 'rejected'
                  ? 'New reason (must differ from previous)'
                  : 'Why do you need pro access? (Optional)'}
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., I'm a club coach creating training materials for my team..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Past attempts history */}
        {hasHistory && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-sm font-medium">
              Previous attempts ({allAttempts.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-md border bg-muted/40 p-3 text-sm space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(attempt.created_at).toLocaleDateString()}
                    </span>
                    {statusBadge(attempt.status)}
                  </div>
                  {attempt.reason && (
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                      {attempt.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {showForm && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : existingRequest?.status === 'rejected' ? (
                'Re-apply'
              ) : (
                'Submit Request'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRequestDialog;
