import { useContext } from 'react';
import { AutenticacaoContexto } from '../contexts/AutenticacaoContexto';

export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContexto);
  if (!contexto) {
    throw new Error('useAutenticacao deve ser usado dentro do ProvedorAutenticacao');
  }

  return contexto;
}
