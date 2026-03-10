import { http } from './http';

export const duplasServico = {
  async listar() {
    const resposta = await http.get('/duplas');
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/duplas', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/duplas/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/duplas/${id}`);
  }
};
