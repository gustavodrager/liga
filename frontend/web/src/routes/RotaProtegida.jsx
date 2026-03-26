import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { temPerfil } from '../utils/perfis';

export function RotaProtegida({ children, perfisPermitidos }) {
  const { token, carregando, usuario } = useAutenticacao();
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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
