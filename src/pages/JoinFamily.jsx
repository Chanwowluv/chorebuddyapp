import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { joinFamily } from '@/functions/joinFamily';
import { createPageUrl } from '@/utils';

// Constants
const REQUIRED_PARAMS = ['code', 'email', 'name'];
const ERROR_MESSAGES = {
  INVALID_LINK: 'Invalid invitation link. Please check your email for the correct link.',
  EMAIL_MISMATCH: 'Please log in with the invited email address',
  AUTH_FAILED: 'Authentication failed. Please try logging in again.',
  // Backend error code mappings
  INVALID_CODE: 'This invite code is invalid. Please check your email for the correct invitation link.',
  EXPIRED_CODE: 'This invitation has expired. Please ask for a new invite.',
  INVALID_ROLE: 'The role specified in the invitation is not valid. Please contact the person who invited you.',
  ALREADY_MEMBER: 'You are already a member of this family.',
  ALREADY_IN_FAMILY: 'You are already in another family. You must leave your current family first.',
  FAMILY_FULL: 'This family has reached its maximum member limit.',
  TIER_LIMIT: "This family has reached its plan's member limit. The family owner needs to upgrade their subscription.",
  INVALID_FAMILY: 'There was a problem with the family data. Please try again.',
  JOIN_FAILED: 'Failed to join family. Please try again or contact support.',
  AUTH_REQUIRED: 'Authentication required. Please log in and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
};

/**
 * Get user-friendly error message from backend response
 */
function getErrorMessage(response) {
  if (response?.errorCode && ERROR_MESSAGES[response.errorCode]) {
    return ERROR_MESSAGES[response.errorCode];
  }
  return response?.error || ERROR_MESSAGES.JOIN_FAILED;
}

/**
 * Get error code from backend response
 */
function getErrorCode(response) {
  return response?.errorCode || response?.data?.errorCode || null;
}

/**
 * Component for handling family invitation acceptance
 */
export default function JoinFamily() {
  // State management
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [user, setUser] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [familyName, setFamilyName] = useState('');

  // Get URL parameters using React Router hook
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('code');
  const invitedEmail = searchParams.get('email');
  const name = searchParams.get('name');
  const role = searchParams.get('role');

  /**
   * Validates that all required URL parameters are present
   */
  const validateParams = useCallback(() => {
    const missingParams = REQUIRED_PARAMS.filter(
      param => !searchParams.get(param)
    );
    
    if (missingParams.length > 0) {
      setError(ERROR_MESSAGES.INVALID_LINK);
      setLoading(false);
      return false;
    }
    return true;
  }, [searchParams]);

  /**
   * Checks user authentication and validates email match
   */
  const checkAuth = useCallback(async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Validate email matches invitation
      if (userData.email !== invitedEmail) {
        setError(`${ERROR_MESSAGES.EMAIL_MISMATCH}: ${invitedEmail}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      
      // Redirect to login with return URL
      const returnUrl = `${window.location.pathname}${window.location.search}`;
      base44.auth.redirectToLogin(returnUrl);
      return false;
    }
  }, [invitedEmail]);

  /**
   * Initialize component - validate params and check auth
   */
  useEffect(() => {
    const initialize = async () => {
      if (!validateParams()) {
        return;
      }

      await checkAuth();
      setLoading(false);
    };

    initialize();
  }, [validateParams, checkAuth]);

  /**
   * Handles the family join action
   */
  const handleJoinFamily = async () => {
    setJoining(true);
    setError('');
    setErrorCode(null);

    try {
      const response = await joinFamily({
        inviteCode,
        email: invitedEmail,
        name,
        role
      });

      if (response?.error) {
        const code = getErrorCode(response);
        setErrorCode(code);
        setError(getErrorMessage(response));
      } else if (response?.alreadyMember) {
        setSuccess(true);
        setFamilyName(response.familyName || 'your family');
      } else {
        setSuccess(true);
        setFamilyName(response?.familyName || 'your family');
      }
    } catch (err) {
      console.error('Failed to join family:', err);
      const code = getErrorCode(err);
      setErrorCode(code);
      setError(getErrorMessage(err) || err.message || ERROR_MESSAGES.JOIN_FAILED);
    } finally {
      setJoining(false);
    }
  };

  /**
   * Loading state UI
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center p-4">
        <div className="funky-card p-8 text-center max-w-md w-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1] mx-auto mb-4" />
          <p className="body-font text-lg text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  /**
   * Success state UI
   */
  if (success) {
    return (
      <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center p-4">
        <div className="funky-card max-w-md w-full p-8 text-center border-4 border-green-400 bg-green-50">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="header-font text-3xl text-[#2B59C3] mb-4">
            Welcome to the Family!
          </h1>
          <p className="body-font-light text-gray-600 mb-6">
            You've successfully joined <strong>{familyName}</strong>. You can now view your 
            chores, earn points, and redeem rewards!
          </p>
          <Link to={createPageUrl('Dashboard')}>
            <Button className="funky-button bg-[#FF6B35] hover:bg-[#FF5722] text-white px-6 py-3 header-font text-lg w-full transition-colors">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Error state UI with contextual actions
   */
  if (error) {
    const isWarning = ['ALREADY_IN_FAMILY', 'TIER_LIMIT', 'EXPIRED_CODE'].includes(errorCode);
    const borderColor = isWarning ? 'border-amber-400' : 'border-red-400';
    const bgColor = isWarning ? 'bg-amber-50' : 'bg-red-50';
    const iconColor = isWarning ? 'text-amber-500' : 'text-red-500';

    return (
      <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center p-4">
        <div className={`funky-card max-w-md w-full p-8 text-center border-4 ${borderColor} ${bgColor}`}>
          <AlertCircle className={`w-16 h-16 ${iconColor} mx-auto mb-4`} />
          <h1 className="header-font text-3xl text-[#2B59C3] mb-4">
            {errorCode === 'ALREADY_IN_FAMILY' ? 'Already in a Family' :
             errorCode === 'ALREADY_MEMBER' ? 'Already a Member' :
             errorCode === 'EXPIRED_CODE' ? 'Invitation Expired' :
             errorCode === 'TIER_LIMIT' ? 'Member Limit Reached' :
             errorCode === 'FAMILY_FULL' ? 'Family is Full' :
             'Invitation Error'}
          </h1>
          <p className="body-font-light text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            {(errorCode === 'ALREADY_IN_FAMILY' || errorCode === 'ALREADY_MEMBER') && (
              <Link to={createPageUrl('Dashboard')} className="block">
                <Button className="funky-button bg-[#FF6B35] hover:bg-[#FF5722] text-white px-6 py-3 header-font text-lg w-full transition-colors">
                  Go to Dashboard
                </Button>
              </Link>
            )}
            {(errorCode === 'EXPIRED_CODE' || errorCode === 'INVALID_CODE') && (
              <p className="body-font-light text-sm text-gray-500">
                Please ask the person who invited you to send a new invitation.
              </p>
            )}
            {(errorCode === 'TIER_LIMIT' || errorCode === 'FAMILY_FULL') && (
              <p className="body-font-light text-sm text-gray-500">
                Contact the family owner to resolve this issue.
              </p>
            )}
            <Link to={createPageUrl('Home')} className="block">
              <Button className="funky-button bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 header-font text-lg w-full transition-colors">
                Go to Home
              </Button>
            </Link>
            {user?.email !== invitedEmail && (
              <Button
                onClick={() => base44.auth.logout()}
                variant="outline"
                className="w-full"
              >
                Log out and try again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Main invitation UI
   */
  const isEmailMatch = user?.email === invitedEmail;

  return (
    <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center p-4">
      <div className="funky-card max-w-md w-full p-8 text-center border-4 border-[#C3B1E1] bg-purple-50">
        <Users className="w-16 h-16 text-[#C3B1E1] mx-auto mb-4" />
        <h1 className="header-font text-3xl text-[#2B59C3] mb-4">
          Join Your Family
        </h1>
        
        <div className="mb-6">
          <p className="body-font-light text-gray-600 mb-2">
            You've been invited to join as:
          </p>
          <p className="body-font text-xl text-[#FF6B35] mb-4">{name}</p>
          {role && (
            <p className="body-font-light text-sm text-gray-500 mb-2">
              Role: <span className="font-semibold">{role}</span>
            </p>
          )}
        </div>

        <div className="mb-8 p-3 bg-white rounded-lg border border-gray-200">
          <p className="body-font-light text-sm text-gray-500 mb-1">
            Logged in as:
          </p>
          <p className={`body-font text-sm ${isEmailMatch ? 'text-green-600' : 'text-red-600'}`}>
            {user?.email}
          </p>
          {!isEmailMatch && (
            <p className="text-xs text-red-500 mt-2">
              This email doesn't match the invitation
            </p>
          )}
        </div>

        <Button
          onClick={handleJoinFamily}
          disabled={joining || !isEmailMatch}
          className="funky-button bg-[#FF6B35] hover:bg-[#FF5722] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 header-font text-lg w-full transition-colors"
        >
          {joining ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Joining...
            </>
          ) : (
            'Join Family'
          )}
        </Button>
      </div>
    </div>
  );
}