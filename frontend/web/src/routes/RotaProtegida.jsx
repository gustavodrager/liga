import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { ESTADOS_ACESSO, obterRotaPadraoEstado, temEstadoAcesso } from '../utils/acesso';
import { temPerfil } from '../utils/perfis';

export function RotaProtegida({ children, perfisPermitidos, estadosPermitidos }) {
  const { token, carregando, usuario, estadoAcesso, rotaInicial } = useAutenticacao();
  const localizacao = useLocation();

  if (carregando) {
    return (
      <div className="tela-carregamento">
        <div className="spinner" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ origem: localizacao }} />;
  }

  if (!temPerfil(usuario, perfisPermitidos)) {
    return <Navigate to={rotaInicial} replace />;
  }

  if (!temEstadoAcesso(estadoAcesso, estadosPermitidos)) {
    const destinoBloqueio = (
      estadoAcesso === ESTADOS_ACESSO.primeiroAcesso
      || estadoAcesso === ESTADOS_ACESSO.cadastroIncompleto
    )
      ? '/app/perfil'
      : obterRotaPadraoEstado(usuario, estadoAcesso);

    return <Navigate to={destinoBloqueio} replace state={{ origem: localizacao }} />;
  }

  return children;
}
