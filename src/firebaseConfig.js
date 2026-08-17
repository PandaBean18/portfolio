import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  projectId: "sir-pixelot-gallery",
  storageBucket: "sir-pixelot-gallery.firebasestorage.app",
  databaseURL: "https://sir-pixelot-gallery-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const database = getDatabase(app);
