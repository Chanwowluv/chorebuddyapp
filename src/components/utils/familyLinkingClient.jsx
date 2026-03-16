/**
 * Family linking client utilities
 * Wraps backend function calls for family joining and account linking
 */
import { base44 } from '@/api/base44Client';

export async function generateLinkingCode(familyId) {
  const response = await base44.functions.invoke('familyLinking', {
    action: 'generateCode',
    familyId
  });
  const result = response.data || response;
  if (result.error) throw new Error(result.error);
  return result;
}

export async function joinFamilyByCode({ linkingCode }) {
  const response = await base44.functions.invoke('familyLinking', {
    action: 'joinByCode',
    linkingCode
  });
  const result = response.data || response;
  if (result.error) throw new Error(result.error);
  return result;
}

export async function joinFamilyByInviteCode({ inviteCode, email, name, role }) {
  const response = await base44.functions.invoke('joinFamily', {
    inviteCode,
    email,
    name,
    role
  });
  const result = response.data || response;
  if (result.error) throw new Error(result.error);
  return result;
}

export async function linkAccountToParent(personId) {
  const response = await base44.functions.invoke('linkAccount', {
    action: 'link',
    personId
  });
  const result = response.data || response;
  if (result.error) throw new Error(result.error);
  return result;
}

export async function unlinkAccount(personId) {
  const response = await base44.functions.invoke('linkAccount', {
    action: 'unlink',
    personId
  });
  const result = response.data || response;
  if (result.error) throw new Error(result.error);
  return result;
}