import { http } from './http';

export const ligasServico = {
  async listar() {
    const resposta = await http.get('/ligas');
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/ligas', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/ligas/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/ligas/${id}`);
  }
};
