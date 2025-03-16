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
      const payload = parseJwt(token);
      const user = {
        id: payload.sub,
        email: payload.preferred_username,
        name: payload.name,
      };
      setUser(user);
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [token, setUser, navigate]);

  return <div>Signing in...</div>;
}