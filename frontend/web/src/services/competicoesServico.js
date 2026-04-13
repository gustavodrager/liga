import { http } from './http';

export const competicoesServico = {
  async listar() {
    const resposta = await http.get('/competicoes');
    return resposta.data;
  },

  async listarVisiveis() {
    const resposta = await http.get('/competicoes', {
      params: { incluirPublicas: true }
    });
    return resposta.data;
  },

  async obterResumoPublico() {
    const resposta = await http.get('/competicoes/resumo-publico');
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/competicoes', dados);
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/competicoes/${id}`, dados);
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/competicoes/${id}`);
  }
};
