import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { ehGestorCompeticao } from '../utils/perfis';

export function RedirecionamentoPartidas() {
  const { usuario } = useAutenticacao();
  const location = useLocation();
  const destinoBase = ehGestorCompeticao(usuario) ? '/partidas/registrar' : '/partidas/consulta';

  return <Navigate to={`${destinoBase}${location.search}`} replace />;
}
