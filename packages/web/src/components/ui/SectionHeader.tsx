import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  count?: number | string;
  collapsed?: boolean;
  onToggle?: () => void;
  right?: ReactNode;
}

export default function SectionHeader({
  title,
  count,
  collapsed,
  onToggle,
  right,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center px-3 py-2 border-b border-dark-700 flex-shrink-0 bg-dark-800">
      {onToggle ? (
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider hover:text-gray-200 transition-colors"
        >
          {title}
          {count != null && <span className="text-accent ml-1">{count}</span>}
          <span className="text-muted ml-1">{collapsed ? '▶' : '▼'}</span>
        </button>
      ) : (
        <>
          <span className="text-[10px] text-muted uppercase tracking-wider">{title}</span>
          {count != null && <span className="text-accent text-[10px] ml-2">{count}</span>}
        </>
      )}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}
