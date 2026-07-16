import { useState } from 'react';

const VACCINES = [
  { id: 'bcg', name: 'BCG', category: 'Bebé' },
  { id: 'hepb', name: 'Hepatitis B', category: 'Bebé' },
  { id: 'penta', name: 'Pentavalente', category: 'Bebé' },
  { id: 'rotavirus', name: 'Rotavirus', category: 'Bebé' },
  { id: 'neumococo', name: 'Neumococo', category: 'Bebé' },
  { id: 'triple', name: 'Triple viral', category: 'Niño' },
  { id: 'dpt', name: 'DPT', category: 'Niño' },
  { id: 'influenza', name: 'Influenza', category: 'Todos' },
  { id: 'tetanos', name: 'Tétanos', category: 'Adulto' },
  { id: 'covid', name: 'COVID-19', category: 'Todos' },
];

export function AddVaccine({ patientId, onNavigate }: {
  patientId: string | null;
  onNavigate: (screen: string) => void;
}) {
  const [formData, setFormData] = useState({
    patientName: patientId ? 'Sofía Rodríguez' : '',
    vaccine: '',
    dose: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    lot: '',
    appliedBy: 'Dra. María',
    notes: '',
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onNavigate('patients');
    }, 2000);
  };

  return (
    <div className="pb-24 relative">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-lg border-b border-border px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => onNavigate('patients')}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-foreground">Registrar Vacuna</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* Patient Selection */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Paciente
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.patientName}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
              placeholder="Buscar paciente..."
              className="w-full bg-input-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <SearchIcon className="absolute right-3 top-3.5 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Vaccine Selection */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Vacuna
          </label>
          <select
            value={formData.vaccine}
            onChange={(e) => setFormData({ ...formData, vaccine: e.target.value })}
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          >
            <option value="">Seleccionar vacuna</option>
            {VACCINES.map((vaccine) => (
              <option key={vaccine.id} value={vaccine.id}>
                {vaccine.name} ({vaccine.category})
              </option>
            ))}
          </select>
        </div>

        {/* Dose */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Dosis
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['1ra', '2da', '3ra', 'Única'].map((dose) => (
              <button
                key={dose}
                type="button"
                onClick={() => setFormData({ ...formData, dose })}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  formData.dose === dose
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {dose}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Fecha
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-input-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Hora
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full bg-input-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
        </div>

        {/* Lot Number */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Número de Lote
          </label>
          <input
            type="text"
            value={formData.lot}
            onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
            placeholder="Ej: LOT2026-04-123"
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        {/* Applied By */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Aplicado por
          </label>
          <input
            type="text"
            value={formData.appliedBy}
            onChange={(e) => setFormData({ ...formData, appliedBy: e.target.value })}
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Observaciones (Opcional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas adicionales, reacciones, etc."
            rows={3}
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-4 font-bold text-base shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <CheckIcon />
          Registrar Vacuna
        </button>

        {/* Info Card */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3">
          <InfoIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground mb-1">
              Importante
            </p>
            <p className="text-xs text-muted-foreground">
              Asegúrese de verificar la fecha de vencimiento de la vacuna y registrar correctamente el número de lote para trazabilidad.
            </p>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccess && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 mx-5 max-w-sm animate-scale-in">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-center text-foreground mb-2">
              ¡Vacuna Registrada!
            </h3>
            <p className="text-sm text-center text-muted-foreground">
              La vacuna se ha registrado correctamente en el sistema
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function SearchIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function InfoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
