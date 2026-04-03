import { GoogleLogin } from '@react-oauth/google';

interface LoginPageProps {
  onLogin: (credential: string) => Promise<void>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="h-screen bg-dark-900 flex items-center justify-center">
      <div className="card max-w-md w-full mx-4 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">AI</span>
          </div>
          <span className="text-2xl font-bold text-white">
            Trading Platform
          </span>
        </div>

        <p className="text-gray-400 text-sm mb-8">
          Sign in to access your AI-powered trading strategies and backtesting.
        </p>

        {/* Google Sign-In */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={(response) => {
              if (response.credential) {
                onLogin(response.credential);
              }
            }}
            onError={() => {
              console.error('Google login failed');
            }}
            theme="filled_black"
            size="large"
            width="300"
          />
        </div>
      </div>
    </div>
  );
}
