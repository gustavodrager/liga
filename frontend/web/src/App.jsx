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
import { PaginaMeuPerfil } from './pages/PaginaMeuPerfil';
import { PaginaPerfilUsuario } from './pages/PaginaPerfilUsuario';
import { PaginaPendenciasAtletas } from './pages/PaginaPendenciasAtletas';
import { PaginaUsuarios } from './pages/PaginaUsuarios';
import { PaginaConvitesCadastro } from './pages/PaginaConvitesCadastro';
import { PaginaCadastroConvite } from './pages/PaginaCadastroConvite';
import { PERFIS_USUARIO } from './utils/perfis';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PaginaLogin />} />
      <Route path="/cadastro/convite" element={<PaginaCadastroConvite />} />
      <Route path="/cadastro/convite/:identificadorPublico" element={<PaginaCadastroConvite />} />

      <Route
        element={
          <RotaProtegida>
            <LayoutPrincipal />
          </RotaProtegida>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PaginaDashboard />} />
        <Route path="/meu-perfil" element={<PaginaMeuPerfil />} />
        <Route
          path="/perfil-usuario"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador]}>
              <PaginaPerfilUsuario />
            </RotaProtegida>
          }
        />
        <Route
          path="/pendencias"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador, PERFIS_USUARIO.atleta]}>
              <PaginaPendenciasAtletas />
            </RotaProtegida>
          }
        />
        <Route
          path="/pendencias-atletas"
          element={<Navigate to="/pendencias" replace />}
        />
        <Route
          path="/atletas"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}>
              <PaginaAtletas />
            </RotaProtegida>
          }
        />
        <Route
          path="/duplas"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}>
              <PaginaDuplas />
            </RotaProtegida>
          }
        />
        <Route
          path="/ligas"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador]}>
              <PaginaLigas />
            </RotaProtegida>
          }
        />
        <Route
          path="/locais"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}>
              <PaginaLocais />
            </RotaProtegida>
          }
        />
        <Route
          path="/formatos-campeonato"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador]}>
              <PaginaFormatosCampeonato />
            </RotaProtegida>
          }
        />
        <Route
          path="/regras"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}>
              <PaginaRegrasCompeticao />
            </RotaProtegida>
          }
        />
        <Route
          path="/modelos-importacao"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador]}>
              <PaginaModelosImportacao />
            </RotaProtegida>
          }
        />
        <Route
          path="/competicoes"
          element={<PaginaCompeticoes />}
        />
        <Route
          path="/ranking"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador, PERFIS_USUARIO.atleta]}>
              <PaginaRanking />
            </RotaProtegida>
          }
        />
        <Route
          path="/categorias"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}>
              <PaginaCategorias />
            </RotaProtegida>
          }
        />
        <Route
          path="/inscricoes"
          element={<PaginaInscricoesCampeonato />}
        />
        <Route
          path="/partidas"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador, PERFIS_USUARIO.atleta]}>
              <PaginaPartidas />
            </RotaProtegida>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador]}>
              <PaginaUsuarios />
            </RotaProtegida>
          }
        />
        <Route
          path="/convites-cadastro"
          element={
            <RotaProtegida perfisPermitidos={[PERFIS_USUARIO.administrador]}>
              <PaginaConvitesCadastro />
            </RotaProtegida>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
