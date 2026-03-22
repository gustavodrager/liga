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
  }
};
