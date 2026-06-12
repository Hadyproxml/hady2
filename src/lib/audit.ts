import { AuditEntry, AuditActionType, User } from '../types';

export async function logAudit(
  user: User | null | undefined,
  action: AuditActionType,
  targetId: string,
  targetName: string,
  oldData?: any,
  newData?: any,
  details?: string
) {
  const entry: Partial<AuditEntry> = {
    userId: user?.id || 'anonymous',
    userName: user?.name || 'زائر غير مسجل',
    action,
    targetId,
    targetName,
    oldData,
    newData,
    details
  };

  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true
    });
  } catch (e) {
    console.warn('Silent notice: Audit log fetch deferred or bypassed during transition:', e);
  }
}
