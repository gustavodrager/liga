import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { definirManipuladorNaoAutorizado, definirTokenAutorizacao } from '../services/http';
import { autenticacaoServico } from '../services/autenticacaoServico';

const CHAVE_ARMAZENAMENTO = 'plataforma_futevolei_autenticacao';

export const AutenticacaoContexto = createContext(null);

function tokenExpirado(token) {
  if (!token) {
    return true;
  }

  try {
    const [, carga] = token.split('.');
    if (!carga) {
      return true;
    }

    const cargaNormalizada = carga.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (cargaNormalizada.length % 4)) % 4);
    const conteudo = atob(`${cargaNormalizada}${padding}`);
    const dados = JSON.parse(conteudo);

    if (typeof dados.exp !== 'number') {
      return false;
    }

    const agora = Math.floor(Date.now() / 1000);
    return dados.exp <= agora;
  } catch {
    return true;
  }
}

export function ProvedorAutenticacao({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const salvarAutenticacao = useCallback((resposta) => {
    setToken(resposta.token);
    setUsuario(resposta.usuario);
    definirTokenAutorizacao(resposta.token);
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(resposta));
  }, []);

  const sair = useCallback(() => {
    setToken(null);
    setUsuario(null);
    definirTokenAutorizacao(null);
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  }, []);

  const atualizarUsuarioLocal = useCallback((proximoUsuario) => {
    setUsuario(proximoUsuario);
    setToken((tokenAtual) => {
      if (!tokenAtual) {
        return tokenAtual;
      }

      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify({
        token: tokenAtual,
        usuario: proximoUsuario
      }));

      return tokenAtual;
    });
  }, []);

  useEffect(() => {
    const conteudo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!conteudo) {
      setCarregando(false);
      return;
    }

    try {
      const dados = JSON.parse(conteudo);

      if (tokenExpirado(dados.token)) {
        localStorage.removeItem(CHAVE_ARMAZENAMENTO);
        return;
      }

      setToken(dados.token);
      setUsuario(dados.usuario);
      definirTokenAutorizacao(dados.token);
    } catch {
      localStorage.removeItem(CHAVE_ARMAZENAMENTO);
    } finally {
      setCarregando(false);
    }
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const resposta = await autenticacaoServico.login({ email, senha });
    salvarAutenticacao(resposta);
    return resposta;
  }, [salvarAutenticacao]);

  const registrarPorConvite = useCallback(async (tokenConvite, nome, email, senha) => {
    const resposta = await autenticacaoServico.registrarPorConvite({
      tokenConvite,
      nome,
      email,
      senha
    });
    salvarAutenticacao(resposta);
    return resposta;
  }, [salvarAutenticacao]);

  const recarregarUsuario = useCallback(async () => {
    const usuarioAtual = await autenticacaoServico.me();
    atualizarUsuarioLocal(usuarioAtual);
    return usuarioAtual;
  }, [atualizarUsuarioLocal]);

  useEffect(() => {
    definirManipuladorNaoAutorizado(sair);
    return () => {
      definirManipuladorNaoAutorizado(null);
    };
  }, [sair]);

  const valor = useMemo(
    () => ({
      token,
      usuario,
      carregando,
      entrar,
      registrarPorConvite,
      sair,
      recarregarUsuario,
      atualizarUsuarioLocal
    }),
    [token, usuario, carregando, entrar, registrarPorConvite, sair, recarregarUsuario, atualizarUsuarioLocal]
  );

  return <AutenticacaoContexto.Provider value={valor}>{children}</AutenticacaoContexto.Provider>;
}
