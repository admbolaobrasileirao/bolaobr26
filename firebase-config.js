import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCAJbxjO59Fk_sgNV7TMx1mvbM8AcvCe9w',
  authDomain: 'bolao-brasileirao-2026-9b62e.firebaseapp.com',
  projectId: 'bolao-brasileirao-2026-9b62e',
  storageBucket: 'bolao-brasileirao-2026-9b62e.firebasestorage.app',
  messagingSenderId: '931690711654',
  appId: '1:931690711654:web:1a868af2bb9538df9cfba7',
};

export const adminEmail = 'victorcovelli03@gmail.com';
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
