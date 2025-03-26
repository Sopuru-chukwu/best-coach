// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA-5OQx8EDGKt4Ix3SG3BpQL_5E6sMH18I",
  authDomain: "projects-2025-1b302.firebaseapp.com",
  projectId: "projects-2025-1b302",
  storageBucket: "projects-2025-1b302.firebasestorage.app",
  messagingSenderId: "911137164001",
  appId: "1:911137164001:web:47ee67ca4dccc1b60885a0",
  measurementId: "G-SY13KBPWDC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth=initializeAuth(app,{
    persistence:getReactNativePersistence(ReactNativeAsyncStorage)
})
export const db=getFirestore(app)
const analytics = getAnalytics(app);