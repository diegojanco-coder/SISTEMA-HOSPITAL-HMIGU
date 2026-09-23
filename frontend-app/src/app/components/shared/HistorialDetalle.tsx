import type { HistorialItem } from '../../../lib/types';

export default function HistorialDetalle({ registro }: { registro: HistorialItem }) {
  const externo = registro.origen === 'externo';
  return <div className="mt-2 space-y-1 break-words text-sm text-muted-foreground">
    <p className="font-medium text-foreground">{externo ? 'Antecedente externo documentado' : 'Aplicación local'}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <span>{registro.fecha_aplicacion}</span>
      {!externo && <span>Lote: {registro.lote || 'Sin dato'}</span>}
      {!externo && <span>Aplicada por: {registro.aplicado_por || 'Sin dato'}</span>}
    </div>
    {registro.establecimiento && <p>Establecimiento: {registro.establecimiento}</p>}
    {externo && <>
      <p>Documento de referencia: {registro.documento_referencia || 'Sin dato'}</p>
      <p>Registrado por: {registro.registrado_por || 'Sin dato'}</p>
    </>}
    {registro.observaciones && <p>{registro.observaciones}</p>}
  </div>;
}
