import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import BetaBadge from './BetaBadge';

interface BetaFeedbackBoxProps {
  feature: 'route_finder' | 'route_navigator';
}

const BetaFeedbackBox: React.FC<BetaFeedbackBoxProps> = ({ feature }) => {
  const { user } = useUser();
  const { t } = useLanguage();
  const storageKey = `beta-feedback-dismissed-${feature}`;

  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1'
  );
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  const handleSubmit = async () => {
    if (!user || user.id === '1' || !message.trim()) return;
    setSubmitting(true);
    const { error } = await (supabase
      .from('beta_feedback' as any)
      .insert({
        user_id: user.id,
        feature,
        message: message.trim(),
      }) as any);
    setSubmitting(false);
    if (error) {
      toast.error('Could not send feedback. Please try again.');
      return;
    }
    toast.success(t('feedbackThanks'));
    setMessage('');
    setOpen(false);
  };

  return (
    <Card className="border-orienteering/30 bg-orienteering/5">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <BetaBadge />
            <MessageSquarePlus className="h-4 w-4 text-orienteering" />
            <span>{t('betaFeedbackTitle')}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {open && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('betaFeedbackPlaceholder')}
              rows={3}
              maxLength={2000}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                {t('submitFeedback')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BetaFeedbackBox;
