import React from 'react';
import { cn } from '@/lib/utils';

interface BetaBadgeProps {
  className?: string;
}

const BetaBadge: React.FC<BetaBadgeProps> = ({ className }) => (
  <span
    className={cn(
      'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wider',
      'bg-orienteering text-white shadow-sm',
      className
    )}
  >
    BETA
  </span>
);

export default BetaBadge;
