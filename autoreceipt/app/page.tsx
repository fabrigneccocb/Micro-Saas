import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* NAVBAR */}
      <header className="border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">AutoReceipt</div>
          <div className="flex gap-4">
            {/* Botones dirigen al Login */}
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2">
              Entrar
            </Link>
            <Link href="/login" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
              Empezar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
          Adiós a facturar <br/>
          <span className="text-blue-600">a mano.</span>
        </h1>
        
        <p className="text-xl text-gray-500 max-w-2xl mb-10">
          Sube tus recibos y deja que nuestra IA extraiga los datos automáticamente. 
          Contabilidad automatizada para freelancers y empresas.
        </p>

        <div className="flex gap-4 flex-col sm:flex-row">
          <Link href="/login" className="bg-blue-600 text-white text-lg px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg hover:shadow-xl">
            Automatizar mis facturas &rarr;
          </Link>
          <Link href="/login" className="bg-white text-gray-700 border border-gray-300 text-lg px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition">
            Ver demostración
          </Link>
        </div>

        {/* FEATURES */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Instantáneo</h3>
            <p className="text-gray-600">Sube una foto y obtén los datos en segundos.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">Inteligencia Artificial</h3>
            <p className="text-gray-600">Extrae fecha, monto, impuestos y comercio sin errores.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="text-4xl mb-4">☁️</div>
            <h3 className="text-xl font-bold mb-2">En la nube</h3>
            <p className="text-gray-600">Accede a tus datos desde cualquier lugar y exporta a Excel.</p>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-50 py-10 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} AutoReceipt. Todos los derechos reservados.
      </footer>
    </div>
  );
}