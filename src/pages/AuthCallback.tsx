import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function parseJwt(token: string) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const setUser = useAuthStore(state => state.setUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try { // Add try...catch for parseJwt
        const payload = parseJwt(token);

        // **CORRECTION HERE:** Include the idToken in the user object
        const user = {
          id: payload.sub, // Use 'sub' claim as the unique user ID
          email: payload.preferred_username,
          name: payload.name,
          idToken: token, // Store the actual token
        };

        setUser(user);
        navigate('/');

      } catch (error) {
          console.error("Failed to parse JWT:", error);
          navigate('/login?error=invalid_token'); // Redirect on parsing error
      }
    } else {
      console.error("Auth callback missing token");
      navigate('/login?error=missing_token');
    }
  }, [token, setUser, navigate]);

  return <div>Signing in...</div>;
}