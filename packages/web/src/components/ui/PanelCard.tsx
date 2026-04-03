import { ReactNode, useState } from 'react';

interface PanelCardProps {
  title?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function PanelCard({
  title,
  headerRight,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: PanelCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="bg-dark-800 border border-dark-700 rounded overflow-hidden">
      {title && (
        <div className="flex items-center px-3 py-2 border-b border-dark-700 bg-dark-800">
          {collapsible ? (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider hover:text-gray-200 transition-colors"
            >
              {title}
              <span className="ml-1">{collapsed ? '▶' : '▼'}</span>
            </button>
          ) : (
            <span className="text-[10px] text-muted uppercase tracking-wider">{title}</span>
          )}
          {headerRight && <div className="ml-auto">{headerRight}</div>}
        </div>
      )}
      {!collapsed && children}
    </div>
  );
}
