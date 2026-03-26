import { 
  db, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  getCountFromServer, 
  query, 
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

export const gcpService = {
  async updateDoc(collectionName: string, id: string, data: any) {
    const path = `${collectionName}/${id}`;
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async addDoc(collectionName: string, data: any) {
    try {
      const colRef = collection(db, collectionName);
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  },

  async getCount(collectionName: string, filters?: any) {
    try {
      let q = query(collection(db, collectionName));
      
      if (filters && filters.where) {
        filters.where.forEach((f: any) => {
          q = query(q, where(f.field, f.operator, f.value));
        });
      }

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, collectionName);
      return 0;
    }
  }
};
