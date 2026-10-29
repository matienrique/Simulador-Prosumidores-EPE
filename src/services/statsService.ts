import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, setDoc, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { UserType, CalculationResult } from '../../types';

export interface FeedbackData {
  number: number;
  date: string;
  userType: string;
  resolved: boolean;
  observations: string;
}

export interface SimulationData {
  number: number;
  date: string;
  userType: string;
  ahorroPesos: number;
  ahorroPorcentaje: number;
}

export interface GlobalStats {
  visitCount: number;
  completaronCount: number;
  resolvedCount: number;
  notResolvedCount: number;
  lastConsultationNumber: number;
  lastSimulationNumber?: number;
}

const STATS_DOC_ID = 'counters';

export const incrementVisitCount = async () => {
  try {
    const statsRef = doc(db, 'global_stats', STATS_DOC_ID);
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      const data = statsSnap.data() as GlobalStats;
      const newCount = Math.max(data.visitCount + 1, 104);
      await updateDoc(statsRef, { visitCount: newCount });
    } else {
      await setDoc(statsRef, {
        visitCount: 104,
        completaronCount: 250,
        resolvedCount: 0,
        notResolvedCount: 0,
        lastConsultationNumber: 0,
        lastSimulationNumber: 0
      });
    }
  } catch (error) {
    console.warn("Failed to increment visit count, operating offline or error: ", error);
  }
};

export const incrementCompletaronCount = async () => {
  try {
    const statsRef = doc(db, 'global_stats', STATS_DOC_ID);
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      const data = statsSnap.data() as GlobalStats;
      const currentVal = data.completaronCount || 250;
      await updateDoc(statsRef, { completaronCount: currentVal + 1 });
    } else {
      await setDoc(statsRef, {
        visitCount: 104,
        completaronCount: 251,
        resolvedCount: 0,
        notResolvedCount: 0,
        lastConsultationNumber: 0,
        lastSimulationNumber: 0
      });
    }
  } catch (error) {
    console.warn("Failed to increment completaron count, operating offline or error: ", error);
  }
};

export const saveFeedback = async (resolved: boolean, observations: string, userType: UserType, isGD?: boolean) => {
  try {
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
        lastConsultationNumber: 1,
        lastSimulationNumber: 0
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
  } catch (error) {
    console.error("Failed to save feedback: ", error);
  }
};

export const getFeedbackList = async (): Promise<FeedbackData[]> => {
  try {
    const q = query(collection(db, 'tabla_estadisticas'), orderBy('number', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as FeedbackData);
  } catch (error) {
    console.error("Error fetching feedback list:", error);
    return [];
  }
};

export const computeSimulationSavings = (results: CalculationResult, userType: UserType, isGD?: boolean) => {
  const isProsumidor = userType === UserType.PROSUMIDOR;
  const isGDResult = results.type === 'GD';
  const isGDUser = (userType === UserType.EPE_NO_PROSUMIDOR_GD) || !!isGD || isGDResult;
  const isPequeñaDemandaNoProsumidor = !isProsumidor && !isGDUser && (
    userType === UserType.EPE_NO_PROSUMIDOR_RESIDENCIAL ||
    userType === UserType.EPE_NO_PROSUMIDOR_COMERCIAL ||
    userType === UserType.EPE_NO_PROSUMIDOR_INDUSTRIAL ||
    userType === UserType.EPE_NO_PROSUMIDOR_ASOCIACIONES ||
    results.type === 'NO_PROSUMIDOR'
  );

  const isNegativeBill = results.billWithProsumers < 0;
  const isPequeñaDemandaNegativeBill = isPequeñaDemandaNoProsumidor && isNegativeBill;
  const displayBillWithProsumers = isPequeñaDemandaNegativeBill ? 0 : results.billWithProsumers;
  let displayTotalSavings = isPequeñaDemandaNegativeBill ? results.billWithoutProsumers : results.totalSavings;
  let displayTotalSavingsPercent = isPequeñaDemandaNegativeBill ? 100 : results.totalSavingsPercent;

  const isNoProsumidorGD = !isProsumidor && (userType === UserType.EPE_NO_PROSUMIDOR_GD || isGDResult);
  if (isNoProsumidorGD) {
    displayTotalSavings = results.billWithoutProsumers - displayBillWithProsumers;
    displayTotalSavingsPercent = results.billWithoutProsumers !== 0 ? (displayTotalSavings / results.billWithoutProsumers) * 100 : 0;
  }

  return {
    ahorroPesos: Math.round(displayTotalSavings * 100) / 100,
    ahorroPorcentaje: Math.round(displayTotalSavingsPercent * 100) / 100
  };
};

export const saveSimulation = async (userType: UserType, isGD: boolean, results: CalculationResult) => {
  try {
    const { ahorroPesos, ahorroPorcentaje } = computeSimulationSavings(results, userType, isGD);

    const statsRef = doc(db, 'global_stats', STATS_DOC_ID);
    const statsSnap = await getDoc(statsRef);
    
    let nextNumber = 1;
    if (statsSnap.exists()) {
      const data = statsSnap.data() as GlobalStats;
      nextNumber = (data.lastSimulationNumber || 0) + 1;
      await updateDoc(statsRef, {
        lastSimulationNumber: nextNumber
      });
    } else {
      await setDoc(statsRef, {
        visitCount: 104,
        completaronCount: 250,
        resolvedCount: 0,
        notResolvedCount: 0,
        lastConsultationNumber: 0,
        lastSimulationNumber: 1
      });
    }

    const simulation: SimulationData = {
      number: nextNumber,
      date: new Date().toLocaleDateString(),
      userType: getUserTypeLabel(userType, isGD),
      ahorroPesos,
      ahorroPorcentaje
    };

    await addDoc(collection(db, 'tabla_ahorros'), simulation);
  } catch (error) {
    console.warn("Failed to save simulation, operating offline or error: ", error);
  }
};

export const getSimulationList = async (): Promise<SimulationData[]> => {
  try {
    const q = query(collection(db, 'tabla_ahorros'), orderBy('number', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as SimulationData);
  } catch (error) {
    console.error("Error fetching simulation list:", error);
    return [];
  }
};

export const getGlobalStats = async (): Promise<GlobalStats | null> => {
  try {
    const statsSnap = await getDoc(doc(db, 'global_stats', STATS_DOC_ID));
    return statsSnap.exists() ? (statsSnap.data() as GlobalStats) : null;
  } catch (error) {
    console.error("Error fetching global stats:", error);
    return null;
  }
};

export const getAppConstants = async () => {
  try {
    const configSnap = await getDoc(doc(db, 'global_stats', 'config_constants'));
    return configSnap.exists() ? configSnap.data() : null;
  } catch (error) {
    console.warn("Failed to fetch app constants, operating offline or error: ", error);
    return null;
  }
};

export const saveAppConstants = async (calculatorConstants: any, globalConstants: any) => {
  try {
    const configRef = doc(db, 'global_stats', 'config_constants');
    await setDoc(configRef, {
      calculatorConstants,
      globalConstants,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to save app constants: ", error);
    throw error;
  }
};

export const clearAllData = async () => {
  try {
    const batch = writeBatch(db);
    
    // Clear feedback
    const feedbackSnap = await getDocs(collection(db, 'tabla_estadisticas'));
    feedbackSnap.docs.forEach((d) => batch.delete(d.ref));

    // Clear savings simulations
    const simSnap = await getDocs(collection(db, 'tabla_ahorros'));
    simSnap.docs.forEach((d) => batch.delete(d.ref));
    
    // Reset counters (keep visit count)
    const statsRef = doc(db, 'global_stats', STATS_DOC_ID);
    const statsSnap = await getDoc(statsRef);
    const currentVisitCount = statsSnap.exists() ? statsSnap.data().visitCount : 0;
    
    batch.set(statsRef, {
      visitCount: currentVisitCount,
      completaronCount: 250,
      resolvedCount: 0,
      notResolvedCount: 0,
      lastConsultationNumber: 0,
      lastSimulationNumber: 0
    });

    await batch.commit();
  } catch (error) {
    console.error("Error clearing data:", error);
  }
};

export const getUserTypeLabel = (type: UserType, isGD?: boolean): string => {
  switch (type) {
    case UserType.PROSUMIDOR: 
      return isGD ? 'Prosumidor - Gran Demanda' : 'Prosumidor - Pequeña Demanda';
    case UserType.NO_PROSUMIDOR: return 'No Prosumidor';
    case UserType.EPE_NO_PROSUMIDOR_RESIDENCIAL: return 'No Prosumidor - Residencial';
    case UserType.EPE_NO_PROSUMIDOR_COMERCIAL: return 'No Prosumidor - Comercial';
    case UserType.EPE_NO_PROSUMIDOR_INDUSTRIAL: return 'No Prosumidor - Industrial';
    case UserType.EPE_NO_PROSUMIDOR_GD: return 'No Prosumidor - Gran Demanda';
    case UserType.EPE_NO_PROSUMIDOR_ASOCIACIONES: return 'No Prosumidor - Asociaciones';
    default: return 'Desconocido';
  }
};
