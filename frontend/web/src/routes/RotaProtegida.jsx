import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';

export function RotaProtegida({ children }) {
  const { token, carregando } = useAutenticacao();
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

  return children;
}
