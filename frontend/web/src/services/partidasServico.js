import { http } from './http';

export const partidasServico = {
  async listar({ competicaoId, categoriaId }) {
    const resposta = await http.get('/partidas', {
      params: categoriaId ? { categoriaId } : { competicaoId }
    });
    return resposta.data;
  },

  async listarPorCategoria(categoriaId) {
    return this.listar({ categoriaId });
  },

  async listarPorCompeticao(competicaoId) {
    return this.listar({ competicaoId });
  },

  async listarEstrutura({ competicaoId, categoriaId }) {
    const resposta = await http.get('/partidas/estrutura', {
      params: categoriaId ? { categoriaId } : { competicaoId }
    });
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
