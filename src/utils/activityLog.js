const STORAGE_KEY = 'activityLogs';
const MAX_ENTRIES = 200;

function generateId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export function addLog(action, entity, entityType, tab, details) {
  const logs = getLogs();
  const entry = {
    id: generateId(),
    timestamp: Date.now(),
    action,
    entity,
    entityType,
    tab,
  };
  if (details) entry.details = details;
  logs.unshift(entry);
  if (logs.length > MAX_ENTRIES) logs.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function getLogs(tabFilter) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    if (tabFilter) return logs.filter(l => l.tab === tabFilter);
    return logs;
  } catch {
    return [];
  }
}

export function clearLogs() {
  localStorage.removeItem(STORAGE_KEY);
}
