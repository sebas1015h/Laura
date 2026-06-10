const firebaseConfig = {
  apiKey:            "AIzaSyCo-BYAcpAXmgL3DRDi5_R36ZUgQ8uPXQQ",
  authDomain:        "pagina-laura-c9d1b.firebaseapp.com",
  projectId:         "pagina-laura-c9d1b",
  storageBucket:     "pagina-laura-c9d1b.firebasestorage.app",
  messagingSenderId: "597072105986",
  appId:             "1:597072105986:web:7ade6ec67ba8a92a2a4d1b"
};

firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const storage = firebase.storage();
