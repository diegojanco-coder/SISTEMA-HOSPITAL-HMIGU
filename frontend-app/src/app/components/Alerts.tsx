import { useState } from 'react';

const ALERTS_DATA = [
  {
    id: 1,
    patientName: 'Sofía Rodríguez',
    age: '2 meses',
    vaccine: 'BCG',
    dose: 'Dosis única',
    type: 'overdue',
    dueDate: '10 Abr 2026',
    daysOverdue: 3,
    avatar: '👶',
    patientId: 'sofia'
  },
  {
    id: 2,
    patientName: 'Carlos Méndez',
    age: '4 años',
    vaccine: 'Triple viral',
    dose: '2da dosis',
    type: 'today',
    scheduledTime: '10:00',
    avatar: '🧒',
    patientId: 'carlos'
  },
  {
    id: 3,
    patientName: 'Miguel Sánchez',
    age: '8 años',
    vaccine: 'DPT',
    dose: 'Refuerzo',
    type: 'upcoming',
    dueDate: '15 Abr 2026',
    daysRemaining: 2,
    avatar: '🧒',
    patientId: 'miguel'
  },
  {
    id: 4,
    patientName: 'Laura Martínez',
    age: '35 años',
    vaccine: 'Tétanos',
    dose: 'Refuerzo',
    type: 'upcoming',
    dueDate: '20 Abr 2026',
    daysRemaining: 7,
    avatar: '👩',
    patientId: 'laura'
  },
  {
    id: 5,
    patientName: 'Pedro Ramírez',
    age: '3 meses',
    vaccine: 'Rotavirus',
    dose: '1ra dosis',
    type: 'upcoming',
    dueDate: '18 Abr 2026',
    daysRemaining: 5,
    avatar: '👶',
    patientId: 'pedro'
  },
];

type FilterType = 'all' | 'overdue' | 'today' | 'upcoming';

export function Alerts({ onNavigate }: { onNavigate: (screen: string, patientId: string) => void }) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredAlerts = ALERTS_DATA.filter(alert => {
    if (filter === 'all') return true;
    return alert.type === filter;
  });

  const overdueCount = ALERTS_DATA.filter(a => a.type === 'overdue').length;
  const todayCount = ALERTS_DATA.filter(a => a.type === 'today').length;
  const upcomingCount = ALERTS_DATA.filter(a => a.type === 'upcoming').length;

  return (
    <div className="pb-24 px-5">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Alertas y Recordatorios
        </h1>
        <p className="text-sm text-muted-foreground">
          {ALERTS_DATA.length} notificaciones activas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <SummaryCard
          label="Atrasadas"
          count={overdueCount}
          color="bg-destructive"
          icon={<AlertCircleIcon />}
        />
        <SummaryCard
          label="Hoy"
          count={todayCount}
          color="bg-warning"
          icon={<ClockIcon />}
        />
        <SummaryCard
          label="Próximas"
          count={upcomingCount}
          color="bg-primary"
          icon={<CalendarIcon />}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <FilterButton
          label="Todas"
          count={ALERTS_DATA.length}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterButton
          label="Atrasadas"
          count={overdueCount}
          active={filter === 'overdue'}
          onClick={() => setFilter('overdue')}
          color="text-destructive"
        />
        <FilterButton
          label="Hoy"
          count={todayCount}
          active={filter === 'today'}
          onClick={() => setFilter('today')}
          color="text-warning"
        />
        <FilterButton
          label="Próximas"
          count={upcomingCount}
          active={filter === 'upcoming'}
          onClick={() => setFilter('upcoming')}
          color="text-primary"
        />
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onClick={() => onNavigate('patient-profile', alert.patientId)}
          />
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <CheckCircleIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No hay alertas en esta categoría</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, count, color, icon }: {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`${color} text-white rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-6 h-6 opacity-80">
          {icon}
        </div>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
    </div>
  );
}

function FilterButton({ label, count, active, onClick, color = 'text-primary' }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
        active
          ? 'bg-foreground text-background shadow-lg'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-background/20' : 'bg-background/50'
      }`}>
        {count}
      </span>
    </button>
  );
}

function AlertCard({ alert, onClick }: {
  alert: typeof ALERTS_DATA[0];
  onClick: () => void;
}) {
  const typeConfig = {
    overdue: {
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive',
      headerBg: 'bg-destructive',
      headerText: 'text-white',
      iconColor: 'text-destructive',
      icon: <AlertCircleIcon />,
      badgeText: `Atrasada ${alert.daysOverdue} días`,
      badgeColor: 'bg-destructive text-white'
    },
    today: {
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning',
      headerBg: 'bg-warning',
      headerText: 'text-white',
      iconColor: 'text-warning',
      icon: <ClockIcon />,
      badgeText: `Hoy a las ${alert.scheduledTime}`,
      badgeColor: 'bg-warning text-white'
    },
    upcoming: {
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary',
      headerBg: 'bg-primary',
      headerText: 'text-white',
      iconColor: 'text-primary',
      icon: <CalendarIcon />,
      badgeText: `En ${alert.daysRemaining} días`,
      badgeColor: 'bg-primary text-white'
    },
  };

  const config = typeConfig[alert.type as keyof typeof typeConfig];

  return (
    <button
      onClick={onClick}
      className={`w-full ${config.bgColor} border-l-4 ${config.borderColor} rounded-xl overflow-hidden hover:scale-[1.01] active:scale-[0.99] transition-transform`}
    >
      {/* Header */}
      <div className={`${config.headerBg} ${config.headerText} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5">
            {config.icon}
          </div>
          <span className="text-xs font-bold uppercase tracking-wide">{config.badgeText}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex items-center gap-3 bg-card">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl flex-shrink-0">
          {alert.avatar}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-foreground mb-0.5">{alert.patientName}</p>
          <p className="text-xs text-muted-foreground mb-1">{alert.age}</p>
          <p className="text-xs font-semibold text-foreground">
            {alert.vaccine} - {alert.dose}
          </p>
        </div>
        <div className="text-muted-foreground">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Icons
function AlertCircleIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
