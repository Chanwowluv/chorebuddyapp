import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Link as LinkIcon, Copy } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { generateLinkingCode } from '@/utils/familyLinkingClient';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from 'date-fns';

export default function FamilyInviteModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'child'
  });
  const [isInviting, setIsInviting] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [generatedLinkingCode, setGeneratedLinkingCode] = useState(null);
  const [linkingCodeExpiry, setLinkingCodeExpiry] = useState(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const handleGenerateLinkingCode = async () => {
    setIsGeneratingCode(true);
    try {
      const user = await base44.auth.me();
      if (!user?.family_id) {
        toast.error('No family found. Please refresh the page.');
        return;
      }
      const result = await generateLinkingCode(user.family_id);
      setGeneratedLinkingCode(result.linkingCode);
      setLinkingCodeExpiry(result.expiresAt);
      toast.success('Linking code generated successfully!');
    } catch (error) {
      console.error('Error generating linking code:', error);
      toast.error(error?.message || 'Failed to generate linking code. Please try again.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedLinkingCode) {
      navigator.clipboard.writeText(generatedLinkingCode);
      toast.success('Linking code copied to clipboard!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast.error('Email invitations require backend functions. Please use the Linking Code tab to share a code manually.');
  };

  const handleClose = () => {
    if (!isInviting && !isGeneratingCode) {
      setFormData({ email: '', name: '', role: 'child' });
      setGeneratedLinkingCode(null);
      setLinkingCodeExpiry(null);
      setActiveTab('email');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="funky-card max-w-md w-full p-8 border-4 border-[#C3B1E1] bg-purple-50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="funky-button w-12 h-12 bg-[#C3B1E1] flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="header-font text-2xl text-[#2B59C3]">Invite Family Member</h2>
                <p className="body-font-light text-sm text-gray-600">Premium Feature</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 funky-card p-2 h-auto mb-6">
                <TabsTrigger
                  value="email"
                  className="mx-1 my-1 px-3 py-2 text-sm font-medium funky-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm transition-all data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white"
                >
                  <Mail className="w-4 h-4" />
                  Email Invite
                </TabsTrigger>
                <TabsTrigger
                  value="linking_code"
                  className="mx-1 my-1 px-3 py-2 text-sm font-medium funky-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm transition-all data-[state=active]:bg-[#C3B1E1] data-[state=active]:text-white"
                >
                  <LinkIcon className="w-4 h-4" />
                  Linking Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="body-font text-base text-[#5E3B85] mb-2 block">Email Address *</label>
                <Input
                  type="email"
                  placeholder="family.member@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="funky-button border-3 border-[#5E3B85] text-base p-3 body-font bg-white"
                  required
                />
              </div>

              <div>
                <label className="body-font text-base text-[#5E3B85] mb-2 block">Name *</label>
                <Input
                  placeholder="Their name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="funky-button border-3 border-[#5E3B85] text-base p-3 body-font bg-white"
                  required
                />
              </div>

              <div>
                <label className="body-font text-base text-[#5E3B85] mb-2 block">Role</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="funky-button border-3 border-[#5E3B85] body-font bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">🧒 Child</SelectItem>
                    <SelectItem value="parent">👨‍👩‍ Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mt-4">
                <p className="body-font-light text-xs text-blue-800">
                  💡 They'll receive an email invitation with instructions to join your family and access their chores on their own device.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={isInviting}
                  className="funky-button flex-1 bg-gray-200 hover:bg-gray-300 text-[#5E3B85] border-3 border-[#5E3B85] py-3 header-font text-base"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isInviting || !formData.email.trim() || !formData.name.trim()}
                  className="funky-button flex-1 bg-[#FF6B35] hover:bg-[#fa5a1f] text-white py-3 header-font text-base"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="linking_code">
            <div className="space-y-4">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
                <p className="body-font-light text-xs text-orange-800">
                  💡 Generate a temporary linking code. Share this code with the family member, who can use it to join your family. The code expires in 48 hours.
                </p>
              </div>

              {!generatedLinkingCode ? (
                <Button
                  onClick={handleGenerateLinkingCode}
                  disabled={isGeneratingCode}
                  className="funky-button w-full bg-[#C3B1E1] hover:bg-[#b19dcb] text-white py-3 header-font text-base"
                >
                  {isGeneratingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Generate Linking Code
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="body-font text-base text-[#5E3B85] mb-2 block">Linking Code</label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={generatedLinkingCode}
                        readOnly
                        className="funky-button border-3 border-[#5E3B85] text-xl p-3 body-font bg-white text-center font-bold tracking-widest"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyCode}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5E3B85] hover:bg-gray-100"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {linkingCodeExpiry && (
                      <p className="body-font-light text-xs text-gray-500 mt-1 text-center">
                        Expires: {format(new Date(linkingCodeExpiry), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={handleClose}
                      className="funky-button flex-1 bg-gray-200 hover:bg-gray-300 text-[#5E3B85] border-3 border-[#5E3B85] py-3 header-font text-base"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}