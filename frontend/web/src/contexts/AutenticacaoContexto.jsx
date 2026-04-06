import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { definirManipuladorNaoAutorizado, definirTokenAutorizacao } from '../services/http';
import { autenticacaoServico } from '../services/autenticacaoServico';

const CHAVE_ARMAZENAMENTO = 'plataforma_futevolei_autenticacao';
const ANTECEDENCIA_RENOVACAO_MS = 60 * 1000;

export const AutenticacaoContexto = createContext(null);

function decodificarCargaToken(token) {
  if (!token) {
    return null;
  }

  try {
    const [, carga] = token.split('.');
    if (!carga) {
      return null;
    }

    const cargaNormalizada = carga.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (cargaNormalizada.length % 4)) % 4);
    const conteudo = atob(`${cargaNormalizada}${padding}`);
    return JSON.parse(conteudo);
  } catch {
    return null;
  }
}

function obterDataExpiracaoToken(token) {
  const dados = decodificarCargaToken(token);
  if (typeof dados?.exp !== 'number') {
    return null;
  }

  return new Date(dados.exp * 1000);
}

function tokenExpirado(token) {
  const expiraEm = obterDataExpiracaoToken(token);
  return !expiraEm || expiraEm.getTime() <= Date.now();
}

function dataUtcExpirada(valor) {
  if (!valor) {
    return true;
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) || data.getTime() <= Date.now();
}

function normalizarSessaoPersistida(conteudo) {
  if (!conteudo) {
    return null;
  }

  try {
    const dados = JSON.parse(conteudo);
    if (typeof dados?.token === 'string') {
      return {
        token: dados.token,
        refreshToken: typeof dados.refreshToken === 'string' ? dados.refreshToken : null,
        tokenExpiraEmUtc: dados.tokenExpiraEmUtc ?? null,
        refreshTokenExpiraEmUtc: dados.refreshTokenExpiraEmUtc ?? null,
        usuario: dados.usuario ?? null
      };
    }
  } catch {
  }

  return typeof conteudo === 'string'
    ? {
      token: conteudo,
      refreshToken: null,
      tokenExpiraEmUtc: null,
      refreshTokenExpiraEmUtc: null,
      usuario: null
    }
    : null;
}

export function ProvedorAutenticacao({ children }) {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const temporizadorRenovacaoRef = useRef(null);
  const sessaoRef = useRef(null);

  const token = sessao?.token ?? null;
  const usuario = sessao?.usuario ?? null;

  useEffect(() => {
    sessaoRef.current = sessao;
  }, [sessao]);

  const limparTemporizadorRenovacao = useCallback(() => {
    if (temporizadorRenovacaoRef.current) {
      clearTimeout(temporizadorRenovacaoRef.current);
      temporizadorRenovacaoRef.current = null;
    }
  }, []);

  const salvarAutenticacao = useCallback((resposta) => {
    const proximaSessao = {
      token: resposta.token,
      refreshToken: resposta.refreshToken,
      tokenExpiraEmUtc: resposta.tokenExpiraEmUtc,
      refreshTokenExpiraEmUtc: resposta.refreshTokenExpiraEmUtc,
      usuario: resposta.usuario
    };

    setSessao(proximaSessao);
    definirTokenAutorizacao(resposta.token);
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(proximaSessao));
  }, []);

  const sair = useCallback(() => {
    limparTemporizadorRenovacao();
    setSessao(null);
    definirTokenAutorizacao(null);
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  }, [limparTemporizadorRenovacao]);

  const atualizarUsuarioLocal = useCallback((proximoUsuario) => {
    setSessao((sessaoAtual) => {
      if (!sessaoAtual) {
        return sessaoAtual;
      }

      const proximaSessao = {
        ...sessaoAtual,
        usuario: proximoUsuario
      };
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(proximaSessao));
      return proximaSessao;
    });
  }, []);

  const renovarToken = useCallback(async (sessaoBase = null) => {
    const sessaoAtual = sessaoBase ?? sessaoRef.current;
    if (!sessaoAtual?.token || !sessaoAtual?.refreshToken) {
      throw new Error('Sessão sem token de renovação.');
    }

    const resposta = await autenticacaoServico.renovarToken({
      token: sessaoAtual.token,
      refreshToken: sessaoAtual.refreshToken
    });

    salvarAutenticacao(resposta);
    return resposta;
  }, [salvarAutenticacao]);

  useEffect(() => {
    async function carregarAutenticacaoPersistida() {
      const sessaoPersistida = normalizarSessaoPersistida(localStorage.getItem(CHAVE_ARMAZENAMENTO));
      if (!sessaoPersistida) {
        setCarregando(false);
        return;
      }

      let sessaoAtiva = sessaoPersistida;

      try {
        if (tokenExpirado(sessaoPersistida.token)) {
          if (!sessaoPersistida.refreshToken || dataUtcExpirada(sessaoPersistida.refreshTokenExpiraEmUtc)) {
            localStorage.removeItem(CHAVE_ARMAZENAMENTO);
            setCarregando(false);
            return;
          }

          const respostaRenovacao = await renovarToken(sessaoPersistida);
          sessaoAtiva = {
            token: respostaRenovacao.token,
            refreshToken: respostaRenovacao.refreshToken,
            tokenExpiraEmUtc: respostaRenovacao.tokenExpiraEmUtc,
            refreshTokenExpiraEmUtc: respostaRenovacao.refreshTokenExpiraEmUtc,
            usuario: respostaRenovacao.usuario
          };
        }

        definirTokenAutorizacao(sessaoAtiva.token);
        setSessao(sessaoAtiva);

        if (!sessaoAtiva.usuario) {
          const usuarioAtual = await autenticacaoServico.me();
          setSessao((sessaoAtual) => {
            if (!sessaoAtual) {
              return sessaoAtual;
            }

            const proximaSessao = {
              ...sessaoAtual,
              usuario: usuarioAtual
            };
            localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(proximaSessao));
            return proximaSessao;
          });
        }
      } catch {
        localStorage.removeItem(CHAVE_ARMAZENAMENTO);
        definirTokenAutorizacao(null);
        setSessao(null);
      } finally {
        setCarregando(false);
      }
    }

    carregarAutenticacaoPersistida();
  }, [renovarToken]);

  useEffect(() => {
    limparTemporizadorRenovacao();

    if (!sessao?.token || !sessao?.refreshToken) {
      return undefined;
    }

    if (dataUtcExpirada(sessao.refreshTokenExpiraEmUtc)) {
      sair();
      return undefined;
    }

    const expiraEm = sessao.tokenExpiraEmUtc
      ? new Date(sessao.tokenExpiraEmUtc)
      : obterDataExpiracaoToken(sessao.token);

    if (!expiraEm || Number.isNaN(expiraEm.getTime())) {
      return undefined;
    }

    const atraso = Math.max(expiraEm.getTime() - Date.now() - ANTECEDENCIA_RENOVACAO_MS, 0);
    temporizadorRenovacaoRef.current = setTimeout(async () => {
      try {
        await renovarToken();
      } catch {
        sair();
      }
    }, atraso);

    return () => {
      limparTemporizadorRenovacao();
    };
  }, [sessao, renovarToken, sair, limparTemporizadorRenovacao]);

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
      limparTemporizadorRenovacao();
      definirManipuladorNaoAutorizado(null);
    };
  }, [sair, limparTemporizadorRenovacao]);

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
