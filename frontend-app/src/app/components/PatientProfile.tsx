const PATIENT_DATA = {
  sofia: {
    name: 'Sofía Rodríguez',
    age: '2 meses',
    birthDate: '15 Feb 2026',
    category: 'Bebé',
    avatar: '👶',
    parent: 'María Rodríguez',
    phone: '+591 7123-4567',
    vaccines: [
      { name: 'BCG', dose: 'Dosis única', date: null, status: 'pending', dueDate: '10 Abr 2026' },
      { name: 'Hepatitis B', dose: '1ra dosis', date: '16 Feb 2026', status: 'completed', appliedBy: 'Dra. María' },
      { name: 'Pentavalente', dose: '1ra dosis', date: null, status: 'upcoming', dueDate: '15 May 2026' },
    ]
  },
  carlos: {
    name: 'Carlos Méndez',
    age: '4 años',
    birthDate: '20 Mar 2022',
    category: 'Niño',
    avatar: '🧒',
    parent: 'Ana Méndez',
    phone: '+591 7234-5678',
    vaccines: [
      { name: 'BCG', dose: 'Dosis única', date: '21 Mar 2022', status: 'completed', appliedBy: 'Dra. Carmen' },
      { name: 'Triple viral', dose: '1ra dosis', date: '20 Mar 2023', status: 'completed', appliedBy: 'Dra. María' },
      { name: 'Triple viral', dose: '2da dosis', date: null, status: 'pending', dueDate: '13 Abr 2026' },
      { name: 'DPT', dose: 'Refuerzo', date: '25 Mar 2024', status: 'completed', appliedBy: 'Enf. Pedro' },
    ]
  },
};

export function PatientProfile({ patientId, onNavigate }: {
  patientId: string | null;
  onNavigate: (screen: string, patientId?: string) => void;
}) {
  const patient = patientId ? PATIENT_DATA[patientId as keyof typeof PATIENT_DATA] : PATIENT_DATA.sofia;

  if (!patient) {
    return (
      <div className="p-5">
        <p>Paciente no encontrado</p>
      </div>
    );
  }

  const completedVaccines = patient.vaccines.filter(v => v.status === 'completed').length;
  const totalVaccines = patient.vaccines.length;
  const progress = Math.round((completedVaccines / totalVaccines) * 100);

  return (
    <div className="pb-24">
      {/* Header with back button */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-lg border-b border-border px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => onNavigate('patients')}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-foreground">Perfil del Paciente</h1>
      </div>

      <div className="px-5 pt-4">
        {/* Patient Info Card */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-5 mb-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-4xl shadow-lg">
              {patient.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-1">{patient.name}</h2>
              <p className="text-sm text-muted-foreground mb-1">{patient.age} • {patient.category}</p>
              <p className="text-xs text-muted-foreground">Nacimiento: {patient.birthDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={<UserIcon />} label="Responsable" value={patient.parent} />
            <InfoItem icon={<PhoneIcon />} label="Teléfono" value={patient.phone} />
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Esquema de Vacunación</h3>
            <span className="text-2xl font-bold text-primary">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedVaccines} de {totalVaccines} completadas</span>
            <span>{totalVaccines - completedVaccines} pendientes</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => onNavigate('add-vaccine', patientId || undefined)}
            className="bg-primary text-white rounded-xl py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/30"
          >
            <PlusIcon className="w-5 h-5" />
            Registrar Vacuna
          </button>
          <button className="bg-secondary text-white rounded-xl py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-secondary/30">
            <CalendarIcon className="w-5 h-5" />
            Programar
          </button>
        </div>

        {/* Vaccine History */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Historial de Vacunación</h3>
          <div className="space-y-3">
            {patient.vaccines.map((vaccine, index) => (
              <VaccineHistoryItem key={index} vaccine={vaccine} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xs font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function VaccineHistoryItem({ vaccine }: {
  vaccine: {
    name: string;
    dose: string;
    date: string | null;
    status: 'completed' | 'pending' | 'upcoming';
    dueDate?: string;
    appliedBy?: string;
  };
}) {
  const statusConfig = {
    completed: {
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/20',
      iconColor: 'text-accent',
      icon: <CheckIcon />,
      textColor: 'text-accent'
    },
    pending: {
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
      iconColor: 'text-destructive',
      icon: <AlertIcon />,
      textColor: 'text-destructive'
    },
    upcoming: {
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      iconColor: 'text-primary',
      icon: <ClockIcon />,
      textColor: 'text-primary'
    },
  };

  const config = statusConfig[vaccine.status];

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${config.iconColor} flex-shrink-0`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground mb-1">{vaccine.name}</h4>
          <p className="text-xs text-muted-foreground mb-2">{vaccine.dose}</p>
          {vaccine.status === 'completed' && vaccine.date && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Aplicada:</span> {vaccine.date}
              </p>
              {vaccine.appliedBy && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Por:</span> {vaccine.appliedBy}
                </p>
              )}
            </div>
          )}
          {vaccine.status === 'pending' && vaccine.dueDate && (
            <p className={`text-xs font-semibold ${config.textColor}`}>
              Vencida desde: {vaccine.dueDate}
            </p>
          )}
          {vaccine.status === 'upcoming' && vaccine.dueDate && (
            <p className={`text-xs font-semibold ${config.textColor}`}>
              Programada para: {vaccine.dueDate}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons
function UserIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function PlusIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CalendarIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
