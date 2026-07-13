import { LucideIcon } from "lucide-react";

type Props = {
  titulo: string;
  valor: number | string;
  icono: LucideIcon;
  color?: string;
  subtitulo?: string;
};

export default function StatCard({
  titulo,
  valor,
  icono: Icon,
  color = "text-blue-600",
  subtitulo,
}: Props) {
  return (

    <div
      className="
        bg-white
        rounded-2xl
        shadow-md
        hover:shadow-xl
        transition-all
        duration-300
        p-6
        border
        border-slate-200
      "
    >

      <div className="flex justify-between items-start">

        <div>

          <p className="text-gray-500 text-sm">
            {titulo}
          </p>

          <h2 className={`text-4xl font-bold mt-3 ${color}`}>
            {valor}
          </h2>

          {subtitulo && (

            <p className="text-xs text-gray-400 mt-2">
              {subtitulo}
            </p>

          )}

        </div>

        <div
          className="
            w-14
            h-14
            rounded-2xl
            bg-slate-100
            flex
            items-center
            justify-center
          "
        >

          <Icon
            size={30}
            className={color}
          />

        </div>

      </div>

    </div>

  );
}