import React, { useState, useEffect } from 'react';
import { useData } from '@/components/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Settings as SettingsIcon,
  Crown,
  Copy,
  Check,
  Shield,
  Bell,
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMemberLimit } from '@/constants/subscriptionTiers';

export default function FamilySettings() {
  const { user, family, loading, updateFamily, canManageFamily, isFamilyOwner } = useData();
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    settings: {}
  });

  // Sync formData when family loads or changes
  useEffect(() => {
    if (family) {
      setFormData({
        name: family.name || '',
        settings: family.settings || {}
      });
    }
  }, [family]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateFamily({
        name: formData.name,
        settings: formData.settings,
      });
    } catch (error) {
      console.error('Error updating family:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSetting = (key, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  };

  const handleCopyInviteCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code);
      setCopiedCode(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleToggleInviteCode = async () => {
    try {
      await updateFamily({
        invite_enabled: !family.invite_enabled
      });
    } catch (error) {
      console.error('Error toggling invite code:', error);
      toast.error('Failed to update invite code');
    }
  };

  const getSubscriptionBadge = () => {
    const colors = {
      free: 'bg-gray-200 text-gray-800',
      premium: 'bg-blue-200 text-blue-800',
      family_plus: 'bg-purple-200 text-purple-800',
    };

    const tierNames = {
      free: 'FREE',
      premium: 'PREMIUM',
      family_plus: 'FAMILY PLUS'
    };

    return (
      <Badge className={colors[family.subscription_tier] || colors.free}>
        {tierNames[family.subscription_tier] || 'FREE'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  if (!canManageFamily()) {
    return (
      <div className="funky-card p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h2 className="header-font text-2xl text-[#2B59C3] mb-2">
          Access Restricted
        </h2>
        <p className="body-font-light text-gray-600">
          Only family owners and co-owners can access these settings
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="funky-button w-16 h-16 bg-[#5E3B85] flex items-center justify-center">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="header-font text-3xl text-[#2B59C3]">
                Family Settings
              </h1>
              <p className="body-font-light text-gray-600">
                Manage your family configuration
              </p>
            </div>
          </div>
          {getSubscriptionBadge()}
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="funky-card p-2 h-auto grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Family Name */}
          <div className="funky-card p-6">
            <h3 className="header-font text-xl text-[#2B59C3] mb-4">
              Family Name
            </h3>
            <div className="space-y-2">
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter family name"
                maxLength={100}
              />
              <p className="body-font-light text-sm text-gray-500">
                This name helps identify your family
              </p>
            </div>
          </div>

          {/* Invite Code */}
          <div className="funky-card p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="header-font text-xl text-[#2B59C3]">
                  Invite Code
                </h3>
                {isFamilyOwner() && (
                  <Switch checked={family.invite_enabled} onCheckedChange={handleToggleInviteCode} />
                )}
              </div>
            </div>

            {family.invite_enabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3">
                    <code className="header-font text-lg text-[#5E3B85]">
                      {family.invite_code}
                    </code>
                  </div>
                  <Button onClick={handleCopyInviteCode} variant="outline" className="funky-button">
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="body-font-light text-sm text-gray-500">
                  Share this code with family members to let them join
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="body-font-light text-gray-500">
                  Invite code is currently disabled
                </p>
              </div>
            )}
          </div>

          {/* Timezone & Currency */}
          <div className="funky-card p-6">
            <h3 className="header-font text-xl text-[#2B59C3] mb-4">
              Regional Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="body-font text-sm text-gray-600 mb-2 block">
                  Timezone
                </label>
                <Select
                  value={family.timezone}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    timezone: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                    <SelectItem value="America/Chicago">Central (US)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (US)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="body-font text-sm text-gray-600 mb-2 block">
                  Currency
                </label>
                <Select
                  value={family.currency}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    currency: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <div className="funky-card p-6 space-y-6">
            <div>
              <h3 className="header-font text-xl text-[#2B59C3]">
                Family Members
              </h3>
              <p className="body-font-light text-sm text-gray-600">
                {family.member_count} / {getMemberLimit(family.subscription_tier || 'free')} members
              </p>
            </div>

            {/* Owner */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Crown className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="body-font text-sm font-medium">Owner</p>
                  <p className="body-font-light text-xs text-gray-600">
                    {family.owner_user_id === user.id ? 'You' : 'Another family member'}
                  </p>
                </div>
              </div>

              {/* Co-owners */}
              {family.co_owners && family.co_owners.length > 0 && (
                <div className="space-y-2">
                  <p className="body-font text-sm text-gray-700">Co-owners ({family.co_owners.length})</p>
                  {family.co_owners.map((coOwnerId, index) => (
                    <div key={coOwnerId} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span className="body-font-light text-sm">
                        {coOwnerId === user.id ? 'You' : `Co-owner ${index + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Other Members */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="body-font text-sm">
                  All Members ({family.member_count})
                </p>
                <p className="body-font-light text-xs text-gray-500">
                  View detailed member list in the People page
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6 mt-6">
          <div className="funky-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-[#FF6B35]" />
              <h3 className="header-font text-xl text-[#2B59C3]">Chore Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-font text-sm">Auto-assign Chores</p>
                  <p className="body-font-light text-xs text-gray-500">
                    Automatically assign recurring chores
                  </p>
                </div>
                <Switch
                  checked={formData.settings.auto_assign_chores}
                  onCheckedChange={(value) => handleToggleSetting('auto_assign_chores', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="body-font text-sm">Allow Self-Assignment</p>
                  <p className="body-font-light text-xs text-gray-500">
                    Let children pick available chores
                  </p>
                </div>
                <Switch
                  checked={formData.settings.allow_self_assignment}
                  onCheckedChange={(value) => handleToggleSetting('allow_self_assignment', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="body-font text-sm">Require Photo Proof</p>
                  <p className="body-font-light text-xs text-gray-500">
                    Require photos for chore verification
                  </p>
                </div>
                <Switch
                  checked={formData.settings.require_photo_proof}
                  onCheckedChange={(value) => handleToggleSetting('require_photo_proof', value)}
                />
              </div>

              <div>
                <p className="body-font text-sm mb-1">Point Multiplier</p>
                <p className="body-font-light text-xs text-gray-500 mb-2">
                  Multiply all point rewards (0.5x - 5.0x)
                </p>
                <Input
                  type="number"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={formData.settings.point_multiplier}
                  onChange={(e) => handleToggleSetting('point_multiplier', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <p className="body-font text-sm mb-1">Max Pending Chores per Person</p>
                <p className="body-font-light text-xs text-gray-500 mb-2">
                  Maximum incomplete chores assigned at once
                </p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.settings.max_pending_chores}
                  onChange={(e) => handleToggleSetting('max_pending_chores', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="funky-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-[#C3B1E1]" />
              <h3 className="header-font text-xl text-[#2B59C3]">Notification Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-font text-sm">Enable Notifications</p>
                  <p className="body-font-light text-xs text-gray-500">
                    Send push and email notifications
                  </p>
                </div>
                <Switch
                  checked={formData.settings.notifications_enabled}
                  onCheckedChange={(value) => handleToggleSetting('notifications_enabled', value)}
                />
              </div>

              <div>
                <p className="body-font text-sm mb-1">Weekly Digest Day</p>
                <p className="body-font-light text-xs text-gray-500 mb-2">
                  Day to send weekly summary emails
                </p>
                <Select
                  value={formData.settings.weekly_digest_day}
                  onValueChange={(value) => handleToggleSetting('weekly_digest_day', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="mt-6">
          <div className="funky-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="header-font text-xl text-[#2B59C3]">Family Statistics</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="body-font-light text-sm text-gray-600">
                  Total Chores Completed
                </p>
                <p className="header-font text-2xl text-[#2B59C3]">
                  {family.statistics?.total_chores_completed || 0}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <p className="body-font-light text-sm text-gray-600">
                  Total Points Awarded
                </p>
                <p className="header-font text-2xl text-green-600">
                  {family.statistics?.total_points_awarded || 0}
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="body-font-light text-sm text-gray-600">
                  Rewards Redeemed
                </p>
                <p className="header-font text-2xl text-[#5E3B85]">
                  {family.statistics?.total_rewards_redeemed || 0}
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="body-font-light text-sm text-gray-600">
                  This Week's Completions
                </p>
                <p className="header-font text-2xl text-[#FF6B35]">
                  {family.statistics?.current_week_completions || 0}
                </p>
              </div>
            </div>

            {family.statistics?.last_activity_at && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="body-font-light text-sm text-gray-500">
                  Last activity: {new Date(family.statistics.last_activity_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} className="funky-button bg-[#FF6B35] text-white px-8 py-3 header-font">
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {/* Danger Zone (Owner Only) */}
      {isFamilyOwner() && (
        <div className="funky-card p-6 border-4 border-red-300">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="header-font text-xl text-red-600">
                Danger Zone
              </h3>
              <p className="body-font-light text-sm text-gray-600">
                These actions are permanent and cannot be undone
              </p>
            </div>
          </div>

          <Button
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              toast.error('Family deletion must be done through support');
            }}
          >
            Delete Family
          </Button>
          <p className="body-font-light text-xs text-gray-500 mt-2">
            Please contact support to permanently delete your family
          </p>
        </div>
      )}
    </div>
  );
}
