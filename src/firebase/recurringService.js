import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION_NAME = 'recurringTransactions';

// Ledger collection a template's occurrences are written into
const LEDGER_BY_SCOPE = {
  shop: 'transactions',
  personal: 'personalTransactions'
};

// Safety cap on catch-up materialization per template
const MAX_OCCURRENCES_PER_RUN = 24;

// Add a recurring template
export const addRecurring = async (recurringData, tenantId) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...recurringData,
      tenantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    console.error('Error adding recurring transaction: ', error);
    throw error;
  }
};

// Update a recurring template (pause = { active: false })
export const updateRecurring = async (recurringId, updateData) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, recurringId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating recurring transaction: ', error);
    throw error;
  }
};

// Delete a recurring template
export const deleteRecurring = async (recurringId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, recurringId));
  } catch (error) {
    console.error('Error deleting recurring transaction: ', error);
    throw error;
  }
};

// Real-time listener for one scope's templates (equality-only query — no composite index needed)
export const subscribeToRecurring = (tenantId, scope, callback, onError) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('tenantId', '==', tenantId),
    where('scope', '==', scope)
  );

  return onSnapshot(q, (querySnapshot) => {
    const templates = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      templates.push({
        id: docSnap.id,
        ...data,
        nextDue: data.nextDue?.toDate?.() || data.nextDue
      });
    });
    templates.sort((a, b) => (a.nextDue || 0) - (b.nextDue || 0));
    callback(templates);
  }, (error) => {
    console.error('Error subscribing to recurring transactions:', error);
    if (onError) onError(error);
  });
};

// Advance a due date by one period; monthly clamps the day to the target month's length
export const advanceNextDue = (date, frequency) => {
  const d = new Date(date);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
    return d;
  }
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTarget));
  target.setHours(d.getHours(), d.getMinutes(), 0, 0);
  return target;
};

const occurrenceId = (templateId, dueDate) => {
  const d = new Date(dueDate);
  const pad = (n) => String(n).padStart(2, '0');
  return `rec_${templateId}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Write ledger entries for every due occurrence of the given templates, then advance nextDue.
// Deterministic doc ids make this idempotent — concurrent tabs cannot double-post.
export const materializeDueRecurring = async (tenantId, templates) => {
  const now = new Date();
  let created = 0;

  for (const template of templates) {
    if (!template.active || !template.nextDue) continue;
    const ledger = LEDGER_BY_SCOPE[template.scope];
    if (!ledger) continue;

    let due = new Date(template.nextDue);
    let runs = 0;

    try {
      while (due <= now && runs < MAX_OCCURRENCES_PER_RUN) {
        const entry = {
          type: template.type,
          amount: template.amount,
          comment: template.comment,
          date: due,
          recurringId: template.id,
          tenantId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (template.scope === 'personal') {
          entry.category = template.type === 'cashOut' ? (template.category || 'other') : null;
        }
        await setDoc(doc(db, ledger, occurrenceId(template.id, due)), entry);
        created++;
        runs++;
        due = advanceNextDue(due, template.frequency);
      }

      if (runs > 0) {
        await updateRecurring(template.id, { nextDue: due });
      }
    } catch (error) {
      console.error('Error materializing recurring transaction:', template.id, error);
    }
  }

  return created;
};
