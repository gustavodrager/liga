import { http } from './http';

export const rankingServico = {
  async listarAtletasPorLiga(ligaId) {
    const resposta = await http.get(`/ranking/ligas/${ligaId}/atletas`);
    return resposta.data;
  },

  async listarAtletasPorCompeticao(competicaoId) {
    const resposta = await http.get(`/ranking/competicoes/${competicaoId}/atletas`);
    return resposta.data;
  }
};
