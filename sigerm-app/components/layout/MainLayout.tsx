import Sidebar from "./Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <Sidebar />

      <main className="flex-1">

        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">

          <div>
            <h2 className="text-2xl font-semibold">
              SIGERM
            </h2>
          </div>

          <div className="text-gray-600">
            Administrador
          </div>

        </header>

        <section className="p-8">
          {children}
        </section>

      </main>

    </div>
  );
}