import { useEffect, useRef, useCallback } from 'react';
import { Person } from '@/entities/Person';
import { Chore } from '@/entities/Chore';
import { Assignment } from '@/entities/Assignment';
import { listForFamily } from '@/utils/entityHelpers';
import { toast } from 'sonner';

/**
 * Real-time assignment notifications using polling
 * Shows toast notifications when chore assignments change
 */
export function useAssignmentNotifications(familyId, enabled = true) {
  const peopleRef = useRef({});
  const choresRef = useRef({});
  const assignmentsRef = useRef({});
  const initializedRef = useRef(false);
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);

  // Load reference data for meaningful notifications
  const loadReferenceData = useCallback(async () => {
    if (!familyId) return;

    try {
      const [people, chores] = await Promise.all([
        listForFamily(Person, familyId),
        listForFamily(Chore, familyId)
      ]);

      // Build lookup maps
      peopleRef.current = {};
      people.forEach(person => {
        peopleRef.current[person.id] = person;
      });

      choresRef.current = {};
      chores.forEach(chore => {
        choresRef.current[chore.id] = chore;
      });
    } catch (error) {
      console.error('[AssignmentNotifications] Error loading reference data:', error);
    }
  }, [familyId]);

  // Check for assignment changes
  const checkForChanges = useCallback(async () => {
    if (!familyId || !enabled || !isActiveRef.current) return;

    try {
      const assignments = await listForFamily(Assignment, familyId, '-created_date');

      // Skip notification on first load (just initialize the cache)
      if (!initializedRef.current) {
        assignmentsRef.current = {};
        assignments.forEach(assignment => {
          assignmentsRef.current[assignment.id] = assignment;
        });
        initializedRef.current = true;
        return;
      }

      // Check for new assignments
      assignments.forEach(assignment => {
        const previousAssignment = assignmentsRef.current[assignment.id];

        if (!previousAssignment) {
          // New assignment detected
          const person = peopleRef.current[assignment.person_id];
          const chore = choresRef.current[assignment.chore_id];

          if (person && chore) {
            toast.info(`${person.name} was assigned "${chore.title}"`, {
              duration: 4000,
            });
          }
        } else if (
          !previousAssignment.completed &&
          assignment.completed
        ) {
          // Assignment was completed
          const person = peopleRef.current[assignment.person_id];
          const chore = choresRef.current[assignment.chore_id];

          if (person && chore) {
            toast.success(`${person.name} completed "${chore.title}"`, {
              duration: 4000,
            });
          }
        } else if (
          previousAssignment.person_id !== assignment.person_id
        ) {
          // Assignment was reassigned
          const newPerson = peopleRef.current[assignment.person_id];
          const chore = choresRef.current[assignment.chore_id];

          if (newPerson && chore) {
            toast.info(`"${chore.title}" was reassigned to ${newPerson.name}`, {
              duration: 4000,
            });
          }
        }
      });

      // Update the cache
      assignmentsRef.current = {};
      assignments.forEach(assignment => {
        assignmentsRef.current[assignment.id] = assignment;
      });

    } catch (error) {
      console.error('[AssignmentNotifications] Error checking for changes:', error);
    }
  }, [familyId, enabled]);

  // Handle tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      if (isActiveRef.current && initializedRef.current) {
        // Check for updates when tab becomes active again
        checkForChanges();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkForChanges]);

  // Main effect for polling
  useEffect(() => {
    if (!familyId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Load reference data first, then start polling
    loadReferenceData().then(() => {
      // Initial check
      checkForChanges();

      // Poll every 30 seconds to match useRealTimeSync interval
      intervalRef.current = setInterval(() => {
        checkForChanges();
      }, 30000);
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset state on cleanup
      initializedRef.current = false;
      assignmentsRef.current = {};
    };
  }, [familyId, enabled, loadReferenceData, checkForChanges]);
}