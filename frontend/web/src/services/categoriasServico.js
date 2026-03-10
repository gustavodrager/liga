import { http } from './http';

export const categoriasServico = {
  async listarPorCompeticao(competicaoId) {
    const resposta = await http.get(`/competicoes/${competicaoId}/categorias`);
    return resposta.data;
  },

  async obterPorId(id) {
    const resposta = await http.get(`/categorias/${id}`);
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/categorias', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/categorias/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/categorias/${id}`);
  }
};
