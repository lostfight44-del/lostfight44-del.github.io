VikingGOLD – beállítás
======================
1) js/firebase-config.js : illeszd be a Firebase projekt adatait.
2) Firebase -> Authentication -> Email/Password legyen bekapcsolva.
3) FONTOS: regisztráld MINDKÉT admin nevet, mielőtt mások lefoglalnák:
      _notryn   és   Kriszhhh
   (a rendszer a felhasználónév alapján ismeri fel az admint/tippadót)
4) Firebase -> Firestore -> Rules, illeszd be:

rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email in ['_notryn@vikinggold.local', 'kriszhhh@vikinggold.local'];
    }
    match /tips/{id}     { allow read: if request.auth != null; allow write: if isAdmin(); }
    match /users/{uid}   { allow read: if true;
                           allow create, update: if request.auth != null && request.auth.uid == uid;
                           allow delete: if isAdmin(); }
    match /messages/{id} { allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
                           allow read, delete: if isAdmin(); }
  }
}
