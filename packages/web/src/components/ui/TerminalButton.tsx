import { ReactNode } from 'react';

interface TerminalButtonProps {
  variant?: 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses: Record<NonNullable<TerminalButtonProps['variant']>, string> = {
  accent: 'bg-accent border border-accent text-dark-900 font-bold hover:opacity-90',
  ghost:
    'bg-dark-700 border border-dark-700 text-muted hover:text-gray-200 font-mono',
  danger: 'bg-red/15 border border-red/30 text-red hover:bg-red/25',
};

const sizeClasses: Record<NonNullable<TerminalButtonProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[10px] rounded',
  md: 'px-3 py-1.5 text-sm rounded',
};

export default function TerminalButton({
  variant = 'ghost',
  size = 'sm',
  disabled,
  onClick,
  children,
  className = '',
  type = 'button',
}: TerminalButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
}
