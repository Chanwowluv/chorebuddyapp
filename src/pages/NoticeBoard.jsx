import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Megaphone, Plus, Pin, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { stripHTMLTags } from '@/components/lib/sanitization';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { isParent as checkParent } from '@/utils/roles';

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    pinned: false
  });

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time notice updates
    const unsubscribe = base44.entities.Notice.subscribe((event) => {
      if (event.type === 'create') {
        setNotices(prev => [event.data, ...prev]);
      } else if (event.type === 'delete') {
        setNotices(prev => prev.filter(n => n.id !== event.id));
      }
    });

    return unsubscribe;
  }, []);

  const fetchData = async () => {
    try {
      const userData = await base44.auth.me();
      setCurrentUser(userData);

      const noticesData = userData.family_id
        ? await base44.entities.Notice.filter({ family_id: userData.family_id })
            .then(all => [...all].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')))
            .catch(() => [])
        : [];

      setNotices(noticesData);
    } catch (error) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    
    try {
      await base44.entities.Notice.create({
        ...formData,
        title: stripHTMLTags(formData.title),
        content: stripHTMLTags(formData.content),
        created_by_user_id: currentUser.id,
        created_by_name: currentUser.full_name,
        family_id: currentUser.family_id
      });

      setModalOpen(false);
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        pinned: false
      });
      toast.success('Notice posted!');
    } catch (error) {
      toast.error('Failed to create notice');
    }
  };

  const handleTogglePin = async (notice) => {
    try {
      await base44.entities.Notice.update(notice.id, {
        pinned: !notice.pinned
      });
      
      setNotices(prev => prev.map(n => 
        n.id === notice.id ? { ...n, pinned: !n.pinned } : n
      ));
      
      toast.success(notice.pinned ? 'Notice unpinned' : 'Notice pinned');
    } catch (error) {
      toast.error('Failed to update notice');
    }
  };

  const handleDeleteNotice = async () => {
    if (!noticeToDelete) return;
    try {
      await base44.entities.Notice.delete(noticeToDelete);
      toast.success('Notice deleted');
    } catch (error) {
      toast.error('Failed to delete notice');
    } finally {
      setNoticeToDelete(null);
    }
  };

  const sortedNotices = [...notices].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#C3B1E1]" />
      </div>
    );
  }

  return (
    <div className="pb-32 lg:pb-8 space-y-6">
      <ConfirmDialog
        isOpen={!!noticeToDelete}
        onClose={() => setNoticeToDelete(null)}
        onConfirm={handleDeleteNotice}
        title="Delete Notice"
        message="Are you sure you want to delete this notice? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
      {/* Header */}
      <div className="funky-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="funky-button w-16 h-16 md:w-20 md:h-20 bg-[#F7A1C4] flex items-center justify-center">
              <Megaphone className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <h1 className="header-font text-3xl md:text-4xl lg:text-5xl text-[#2B59C3]">Notice Board</h1>
              <p className="body-font-light text-gray-600 mt-2">Important family announcements</p>
            </div>
          </div>
          {checkParent(currentUser) && (
            <Button
              onClick={() => setModalOpen(true)}
              className="funky-button bg-[#FF6B35] text-white w-full md:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Post Notice
            </Button>
          )}
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {sortedNotices.length === 0 ? (
          <div className="funky-card p-12 text-center border-4 border-dashed border-gray-300">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="header-font text-2xl text-[#2B59C3] mb-2">No notices yet</h3>
            <p className="body-font-light text-gray-600">Post important announcements for your family</p>
          </div>
        ) : (
          sortedNotices.map(notice => (
            <div
              key={notice.id}
              className={`funky-card p-6 md:p-8 ${
                notice.pinned ? 'border-4 border-[#FF6B35] bg-orange-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {notice.pinned && (
                      <Pin className="w-5 h-5 text-[#FF6B35]" />
                    )}
                    {notice.priority === 'important' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <h3 className="header-font text-2xl text-[#2B59C3]">{notice.title}</h3>
                  </div>
                  <p className="body-font-light text-gray-700 text-lg whitespace-pre-wrap">
                    {notice.content}
                  </p>
                </div>
                <div className="flex gap-2">
                  {checkParent(currentUser) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePin(notice)}
                        className={notice.pinned ? 'text-[#FF6B35]' : 'text-gray-400'}
                      >
                        <Pin className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNoticeToDelete(notice.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-3">
                <span>Posted by {notice.created_by_name}</span>
                <span>{format(new Date(notice.created_date), 'MMM d, h:mm a')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Notice Modal */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="header-font text-2xl text-[#2B59C3]">Post Notice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNotice} className="space-y-4">
            <div>
              <label className="body-font text-sm text-gray-600 mb-1 block">Title</label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title..."
              />
            </div>
            
            <div>
              <label className="body-font text-sm text-gray-600 mb-1 block">Message</label>
              <Textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="What do you want to announce?"
                className="min-h-[120px]"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.priority === 'important'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    priority: e.target.checked ? 'important' : 'normal' 
                  })}
                  className="w-4 h-4"
                />
                <span className="body-font text-sm text-gray-600">Mark as important</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="body-font text-sm text-gray-600">Pin to top</span>
              </label>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 funky-button bg-[#FF6B35] text-white">
                Post Notice
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}