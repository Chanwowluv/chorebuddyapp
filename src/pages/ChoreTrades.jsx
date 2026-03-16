import React, { useState } from 'react';
import { useData } from '../components/contexts/DataContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { stripHTMLTags } from '@/components/lib/sanitization';
import ChoreTradeCard from '../components/trades/ChoreTradeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { isParent as checkParent } from '@/utils/roles';

export default function ChoreTrades() {
  const { assignments, chores, people, user, loading } = useData();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFromAssignment, setSelectedFromAssignment] = useState('');
  const [selectedToPerson, setSelectedToPerson] = useState('');
  const [selectedToAssignment, setSelectedToAssignment] = useState('');
  const [message, setMessage] = useState('');

  const isParent = checkParent(user);
  const linkedPersonId = user?.linked_person_id;

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', user?.family_id],
    queryFn: async () => {
      if (!user?.family_id) return [];
      const data = await base44.entities.ChoreTrade.filter({ family_id: user.family_id });
      return [...data].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!user?.family_id
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChoreTrade.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trades'] })
  });

  const createTradeMutation = useMutation({
    mutationFn: (data) => base44.entities.ChoreTrade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setIsCreating(false);
      setSelectedFromAssignment('');
      setSelectedToPerson('');
      setSelectedToAssignment('');
      setMessage('');
    }
  });

  const handleCreateTrade = async () => {
    if (!selectedFromAssignment || !selectedToPerson) {
      toast.error('Please select a chore and recipient');
      return;
    }

    const fromAssignment = assignments.find(a => a.id === selectedFromAssignment);
    
    await createTradeMutation.mutateAsync({
      from_person_id: linkedPersonId,
      to_person_id: selectedToPerson,
      from_assignment_id: selectedFromAssignment,
      to_assignment_id: selectedToAssignment && selectedToAssignment !== 'none' ? selectedToAssignment : null,
      message: stripHTMLTags(message),
      status: 'pending',
      family_id: user.family_id
    });

    toast.success('Trade request sent!');
  };

  const handleAccept = async (tradeId) => {
    try {
      await updateTradeMutation.mutateAsync({
        id: tradeId,
        data: { status: 'accepted' }
      });
      toast.success('Trade accepted! Awaiting parent approval.');
    } catch (error) {
      toast.error('Failed to accept trade. Please try again.');
    }
  };

  const handleReject = async (tradeId) => {
    try {
      await updateTradeMutation.mutateAsync({
        id: tradeId,
        data: { status: 'rejected' }
      });
      toast.info('Trade declined.');
    } catch (error) {
      toast.error('Failed to decline trade. Please try again.');
    }
  };

  const handleParentApprove = async (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    // Swap assignments
    await base44.entities.Assignment.update(trade.from_assignment_id, {
      person_id: trade.to_person_id
    });

    if (trade.to_assignment_id) {
      await base44.entities.Assignment.update(trade.to_assignment_id, {
        person_id: trade.from_person_id
      });
    }

    await updateTradeMutation.mutateAsync({
      id: tradeId,
      data: { status: 'parent_approved' }
    });

    toast.success('Trade approved and completed!');
    queryClient.invalidateQueries({ queryKey: ['assignments'] });
  };

  const handleParentReject = async (tradeId) => {
    await updateTradeMutation.mutateAsync({
      id: tradeId,
      data: { status: 'parent_rejected' }
    });
    toast.info('Trade rejected.');
  };

  if (loading || tradesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  const myAssignments = assignments.filter(a =>
    a.person_id === linkedPersonId && !a.completed
  );

  const activeTrades = trades.filter(t =>
    t.status === 'pending' || t.status === 'accepted'
  );
  const completedTrades = trades.filter(t =>
    t.status === 'parent_approved' || t.status === 'parent_rejected' || t.status === 'rejected'
  );

  // Build lookup maps to avoid O(n^2) in render
  const peopleMap = Object.fromEntries(people.map(p => [p.id, p]));
  const assignmentMap = Object.fromEntries(assignments.map(a => [a.id, a]));
  const choreMap = Object.fromEntries(chores.map(c => [c.id, c]));

  const getChoreForAssignment = (assignmentId) => {
    const assignment = assignmentMap[assignmentId];
    return assignment ? choreMap[assignment.chore_id] : undefined;
  };

  return (
    <div className="mx-4 md:mx-8 lg:mx-24 pb-32 space-y-8 lg:pb-8">
      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-[#FF6B35] flex items-center justify-center">
            <ArrowRightLeft className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div>
            <h1 className="header-font text-4xl md:text-5xl text-[#2B59C3]">Chore Trading</h1>
            <p className="body-font-light text-gray-600 mt-2">
              Negotiate chore swaps with family members
            </p>
          </div>
        </div>
      </div>

      {/* Create Trade Form */}
      {!isParent && linkedPersonId && (
        <div className="funky-card p-6">
          {!isCreating ? (
            <Button
              onClick={() => setIsCreating(true)}
              className="funky-button bg-[#C3B1E1] text-white w-full"
            >
              <Plus className="w-5 h-5 mr-2" />
              Request a Trade
            </Button>
          ) : (
            <div className="space-y-4">
              <h3 className="header-font text-xl text-[#2B59C3]">New Trade Request</h3>
              
              <div>
                <label className="body-font text-sm text-gray-700 mb-2 block">
                  Your chore to trade
                </label>
                <Select value={selectedFromAssignment} onValueChange={setSelectedFromAssignment}>
                  <SelectTrigger className="funky-button">
                    <SelectValue placeholder="Select your chore..." />
                  </SelectTrigger>
                  <SelectContent>
                    {myAssignments.map(a => {
                      const chore = chores.find(c => c.id === a.chore_id);
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {chore?.title || 'Unknown'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="body-font text-sm text-gray-700 mb-2 block">
                  Trade with
                </label>
                <Select value={selectedToPerson} onValueChange={setSelectedToPerson}>
                  <SelectTrigger className="funky-button">
                    <SelectValue placeholder="Select person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {people.filter(p => p.id !== linkedPersonId).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="body-font text-sm text-gray-700 mb-2 block">
                  For their chore (optional)
                </label>
                <Select value={selectedToAssignment} onValueChange={setSelectedToAssignment}>
                  <SelectTrigger className="funky-button">
                    <SelectValue placeholder="None (asking a favor)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {assignments
                      .filter(a => a.person_id === selectedToPerson && !a.completed)
                      .map(a => {
                        const chore = chores.find(c => c.id === a.chore_id);
                        return (
                          <SelectItem key={a.id} value={a.id}>
                            {chore?.title || 'Unknown'}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="body-font text-sm text-gray-700 mb-2 block">
                  Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why do you want to trade?"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsCreating(false)}
                  variant="outline"
                  className="flex-1 funky-button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTrade}
                  className="flex-1 funky-button bg-[#FF6B35] text-white"
                  disabled={createTradeMutation.isPending}
                >
                  Send Request
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trades List */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 funky-card p-2">
          <TabsTrigger value="active">Active ({activeTrades.length})</TabsTrigger>
          <TabsTrigger value="history">History ({completedTrades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-4">
          {activeTrades.length > 0 ? (
            activeTrades.map(trade => (
              <ChoreTradeCard
                key={trade.id}
                trade={trade}
                fromPerson={peopleMap[trade.from_person_id]}
                toPerson={peopleMap[trade.to_person_id]}
                fromChore={getChoreForAssignment(trade.from_assignment_id)}
                toChore={getChoreForAssignment(trade.to_assignment_id)}
                onAccept={handleAccept}
                onReject={handleReject}
                onParentApprove={handleParentApprove}
                onParentReject={handleParentReject}
                isParent={isParent}
                currentPersonId={linkedPersonId}
              />
            ))
          ) : (
            <div className="funky-card p-8 text-center">
              <ArrowRightLeft className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="body-font text-gray-500">No active trade requests</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {completedTrades.length > 0 ? (
            completedTrades.map(trade => (
              <ChoreTradeCard
                key={trade.id}
                trade={trade}
                fromPerson={peopleMap[trade.from_person_id]}
                toPerson={peopleMap[trade.to_person_id]}
                fromChore={getChoreForAssignment(trade.from_assignment_id)}
                toChore={getChoreForAssignment(trade.to_assignment_id)}
                isParent={isParent}
                currentPersonId={linkedPersonId}
              />
            ))
          ) : (
            <div className="funky-card p-8 text-center">
              <ArrowRightLeft className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="body-font text-gray-500">No trade history yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}