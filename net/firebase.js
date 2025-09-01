export function initFirebase(){
  const firebaseConfig = {
    apiKey: "AIzaSyA1iB1gMq2UubLhlUDvDdnQPOZ1l5utGW8",
    authDomain: "cupadoo-80273.firebaseapp.com",
    projectId: "cupadoo-80273",
    storageBucket: "cupadoo-80273.firebasestorage.app",
    messagingSenderId: "827895807709",
    appId: "1:827895807709:web:806035be2f119d3993e534",
    measurementId: "G-8MHF4LZ9JR",
    databaseURL: "https://cupadoo-80273-default-rtdb.europe-west1.firebasedatabase.app/"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // Persistent local identity
  const uid = localStorage.getItem('uid') || (()=>{ const id='u'+Math.random().toString(36).slice(2,9); localStorage.setItem('uid',id); return id; })();
  window.uid = uid;

  // roomCode stored when host/join is clicked in lobby
  const roomCode = localStorage.getItem('roomCode') || 'default';
  const roomRef  = db.ref('rooms/'+roomCode);

  return {
    uid,
    roomRef,
    stateRef:  roomRef.child('state'),
    inputsRef: roomRef.child('inputs'),
    isHost: true // the reducer is host-authoritative; switch to true only on the host instance if you split hosting later
  };
}
