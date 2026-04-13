import { http } from './http';

export const rankingServico = {
  async obterFiltroInicial() {
    const resposta = await http.get('/ranking/filtro-inicial');
    return resposta.data;
  },

  async listarAtletasGeral() {
    const resposta = await http.get('/ranking/geral/atletas');
    return resposta.data;
  },

  async listarAtletasPorLiga(ligaId) {
    const resposta = await http.get(`/ranking/ligas/${ligaId}/atletas`);
    return resposta.data;
  },

  async listarRegioesDisponiveis() {
    const resposta = await http.get('/ranking/regioes');
    return resposta.data;
  },

  async listarAtletasPorRegiao(filtros = {}) {
    const params = {};
    if (filtros.estado) {
      params.estado = filtros.estado;
    }
    if (filtros.cidade) {
      params.cidade = filtros.cidade;
    }
    if (filtros.bairro) {
      params.bairro = filtros.bairro;
    }

    const resposta = await http.get('/ranking/regiao/atletas', { params });
    return resposta.data;
  },

  async listarAtletasPorCompeticao(competicaoId) {
    const resposta = await http.get(`/ranking/competicoes/${competicaoId}/atletas`);
    return resposta.data;
  }
};
