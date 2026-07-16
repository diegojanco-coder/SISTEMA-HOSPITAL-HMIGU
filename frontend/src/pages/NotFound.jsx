import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-hospital-celesteClaro text-center px-4">
      <h1 className="text-5xl font-bold text-hospital-azul">404</h1>
      <p className="text-slate-600 mt-2">La página que busca no existe.</p>
      <Link to="/" className="mt-4 text-hospital-azul hover:underline">Volver al inicio</Link>
    </div>
  );
}
