import { http } from './http';

export const duplasServico = {
  async listar(filtros = {}) {
    const resposta = await http.get('/duplas', {
      params: filtros.somenteInscritasMinhasCompeticoes
        ? { somenteInscritasMinhasCompeticoes: true }
        : undefined
    });
    return resposta.data;
  },

  async listarPorAtleta(atletaId) {
    const resposta = await http.get(`/duplas/por-atleta/${atletaId}`);
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
