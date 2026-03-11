import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'glow';
}

export function Card({ children, className = '', hover = false, onClick, variant = 'default' }: CardProps) {
  const variants = {
    default: 'card-solid',
    glass: 'glass-card',
    glow: 'card-elevated glow-orange-sm',
  };

  return (
    <div
      className={`
        ${hover ? 'card-elevated cursor-pointer' : variants[variant]}
        p-6 ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
