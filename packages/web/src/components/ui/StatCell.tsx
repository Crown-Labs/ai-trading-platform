interface StatCellProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: 'green' | 'red' | 'accent' | 'white';
}

const colorClasses: Record<NonNullable<StatCellProps['valueColor']>, string> = {
  green: 'text-green',
  red: 'text-red',
  accent: 'text-accent',
  white: 'text-gray-100',
};

export default function StatCell({ label, value, sub, valueColor = 'white' }: StatCellProps) {
  return (
    <div className="bg-dark-800 px-3 py-2.5">
      <div className="text-[9px] text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-base font-bold leading-tight ${colorClasses[valueColor]}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
