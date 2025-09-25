import React from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ContinueButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ContinueButton: React.FC<ContinueButtonProps> = React.memo(({
  onClick,
  isLoading,
  disabled = false,
}) => {
  // Performance optimization: Respect user's reduced motion preference
  const shouldReduceMotion = useReducedMotion();
  
  // Performance optimization: Memoize animation variants
  const animationVariants = React.useMemo(() => ({
    hover: shouldReduceMotion ? {} : { scale: 1.05 },
    tap: shouldReduceMotion ? {} : { scale: 0.98 }
  }), [shouldReduceMotion]);
  
  // Performance optimization: Memoize transition config
  const transitionConfig:Transition = React.useMemo(() => 
    shouldReduceMotion 
      ? { duration: 0 }
      : { 
          type: "spring", 
          stiffness: 400, 
          damping: 25,
          mass: 0.8
        }
  , [shouldReduceMotion]);

  return (
    <motion.div
      whileHover={animationVariants.hover}
      whileTap={animationVariants.tap}
      transition={transitionConfig}
      // Performance optimization: Enable hardware acceleration
      style={{ 
        willChange: shouldReduceMotion ? 'auto' : 'transform',
        transform: 'translateZ(0)'
      }}
    >
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        variant="default"
        size="default"
        className={`
          transition-all duration-200
          ${shouldReduceMotion ? '' : 'hover:shadow-md active:shadow-sm'}
          will-change-[box-shadow,background-color]
        `}
      >
        {isLoading ? 'Generating...' : 'Continue Writing'}
      </Button>
    </motion.div>
  );
});