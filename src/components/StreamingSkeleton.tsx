import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StreamingSkeletonProps {
  className?: string;
}

export const StreamingSkeleton: React.FC<StreamingSkeletonProps> = ({ className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn('mt-4 p-4 rounded-md bg-muted/30 border border-dashed border-muted-foreground/30', className)}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <span className="text-xs text-muted-foreground font-medium">AI is writing...</span>
      </div>
      
      <div className="space-y-2">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Skeleton className="h-3 w-full" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        >
          <Skeleton className="h-3 w-4/5" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        >
          <Skeleton className="h-3 w-3/4" />
        </motion.div>
      </div>
    </motion.div>
  );
};