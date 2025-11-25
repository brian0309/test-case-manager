import React from "react";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const OAuthRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userData = params.get('user');
    const success = params.get('success');

    if (success === 'true' && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        setUser(user);
        navigate('/');
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login?error=oauth_error');
      }
    } else {
      navigate('/login?error=oauth_failed');
    }
  }, [navigate, setUser]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Completing Login...</h2>
        <p className="text-gray-600">Please wait while we log you in with Google.</p>
      </div>
    </div>
  );
};

export default OAuthRedirect;
