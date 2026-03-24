import { http } from './http';

export const regrasCompeticaoServico = {
  async listar() {
    const resposta = await http.get('/regras-competicao');
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/regras-competicao', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/regras-competicao/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/regras-competicao/${id}`);
  }
};
