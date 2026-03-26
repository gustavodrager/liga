import { http } from './http';

export const grupoAtletasServico = {
  async listarPorCompeticao(competicaoId) {
    const resposta = await http.get(`/competicoes/${competicaoId}/grupo-atletas`);
    return resposta.data;
  },

  async criar(competicaoId, dados) {
    const resposta = await http.post(`/competicoes/${competicaoId}/grupo-atletas`, dados);
    return resposta.data;
  },

  async remover(competicaoId, id) {
    await http.delete(`/competicoes/${competicaoId}/grupo-atletas/${id}`);
  },

  async assumirMeuNome(competicaoId, id) {
    const resposta = await http.post(`/competicoes/${competicaoId}/grupo-atletas/${id}/assumir`);
    return resposta.data;
  }
};
