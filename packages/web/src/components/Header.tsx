interface HeaderProps {
  user: { name?: string; picture?: string; email: string };
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-dark-800 border-b border-dark-700">
      <nav className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <span className="text-xl font-bold text-white">Trading Platform</span>
          </div>

          {/* User */}
          <div className="flex items-center space-x-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            )}
            <span className="text-gray-300 text-sm hidden md:block">
              {user.name || user.email}
            </span>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
