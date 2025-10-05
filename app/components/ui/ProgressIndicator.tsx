import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface ProgressIndicatorProps {
  show: boolean;
  message?: string;
  progress?: number;
  type?: 'loading' | 'success' | 'error';
}

export function ProgressIndicator({ show, message, progress, type = 'loading' }: ProgressIndicatorProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'i-ph:check-circle-fill';
      case 'error':
        return 'i-ph:x-circle-fill';
      default:
        return 'i-svg-spinners:90-ring-with-bg';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return 'text-bolt-elements-icon-success';
      case 'error':
        return 'text-bolt-elements-icon-error';
      default:
        return 'text-bolt-elements-loader-progress';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-6 right-6 z-50 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg shadow-lg p-4 min-w-[300px]"
        >
          <div className="flex items-center gap-3">
            <div className={classNames(getIcon(), getColor(), 'text-2xl flex-shrink-0')} />
            <div className="flex-1 min-w-0">
              {message && (
                <div className="text-sm font-medium text-bolt-elements-textPrimary mb-1">
                  {message}
                </div>
              )}
              {progress !== undefined && (
                <div className="w-full h-2 bg-bolt-elements-loader-background rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-bolt-elements-loader-progress"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
