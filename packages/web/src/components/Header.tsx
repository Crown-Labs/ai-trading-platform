import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-dark-800 border-b border-dark-700">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <span className="text-xl font-bold text-white">Trading Platform</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              Markets
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              Portfolio
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              Analytics
            </a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="btn-secondary">
              Sign In
            </button>
            <button className="btn-primary">
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <div className="flex flex-col space-y-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                Dashboard
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                Markets
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                Portfolio
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                Analytics
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <button className="btn-secondary w-full">
                  Sign In
                </button>
                <button className="btn-primary w-full">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
