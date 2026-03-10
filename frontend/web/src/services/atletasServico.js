import { http } from './http';

export const atletasServico = {
  async listar() {
    const resposta = await http.get('/atletas');
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/atletas', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/atletas/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/atletas/${id}`);
  }
};
