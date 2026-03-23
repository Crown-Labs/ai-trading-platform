interface MarketCardProps {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
}

export default function MarketCard({ symbol, name, price, change, isPositive }: MarketCardProps) {
  return (
    <div className="card hover:border-primary-600 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{symbol}</h3>
          <p className="text-gray-400 text-sm">{name}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          <svg
            className={`w-6 h-6 ${isPositive ? 'text-green-500' : 'text-red-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isPositive ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            )}
          </svg>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white">${price}</p>
        <span
          className={`text-sm font-medium ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}{change}%
        </span>
      </div>
    </div>
  );
}
