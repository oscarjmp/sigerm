import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type PrestamoPDF = {
  folio: string;
  responsable: string;
  solicitante: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  observaciones: string;

  detalle_prestamo: {
    cantidad: number;
    articulos: {
      id?: string;
      codigo: string;
      nombre: string;
    } | null;
  }[];
};

export function generarPrestamoPDF(
  prestamo: PrestamoPDF
) {
  const doc = new jsPDF();

  // =========================
  // ENCABEZADO
  // =========================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);

  doc.text(
    "RENOVACIÓN MATRIMONIAL",
    105,
    20,
    { align: "center" }
  );

  doc.setFontSize(14);

  doc.text(
    "Sistema Integral de Gestión (SIGERM)",
    105,
    28,
    { align: "center" }
  );

  doc.setFontSize(16);

  doc.text(
    "VALE DE PRÉSTAMO",
    105,
    40,
    { align: "center" }
  );

  doc.line(15, 45, 195, 45);

  // =========================
  // DATOS
  // =========================

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  doc.text(`Folio: ${prestamo.folio}`, 15, 55);
  doc.text(`Responsable: ${prestamo.responsable}`, 15, 65);
  doc.text(`Solicitante: ${prestamo.solicitante}`, 15, 75);

  doc.text(
    `Fecha préstamo: ${prestamo.fecha_prestamo}`,
    120,
    65
  );

  doc.text(
    `Fecha devolución: ${prestamo.fecha_devolucion ?? "Pendiente"}`,
    120,
    75
  );

  doc.text(
    `Observaciones: ${prestamo.observaciones || "Ninguna"}`,
    15,
    85
  );

  // =========================
  // TABLA
  // =========================

  autoTable(doc, {
    startY: 95,

    head: [["Código", "Artículo", "Cantidad"]],

    body: prestamo.detalle_prestamo.map((item) => [
      item.articulos?.codigo ?? "-",
      item.articulos?.nombre ?? "Artículo eliminado",
      item.cantidad.toString(),
    ]),

    theme: "grid",

    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: "bold",
    },

    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
  });

  // =========================
  // FIRMAS
  // =========================

  const finalY =
    (doc as any).lastAutoTable.finalY + 25;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  doc.text("________________________", 25, finalY);
  doc.text("Entrega", 55, finalY + 8);

  doc.text("________________________", 120, finalY);
  doc.text("Recibe", 152, finalY + 8);

  // =========================
  // PIE
  // =========================

  doc.setFontSize(9);

  doc.text(
    "Documento generado por SIGERM",
    105,
    285,
    { align: "center" }
  );

  doc.save(`Prestamo-${prestamo.folio}.pdf`);
}