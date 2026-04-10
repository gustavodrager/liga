import { ehAdministrador, ehAtleta, ehGestorCompeticao, temPerfil } from './perfis';

export const ESTADOS_ACESSO = {
  convitePendente: 'ConvitePendente',
  primeiroAcesso: 'PrimeiroAcesso',
  cadastroIncompleto: 'CadastroIncompleto',
  ativo: 'Ativo'
};

export function nomeEstadoAcesso(estadoAcesso) {
  switch (estadoAcesso) {
    case ESTADOS_ACESSO.convitePendente:
      return 'Convite pendente';
    case ESTADOS_ACESSO.primeiroAcesso:
      return 'Primeiro acesso';
    case ESTADOS_ACESSO.cadastroIncompleto:
      return 'Cadastro incompleto';
    case ESTADOS_ACESSO.ativo:
      return 'Ativo';
    default:
      return 'Desconhecido';
  }
}

export function obterEstadoAcessoUsuario(usuario, opcoes = {}) {
  if (!usuario) {
    return null;
  }

  const { primeiroAcessoPendente = false } = opcoes;
  if (primeiroAcessoPendente && !(ehAtleta(usuario) && usuario?.atletaId)) {
    return ESTADOS_ACESSO.primeiroAcesso;
  }

  if (ehAtleta(usuario) && !usuario?.atletaId) {
    return ESTADOS_ACESSO.cadastroIncompleto;
  }

  return ESTADOS_ACESSO.ativo;
}

export function temEstadoAcesso(estadoAcesso, estadosPermitidos = []) {
  if (!estadoAcesso) {
    return false;
  }

  if (!Array.isArray(estadosPermitidos) || estadosPermitidos.length === 0) {
    return true;
  }

  return estadosPermitidos.includes(estadoAcesso);
}

export function obterRotaPainelPorPerfil(usuario) {
  if (ehAdministrador(usuario)) {
    return '/admin';
  }

  if (ehGestorCompeticao(usuario)) {
    return '/app/organizacao';
  }

  return '/app/inicio';
}

export function obterRotaPadraoEstado(usuario, estadoAcesso) {
  if (!usuario) {
    return '/login';
  }

  if (
    estadoAcesso === ESTADOS_ACESSO.primeiroAcesso
    || estadoAcesso === ESTADOS_ACESSO.cadastroIncompleto
  ) {
    return '/app/perfil';
  }

  return obterRotaPainelPorPerfil(usuario);
}

export function podeAcessarRota(usuario, estadoAcesso, configuracao = {}) {
  if (!usuario) {
    return false;
  }

  return temPerfil(usuario, configuracao.perfisPermitidos)
    && temEstadoAcesso(estadoAcesso, configuracao.estadosPermitidos);
}
