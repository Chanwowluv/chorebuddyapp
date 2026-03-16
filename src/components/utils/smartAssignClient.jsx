/**
 * Smart chore assignment client
 * Wraps backend function call for AI-powered chore assignments
 */
import { base44 } from '@/api/base44Client';

export async function smartAssignChores(options = {}) {
  const response = await base44.functions.invoke('smartAssignChores', options);
  return response;
}