import { createContext, useEffect, useMemo, useState } from 'react';
import { definirTokenAutorizacao } from '../services/http';
import { autenticacaoServico } from '../services/autenticacaoServico';

const CHAVE_ARMAZENAMENTO = 'plataforma_futevolei_autenticacao';

export const AutenticacaoContexto = createContext(null);

export function ProvedorAutenticacao({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const conteudo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!conteudo) {
      setCarregando(false);
      return;
    }

    try {
      const dados = JSON.parse(conteudo);
      setToken(dados.token);
      setUsuario(dados.usuario);
      definirTokenAutorizacao(dados.token);
    } catch {
      localStorage.removeItem(CHAVE_ARMAZENAMENTO);
    } finally {
      setCarregando(false);
    }
  }, []);

  const entrar = async (email, senha) => {
    const resposta = await autenticacaoServico.login({ email, senha });
    setToken(resposta.token);
    setUsuario(resposta.usuario);
    definirTokenAutorizacao(resposta.token);
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(resposta));
    return resposta;
  };

  const sair = () => {
    setToken(null);
    setUsuario(null);
    definirTokenAutorizacao(null);
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  };

  const valor = useMemo(
    () => ({ token, usuario, carregando, entrar, sair }),
    [token, usuario, carregando]
  );

  return <AutenticacaoContexto.Provider value={valor}>{children}</AutenticacaoContexto.Provider>;
}
