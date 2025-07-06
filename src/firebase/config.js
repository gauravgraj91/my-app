import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBjNL3TVq2oAmHm_W0n8wx8wDF3dtxEkw8",
  authDomain: "todo-shop-app.firebaseapp.com",
  projectId: "todo-shop-app",
  storageBucket: "todo-shop-app.firebasestorage.app",
  messagingSenderId: "358186121028",
  appId: "1:358186121028:web:3a5bbe57f4470fd0674911",
  measurementId: "G-FWSZEWBQHG"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
export const db = getFirestore(app);

export default app; 