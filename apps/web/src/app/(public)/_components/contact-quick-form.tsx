"use client";

import { useState } from "react";

import { IvIcon } from "@/components/iv";

type Need = "venta" | "alquiler" | "soporte" | "consumibles";

const NEED_LABEL: Record<Need, string> = {
  venta: "Comprar un equipo",
  alquiler: "Alquilar un equipo",
  soporte: "Soporte técnico",
  consumibles: "Consumibles / repuestos",
};

type Props = {
  whatsapp: string | null;
  fallbackEmail: string | null;
};

function buildMessage(input: {
  empresa: string;
  contacto: string;
  need: Need;
  detalle: string;
}) {
  const lines = [
    "Hola, vengo desde la web de Inventori.",
    "",
    `Empresa: ${input.empresa}`,
    `Contacto: ${input.contacto}`,
    `Necesito: ${NEED_LABEL[input.need]}`,
  ];
  if (input.detalle.trim()) {
    lines.push("", "Detalle:", input.detalle.trim());
  }
  return lines.join("\n");
}

export function ContactQuickForm({ whatsapp, fallbackEmail }: Props) {
  const [empresa, setEmpresa] = useState("");
  const [contacto, setContacto] = useState("");
  const [need, setNeed] = useState<Need>("venta");
  const [detalle, setDetalle] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = buildMessage({ empresa, contacto, need, detalle });
    const encoded = encodeURIComponent(message);

    if (whatsapp) {
      const number = whatsapp.replace(/[^\d]/g, "");
      window.open(
        `https://wa.me/${number}?text=${encoded}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    if (fallbackEmail) {
      const subject = encodeURIComponent(
        `Solicitud desde web — ${NEED_LABEL[need]}`,
      );
      window.location.href = `mailto:${fallbackEmail}?subject=${subject}&body=${encoded}`;
      return;
    }

    window.location.href = `/contacto?necesidad=${need}&empresa=${encodeURIComponent(empresa)}&contacto=${encodeURIComponent(contacto)}`;
  }

  return (
    <form className="iv-cta-form" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cta-empresa">Empresa</label>
        <input
          id="cta-empresa"
          name="empresa"
          type="text"
          required
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Tu empresa S.A.C."
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cta-contacto">Email o WhatsApp</label>
        <input
          id="cta-contacto"
          name="contacto"
          type="text"
          required
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          placeholder="tu@empresa.com / +51 9XX XXX XXX"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cta-necesidad">¿Qué necesitas?</label>
        <select
          id="cta-necesidad"
          name="necesidad"
          value={need}
          onChange={(e) => setNeed(e.target.value as Need)}
        >
          {(Object.keys(NEED_LABEL) as Need[]).map((key) => (
            <option key={key} value={key}>
              {NEED_LABEL[key]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cta-detalle">Cuéntanos más (opcional)</label>
        <textarea
          id="cta-detalle"
          name="detalle"
          rows={3}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Modelo, volumen mensual, ubicación, plazo..."
        />
      </div>
      <button
        type="submit"
        className="iv-cta-primary"
        style={{
          justifyContent: "center",
          marginTop: 6,
          width: "100%",
        }}
      >
        {whatsapp ? "Enviar por WhatsApp" : "Enviar solicitud"}
        <IvIcon name="arrow" size={16} stroke={2.2} />
      </button>
      <p className="iv-form-note">
        {whatsapp
          ? "Abre WhatsApp con el mensaje listo para enviar."
          : fallbackEmail
            ? "Te enviaremos al cliente de correo con el mensaje preparado."
            : "Te redirigimos al formulario de contacto."}
      </p>
    </form>
  );
}
