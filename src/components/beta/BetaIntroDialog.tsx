import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface BetaIntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
}

const BetaIntroDialog: React.FC<BetaIntroDialogProps> = ({
  open,
  onOpenChange,
  onAcknowledge,
}) => {
  const { t } = useLanguage();

  const handleClose = () => {
    onAcknowledge();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orienteering" />
            {t('betaEnabledTitle')}
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            {t('betaEnabledBody')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose}>{t('gotIt')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BetaIntroDialog;
