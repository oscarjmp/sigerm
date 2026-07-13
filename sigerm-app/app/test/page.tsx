'use client';

import { supabase } from "@/lib/supabase/client";

export default function TestPage() {

  async function probar() {

    const { data, error } = await supabase.rpc(
      "generar_codigo_articulo",
      {
        categoria: "Religiosos",
      }
    );

    console.log(data);
    console.log(error);

    alert(JSON.stringify({ data, error }));

  }

  return (

    <div className="p-10">

      <button
        onClick={probar}
        className="bg-blue-600 text-white p-4 rounded"
      >
        Probar RPC
      </button>

    </div>

  );

}