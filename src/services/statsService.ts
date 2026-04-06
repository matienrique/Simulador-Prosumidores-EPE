import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, setDoc, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { UserType } from '../../types';

export interface FeedbackData {
  number: number;
  date: string;
  userType: string;
  resolved: boolean;
  observations: string;
}

export interface GlobalStats {
  visitCount: number;
  resolvedCount: number;
  notResolvedCount: number;
  lastConsultationNumber: number;
}

const STATS_DOC_ID = 'counters';

export const incrementVisitCount = async () => {
  const statsRef = doc(db, 'global_stats', STATS_DOC_ID);
  const statsSnap = await getDoc(statsRef);

  if (statsSnap.exists()) {
    const data = statsSnap.data() as GlobalStats;
    // Update: If the current count is less than 104, we seed it to 104 as requested.
    const newCount = Math.max(data.visitCount + 1, 104);
    await updateDoc(statsRef, { visitCount: newCount });
  } else {
    await setDoc(statsRef, {
      visitCount: 104, // Start at 104 if it doesn't exist
      resolvedCount: 0,
      notResolvedCount: 0,
      lastConsultationNumber: 0
    });
  }
};

export const saveFeedback = async (resolved: boolean, observations: string, userType: UserType, isGD?: boolean) => {
  const statsRef = doc(db, 'global_stats', STATS_DOC_ID);
  const statsSnap = await getDoc(statsRef);
  
  let nextNumber = 1;
  let resolvedCount = 0;
  let notResolvedCount = 0;

  if (statsSnap.exists()) {
    const data = statsSnap.data() as GlobalStats;
    nextNumber = data.lastConsultationNumber + 1;
    resolvedCount = resolved ? data.resolvedCount + 1 : data.resolvedCount;
    notResolvedCount = !resolved ? data.notResolvedCount + 1 : data.notResolvedCount;
    
    await updateDoc(statsRef, {
      lastConsultationNumber: nextNumber,
      resolvedCount,
      notResolvedCount
    });
  } else {
    resolvedCount = resolved ? 1 : 0;
    notResolvedCount = !resolved ? 1 : 0;
    await setDoc(statsRef, {
      visitCount: 1,
      resolvedCount,
      notResolvedCount,
      lastConsultationNumber: 1
    });
  }

  const feedback: FeedbackData = {
    number: nextNumber,
    date: new Date().toLocaleDateString(),
    userType: getUserTypeLabel(userType, isGD),
    resolved,
    observations
  };

  await addDoc(collection(db, 'tabla_estadisticas'), feedback);
};

export const getFeedbackList = async (): Promise<FeedbackData[]> => {
  const q = query(collection(db, 'tabla_estadisticas'), orderBy('number', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as FeedbackData);
};

export const getGlobalStats = async (): Promise<GlobalStats | null> => {
  const statsSnap = await getDoc(doc(db, 'global_stats', STATS_DOC_ID));
  return statsSnap.exists() ? (statsSnap.data() as GlobalStats) : null;
};

export const clearAllData = async () => {
  const batch = writeBatch(db);
  
  // Clear feedback
  const feedbackSnap = await getDocs(collection(db, 'tabla_estadisticas'));
  feedbackSnap.docs.forEach(doc => batch.delete(doc.ref));
  
  // Reset counters (keep visit count?)
  const statsRef = doc(db, 'global_stats', STATS_DOC_ID);
  const statsSnap = await getDoc(statsRef);
  const currentVisitCount = statsSnap.exists() ? statsSnap.data().visitCount : 0;
  
  batch.set(statsRef, {
    visitCount: currentVisitCount,
    resolvedCount: 0,
    notResolvedCount: 0,
    lastConsultationNumber: 0
  });

  await batch.commit();
};

const getUserTypeLabel = (type: UserType, isGD?: boolean): string => {
  switch (type) {
    case UserType.PROSUMIDOR: 
      return isGD ? 'Prosumidor - Gran Demanda' : 'Prosumidor - Pequeña Demanda';
    case UserType.NO_PROSUMIDOR: return 'No Prosumidor';
    case UserType.EPE_NO_PROSUMIDOR_RESIDENCIAL: return 'No Prosumidor - Residencial';
    case UserType.EPE_NO_PROSUMIDOR_COMERCIAL: return 'No Prosumidor - Comercial';
    case UserType.EPE_NO_PROSUMIDOR_INDUSTRIAL: return 'No Prosumidor - Industrial';
    case UserType.EPE_NO_PROSUMIDOR_GD: return 'No Prosumidor - Gran Demanda';
    default: return 'Desconocido';
  }
};
