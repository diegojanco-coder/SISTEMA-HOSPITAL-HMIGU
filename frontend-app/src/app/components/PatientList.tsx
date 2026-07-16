import { useState } from 'react';

const PATIENTS = [
  { id: 'sofia', name: 'Sofía Rodríguez', age: '2 meses', category: 'Bebé', nextVaccine: 'BCG', status: 'overdue', avatar: '👶' },
  { id: 'carlos', name: 'Carlos Méndez', age: '4 años', category: 'Niño', nextVaccine: 'Triple viral', status: 'today', avatar: '🧒' },
  { id: 'ana', name: 'Ana López', age: '6 meses', category: 'Bebé', nextVaccine: 'Pentavalente', status: 'completed', avatar: '👶' },
  { id: 'diego', name: 'Diego Torres', age: '1 mes', category: 'Bebé', nextVaccine: 'Hepatitis B', status: 'completed', avatar: '👶' },
  { id: 'elena', name: 'Elena García', age: '65 años', category: 'Adulto Mayor', nextVaccine: 'Influenza', status: 'completed', avatar: '👵' },
  { id: 'miguel', name: 'Miguel Sánchez', age: '8 años', category: 'Niño', nextVaccine: 'DPT', status: 'upcoming', avatar: '🧒' },
  { id: 'laura', name: 'Laura Martínez', age: '35 años', category: 'Adulto', nextVaccine: 'Tétanos', status: 'upcoming', avatar: '👩' },
  { id: 'pedro', name: 'Pedro Ramírez', age: '3 meses', category: 'Bebé', nextVaccine: 'Rotavirus', status: 'upcoming', avatar: '👶' },
];

type Category = 'Todos' | 'Bebé' | 'Niño' | 'Adulto' | 'Adulto Mayor';

export function PatientList({ onNavigate }: { onNavigate: (screen: string, patientId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');

  const filteredPatients = PATIENTS.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || patient.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-24 px-5">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Pacientes
        </h1>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <svg className="w-5 h-5 text-muted-foreground absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {(['Todos', 'Bebé', 'Niño', 'Adulto', 'Adulto Mayor'] as Category[]).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatBadge label="Total" value={PATIENTS.length.toString()} color="bg-primary/10 text-primary" />
        <StatBadge label="Pendientes" value="2" color="bg-warning/10 text-warning" />
        <StatBadge label="Al día" value="6" color="bg-accent/10 text-accent" />
      </div>

      {/* Patient List */}
      <div className="space-y-2">
        {filteredPatients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            onClick={() => onNavigate('patient-profile', patient.id)}
          />
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">No se encontraron pacientes</p>
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`${color} rounded-lg p-2 text-center`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function PatientCard({ patient, onClick }: {
  patient: typeof PATIENTS[0];
  onClick: () => void;
}) {
  const statusConfig = {
    overdue: { color: 'bg-destructive/10 border-destructive/20', dot: 'bg-destructive', label: 'Atrasada', textColor: 'text-destructive' },
    today: { color: 'bg-warning/10 border-warning/20', dot: 'bg-warning', label: 'Hoy', textColor: 'text-warning' },
    upcoming: { color: 'bg-primary/10 border-primary/20', dot: 'bg-primary', label: 'Próxima', textColor: 'text-primary' },
    completed: { color: 'bg-accent/10 border-accent/20', dot: 'bg-accent', label: 'Completada', textColor: 'text-accent' },
  };

  const config = statusConfig[patient.status as keyof typeof statusConfig];

  return (
    <button
      onClick={onClick}
      className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-transform"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl flex-shrink-0">
        {patient.avatar}
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-foreground">{patient.name}</p>
        <p className="text-xs text-muted-foreground">{patient.age} • {patient.category}</p>
      </div>

      {/* Status */}
      <div className={`${config.color} border rounded-lg px-3 py-1.5 flex items-center gap-1.5`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
      </div>
    </button>
  );
}
