
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the route game page
    navigate('/route-game');
  }, [navigate]);
  
  return null; // No content needed as we're redirecting
};

export default Index;
