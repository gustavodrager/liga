import { Navigate, Route, Routes } from 'react-router-dom';
import { RotaProtegida } from './routes/RotaProtegida';
import { LayoutPrincipal } from './layouts/LayoutPrincipal';
import { PaginaLogin } from './pages/PaginaLogin';
import { PaginaDashboard } from './pages/PaginaDashboard';
import { PaginaAtletas } from './pages/PaginaAtletas';
import { PaginaDuplas } from './pages/PaginaDuplas';
import { PaginaCompeticoes } from './pages/PaginaCompeticoes';
import { PaginaCategorias } from './pages/PaginaCategorias';
import { PaginaPartidas } from './pages/PaginaPartidas';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PaginaLogin />} />

      <Route
        element={
          <RotaProtegida>
            <LayoutPrincipal />
          </RotaProtegida>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PaginaDashboard />} />
        <Route path="/atletas" element={<PaginaAtletas />} />
        <Route path="/duplas" element={<PaginaDuplas />} />
        <Route path="/competicoes" element={<PaginaCompeticoes />} />
        <Route path="/categorias" element={<PaginaCategorias />} />
        <Route path="/partidas" element={<PaginaPartidas />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
