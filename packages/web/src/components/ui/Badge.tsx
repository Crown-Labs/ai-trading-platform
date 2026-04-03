import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'accent' | 'green' | 'red' | 'muted' | 'outline';
  size?: 'sm' | 'xs';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  accent: 'bg-accent border border-accent text-dark-900',
  green: 'bg-green/15 text-green',
  red: 'bg-red/15 text-red',
  muted: 'bg-dark-700 border border-dark-700 text-muted',
  outline: 'bg-transparent border border-dark-700 text-muted hover:text-gray-200',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] rounded',
  xs: 'px-1 py-px text-[9px] rounded',
};

export default function Badge({
  variant = 'muted',
  size = 'sm',
  children,
  className = '',
  onClick,
  disabled,
}: BadgeProps) {
  const base = `inline-block font-medium whitespace-nowrap ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (onClick !== undefined) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${base} cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {children}
      </button>
    );
  }

  return <span className={base}>{children}</span>;
}
