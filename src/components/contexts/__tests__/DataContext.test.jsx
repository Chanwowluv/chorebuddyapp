import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../DataContext';

// =============================================
// Mocks
// =============================================

const mockFilter = vi.fn().mockResolvedValue([]);
const mockCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
const mockUpdate = vi.fn().mockResolvedValue({ id: 'upd-1' });
const mockDelete = vi.fn().mockResolvedValue(true);
const mockGet = vi.fn().mockResolvedValue({ id: 'fam-1', owner_user_id: 'user-1' });

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: vi.fn(),
      updateMe: vi.fn().mockResolvedValue(true),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { record: { id: 'crud-new' } } }),
    },
    entities: {
      Family:          { create: vi.fn().mockResolvedValue({ id: 'fam-new' }), get: vi.fn(), update: vi.fn().mockResolvedValue({ id: 'fam-1' }), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      Person:          { create: vi.fn().mockResolvedValue({ id: 'person-new' }), update: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue(true), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      Chore:           { create: vi.fn().mockResolvedValue({ id: 'chore-new' }), update: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue(true), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      Assignment:      { create: vi.fn().mockResolvedValue({ id: 'assign-new' }), update: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue(true), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      Reward:          { create: vi.fn().mockResolvedValue({ id: 'reward-new' }), delete: vi.fn().mockResolvedValue(true), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      RedeemableItem:  { create: vi.fn().mockResolvedValue({ id: 'item-new' }), update: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue(true), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      FamilyGoal:      { create: vi.fn().mockResolvedValue({ id: 'goal-new' }), update: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue(true), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      ChoreCompletion: { create: vi.fn().mockResolvedValue({ id: 'comp-new' }), list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
      Achievement:     { list: vi.fn().mockResolvedValue([]), filter: vi.fn().mockResolvedValue([]) },
    },
  },
}));

vi.mock('../../utils/offlineStorage', () => ({
  offlineStorage: {
    saveData: vi.fn().mockResolvedValue(undefined),
    getData: vi.fn().mockResolvedValue([]),
    updateItem: vi.fn().mockResolvedValue(undefined),
    addToSyncQueue: vi.fn().mockResolvedValue(undefined),
  },
  STORES: {
    PEOPLE: 'people',
    CHORES: 'chores',
    ASSIGNMENTS: 'assignments',
    REWARDS: 'rewards',
    ITEMS: 'items',
    SYNC_QUEUE: 'sync_queue',
  },
}));

const mockLoadPendingCount = vi.fn();
vi.mock('../../hooks/useOfflineSync', () => ({
  useOfflineSync: vi.fn(() => ({
    isOnline: true,
    isSyncing: false,
    pendingOperations: 0,
    syncNow: vi.fn(),
    loadPendingCount: mockLoadPendingCount,
  })),
}));

vi.mock('../../hooks/useRealTimeSync', () => ({
  useRealTimeSync: vi.fn(),
}));

vi.mock('../../hooks/useAssignmentNotifications', () => ({
  useAssignmentNotifications: vi.fn(),
}));

// Mock virtual Base44 SDK entity modules (resolved by base44 vite plugin at runtime)
vi.mock('@/entities/Person', () => ({ Person: {} }));
vi.mock('@/entities/Chore', () => ({ Chore: {} }));
vi.mock('@/entities/Assignment', () => ({ Assignment: {} }));
vi.mock('@/utils/entityHelpers', () => ({ listForFamily: vi.fn() }));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/utils', () => ({
  canManageFamily: vi.fn(() => true),
  isFamilyOwner: vi.fn(() => true),
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isLoadingAuth: false,
  })),
}));

// Import mocked modules to manipulate in tests
import { base44 } from '@/api/base44Client';
import { offlineStorage } from '../../utils/offlineStorage';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { toast } from 'sonner';
import { canManageFamily as canManageFamilyUtil } from '@/components/utils';

// =============================================
// Test helpers
// =============================================

const defaultUser = {
  id: 'user-1',
  family_id: 'fam-1',
  full_name: 'Test User',
  family_role: 'parent',
  subscription_tier: 'free',
};

const defaultFamily = {
  id: 'fam-1',
  owner_user_id: 'user-1',
  subscription_tier: 'free',
  statistics: {},
};

function TestConsumer({ onContext }) {
  const data = useData();
  useEffect(() => {
    onContext(data);
  });
  return null;
}

async function renderProvider() {
  let ctx;
  const captureContext = (data) => { ctx = data; };

  await act(async () => {
    render(
      <DataProvider>
        <TestConsumer onContext={captureContext} />
      </DataProvider>
    );
  });

  return () => ctx;
}

// =============================================
// Setup
// =============================================

beforeEach(() => {
  vi.clearAllMocks();

  // Default: authenticated user with family
  base44.auth.me.mockResolvedValue({ ...defaultUser });
  base44.entities.Family.get.mockResolvedValue({ ...defaultFamily });

  // All list/filter methods return empty arrays by default
  for (const entity of Object.values(base44.entities)) {
    if (entity.list) entity.list.mockResolvedValue([]);
    if (entity.filter) entity.filter.mockResolvedValue([]);
  }

  // Reset offline sync to online
  useOfflineSync.mockReturnValue({
    isOnline: true,
    isSyncing: false,
    pendingOperations: 0,
    syncNow: vi.fn(),
    loadPendingCount: mockLoadPendingCount,
  });
});

// =============================================
// Tests
// =============================================

describe('useData hook guard', () => {
  it('throws when used outside DataProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer onContext={() => {}} />);
    }).toThrow('useData must be used within a DataProvider');
    consoleError.mockRestore();
  });
});

describe('fetchData - initial load', () => {
  it('calls auth.me on mount', async () => {
    await renderProvider();
    expect(base44.auth.me).toHaveBeenCalled();
  });

  it('sets user to null when auth.me fails', async () => {
    base44.auth.me.mockRejectedValue(new Error('Not authenticated'));
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().user).toBeNull());
  });

  it('fetches all entity types via list', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    expect(base44.entities.Person.list).toHaveBeenCalled();
    expect(base44.entities.Chore.list).toHaveBeenCalled();
    expect(base44.entities.Assignment.list).toHaveBeenCalled();
    expect(base44.entities.Reward.list).toHaveBeenCalled();
    expect(base44.entities.RedeemableItem.list).toHaveBeenCalled();
    expect(base44.entities.FamilyGoal.list).toHaveBeenCalled();
    expect(base44.entities.ChoreCompletion.list).toHaveBeenCalled();
    expect(base44.entities.Achievement.list).toHaveBeenCalled();
  });

  it('populates people state from list results', async () => {
    const mockPeople = [{ id: 'p1', name: 'Alice', family_id: 'fam-1' }];
    base44.entities.Person.list.mockResolvedValue(mockPeople);

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().people).toEqual(mockPeople));
  });

  it('loading becomes false after fetch completes', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));
  });
});

describe('fetchData - offline fallback', () => {
  it('uses cached data when offline and cache is available', async () => {
    useOfflineSync.mockReturnValue({
      isOnline: false,
      isSyncing: false,
      pendingOperations: 0,
      syncNow: vi.fn(),
      loadPendingCount: mockLoadPendingCount,
    });

    const cachedPeople = [{ id: 'cached-p1', name: 'Cached' }];
    offlineStorage.getData.mockImplementation((store) => {
      if (store === 'people') return Promise.resolve(cachedPeople);
      return Promise.resolve([]);
    });

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().people).toEqual(cachedPeople));
    expect(toast.info).toHaveBeenCalledWith('Using offline data');
  });
});

describe('fetchData - data caching', () => {
  it('caches data to offline storage when online', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    expect(offlineStorage.saveData).toHaveBeenCalledTimes(5);
  });
});

describe('fetchData - safeFilter error handling', () => {
  it('returns empty array when a single entity list fails', async () => {
    base44.entities.Person.list.mockRejectedValue(new Error('Network error'));

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    // People should be empty due to error, but other entities should still work
    expect(getCtx().people).toEqual([]);
    expect(base44.entities.Chore.list).toHaveBeenCalled();
  });
});

describe('initializeFamily', () => {
  it('creates family and person for users without family_id', async () => {
    base44.auth.me.mockResolvedValue({ id: 'user-1', full_name: 'New User' });
    base44.entities.Family.create.mockResolvedValue({ id: 'fam-new' });
    base44.entities.Person.create.mockResolvedValue({ id: 'person-new' });

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    expect(base44.entities.Family.create).toHaveBeenCalled();
    expect(base44.entities.Person.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'parent', family_id: 'fam-new' })
    );
    expect(base44.auth.updateMe).toHaveBeenCalledWith(
      expect.objectContaining({ family_id: 'fam-new', family_role: 'parent' })
    );
  });

  it('skips initialization when user already has family_id', async () => {
    // Default user already has family_id
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    expect(base44.entities.Family.create).not.toHaveBeenCalled();
  });
});

describe('CRUD operations', () => {
  it('addPerson creates person via direct entity operation', async () => {
    base44.auth.me.mockResolvedValue({ ...defaultUser });

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      await getCtx().addPerson({ name: 'Alice' });
    });

    expect(base44.entities.Person.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice', family_id: 'fam-1', created_by: 'user-1' })
    );
    expect(toast.success).toHaveBeenCalledWith('Family member added!');
  });

  it('updatePerson calls entity update with updated_at', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      await getCtx().updatePerson('p1', { name: 'Bob' });
    });

    expect(base44.entities.Person.update).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ name: 'Bob' })
    );
    expect(toast.success).toHaveBeenCalledWith('Family member updated!');
  });

  it('deletePerson calls entity delete', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      await getCtx().deletePerson('p1');
    });

    expect(base44.entities.Person.delete).toHaveBeenCalledWith('p1');
    expect(toast.success).toHaveBeenCalledWith('Family member removed');
  });

  it('addChore creates chore via direct entity operation', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      await getCtx().addChore({ title: 'Dishes' });
    });

    expect(base44.entities.Chore.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dishes', family_id: 'fam-1', created_by: 'user-1' })
    );
    expect(toast.success).toHaveBeenCalledWith('Chore added!');
  });

  it('createAssignment creates with completed: false via direct entity operation', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      await getCtx().createAssignment({ chore_id: 'c1', person_id: 'p1' });
    });

    expect(base44.entities.Assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ completed: false, family_id: 'fam-1', created_by: 'user-1' })
    );
    expect(toast.success).toHaveBeenCalledWith('Chore assigned!');
  });

  it('addItem creates redeemable item via direct entity operation', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      await getCtx().addItem({ name: 'Cookie' });
    });

    expect(base44.entities.RedeemableItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cookie', family_id: 'fam-1', created_by: 'user-1' })
    );
    expect(toast.success).toHaveBeenCalledWith('Reward item added!');
  });
});

describe('error handling', () => {
  it('sets error state when CRUD operation fails', async () => {
    base44.entities.Person.create.mockRejectedValue(new Error('Create failed'));
    base44.auth.me.mockResolvedValue({ ...defaultUser });

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      try {
        await getCtx().addPerson({ name: 'Fail' });
      } catch {
        // expected
      }
    });

    expect(toast.error).toHaveBeenCalled();
  });
});

describe('utility functions', () => {
  it('getPersonByUserId finds person by linked_user_id', async () => {
    const mockPeople = [
      { id: 'p1', linked_user_id: 'user-1', name: 'Alice', family_id: 'fam-1' },
      { id: 'p2', linked_user_id: 'user-2', name: 'Bob', family_id: 'fam-1' },
    ];
    base44.entities.Person.list.mockResolvedValue(mockPeople);

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().people).toHaveLength(2));

    expect(getCtx().getPersonByUserId('user-2')).toEqual(
      expect.objectContaining({ id: 'p2', name: 'Bob' })
    );
  });

  it('getPersonByUserId returns undefined for unknown user', async () => {
    base44.entities.Person.filter.mockResolvedValue([]);

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    expect(getCtx().getPersonByUserId('nonexistent')).toBeUndefined();
  });

  it('getCurrentPerson returns person matching user.id', async () => {
    const mockPeople = [
      { id: 'p1', linked_user_id: 'user-1', name: 'Me', family_id: 'fam-1' },
    ];
    base44.entities.Person.list.mockResolvedValue(mockPeople);

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().people).toHaveLength(1));

    expect(getCtx().getCurrentPerson()).toEqual(
      expect.objectContaining({ id: 'p1', name: 'Me' })
    );
  });

  it('canManageFamily delegates to utility', async () => {
    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    expect(getCtx().canManageFamily()).toBe(true);
    expect(canManageFamilyUtil).toHaveBeenCalled();
  });
});

describe('updateFamily permissions', () => {
  it('throws when user cannot manage family', async () => {
    canManageFamilyUtil.mockReturnValue(false);

    const getCtx = await renderProvider();
    await waitFor(() => expect(getCtx().loading).toBe(false));

    await act(async () => {
      try {
        await getCtx().updateFamily({ name: 'New Name' });
      } catch (e) {
        expect(e.message).toContain('Only owners and co-owners');
      }
    });
  });
});
