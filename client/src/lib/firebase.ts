import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// 本物の設定値で上書き
const firebaseConfig = {
  apiKey: "AIzaSyBzlct37KQContlV1N4yKuWohMOq6-wZ4c",
  authDomain: "ticket-lottery-app.firebaseapp.com",
  projectId: "ticket-lottery-app",
  storageBucket: "ticket-lottery-app.firebasestorage.app",
  messagingSenderId: "298852177170",
  appId: "1:298852177170:web:49ea236c2042280b810fcb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
