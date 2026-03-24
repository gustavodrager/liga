import { http } from './http';

export const locaisServico = {
  async listar() {
    const resposta = await http.get('/locais');
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/locais', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/locais/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/locais/${id}`);
  }
};
