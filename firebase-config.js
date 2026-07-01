import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAfuZpUC72nZWT16Grn5R3NkLSX2pNdMuY',
  authDomain: 'bolao-brasileirao-2026-9e903.firebaseapp.com',
  projectId: 'bolao-brasileirao-2026-9e903',
  storageBucket: 'bolao-brasileirao-2026-9e903.firebasestorage.app',
  messagingSenderId: '202721976689',
  appId: '1:202721976689:web:abd328f301b49561f0d6d0',
};

export const adminEmail = 'admbolaobrasileirao@gmail.com';
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
