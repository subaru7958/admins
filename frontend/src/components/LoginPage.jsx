import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LoginForm from './LoginForm';

function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const existingToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (existingToken) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSuccess = (token, user) => {
    if (token) {
      localStorage.setItem('authToken', token);
    }
    if (user?._id || user?.id) {
      localStorage.setItem('teamId', user._id || user.id);
    }
    if (user?.teamName) {
      localStorage.setItem('teamName', user.teamName);
    }
    if (user?.logo) {
      localStorage.setItem('teamLogo', user.logo);
    }
    if (user?.discipline) {
      localStorage.setItem('teamDiscipline', user.discipline);
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          to="/"
          className="inline-flex items-center px-3 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 font-medium"
        >
          ← Back to Home
        </Link>
      </div>
      <LoginForm onSuccess={handleSuccess} />
    </div>
  );
}

export default LoginPage;


