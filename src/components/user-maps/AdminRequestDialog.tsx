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
import { Crown, Loader2, Unlock, Check, Clock } from 'lucide-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';

interface AdminRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminRequestDialog: React.FC<AdminRequestDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { existingRequest, submitting, submitRequest } = useAdminRequest();
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    const success = await submitRequest(reason);
    if (success) {
      setReason('');
      onOpenChange(false);
    }
  };

  const getStatusBadge = () => {
    if (!existingRequest) return null;
    
    switch (existingRequest.status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Request Admin Access</DialogTitle>
          </div>
          <DialogDescription>
            Admin access unlocks advanced features for power users.
          </DialogDescription>
        </DialogHeader>

        {existingRequest ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Request Status:</span>
              {getStatusBadge()}
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
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2 bg-muted p-4 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Unlock className="h-4 w-4" />
                Admin Benefits
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Multi-route images:</strong> Generate 2-3 alternate routes per image</li>
                <li>• <strong>More routes:</strong> Up to 500 output routes (vs 100)</li>
                <li>• <strong>Larger calculations:</strong> Up to 100,000 candidate pairs (vs 50,000)</li>
                <li>• <strong>Priority processing:</strong> Your maps get processed first</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Why do you need admin access? (Optional)</Label>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!existingRequest && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
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
