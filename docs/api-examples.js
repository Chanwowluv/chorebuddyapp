/**
 * Base44 Entity API Examples
 *
 * This file demonstrates best practices for interacting with Person entities
 * using both the Base44 SDK (recommended) and raw REST API calls.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_CONFIG = {
  baseUrl: process.env.BASE44_API_URL || 'https://app.base44.com/api',
  appId: process.env.VITE_BASE44_APP_ID || '68ab3374ea3ad4ffe8c9ff29',
  // NEVER hardcode API keys - use environment variables
  apiKey: process.env.BASE44_API_KEY,
};

// Person entity filterable fields for reference
const PERSON_FILTERABLE_FIELDS = [
  'name',
  'avatar_color',
  'role',              // 'parent' | 'teen' | 'child'
  'age',
  'preferred_categories',
  'avoided_categories',
  'max_weekly_chores',
  'skill_level',
  'family_id',
  'linked_user_id',
  'is_active',
  'points_balance',
  'total_points_earned',
  'chores_completed_count',
  'current_streak',
  'best_streak',
  'notes',
  'created_at',
  'updated_at',
];

// =============================================================================
// SDK APPROACH (RECOMMENDED)
// =============================================================================

import { Person } from '@/entities/Person';

/**
 * Fetch all Person entities with optional sorting
 * @param {string} sortField - Field to sort by (prefix with '-' for descending)
 * @returns {Promise<Person[]>}
 */
async function fetchAllPeople(sortField = 'name') {
  try {
    const people = await Person.list(sortField);
    return people;
  } catch (error) {
    console.error('Failed to fetch people:', error.message);
    throw error;
  }
}

/**
 * Fetch Person entities with filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Person[]>}
 *
 * @example
 * // Fetch active parents in a family
 * const parents = await fetchPeopleWithFilters({
 *   family_id: 'fam_123',
 *   role: 'parent',
 *   is_active: true
 * });
 *
 * @example
 * // Fetch children with high points
 * const topKids = await fetchPeopleWithFilters({
 *   role: 'child',
 *   points_balance: { $gte: 100 }
 * });
 */
async function fetchPeopleWithFilters(filters) {
  try {
    const people = await Person.filter(filters);
    return people;
  } catch (error) {
    console.error('Failed to fetch filtered people:', error.message);
    throw error;
  }
}

/**
 * Update a Person entity
 * @param {string} entityId - The Person ID to update
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Person>}
 */
async function updatePerson(entityId, updateData) {
  try {
    const updated = await Person.update(entityId, updateData);
    return updated;
  } catch (error) {
    console.error(`Failed to update person ${entityId}:`, error.message);
    throw error;
  }
}

// =============================================================================
// REST API APPROACH (For external integrations)
// =============================================================================

/**
 * Base API client with error handling and retry logic
 */
class Base44ApiClient {
  constructor(config = API_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.appId = config.appId;
    this.apiKey = config.apiKey;

    if (!this.apiKey) {
      throw new Error('API key is required. Set BASE44_API_KEY environment variable.');
    }
  }

  get headers() {
    return {
      'api_key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  getEntityUrl(entityType, entityId = '') {
    const base = `${this.baseUrl}/apps/${this.appId}/entities/${entityType}`;
    return entityId ? `${base}/${entityId}` : base;
  }

  /**
   * Make an API request with error handling
   */
  async request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options.headers },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API Error ${response.status}: ${errorData.message || response.statusText}`
      );
    }

    return response.json();
  }
}

/**
 * Person entity API client
 */
class PersonApi extends Base44ApiClient {
  /**
   * Fetch all Person entities
   * @returns {Promise<Object[]>}
   */
  async list() {
    const url = this.getEntityUrl('Person');
    return this.request(url);
  }

  /**
   * Fetch Person entities with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Object[]>}
   *
   * @example
   * const api = new PersonApi();
   *
   * // Filter by family
   * const familyMembers = await api.filter({ family_id: 'fam_123' });
   *
   * // Filter by role and active status
   * const activeParents = await api.filter({
   *   role: 'parent',
   *   is_active: true
   * });
   *
   * // Filter with comparison operators
   * const highAchievers = await api.filter({
   *   points_balance: { $gte: 500 },
   *   chores_completed_count: { $gte: 10 }
   * });
   *
   * // Filter by multiple roles
   * const kids = await api.filter({
   *   role: { $in: ['child', 'teen'] }
   * });
   */
  async filter(filters = {}) {
    const url = new URL(this.getEntityUrl('Person'));

    // Encode filters as query parameter
    if (Object.keys(filters).length > 0) {
      url.searchParams.set('filter', JSON.stringify(filters));
    }

    return this.request(url.toString());
  }

  /**
   * Get a single Person by ID
   * @param {string} entityId
   * @returns {Promise<Object>}
   */
  async get(entityId) {
    const url = this.getEntityUrl('Person', entityId);
    return this.request(url);
  }

  /**
   * Create a new Person
   * @param {Object} data - Person data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const url = this.getEntityUrl('Person');
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a Person entity
   * @param {string} entityId - The Person ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>}
   */
  async update(entityId, updateData) {
    const url = this.getEntityUrl('Person', entityId);
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete a Person entity
   * @param {string} entityId
   * @returns {Promise<void>}
   */
  async delete(entityId) {
    const url = this.getEntityUrl('Person', entityId);
    return this.request(url, { method: 'DELETE' });
  }
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

async function examples() {
  // --- SDK Examples (Recommended for frontend) ---

  // List all people sorted by name
  const allPeople = await fetchAllPeople('name');

  // List sorted by most recently updated
  const recentlyUpdated = await fetchAllPeople('-updated_at');

  // Filter active family members
  const activeMembers = await fetchPeopleWithFilters({
    family_id: 'your_family_id',
    is_active: true,
  });

  // Filter by role
  const parents = await fetchPeopleWithFilters({ role: 'parent' });
  const children = await fetchPeopleWithFilters({ role: 'child' });

  // Update person's points
  await updatePerson('person_id', {
    points_balance: 150,
    current_streak: 5,
  });

  // --- REST API Examples (For external integrations) ---

  const api = new PersonApi();

  // Fetch all with filters
  const teamMembers = await api.filter({
    family_id: 'fam_123',
    is_active: true,
  });

  // Create new person
  const newPerson = await api.create({
    name: 'Alex',
    role: 'child',
    age: 10,
    family_id: 'fam_123',
    avatar_color: '#4CAF50',
    is_active: true,
    points_balance: 0,
    skill_level: 'beginner',
  });

  // Update person
  await api.update(newPerson.id, {
    points_balance: 50,
    chores_completed_count: 5,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // SDK-based functions
  fetchAllPeople,
  fetchPeopleWithFilters,
  updatePerson,
  // REST API client
  PersonApi,
  Base44ApiClient,
  // Constants
  PERSON_FILTERABLE_FIELDS,
  API_CONFIG,
};
