-- Doc 04 §2.4 / §5.2 — persistir el plazo máximo para enviar el RA.
ALTER TABLE "comunicaciones_baja" ADD COLUMN "deadline" TIMESTAMP(3);
