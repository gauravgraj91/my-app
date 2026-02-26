import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';

export async function signup(email, password, displayName, shopName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await updateProfile(cred.user, { displayName });

  // Create tenant
  const tenantRef = doc(collection(db, 'tenants'));
  const tenantId = tenantRef.id;
  await setDoc(tenantRef, {
    name: shopName,
    ownerId: uid,
    createdAt: serverTimestamp(),
  });

  // Create user profile
  await setDoc(doc(db, 'users', uid), {
    email,
    displayName,
    tenantId,
    role: 'owner',
    createdAt: serverTimestamp(),
  });

  return { uid, tenantId, role: 'owner' };
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(cred.user.uid);
  return profile;
}

export async function logout() {
  return signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
