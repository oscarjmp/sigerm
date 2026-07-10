'use client';

type Props = {
  busqueda: string;
  setBusqueda: (valor: string) => void;
};

export default function Buscador({
  busqueda,
  setBusqueda,
}: Props) {
  return (
    <div className="mb-6">
      <input
        type="text"
        placeholder="🔍 Buscar por código, nombre o categoría..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}