import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/Dashboard', { replace: true });
  }, [navigate]);

  return null;
}