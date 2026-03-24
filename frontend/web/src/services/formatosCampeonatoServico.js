import { http } from './http';

export const formatosCampeonatoServico = {
  async listar() {
    const resposta = await http.get('/formatos-campeonato');
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/formatos-campeonato', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/formatos-campeonato/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/formatos-campeonato/${id}`);
  }
};
