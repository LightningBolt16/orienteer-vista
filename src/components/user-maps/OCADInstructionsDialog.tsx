import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface OCADInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const OCADInstructionsDialog: React.FC<OCADInstructionsDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const { t } = useLanguage();

  const handleDownloadColorGuide = () => {
    window.open('/docs/OCAD_TIF_Color_Image.pdf', '_blank');
  };

  const handleDownloadImpassableGuide = () => {
    window.open('/docs/OCAD_TIF_Impassable.pdf', '_blank');
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            How to prepare your map files
          </DialogTitle>
          <DialogDescription>
            Please read these instructions carefully before uploading. Incorrect files will cause processing errors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Privacy Notice */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Private maps</p>
              <p className="text-muted-foreground">
                Maps you upload are completely private and only visible to you. They will not appear on public leaderboards or be shared with other users.
              </p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">Important</p>
              <p className="text-muted-foreground">
                Both TIF files must be exported from OCAD with the exact settings described below. 
                Incorrect resolution or format will result in processing failures.
              </p>
            </div>
          </div>

          {/* Color TIF Instructions */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">1</span>
              Color map (TIF) - Full color export
            </h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Open your map in <strong>OCAD</strong></li>
                <li>Go to <strong>File → Export</strong> (or press Ctrl+E)</li>
                <li>Select <strong>TIFF</strong> as the export format</li>
                <li>Set <strong>Resolution to 508 dpi</strong> (this is critical!)</li>
                <li>Select <strong>"Entire Map"</strong> for the export area</li>
                <li>Click <strong>Export</strong> and save the file</li>
              </ol>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadColorGuide} className="gap-2">
              <Download className="h-4 w-4" />
              Download color export guide (PDF)
            </Button>
          </div>

          {/* Impassable TIF Instructions */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">2</span>
              Impassable features map (TIF) - B&W export
            </h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Open your map in <strong>OCAD</strong></li>
                <li>Go to <strong>Map → Show Impassable Features</strong></li>
                <li>The map will now display only impassable elements</li>
                <li>Click <strong>Save As</strong> - this automatically saves as TIF with 508 dpi and the entire map</li>
              </ol>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadImpassableGuide} className="gap-2">
              <Download className="h-4 w-4" />
              Download impassable export guide (PDF)
            </Button>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <h3 className="font-semibold">Before uploading, verify:</h3>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Both files are in TIF/TIFF format</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Both files were exported at 508 dpi resolution</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Both files cover the same area ("Entire Map")</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>The impassable map shows barriers/obstacles clearly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            I've read the instructions - Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OCADInstructionsDialog;
