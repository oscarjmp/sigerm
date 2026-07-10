'use client';

export default function BotonImprimir() {

  return (

    <button
      onClick={() => window.print()}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg print:hidden transition"
    >
      🖨 Imprimir
    </button>

  );

}