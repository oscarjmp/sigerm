export default function Home() {
  const tarjetas = [
    {
      titulo: "Recursos",
      icono: "📦",
      cantidad: 0,
      color: "text-blue-700",
    },
    {
      titulo: "Préstamos",
      icono: "🤝",
      cantidad: 0,
      color: "text-orange-600",
    },
    {
      titulo: "Alimentos",
      icono: "🍞",
      cantidad: 0,
      color: "text-green-700",
    },
    {
      titulo: "Mantenimiento",
      icono: "🔧",
      cantidad: 0,
      color: "text-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100">

      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-4xl font-bold">SIGERM</h1>

          <p className="text-blue-100 mt-2">
            Sistema Integral de Gestión para Encuentros de Renovación Matrimonial
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">

        <h2 className="text-3xl font-bold mb-8">
          Dashboard
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          {tarjetas.map((t) => (

            <div
              key={t.titulo}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
            >

              <div className="text-6xl">
                {t.icono}
              </div>

              <h3 className="mt-4 text-2xl font-bold">
                {t.titulo}
              </h3>

              <p className={`text-5xl font-bold mt-4 ${t.color}`}>
                {t.cantidad}
              </p>

            </div>

          ))}

        </div>

        <div className="mt-10 bg-white rounded-xl shadow-lg p-8">

          <h2 className="text-3xl font-bold mb-6">
            Bienvenido a SIGERM
          </h2>

          <div className="space-y-3 text-lg">

            <p>✔ Inventario de recursos.</p>

            <p>✔ Inventario de alimentos.</p>

            <p>✔ Préstamos y devoluciones.</p>

            <p>✔ Programa de mantenimiento.</p>

            <p>✔ Administración de encuentros.</p>

            <p>✔ Reportes PDF y Excel.</p>

            <p>✔ Usuarios y permisos.</p>

          </div>

        </div>

      </main>

    </div>
  );
}