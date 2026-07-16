export function Reports({ onNavigate }: { onNavigate: (screen: string) => void }) {
  return (
    <div className="pb-24 px-5">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Reportes y Estadísticas
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen del período actual
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        <PeriodButton label="Hoy" active={false} />
        <PeriodButton label="Esta Semana" active={false} />
        <PeriodButton label="Este Mes" active={true} />
        <PeriodButton label="Este Año" active={false} />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          title="Total Aplicadas"
          value="248"
          change="+12%"
          positive={true}
          icon={<VaccineIcon />}
          color="from-primary/20 to-primary/10"
        />
        <StatCard
          title="Pacientes Atendidos"
          value="156"
          change="+8%"
          positive={true}
          icon={<UsersIcon />}
          color="from-accent/20 to-accent/10"
        />
        <StatCard
          title="Cobertura"
          value="89%"
          change="+5%"
          positive={true}
          icon={<ChartIcon />}
          color="from-secondary/20 to-secondary/10"
        />
        <StatCard
          title="Pendientes"
          value="12"
          change="-3%"
          positive={true}
          icon={<ClockIcon />}
          color="from-warning/20 to-warning/10"
        />
      </div>

      {/* Charts Section */}
      <div className="space-y-4 mb-5">
        {/* Vaccines by Category */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Vacunas por Categoría
          </h3>
          <div className="space-y-3">
            <CategoryBar label="Bebés" count={98} total={248} color="bg-primary" />
            <CategoryBar label="Niños" count={85} total={248} color="bg-secondary" />
            <CategoryBar label="Adultos" count={42} total={248} color="bg-accent" />
            <CategoryBar label="Adultos Mayores" count={23} total={248} color="bg-warning" />
          </div>
        </div>

        {/* Top Vaccines */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Vacunas Más Aplicadas
          </h3>
          <div className="space-y-2">
            <TopVaccineItem rank={1} name="Pentavalente" count={45} />
            <TopVaccineItem rank={2} name="BCG" count={38} />
            <TopVaccineItem rank={3} name="Hepatitis B" count={32} />
            <TopVaccineItem rank={4} name="Triple Viral" count={28} />
            <TopVaccineItem rank={5} name="Influenza" count={24} />
          </div>
        </div>

        {/* Coverage by Age Group */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Cobertura por Grupo Etario
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <CoverageCard label="0-1 año" percentage={95} color="text-primary" />
            <CoverageCard label="1-5 años" percentage={92} color="text-secondary" />
            <CoverageCard label="6-18 años" percentage={87} color="text-accent" />
            <CoverageCard label="+65 años" percentage={78} color="text-warning" />
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Actividad Diaria (Última Semana)
          </h3>
          <div className="flex items-end justify-between gap-2 h-32">
            <DayBar label="L" height={65} />
            <DayBar label="M" height={82} />
            <DayBar label="M" height={58} />
            <DayBar label="J" height={95} active />
            <DayBar label="V" height={72} />
            <DayBar label="S" height={45} />
            <DayBar label="D" height={28} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>7 Abr</span>
            <span>13 Abr</span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button className="w-full bg-gradient-to-r from-primary to-secondary text-white rounded-xl py-4 font-bold text-base shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
        <DownloadIcon />
        Exportar Reporte Completo
      </button>
    </div>
  );
}

function PeriodButton({ label, active }: { label: string; active: boolean }) {
  return (
    <button
      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
        active
          ? 'bg-foreground text-background shadow-lg'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ title, value, change, positive, icon, color }: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 relative overflow-hidden`}>
      <div className="absolute top-2 right-2 text-foreground/20">
        {icon}
      </div>
      <div className="relative">
        <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
        <div className={`flex items-center gap-1 text-xs font-semibold ${positive ? 'text-accent' : 'text-destructive'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={positive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
          </svg>
          <span>{change}</span>
        </div>
      </div>
    </div>
  );
}

function CategoryBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = Math.round((count / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{count} ({percentage}%)</span>
      </div>
      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TopVaccineItem({ rank, name, count }: {
  rank: number;
  name: string;
  count: number;
}) {
  const rankColors = [
    'bg-gradient-to-br from-yellow-400 to-yellow-500',
    'bg-gradient-to-br from-gray-300 to-gray-400',
    'bg-gradient-to-br from-orange-300 to-orange-400',
    'bg-muted',
    'bg-muted'
  ];

  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 ${rankColors[rank - 1]} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <span className="text-sm font-bold text-white">{rank}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{name}</p>
      </div>
      <span className="text-sm font-bold text-primary">{count}</span>
    </div>
  );
}

function CoverageCard({ label, percentage, color }: {
  label: string;
  percentage: number;
  color: string;
}) {
  return (
    <div className="bg-muted rounded-xl p-3 text-center">
      <p className={`text-2xl font-bold ${color} mb-1`}>{percentage}%</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DayBar({ label, height, active = false }: {
  label: string;
  height: number;
  active?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <div className="w-full relative" style={{ height: '100%' }}>
        <div
          className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
            active
              ? 'bg-gradient-to-t from-primary to-secondary'
              : 'bg-gradient-to-t from-muted to-muted/50'
          }`}
          style={{ height: `${height}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

// Icons
function VaccineIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
