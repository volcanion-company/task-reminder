import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { Button } from './Button';
import { useFocusTrap } from '@app/hooks/useFocusTrap';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  okText?: string;
}

export default function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  okText = 'OK',
}: AlertDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  
  if (!isOpen) return null;

  const config = {
    error: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      bgClass: 'bg-red-50 dark:bg-red-900/10',
    },
    warning: {
      icon: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
      bgClass: 'bg-yellow-50 dark:bg-yellow-900/10',
    },
    info: {
      icon: <Info className="w-12 h-12 text-blue-500" />,
      bgClass: 'bg-blue-50 dark:bg-blue-900/10',
    },
    success: {
      icon: <CheckCircle className="w-12 h-12 text-green-500" />,
      bgClass: 'bg-green-50 dark:bg-green-900/10',
    },
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
    >
      <div ref={dialogRef} className="bg-card rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="alert-dialog-title" className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${config[type].bgClass}`}>
              {config[type].icon}
            </div>
            <p className="flex-1 text-muted-foreground leading-relaxed pt-3">
              {message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <Button onClick={onClose} variant="primary">
            {okText}
          </Button>
        </div>
      </div>
    </div>
  );
}
