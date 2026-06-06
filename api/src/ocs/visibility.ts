import type { OC } from '../types';
import { verifyPassword } from '../auth/password';

export type VisibilityResult = 'allowed' | 'forbidden' | 'needs_password' | 'private';

export async function checkVisibility(
  oc: OC,
  requestingUserId: string | null,
  passwordAttempt: string | null,
): Promise<VisibilityResult> {
  if (oc.user_id === requestingUserId) return 'allowed';

  switch (oc.visibility) {
    case 'public':
    case 'unlisted':
      return 'allowed';
    case 'password':
      if (!passwordAttempt) return 'needs_password';
      if (!oc.password_hash) return 'forbidden';
      return (await verifyPassword(passwordAttempt, oc.password_hash)) ? 'allowed' : 'forbidden';
    case 'private':
      return 'private';
    default:
      return 'forbidden';
  }
}
