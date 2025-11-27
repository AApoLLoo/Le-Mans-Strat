// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAezT5Np6-v18OBR1ICV3uHoFViQB555sg",
  authDomain: "le-mans-strat.firebaseapp.com",
  projectId: "le-mans-strat",
  storageBucket: "le-mans-strat.firebasestorage.app",
  messagingSenderId: "1063156323054",
  appId: "1:1063156323054:web:81e74528a75ffb770099ff"
};

let db: any;
try {
  if (firebaseConfig.apiKey) {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
  }
} catch (error) { console.error("Firebase Error", error); }

export { db };