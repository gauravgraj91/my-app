import { addActivityLog } from '../firebase/activityLogService';

export function addLog(action, entity, entityType, tab, details, tenantId) {
  addActivityLog(action, entity, entityType, tab, details, tenantId);
}
