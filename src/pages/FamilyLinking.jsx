import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Loader2,
    Copy,
    Check,
    RefreshCw,
    Link2,
    Sparkles,
    Users,
    ArrowRight,
    Clock,
    Shield,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { generateLinkingCode as generateLinkingCodeClient, joinFamilyByCode } from '@/utils/familyLinkingClient';
import { isParent as checkParent } from '@/utils/roles';
import { getMemberLimit, formatTier } from '@/constants/subscriptionTiers';

// Error code to user-friendly message mapping for join errors
const LINKING_ERROR_MESSAGES = {
    INVALID_CODE: 'Invalid linking code. Please double-check and try again.',
    EXPIRED_CODE: 'This code has expired. Ask your parent for a new code.',
    ALREADY_MEMBER: 'You are already a member of this family!',
    ALREADY_IN_FAMILY: 'You are already in another family.',
    FAMILY_FULL: 'This family is full and cannot accept more members.',
    TIER_LIMIT: "This family has reached its plan's member limit. The family owner needs to upgrade.",
    JOIN_FAILED: 'Failed to join family. Please try again.',
    SERVER_ERROR: 'Something went wrong. Please try again later.',
};

function getLinkingErrorMessage(result) {
    const errorCode = result?.data?.errorCode || result?.errorCode;
    if (errorCode && LINKING_ERROR_MESSAGES[errorCode]) {
        return LINKING_ERROR_MESSAGES[errorCode];
    }
    return result?.error || result?.data?.error || 'Failed to join family';
}

export default function FamilyLinking() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [family, setFamily] = useState(null);
    const [linkingCode, setLinkingCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [codeExpiry, setCodeExpiry] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [copied, setCopied] = useState(false);
    const [joinSuccess, setJoinSuccess] = useState(false);
    const [joinedFamilyName, setJoinedFamilyName] = useState('');

    const isParent = checkParent(user);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userData = await base44.auth.me();
                setUser(userData);

                // If no family role, redirect to role selection
                if (!userData.family_role) {
                    navigate(createPageUrl('RoleSelection'));
                    return;
                }

                // If user already has a family (and is not a parent/admin), go to dashboard
                if (userData.family_id && !checkParent(userData)) {
                    navigate(createPageUrl('Dashboard'));
                    return;
                }

                // For parents/admins, fetch their family data
                if (checkParent(userData) && userData.family_id) {
                    const familyData = await base44.entities.Family.get(userData.family_id);
                    if (familyData) {
                        setFamily(familyData);
                        if (familyData.linking_code) {
                            setLinkingCode(familyData.linking_code);
                            setCodeExpiry(familyData.linking_code_expires);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
                navigate(createPageUrl('Home'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const generateNewCode = async () => {
        if (!family) return;
        setIsGenerating(true);
        try {
            const result = await generateLinkingCodeClient(family.id);
            setLinkingCode(result.linkingCode);
            setCodeExpiry(result.expiresAt);
            toast.success('New linking code generated!');
        } catch (error) {
            console.error('Error generating code:', error);
            toast.error(error.message || 'Failed to generate linking code');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(linkingCode);
        setCopied(true);
        toast.success('Code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoinFamily = async () => {
        if (!inputCode.trim()) {
            toast.error('Please enter a linking code');
            return;
        }

        setIsJoining(true);
        try {
            const result = await joinFamilyByCode({ linkingCode: inputCode.trim() });
            setJoinSuccess(true);
            setJoinedFamilyName(result.familyName);
            toast.success(`Welcome to ${result.familyName}!`);

            setTimeout(() => {
                navigate(createPageUrl('Dashboard'));
            }, 2000);
        } catch (error) {
            console.error('Error joining family:', error);
            toast.error(error.message || 'Failed to join family. Please check your code.');
        } finally {
            setIsJoining(false);
        }
    };

    const skipLinking = () => {
        navigate(createPageUrl('Dashboard'));
    };

    const formatExpiry = (expiryDate) => {
        if (!expiryDate) return '';
        const expiry = new Date(expiryDate);
        const now = new Date();
        const hoursLeft = Math.max(0, Math.floor((expiry - now) / (1000 * 60 * 60)));
        if (hoursLeft > 1) return `${hoursLeft} hours`;
        const minutesLeft = Math.max(0, Math.floor((expiry - now) / (1000 * 60)));
        return `${minutesLeft} minutes`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center">
                <Loader2 className="w-16 h-16 animate-spin text-[#C3B1E1]" />
            </div>
        );
    }

    // Success state after joining
    if (joinSuccess) {
        return (
            <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center p-4">
                <div className="funky-card p-8 md:p-12 text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="header-font text-4xl text-green-600 mb-4">You're In!</h1>
                    <p className="body-font text-xl text-gray-600 mb-2">
                        Welcome to <span className="font-bold text-[#2B59C3]">{joinedFamilyName}</span>
                    </p>
                    <p className="body-font-light text-gray-500">
                        Taking you to your dashboard...
                    </p>
                    <Loader2 className="w-6 h-6 animate-spin text-[#C3B1E1] mx-auto mt-4" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBF5] flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <div className="funky-button w-20 h-20 bg-[#C3B1E1] flex items-center justify-center">
                            <Link2 className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3] mb-4">
                        {isParent ? 'Share Your Family Code' : 'Join Your Family'}
                    </h1>
                    <p className="body-font text-lg text-gray-600">
                        {isParent 
                            ? 'Share this code with your family members so they can join your household.'
                            : 'Enter the code your parent shared with you to join your family.'
                        }
                    </p>
                </div>

                {/* Main Content Card */}
                <div className="funky-card p-6 md:p-8">
                    {isParent ? (
                        /* Parent View - Show/Generate Code */
                        <div className="space-y-6">
                            {/* Code Display */}
                            <div className="bg-gradient-to-br from-[#2B59C3]/10 to-[#C3B1E1]/20 rounded-2xl p-6 text-center">
                                <p className="body-font text-sm text-gray-600 mb-3">Your Family Linking Code</p>
                                
                                {linkingCode ? (
                                    <>
                                        <div className="flex justify-center items-center gap-2 mb-4">
                                            <div className="bg-white rounded-xl px-6 py-4 border-3 border-[#5E3B85] shadow-md">
                                                <span className="header-font text-4xl md:text-5xl tracking-[0.3em] text-[#2B59C3]">
                                                    {linkingCode}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-center gap-3 mb-4">
                                            <Button
                                                onClick={copyCode}
                                                className="funky-button bg-[#2B59C3] text-white"
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="w-4 h-4 mr-2" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy Code
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={generateNewCode}
                                                disabled={isGenerating}
                                                variant="outline"
                                                className="funky-button border-2 border-[#5E3B85]"
                                            >
                                                {isGenerating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                        New Code
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        {codeExpiry && (
                                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                                <Clock className="w-4 h-4" />
                                                <span>Expires in {formatExpiry(codeExpiry)}</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Button
                                        onClick={generateNewCode}
                                        disabled={isGenerating}
                                        className="funky-button bg-[#2B59C3] text-white px-8 py-4 text-lg"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (
                                            <Sparkles className="w-5 h-5 mr-2" />
                                        )}
                                        Generate Linking Code
                                    </Button>
                                )}
                            </div>

                            {/* Instructions */}
                            <div className="space-y-4">
                                <h3 className="body-font text-lg text-[#5E3B85]">How it works:</h3>
                                <div className="grid gap-3">
                                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-[#2B59C3] text-white flex items-center justify-center flex-shrink-0 header-font">1</div>
                                        <p className="body-font-light text-gray-700">Share this code with your children or family members</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-[#C3B1E1] text-white flex items-center justify-center flex-shrink-0 header-font">2</div>
                                        <p className="body-font-light text-gray-700">They enter the code on their device after selecting their role</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 header-font">3</div>
                                        <p className="body-font-light text-gray-700">They'll automatically join your family and you can assign chores!</p>
                                    </div>
                                </div>
                            </div>

                            {/* Security Note */}
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="body-font-light text-sm text-amber-800">
                                    <strong>Security tip:</strong> Codes expire after 48 hours. Only share with people you want in your family.
                                </p>
                            </div>

                            {/* Member Limit Info */}
                            {family && (
                                <div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                    <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="body-font-light text-sm text-blue-800">
                                            Your <strong>{formatTier(family.subscription_tier || 'free')}</strong> plan supports up to{' '}
                                            <strong>{getMemberLimit(family.subscription_tier || 'free')}</strong> members.
                                            Currently {family.member_count || 1} member{(family.member_count || 1) !== 1 ? 's' : ''}.
                                        </p>
                                        {(family.subscription_tier || 'free') === 'free' && (
                                            <Link to={createPageUrl("Pricing")} className="body-font text-sm text-blue-600 hover:text-blue-800 underline mt-1 inline-block">
                                                Upgrade for more members
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Continue Button */}
                            <Button
                                onClick={skipLinking}
                                className="w-full funky-button bg-[#5E3B85] text-white py-4 text-lg header-font"
                            >
                                Continue to Dashboard
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    ) : (
                        /* Teen/Child View - Enter Code */
                        <div className="space-y-6">
                            {/* Code Input */}
                            <div className="space-y-4">
                                <label className="body-font text-lg text-[#5E3B85]">
                                    Enter the code from your parent:
                                </label>
                                <Input
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    placeholder="XXXXXX"
                                    maxLength={6}
                                    className="text-center header-font text-3xl tracking-[0.3em] py-6 border-3 border-[#5E3B85] rounded-xl uppercase"
                                    disabled={isJoining}
                                />
                            </div>

                            {/* Join Button */}
                            <Button
                                onClick={handleJoinFamily}
                                disabled={isJoining || inputCode.length < 6}
                                className="w-full funky-button bg-[#2B59C3] text-white py-4 text-lg header-font"
                            >
                                {isJoining ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-5 h-5 mr-2" />
                                        Join Family
                                    </>
                                )}
                            </Button>

                            {/* Instructions */}
                            <div className="p-4 bg-blue-50 rounded-xl">
                                <h3 className="body-font text-[#2B59C3] mb-2">Don't have a code?</h3>
                                <p className="body-font-light text-sm text-gray-600">
                                    Ask your parent to open ChoreBuddy on their device and share their family linking code with you.
                                </p>
                            </div>

                            {/* Skip Option */}
                            <div className="text-center">
                                <button
                                    onClick={() => navigate(createPageUrl('RoleSelection'))}
                                    className="body-font-light text-gray-500 hover:text-[#2B59C3] underline text-sm"
                                >
                                    ← Go back to role selection
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}