import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function AISuggestionsModal({ 
  isOpen, 
  onClose, 
  suggestionType,
  onApplySuggestion 
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [familyContext, setFamilyContext] = useState(null);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // AI suggestions require backend functions (LLM access)
      toast.error('AI suggestions are not available on the current plan. Upgrade to a Builder+ plan to unlock AI-powered suggestions.');
      setSuggestions([]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen]);

  const handleApply = (suggestion) => {
    onApplySuggestion(suggestion);
    toast.success(`Added: ${suggestion.title || suggestion.name}`);
  };

  const title = suggestionType === 'chores' ? 'AI Chore Suggestions' : 'AI Reward Suggestions';
  const icon = suggestionType === 'chores' ? TrendingUp : Sparkles;
  const IconComponent = icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 header-font text-3xl text-[#2B59C3]">
            <div className="funky-button w-12 h-12 bg-[#C3B1E1] flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        {familyContext && (
          <div className="funky-card bg-blue-50 p-4 mb-4">
            <p className="body-font text-sm text-gray-700">
              Based on your family of {familyContext.totalMembers} members
              ({familyContext.composition.parent} parent{familyContext.composition.parent !== 1 ? 's' : ''}, {familyContext.composition.teens} teen{familyContext.composition.teens !== 1 ? 's' : ''}, {familyContext.composition.children} child{familyContext.composition.children !== 1 ? 'ren' : ''}{familyContext.composition.toddlers > 0 ? `, ${familyContext.composition.toddlers} toddler${familyContext.composition.toddlers !== 1 ? 's' : ''}` : ''})
              with a {familyContext.completionRate}% completion rate
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1] mb-4" />
            <p className="body-font text-gray-600">AI is analyzing your family data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="funky-card p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="header-font text-xl text-[#5E3B85] mb-2">
                      {suggestion.title || suggestion.name}
                    </h3>
                    <p className="body-font-light text-gray-700 mb-3">
                      {suggestion.description}
                    </p>
                    
                    {suggestionType === 'chores' ? (
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-[#F7A1C4] text-pink-800 rounded-full text-sm body-font">
                          {suggestion.difficulty}
                        </span>
                        <span className="px-3 py-1 bg-[#C3B1E1] text-white rounded-full text-sm body-font">
                          {suggestion.category}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm body-font">
                          ~{suggestion.estimated_time} min
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm body-font">
                          {suggestion.cost} points
                        </span>
                        <span className="px-3 py-1 bg-[#C3B1E1] text-white rounded-full text-sm body-font capitalize">
                          {suggestion.category}
                        </span>
                      </div>
                    )}
                    
                    {suggestion.reasoning && (
                      <p className="body-font-light text-sm text-gray-500 italic">
                        Why: {suggestion.reasoning}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleApply(suggestion)}
                    className="funky-button bg-[#FF6B35] text-white flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            ))}
            
            {suggestions.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="body-font text-gray-600">No suggestions available</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={loadSuggestions}
            disabled={loading}
            variant="outline"
            className="funky-button"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Refresh Suggestions
          </Button>
          <Button onClick={onClose} className="funky-button bg-gray-500 text-white">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}