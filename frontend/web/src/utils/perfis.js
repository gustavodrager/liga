export const PERFIS_USUARIO = {
  administrador: 1,
  organizador: 2,
  atleta: 3
};

export function nomePerfil(perfil) {
  switch (Number(perfil)) {
    case PERFIS_USUARIO.administrador:
      return 'Administrador';
    case PERFIS_USUARIO.organizador:
      return 'Organizador';
    case PERFIS_USUARIO.atleta:
      return 'Atleta';
    default:
      return 'Desconhecido';
  }
}

export function temPerfil(usuario, perfisPermitidos = []) {
  if (!usuario) {
    return false;
  }

  if (!Array.isArray(perfisPermitidos) || perfisPermitidos.length === 0) {
    return true;
  }

  return perfisPermitidos.includes(Number(usuario.perfil));
}

export function ehAdministrador(usuario) {
  return Number(usuario?.perfil) === PERFIS_USUARIO.administrador;
}

export function ehOrganizador(usuario) {
  return Number(usuario?.perfil) === PERFIS_USUARIO.organizador;
}

export function ehAtleta(usuario) {
  return Number(usuario?.perfil) === PERFIS_USUARIO.atleta;
}

export function ehGestorCompeticao(usuario) {
  return ehAdministrador(usuario) || ehOrganizador(usuario);
}
