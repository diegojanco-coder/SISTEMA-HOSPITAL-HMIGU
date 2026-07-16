export default function SearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="relative w-full max-w-sm">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-hospital-celeste"
      />
    </div>
  );
}
