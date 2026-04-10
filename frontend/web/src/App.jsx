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
import { PaginaRegistrarPartidas } from './pages/PaginaRegistrarPartidas';
import { PaginaConsultaPartidas } from './pages/PaginaConsultaPartidas';
import { PaginaMeuPerfil } from './pages/PaginaMeuPerfil';
import { PaginaPerfilUsuario } from './pages/PaginaPerfilUsuario';
import { PaginaPendenciasAtletas } from './pages/PaginaPendenciasAtletas';
import { PaginaUsuarios } from './pages/PaginaUsuarios';
import { PaginaConvitesCadastro } from './pages/PaginaConvitesCadastro';
import { PaginaCadastroConvite } from './pages/PaginaCadastroConvite';
import { RedirecionamentoInicial } from './pages/RedirecionamentoInicial';
import { RedirecionamentoPartidas } from './pages/RedirecionamentoPartidas';
import { PERFIS_USUARIO } from './utils/perfis';
import { ESTADOS_ACESSO } from './utils/acesso';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RedirecionamentoInicial />} />
      <Route path="/login" element={<PaginaLogin />} />
      <Route path="/cadastro/convite" element={<PaginaCadastroConvite />} />
      <Route path="/cadastro/convite/:identificadorPublico" element={<PaginaCadastroConvite />} />
      <Route element={<LayoutPrincipal />}>
        <Route path="/ranking" element={<PaginaRanking />} />
        <Route path="/inscricoes" element={<PaginaInscricoesCampeonato />} />
      </Route>

      <Route
        element={
          <RotaProtegida>
            <LayoutPrincipal />
          </RotaProtegida>
        }
      >
        <Route
          path="/app/inicio"
          element={
            <RotaProtegida estadosPermitidos={[ESTADOS_ACESSO.ativo]}>
              <PaginaDashboard />
            </RotaProtegida>
          }
        />
        <Route
          path="/app/organizacao"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaDashboard />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaDashboard />
            </RotaProtegida>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RotaProtegida estadosPermitidos={[ESTADOS_ACESSO.ativo]}>
              <PaginaDashboard />
            </RotaProtegida>
          }
        />
        <Route
          path="/app/perfil"
          element={
            <RotaProtegida
              estadosPermitidos={[ESTADOS_ACESSO.primeiroAcesso, ESTADOS_ACESSO.cadastroIncompleto, ESTADOS_ACESSO.ativo]}
            >
              <PaginaMeuPerfil />
            </RotaProtegida>
          }
        />
        <Route path="/meu-perfil" element={<Navigate to="/app/perfil" replace />} />
        <Route
          path="/perfil-usuario"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaPerfilUsuario />
            </RotaProtegida>
          }
        />
        <Route
          path="/app/pendencias"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador, PERFIS_USUARIO.atleta]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaPendenciasAtletas />
            </RotaProtegida>
          }
        />
        <Route
          path="/pendencias"
          element={
            <Navigate to="/app/pendencias" replace />
          }
        />
        <Route
          path="/pendencias-atletas"
          element={<Navigate to="/pendencias" replace />}
        />
        <Route
          path="/atletas"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaAtletas />
            </RotaProtegida>
          }
        />
        <Route
          path="/duplas"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaDuplas />
            </RotaProtegida>
          }
        />
        <Route
          path="/ligas"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaLigas />
            </RotaProtegida>
          }
        />
        <Route
          path="/locais"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaLocais />
            </RotaProtegida>
          }
        />
        <Route
          path="/formatos-campeonato"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaFormatosCampeonato />
            </RotaProtegida>
          }
        />
        <Route
          path="/regras"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaRegrasCompeticao />
            </RotaProtegida>
          }
        />
        <Route
          path="/modelos-importacao"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaModelosImportacao />
            </RotaProtegida>
          }
        />
        <Route
          path="/competicoes"
          element={
            <RotaProtegida estadosPermitidos={[ESTADOS_ACESSO.ativo]}>
              <PaginaCompeticoes />
            </RotaProtegida>
          }
        />
        <Route
          path="/categorias"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaCategorias />
            </RotaProtegida>
          }
        />
        <Route
          path="/partidas"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador, PERFIS_USUARIO.atleta]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <RedirecionamentoPartidas />
            </RotaProtegida>
          }
        />
        <Route
          path="/partidas/registrar"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador, PERFIS_USUARIO.atleta]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaRegistrarPartidas />
            </RotaProtegida>
          }
        />
        <Route
          path="/partidas/consulta"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador, PERFIS_USUARIO.organizador, PERFIS_USUARIO.atleta]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaConsultaPartidas />
            </RotaProtegida>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaUsuarios />
            </RotaProtegida>
          }
        />
        <Route
          path="/convites-cadastro"
          element={
            <RotaProtegida
              perfisPermitidos={[PERFIS_USUARIO.administrador]}
              estadosPermitidos={[ESTADOS_ACESSO.ativo]}
            >
              <PaginaConvitesCadastro />
            </RotaProtegida>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
