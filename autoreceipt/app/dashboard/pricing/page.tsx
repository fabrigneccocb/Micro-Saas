"use client";

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase'; // Asegúrate de que la ruta sea correcta
import Link from 'next/link';

export default function PricingPage() {
  // Estado para el switch de "Mensual" vs "Anual"
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // PRECIOS (Puedes editarlos aquí)
  const PRICING = {
    premium: {
      monthly: 9.99,
      annual: 99.90, // Ahorro de 2 meses aprox
    },
    ultra: {
      monthly: 29.99,
      annual: 299.90,
    }
  };

  const handleSubscribe = (plan: string, price: number) => {
    alert(`Aquí conectaremos Stripe para cobrar ${plan} a $${price}`);
    // Aquí irá la lógica de redirección a Stripe más adelante
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Encabezado y Botón de "Volver" */}
      <div className="max-w-7xl mx-auto mb-10 flex justify-between items-center">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 flex items-center gap-2">
          ← Volver al Panel
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Mejora tu Plan</h1>
        <div className="w-20"></div> {/* Espacio vacío para centrar */}
      </div>

      {/* Switch Mensual / Anual */}
      <div className="flex justify-center mb-12">
        <div className="bg-white p-1 rounded-full border border-gray-200 flex shadow-sm">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingCycle === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingCycle === 'annual' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Anual <span className="text-xs ml-1 text-green-500 font-bold">(-20%)</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Precios */}
      <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-3 items-start">
        
        {/* PLAN GRATIS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900">Plan Gratis</h3>
          <p className="text-gray-500 mt-2 text-sm">Para probar el sistema.</p>
          <div className="my-6">
            <span className="text-4xl font-bold text-gray-900">$0</span>
            <span className="text-gray-500">/siempre</span>
          </div>
          <ul className="space-y-4 mb-8 text-sm text-gray-600">
            <li className="flex gap-3">✅ 5 Facturas al mes</li>
            <li className="flex gap-3">✅ Extracción con IA básica</li>
            <li className="flex gap-3">✅ Historial de 30 días</li>
            <li className="flex gap-3 text-gray-400">❌ Soporte Prioritario</li>
          </ul>
          <button className="w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium bg-gray-50 cursor-not-allowed">
            Plan Actual
          </button>
        </div>

        {/* PLAN PREMIUM (El que queremos vender) */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-600 p-8 relative transform scale-105 z-10">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
            MÁS POPULAR
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Premium</h3>
          <p className="text-gray-500 mt-2 text-sm">Para freelancers y pymes.</p>
          <div className="my-6">
            <span className="text-4xl font-bold text-gray-900">
              ${billingCycle === 'monthly' ? PRICING.premium.monthly : PRICING.premium.annual}
            </span>
            <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mes' : 'año'}</span>
          </div>
          <ul className="space-y-4 mb-8 text-sm text-gray-600">
            <li className="flex gap-3">✅ <strong>50 Facturas</strong> al mes</li>
            <li className="flex gap-3">✅ IA de alta velocidad</li>
            <li className="flex gap-3">✅ Exportación a Excel</li>
            <li className="flex gap-3">✅ Historial Ilimitado</li>
          </ul>
          <button 
            onClick={() => handleSubscribe('premium', billingCycle === 'monthly' ? PRICING.premium.monthly : PRICING.premium.annual)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-md"
          >
            Elegir Premium
          </button>
        </div>

        {/* PLAN ULTRA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900">Ultra</h3>
          <p className="text-gray-500 mt-2 text-sm">Para contadores y empresas.</p>
          <div className="my-6">
            <span className="text-4xl font-bold text-gray-900">
              ${billingCycle === 'monthly' ? PRICING.ultra.monthly : PRICING.ultra.annual}
            </span>
            <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mes' : 'año'}</span>
          </div>
          <ul className="space-y-4 mb-8 text-sm text-gray-600">
            <li className="flex gap-3">✅ <strong>Facturas Ilimitadas</strong></li>
            <li className="flex gap-3">✅ IA Prioritaria (Más rápida)</li>
            <li className="flex gap-3">✅ Soporte 24/7</li>
            <li className="flex gap-3">✅ Múltiples usuarios (Pronto)</li>
          </ul>
          <button 
             onClick={() => handleSubscribe('ultra', billingCycle === 'monthly' ? PRICING.ultra.monthly : PRICING.ultra.annual)}
             className="w-full py-3 px-4 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition"
          >
            Elegir Ultra
          </button>
        </div>

      </div>
    </div>
  );
}