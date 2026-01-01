import React from 'react';
import pwtLogo from '@/assets/pwt-italia-logo.png';
import { ExternalLink } from 'lucide-react';

interface PwtAttributionProps {
  variant?: 'badge' | 'footer';
  className?: string;
}

const PWT_MAPS = ['Rotondella', 'Matera'];

export const isPwtMap = (mapName: string): boolean => {
  return PWT_MAPS.some(name => mapName.toLowerCase().includes(name.toLowerCase()));
};

const PwtAttribution: React.FC<PwtAttributionProps> = ({ variant = 'badge', className = '' }) => {
  if (variant === 'badge') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img 
          src={pwtLogo} 
          alt="Park World Tour Italia" 
          className="h-8 w-auto object-contain"
        />
      </div>
    );
  }

  // Footer variant with full attribution
  return (
    <div className={`flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-lg border border-border ${className}`}>
      <img 
        src={pwtLogo} 
        alt="Park World Tour Italia" 
        className="h-12 w-auto object-contain"
      />
      <p className="text-xs text-muted-foreground text-center">
        Rotondella & Matera maps provided by Park World Tour Italia
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        <a 
          href="https://www.orienteering.it" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          www.orienteering.it
          <ExternalLink className="h-3 w-3" />
        </a>
        <a 
          href="https://www.orienteering.it/events/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          MOC 2026 Events
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

export default PwtAttribution;
