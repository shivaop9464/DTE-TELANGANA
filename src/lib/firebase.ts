import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Web app's Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyA2W7Ih4T5PtK17InQ4epxc1sHLRp8cugQ",
  authDomain: "ai-studio-applet-webapp-bcb3b.firebaseapp.com",
  databaseURL: "https://ai-studio-applet-webapp-bcb3b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ai-studio-applet-webapp-bcb3b",
  storageBucket: "ai-studio-applet-webapp-bcb3b.firebasestorage.app",
  messagingSenderId: "1023400366254",
  appId: "1:1023400366254:web:350610d448291894035d3f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Silence Firestore internal logs
try {
  setLogLevel("silent");
} catch (_) {}

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
