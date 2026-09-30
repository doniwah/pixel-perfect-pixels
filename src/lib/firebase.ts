import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import type { Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCfrccOLoMnfT2GrHALpGCp5P5spafW7aU",
  authDomain: "kelompok1-fa379.firebaseapp.com",
  databaseURL: "https://kelompok1-fa379-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kelompok1-fa379",
  storageBucket: "kelompok1-fa379.firebasestorage.app",
  messagingSenderId: "76712763884",
  appId: "1:76712763884:web:18faf200ea888da7a120c9",
  measurementId: "G-96GM50J9NE",
};

// Initialize Firebase safely (avoiding multiple initializations during SSR / HMR)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Realtime Database
export const rtdb = getDatabase(app);

// Initialize Analytics safely on client side
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
    isSupported().then((yes) => {
      if (yes) {
        analytics = getAnalytics(app);
      }
    });
  });
}

export { analytics };
