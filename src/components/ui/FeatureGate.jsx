import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess';

export default function FeatureGate({ 
  feature, 
  children, 
  fallback = null, 
  showUpgradePrompt = true,
  redirectOnBlock = true,
  customMessage = null 
}) {
  const { canAccess } = useSubscriptionAccess();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!canAccess(feature) && redirectOnBlock && showUpgradePrompt) {
      navigate(createPageUrl('Pricing'), { 
        state: { 
          feature,
          message: customMessage 
        } 
      });
    }
  }, [canAccess, feature, redirectOnBlock, showUpgradePrompt, navigate, customMessage]);
  
  if (canAccess(feature)) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  return null;
}