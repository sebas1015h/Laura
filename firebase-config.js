import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { getStorage }    from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCo-BYAcpAXmgL3DRDi5_R36ZUgQ8uPXQQ",
  authDomain:        "pagina-laura-c9d1b.firebaseapp.com",
  projectId:         "pagina-laura-c9d1b",
  storageBucket:     "pagina-laura-c9d1b.firebasestorage.app",
  messagingSenderId: "597072105986",
  appId:             "1:597072105986:web:7ade6ec67ba8a92a2a4d1b"
};

const app = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const storage = getStorage(app);
