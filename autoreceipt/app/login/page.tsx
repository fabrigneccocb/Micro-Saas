"use client"; // Esto es obligatorio para formularios interactivos

import { useState } from 'react';
import { supabase } from '../lib/supabase'; // Importamos tu conexión
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Función para Iniciar Sesión
  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
    } else {
      // Si todo sale bien, vamos al panel principal (Dashboard)
      router.push('/dashboard');
    }
  };

  // Función para Crear Cuenta Nueva
  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("Error al registrarse: " + error.message);
      setLoading(false);
    } else {
      alert("¡Cuenta creada! Revisa tu correo para confirmar (o inicia sesión si deshabilitaste la confirmación).");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">AutoReceipt</h1>
          <p className="text-gray-500 mt-2">Tu asistente contable con IA</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-1/2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
            
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-1/2 bg-white text-blue-600 border border-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50"
            >
              Registrarme
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            ← Volver al inicio
          </Link>
        </div>

      </div>
    </div>
  );
}