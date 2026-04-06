import React, { useState, useEffect } from 'react';
import { getFeedbackList, getGlobalStats, clearAllData, FeedbackData, GlobalStats } from '../services/statsService';
import { ArrowLeft, Trash2, Lock, Unlock, Users, CheckCircle, XCircle, Eye, AlertTriangle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const StatsDashboard: React.FC<Props> = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Energia25#') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feedbackData, statsData] = await Promise.all([
        getFeedbackList(),
        getGlobalStats()
      ]);
      setFeedback(feedbackData);
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      setShowDeleteConfirm(false);
      fetchData();
    } catch (err) {
      console.error("Error clearing data:", err);
      alert("Error al borrar los datos");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-violet-100 rounded-full mb-4">
              <Lock className="w-10 h-10 text-violet-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800">Acceso Restringido</h2>
            <p className="text-gray-500 text-sm text-center mt-2">Ingrese la contraseña de administrador para ver las estadísticas</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1"><AlertTriangle size={12}/> {error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-violet-600 text-white font-black rounded-xl shadow-lg hover:bg-violet-700 transition-all transform active:scale-95"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2 text-gray-500 font-bold hover:text-gray-700 transition-all text-sm"
            >
              Volver al simulador
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Unlock className="text-violet-600" /> Panel de Estadísticas
            </h1>
            <p className="text-gray-500 font-medium">Monitoreo de consultas y feedback de usuarios</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            >
              <ArrowLeft size={18} /> Volver
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold hover:bg-red-100 transition-all shadow-sm"
            >
              <Trash2 size={18} /> Borrar datos
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Eye size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visitas Totales</p>
                    <p className="text-2xl font-black text-gray-800">{stats?.visitCount || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resolvieron</p>
                    <p className="text-2xl font-black text-gray-800">{stats?.resolvedCount || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl text-red-600"><XCircle size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">No Resolvieron</p>
                    <p className="text-2xl font-black text-gray-800">{stats?.notResolvedCount || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-violet-50 rounded-xl text-violet-600"><Users size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Consultas Totales</p>
                    <p className="text-2xl font-black text-gray-800">{stats?.lastConsultationNumber || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-black text-gray-800 uppercase tracking-wider text-sm">Tabla de Estadísticas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-widest">
                      <th className="px-6 py-4 border-b">Número</th>
                      <th className="px-6 py-4 border-b">Fecha</th>
                      <th className="px-6 py-4 border-b">Tipo de Usuario</th>
                      <th className="px-6 py-4 border-b">Resolvió</th>
                      <th className="px-6 py-4 border-b">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {feedback.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">No hay registros aún</td>
                      </tr>
                    ) : (
                      feedback.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 border-b font-bold text-gray-600">{item.number}</td>
                          <td className="px-6 py-4 border-b text-gray-500">{item.date}</td>
                          <td className="px-6 py-4 border-b font-medium text-gray-700">{item.userType}</td>
                          <td className="px-6 py-4 border-b">
                            {item.resolved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                <CheckCircle size={12} /> Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                <XCircle size={12} /> No
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 border-b text-gray-600 max-w-xs truncate" title={item.observations}>
                            {item.observations || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-red-100 rounded-full mb-4 text-red-600">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">¿Seguro que desea borrar los datos?</h3>
              <p className="text-gray-500 text-sm mb-8">Esta acción eliminará todos los registros de feedback y reiniciará los contadores. Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg"
                >
                  Sí, borrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
