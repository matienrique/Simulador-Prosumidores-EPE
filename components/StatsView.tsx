import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Check, X, Lock, Users, MessageSquare } from 'lucide-react';
import { UserType } from '../types';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface FeedbackEntry {
  choice: 'yes' | 'no' | null;
  observation: string;
  userType: UserType;
  userTypeLabel?: string;
  timestamp: any;
}

interface Props {
  onBack: () => void;
}

const StatsView: React.FC<Props> = ({ onBack }) => {
  const [data, setData] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const path = 'feedback';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as FeedbackEntry[];
      setData(feedbackData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      setError('No se pudieron cargar las estadísticas.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resolvedCount = data.filter(d => d.choice === 'yes').length;
  const notResolvedCount = data.filter(d => d.choice === 'no').length;

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800 text-white rounded-xl shadow-lg">
            <Lock size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Panel de Estadísticas</h2>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Acceso Administrativo</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-bold shadow-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all font-bold shadow-md"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-center gap-3">
          <X className="text-red-500" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Número</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Tipo de Usuario</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Resolvió</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    No hay datos de feedback registrados aún.
                  </td>
                </tr>
              ) : (
                data.map((entry, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-400">#{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleDateString('es-AR') : 'N/A'}
                      <span className="block text-[10px] text-gray-400">{entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleTimeString('es-AR') : ''}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                        {entry.userTypeLabel || entry.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {entry.choice === 'yes' ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full shadow-sm">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      ) : entry.choice === 'no' ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full shadow-sm">
                          <X size={16} strokeWidth={3} />
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 max-w-xs truncate hover:whitespace-normal transition-all cursor-help" title={entry.observation || 'Sin comentarios'}>
                        {entry.observation || <span className="text-gray-300 italic">Sin comentarios</span>}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Consultas</p>
            <p className="text-3xl font-black text-gray-800">{data.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-xl">
            <Check size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Consultas Resueltas</p>
            <p className="text-3xl font-black text-green-600">{resolvedCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-xl">
            <X size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Consultas No Resueltas</p>
            <p className="text-3xl font-black text-red-600">{notResolvedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-8 text-white shadow-xl flex items-center justify-between overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Resumen de Satisfacción</h3>
          <p className="text-slate-400 text-sm max-w-md">
            El {data.length > 0 ? Math.round((resolvedCount / data.length) * 100) : 0}% de los usuarios que brindaron feedback resolvieron su consulta exitosamente.
          </p>
        </div>
        <MessageSquare className="w-32 h-32 absolute -right-8 -bottom-8 text-white/5" />
      </div>
    </div>
  );
};

export default StatsView;
