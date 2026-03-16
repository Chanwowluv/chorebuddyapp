import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { linkAccountByCode, linkAccountBySelection } from "@/components/utils/familyLinkingClient";
import { toast } from "sonner";

export default function LinkAccountModal({ isOpen, onClose, onLink, isProcessing: externalIsProcessing }) {
  const [linkingCode, setLinkingCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [unlinkedPeople, setUnlinkedPeople] = useState([]);
  const [needsSelection, setNeedsSelection] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!linkingCode.trim()) {
      toast.error("Please enter a linking code");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await linkAccountByCode(linkingCode.trim());

      if (result.needsSelection) {
        setUnlinkedPeople(result.unlinkedPeople);
        setNeedsSelection(true);
      } else if (result.success) {
        toast.success(result.message || 'Account linked!');
        if (onLink) onLink(result.personId);
        onClose();
      }
    } catch (error) {
      toast.error(error.message || "Failed to link account");
      console.error("Error linking account:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPerson = async () => {
    if (!selectedPersonId) {
      toast.error("Please select your name");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await linkAccountBySelection(selectedPersonId);

      if (result.success) {
        toast.success("Account linked successfully!");
        if (onLink) onLink(selectedPersonId);
        onClose();
      }
    } catch (error) {
      toast.error(error.message || "Failed to link account");
      console.error("Error linking account:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="funky-card bg-white p-6 md:p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="funky-button w-12 h-12 bg-[#2B59C3] flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="header-font text-2xl text-[#2B59C3]">
                {needsSelection ? "Who Are You?" : "Link Your Account"}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (needsSelection) {
                  setNeedsSelection(false);
                  setSelectedPersonId("");
                } else {
                  onClose();
                }
              }}
              className="h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {needsSelection ? (
            // Selection screen when multiple unlinked people exist
            <form onSubmit={(e) => { e.preventDefault(); handleSelectPerson(); }} className="space-y-6">
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                <p className="body-font-light text-sm text-purple-800">
                  👋 Select your name to complete the linking process.
                </p>
              </div>

              <div>
                <label className="body-font text-lg text-[#5E3B85] mb-4 block">
                  Which person are you?
                </label>
                <div className="space-y-3">
                  {unlinkedPeople.map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setSelectedPersonId(person.id)}
                      className={`funky-button w-full p-4 text-left border-3 transition-all ${
                        selectedPersonId === person.id
                          ? 'bg-[#2B59C3] text-white border-[#2B59C3]'
                          : 'bg-white text-[#5E3B85] border-[#5E3B85]'
                      }`}
                    >
                      <p className="header-font text-lg">{person.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setNeedsSelection(false);
                    setSelectedPersonId("");
                  }}
                  disabled={isProcessing}
                  className="funky-button flex-1 bg-gray-200 text-[#5E3B85] border-3 border-[#5E3B85]"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedPersonId || isProcessing}
                  className="funky-button flex-1 bg-[#2B59C3] text-white border-3 border-[#5E3B85]"
                >
                  {isProcessing ? "Linking..." : "Confirm"}
                </Button>
              </div>
            </form>
          ) : (
            // Code entry screen
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <p className="body-font-light text-sm text-blue-800">
                  🔐 Ask your parent for a linking code to connect your account.
                </p>
              </div>

              <div>
                <label className="body-font text-lg text-[#5E3B85] mb-2 block">
                  Enter Linking Code
                </label>
                <input
                  type="text"
                  value={linkingCode}
                  onChange={(e) => setLinkingCode(e.target.value.toUpperCase())}
                  placeholder="E.g. ABC123"
                  maxLength="8"
                  className="funky-button w-full px-4 py-3 border-3 border-[#2B59C3] body-font text-center text-lg tracking-widest bg-white focus:outline-none focus:ring-2 focus:ring-[#2B59C3]"
                  disabled={isProcessing}
                />
                <p className="body-font-light text-xs text-gray-500 mt-2">
                  Enter the code from your parent
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="funky-button flex-1 bg-gray-200 text-[#5E3B85] border-3 border-[#5E3B85]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!linkingCode.trim() || isProcessing}
                  className="funky-button flex-1 bg-[#2B59C3] text-white border-3 border-[#5E3B85]"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Link Account
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}