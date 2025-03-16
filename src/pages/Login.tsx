import React, { useState } from 'react';
import { LayoutDashboard, Loader2 } from 'lucide-react';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';
  
  const handleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      window.location.href = `${apiUrl}/auth/login`;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Main card container with enhanced shadow and rounded corners */}
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 transition-all duration-300 hover:shadow-lg">
        {/* Logo and header section */}
        <div className="text-center mb-8">
          <div className="bg-blue-50 p-4 rounded-full inline-flex justify-center mb-2">
            <LayoutDashboard className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 tracking-tight">Malomatia Reports Portal</h1>
          <p className="mt-2 text-gray-600 text-sm">Sign in to access your dashboards and reports</p>
        </div>

        {/* Login form area */}
        <div className="space-y-4">
          {/* Microsoft login button with loading state */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                {/* Custom Microsoft icon */}
                <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Sign in with Microsoft
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}