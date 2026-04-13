import { http } from './http';

export const inscricoesCampeonatoServico = {
  async listarPorCampeonato(campeonatoId, categoriaId) {
    const resposta = await http.get(`/campeonatos/${campeonatoId}/inscricoes`, {
      params: categoriaId ? { categoriaId } : undefined
    });
    return resposta.data;
  },

  async criar(campeonatoId, dados) {
    const resposta = await http.post(`/campeonatos/${campeonatoId}/inscricoes`, dados);
    return resposta.data;
  },

  async atualizar(campeonatoId, inscricaoId, dados) {
    const resposta = await http.put(`/campeonatos/${campeonatoId}/inscricoes/${inscricaoId}`, dados);
    return resposta.data;
  },

  async aprovar(campeonatoId, inscricaoId) {
    const resposta = await http.post(`/campeonatos/${campeonatoId}/inscricoes/${inscricaoId}/aprovar`);
    return resposta.data;
  },

  async remover(campeonatoId, inscricaoId) {
    await http.delete(`/campeonatos/${campeonatoId}/inscricoes/${inscricaoId}`);
  }
};
