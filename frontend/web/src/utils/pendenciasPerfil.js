import { ESTADOS_ACESSO } from './acesso';
import { PERFIS_USUARIO } from './perfis';

const CAMPOS_ATLETA_PERFIL = [
  { id: 'nome', rotulo: 'nome completo', obterValor: (atleta) => atleta?.nome },
  { id: 'apelido', rotulo: 'apelido', obterValor: (atleta) => atleta?.apelido },
  { id: 'dataNascimento', rotulo: 'data de nascimento', obterValor: (atleta) => atleta?.dataNascimento },
  { id: 'cpf', rotulo: 'CPF', obterValor: (atleta) => atleta?.cpf },
  { id: 'telefone', rotulo: 'telefone', obterValor: (atleta) => atleta?.telefone },
  { id: 'instagram', rotulo: 'Instagram', obterValor: (atleta) => atleta?.instagram },
  { id: 'estado', rotulo: 'estado', obterValor: (atleta) => atleta?.estado },
  { id: 'cidade', rotulo: 'cidade', obterValor: (atleta) => atleta?.cidade },
  { id: 'bairro', rotulo: 'bairro', obterValor: (atleta) => atleta?.bairro },
  { id: 'nivel', rotulo: 'nível', obterValor: (atleta) => atleta?.nivel }
];

function campoPreenchido(valor) {
  if (valor === null || valor === undefined) {
    return false;
  }

  if (typeof valor === 'string') {
    return valor.trim().length > 0;
  }

  return true;
}

export function criarPendenciasPerfil({ estadoAcesso, usuario, atletaDetalhe = null }) {
  if (!usuario) {
    return [];
  }

  const pendencias = [];
  const usuarioAtleta = Number(usuario.perfil) === PERFIS_USUARIO.atleta;
  const atleta = atletaDetalhe || (usuarioAtleta && !usuario.atletaId ? {} : null);

  if (estadoAcesso === ESTADOS_ACESSO.primeiroAcesso) {
    pendencias.push({
      id: 'perfil-primeiro-acesso',
      tipoLocal: 'perfil',
      titulo: 'Concluir primeiro acesso',
      descricao: 'Revise os dados do seu acesso e complete o Meu Perfil.',
      acaoTexto: 'Ir para Meu Perfil',
      rota: '/app/perfil'
    });
  }

  if (usuarioAtleta && !usuario.atletaId) {
    pendencias.push({
      id: 'perfil-criar-atleta',
      tipoLocal: 'perfil',
      titulo: 'Criar cadastro de atleta',
      descricao: 'Seu usuário ainda precisa criar o atleta no Meu Perfil.',
      acaoTexto: 'Criar meu atleta',
      rota: '/app/perfil'
    });
  }

  if (!atleta) {
    return pendencias;
  }

  CAMPOS_ATLETA_PERFIL.forEach((campo) => {
    if (campoPreenchido(campo.obterValor(atleta))) {
      return;
    }

    pendencias.push({
      id: `perfil-campo-${campo.id}`,
      tipoLocal: 'perfil',
      titulo: `Completar ${campo.rotulo}`,
      descricao: `O campo ${campo.rotulo} ainda não foi preenchido no Meu Perfil.`,
      acaoTexto: 'Completar perfil',
      rota: '/app/perfil'
    });
  });

  return pendencias;
}
