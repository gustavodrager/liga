import { Navigate, Route, Routes } from 'react-router-dom';
import { RotaProtegida } from './routes/RotaProtegida';
import { LayoutPrincipal } from './layouts/LayoutPrincipal';
import { PaginaLogin } from './pages/PaginaLogin';
import { PaginaDashboard } from './pages/PaginaDashboard';
import { PaginaAtletas } from './pages/PaginaAtletas';
import { PaginaDuplas } from './pages/PaginaDuplas';
import { PaginaLigas } from './pages/PaginaLigas';
import { PaginaLocais } from './pages/PaginaLocais';
import { PaginaFormatosCampeonato } from './pages/PaginaFormatosCampeonato';
import { PaginaRegrasCompeticao } from './pages/PaginaRegrasCompeticao';
import { PaginaModelosImportacao } from './pages/PaginaModelosImportacao';
import { PaginaCompeticoes } from './pages/PaginaCompeticoes';
import { PaginaRanking } from './pages/PaginaRanking';
import { PaginaCategorias } from './pages/PaginaCategorias';
import { PaginaInscricoesCampeonato } from './pages/PaginaInscricoesCampeonato';
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
        <Route path="/ligas" element={<PaginaLigas />} />
        <Route path="/locais" element={<PaginaLocais />} />
        <Route path="/formatos-campeonato" element={<PaginaFormatosCampeonato />} />
        <Route path="/regras" element={<PaginaRegrasCompeticao />} />
        <Route path="/modelos-importacao" element={<PaginaModelosImportacao />} />
        <Route path="/competicoes" element={<PaginaCompeticoes />} />
        <Route path="/ranking" element={<PaginaRanking />} />
        <Route path="/categorias" element={<PaginaCategorias />} />
        <Route path="/inscricoes" element={<PaginaInscricoesCampeonato />} />
        <Route path="/partidas" element={<PaginaPartidas />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
