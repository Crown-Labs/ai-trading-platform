interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, change, isPositive, icon }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        {icon && <div className="text-primary-500">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-white">{value}</p>
        {change && (
          <span
            className={`text-sm font-medium ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {isPositive ? '+' : ''}{change}
          </span>
        )}
      </div>
    </div>
  );
}
