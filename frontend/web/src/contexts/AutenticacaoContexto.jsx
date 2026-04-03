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
    localStorage.setItem(CHAVE_ARMAZENAMENTO, resposta.token);
  }, []);

  const sair = useCallback(() => {
    setToken(null);
    setUsuario(null);
    definirTokenAutorizacao(null);
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  }, []);

  const atualizarUsuarioLocal = useCallback((proximoUsuario) => {
    setUsuario(proximoUsuario);
  }, []);

  useEffect(() => {
    async function carregarAutenticacaoPersistida() {
      const conteudo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (!conteudo) {
        setCarregando(false);
        return;
      }

      let tokenPersistido = conteudo;

      try {
        const dadosLegados = JSON.parse(conteudo);
        if (typeof dadosLegados?.token === 'string') {
          tokenPersistido = dadosLegados.token;
        }
      } catch {
      }

      if (tokenExpirado(tokenPersistido)) {
        localStorage.removeItem(CHAVE_ARMAZENAMENTO);
        setCarregando(false);
        return;
      }

      try {
        setToken(tokenPersistido);
        definirTokenAutorizacao(tokenPersistido);
        const usuarioAtual = await autenticacaoServico.me();
        setUsuario(usuarioAtual);
        localStorage.setItem(CHAVE_ARMAZENAMENTO, tokenPersistido);
      } catch {
        localStorage.removeItem(CHAVE_ARMAZENAMENTO);
        definirTokenAutorizacao(null);
        setToken(null);
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    }

    carregarAutenticacaoPersistida();
  }, []);

  const solicitarCodigoLogin = useCallback(async (email) => {
    return autenticacaoServico.solicitarCodigoLogin({ email });
  }, []);

  const entrarComCodigo = useCallback(async (email, codigo) => {
    const resposta = await autenticacaoServico.loginComCodigo({ email, codigo });
    salvarAutenticacao(resposta);
    return resposta;
  }, [salvarAutenticacao]);

  const registrarPorConvite = useCallback(async ({
    conviteIdPublico,
    codigoConvite,
    nome,
    email,
    senha
  }) => {
    const resposta = await autenticacaoServico.registrarPorConvite({
      conviteIdPublico,
      codigoConvite,
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
      solicitarCodigoLogin,
      entrarComCodigo,
      registrarPorConvite,
      sair,
      recarregarUsuario,
      atualizarUsuarioLocal
    }),
    [token, usuario, carregando, solicitarCodigoLogin, entrarComCodigo, registrarPorConvite, sair, recarregarUsuario, atualizarUsuarioLocal]
  );

  return <AutenticacaoContexto.Provider value={valor}>{children}</AutenticacaoContexto.Provider>;
}
