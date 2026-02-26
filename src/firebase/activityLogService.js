import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  limit as fbLimit,
  writeBatch,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'activityLogs';
const MAX_ENTRIES = 200;

export function addActivityLog(action, entity, entityType, tab, details, tenantId) {
  const data = { timestamp: serverTimestamp(), action, entity, entityType, tab, tenantId };
  if (details) data.details = details;
  addDoc(collection(db, COLLECTION_NAME), data).catch(err => {
    console.error('Failed to add activity log:', err);
  });
}

export function subscribeActivityLogs(tenantId, tabFilter, callback) {
  const constraints = [where('tenantId', '==', tenantId), orderBy('timestamp', 'desc'), fbLimit(MAX_ENTRIES)];
  if (tabFilter && tabFilter !== 'All') {
    constraints.push(where('tab', '==', tabFilter));
  }
  const q = query(collection(db, COLLECTION_NAME), ...constraints);

  return onSnapshot(q, snapshot => {
    const logs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toMillis?.() || Date.now(),
    }));
    callback(logs);
  }, err => {
    console.error('Activity log subscription error:', err);
    callback([]);
  });
}

export async function clearActivityLogs(tenantId) {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId)));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  return batch.commit();
}

export async function migrateLocalStorageLogs() {
  const STORAGE_KEY = 'activityLogs';
  const MIGRATION_KEY = 'activityLogsMigrated';

  if (localStorage.getItem(MIGRATION_KEY)) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }
    const logs = JSON.parse(raw);
    if (!logs.length) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const batch = writeBatch(db);
    const colRef = collection(db, COLLECTION_NAME);
    logs.forEach(log => {
      const docRef = doc(colRef);
      batch.set(docRef, {
        timestamp: Timestamp.fromMillis(log.timestamp),
        action: log.action,
        entity: log.entity,
        entityType: log.entityType,
        tab: log.tab,
        ...(log.details ? { details: log.details } : {}),
      });
    });
    await batch.commit();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (err) {
    console.error('Failed to migrate activity logs:', err);
  }
}
