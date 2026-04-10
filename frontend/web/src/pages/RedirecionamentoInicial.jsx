import { Navigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';

export function RedirecionamentoInicial() {
  const { carregando, token, rotaInicial } = useAutenticacao();

  if (carregando) {
    return (
      <div className="tela-carregamento">
        <div className="spinner" />
        <span>Carregando...</span>
      </div>
    );
  }

  return <Navigate to={token ? rotaInicial : '/login'} replace />;
}
