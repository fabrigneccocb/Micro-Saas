"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Configuración de límites por plan
const PLAN_LIMITS: any = {
  free: 5,
  premium: 50,
  ultra: 999999
};

const PLAN_NAMES: any = {
  free: 'Gratis',
  premium: 'Premium',
  ultra: 'Ultra'
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  
  // Estados para control de límites
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [planLimit, setPlanLimit] = useState(5);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FUNCIÓN PARA LEER DATOS ---
  const fetchReceiptsAndUsage = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReceipts(data || []);

      // Calcular Uso Mensual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const usageCount = data?.filter(r => r.created_at >= startOfMonth).length || 0;
      setMonthlyUsage(usageCount);
    } catch (error) {
      console.error('Error al actualizar lista:', error);
    }
  }, []);

  // --- CARGA INICIAL Y REALTIME ---
  useEffect(() => {
    let channel: any;

    const initData = async () => {
      // 1. Sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setUser(session.user);

      // 2. Perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setProfile(profileData);
      const userPlan = profileData?.subscription_plan || 'free';
      setPlanLimit(PLAN_LIMITS[userPlan]);

      // 3. Datos iniciales
      await fetchReceiptsAndUsage(session.user.id);
      setLoading(false);

      // 4. Configurar Realtime (Escuchar cambios automáticamente)
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Escuchar Insert, Update y Delete
            schema: 'public',
            table: 'receipts',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('⚡ Cambio detectado en DB:', payload);
            fetchReceiptsAndUsage(session.user.id);
          }
        )
        .subscribe();
    };

    initData();

    // Limpieza al salir
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, fetchReceiptsAndUsage]);


  // --- FUNCIÓN ELIMINAR ---
  const handleDelete = async (receiptId: string, filePath: string) => {
    if(!confirm("¿Estás seguro de eliminar esta factura?")) return;

    try {
      // 1. Borrar de la base de datos
      const { error: dbError } = await supabase.from('receipts').delete().eq('id', receiptId);
      if (dbError) throw dbError;

      // 2. Borrar archivo del Storage
      const { error: storageError } = await supabase.storage.from('receipts').remove([filePath]);
      if (storageError) console.error("Advertencia: No se pudo borrar el archivo del storage", storageError);

      // 3. Actualizar la vista manualmente por si acaso el realtime falla
      if(user) await fetchReceiptsAndUsage(user.id);

    } catch (error: any) {
      alert("Error al eliminar: " + error.message + "\n\n(Revisa si corriste el código SQL de permisos)");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // --- FUNCIÓN SUBIR ARCHIVO ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (monthlyUsage >= planLimit) { router.push('/dashboard/pricing'); return; }

      const file = event.target.files?.[0];
      if (!file || !user) return;
      
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 1. Subir Imagen
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);

      // 2. Crear registro en BD (Processing)
      const { data: newReceipt, error: dbError } = await supabase
        .from('receipts')
        .insert([{
            user_id: user.id,
            file_url: publicUrl,
            file_path: filePath,
            status: 'processing', 
            merchant_name: 'Procesando...', 
            total_amount: 0 
        }])
        .select().single();

      if (dbError) throw dbError;

      // Actualizar vista inmediatamente
      await fetchReceiptsAndUsage(user.id);

      // 3. Llamar a la IA
      // Usamos await para asegurar que la petición sale bien, pero confiamos en el Realtime para la respuesta final
      await fetch('/api/process-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: publicUrl, receiptId: newReceipt.id, userId: user.id }),
      });
      
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const usagePercentage = Math.min((monthlyUsage / planLimit) * 100, 100);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
           <h1 className="text-xl font-bold text-blue-600">AutoReceipt</h1>
           <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase rounded-full">
             {PLAN_NAMES[profile?.subscription_plan || 'free']}
           </span>
           <Link href="/dashboard/pricing" className="text-sm font-medium text-gray-600 hover:text-blue-600">
             💎 Ver Precios
           </Link>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-500 hidden md:inline">{user.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 border border-red-200 px-3 py-1 rounded hover:bg-red-50">Salir</button>
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
        
        {/* LÍMITES */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-gray-700 font-semibold">Consumo Mensual</h2>
            <span className="text-sm font-medium text-gray-600">
              {monthlyUsage} / {planLimit === 999999 ? '∞' : planLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full ${usagePercentage >= 100 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${usagePercentage}%` }}></div>
          </div>
        </section>

        {/* SUBIDA */}
        <section>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
            <div 
              onClick={() => { if (monthlyUsage < planLimit) fileInputRef.current?.click(); }}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition flex flex-col items-center justify-center h-48
                ${uploading ? 'bg-gray-50 border-gray-400 cursor-wait' : 
                  monthlyUsage >= planLimit ? 'bg-gray-50 border-gray-300' : 
                  'border-blue-300 hover:bg-blue-50 hover:border-blue-500 cursor-pointer'}
              `}
            >
              {uploading ? (
                <div className="flex flex-col items-center animate-pulse">
                  <span className="text-4xl mb-3">⚙️</span>
                  <div className="text-blue-600 font-medium">Procesando con IA...</div>
                </div>
              ) : monthlyUsage >= planLimit ? (
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-3">🔒</span>
                  <p className="text-gray-500 font-medium">Límite Alcanzado</p>
                  <Link href="/dashboard/pricing" className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Mejorar Plan</Link>
                </div>
              ) : (
                <>
                  <span className="text-4xl mb-3">📄</span>
                  <p className="text-gray-700 font-medium">Click para subir factura</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* TABLA */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Historial de Facturas</h2>
            {/* BOTÓN DE ACTUALIZAR RESTAURADO */}
            <button 
              onClick={() => user && fetchReceiptsAndUsage(user.id)}
              className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 shadow-sm"
            >
              🔄 Actualizar Lista
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {receipts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No hay facturas aún.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Comercio</th>
                      <th className="px-6 py-3">Monto</th> 
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500">{new Date(receipt.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium">{receipt.merchant_name}</td>
                        <td className="px-6 py-4 font-bold text-gray-800">
                          {receipt.total_amount > 0 ? `$${receipt.total_amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex w-fit items-center gap-1
                            ${receipt.status === 'completed' ? 'bg-green-100 text-green-700' : 
                              receipt.status === 'processing' ? 'bg-blue-100 text-blue-700' : 
                              'bg-yellow-100 text-yellow-700'}`}>
                            {receipt.status === 'processing' && <span className="animate-spin h-2 w-2 bg-blue-700 rounded-full"></span>}
                            {receipt.status === 'processing' ? 'Analizando...' : 
                             receipt.status === 'completed' ? 'Completado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(receipt.id, receipt.file_path)} className="text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}