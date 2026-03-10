import { http } from './http';

export const partidasServico = {
  async listarPorCategoria(categoriaId) {
    const resposta = await http.get(`/categorias/${categoriaId}/partidas`);
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/partidas', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/partidas/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/partidas/${id}`);
  }
};
