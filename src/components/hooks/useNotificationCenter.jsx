import { useState, useEffect, useCallback, useRef } from 'react';
import { useData } from '@/components/contexts/DataContext';

const MAX_NOTIFICATIONS = 50;
const STORAGE_KEY_PREFIX = 'chorebuddy_notifications_';

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function loadNotifications(userId) {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotifications(userId, notifications) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(notifications));
  } catch {
    // localStorage full or unavailable
  }
}

function createNotification(type, title, body) {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false,
  };
}

/**
 * useNotificationCenter - Aggregates notifications from data changes.
 * Tracks assignment changes, family member joins, and overdue chores.
 * Persists to localStorage per user.
 */
export function useNotificationCenter() {
  const { user, assignments, people, family, chores } = useData();
  const [notifications, setNotifications] = useState([]);

  // Refs to track previous state for diffing
  const prevAssignmentsRef = useRef(null);
  const prevMemberCountRef = useRef(null);
  const initializedRef = useRef(false);

  // Load notifications from localStorage when user changes
  useEffect(() => {
    if (user?.id) {
      const stored = loadNotifications(user.id);
      setNotifications(stored);
      initializedRef.current = false;
    }
  }, [user?.id]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (user?.id && notifications.length > 0) {
      saveNotifications(user.id, notifications);
    }
  }, [user?.id, notifications]);

  // Detect assignment changes
  useEffect(() => {
    if (!user?.id || !assignments) return;

    // Skip the first load (don't generate notifications for existing data)
    if (!initializedRef.current) {
      prevAssignmentsRef.current = assignments;
      prevMemberCountRef.current = family?.members?.length || 0;
      initializedRef.current = true;
      return;
    }

    const prevAssignments = prevAssignmentsRef.current || [];
    const newNotifs = [];

    // Find newly created assignments for this user
    if (user.linked_person_id) {
      const prevIds = new Set(prevAssignments.map(a => a.id));
      const newAssignments = assignments.filter(
        a => !prevIds.has(a.id) && a.person_id === user.linked_person_id && !a.is_self_assigned
      );
      for (const assignment of newAssignments) {
        const chore = chores.find(c => c.id === assignment.chore_id);
        if (chore) {
          newNotifs.push(
            createNotification('chore_assigned', 'New Chore Assigned', `You've been assigned: ${chore.title || chore.name}`)
          );
        }
      }
    }

    // Find newly completed assignments (for parents)
    if (user.family_role === 'parent') {
      for (const assignment of assignments) {
        const prev = prevAssignments.find(a => a.id === assignment.id);
        if (prev && !prev.completed && assignment.completed) {
          const chore = chores.find(c => c.id === assignment.chore_id);
          const person = people.find(p => p.id === assignment.person_id);
          if (chore && person) {
            newNotifs.push(
              createNotification('chore_completed', 'Chore Completed', `${person.name} completed: ${chore.title || chore.name}`)
            );
          }
        }
      }
    }

    prevAssignmentsRef.current = assignments;

    if (newNotifs.length > 0) {
      setNotifications(prev => [...newNotifs, ...prev].slice(0, MAX_NOTIFICATIONS));
    }
  }, [assignments, user, chores, people]);

  // Detect new family members (for parents)
  useEffect(() => {
    if (!user?.id || user.family_role !== 'parent' || !family) return;
    if (!initializedRef.current) return;

    const currentCount = family.members?.length || 0;
    const prevCount = prevMemberCountRef.current || 0;

    if (currentCount > prevCount && prevCount > 0) {
      const newNotif = createNotification(
        'member_joined',
        'New Family Member',
        `A new member has joined your family!`
      );
      setNotifications(prev => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
    }

    prevMemberCountRef.current = currentCount;
  }, [family?.members?.length, user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      if (user?.id) saveNotifications(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user?.id) saveNotifications(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (user?.id) saveNotifications(user.id, []);
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
  };
}
