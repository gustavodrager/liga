import { http } from './http';

export const atletasServico = {
  async listar(filtros = {}) {
    const resposta = await http.get('/atletas', {
      params: filtros.somenteInscritosMinhasCompeticoes
        ? { somenteInscritosMinhasCompeticoes: true }
        : undefined
    });
    return resposta.data;
  },

  async buscar(termo) {
    const resposta = await http.get('/atletas/busca', {
      params: termo ? { termo } : undefined
    });
    return resposta.data;
  },

  async listarPendencias() {
    const resposta = await http.get('/atletas/pendencias');
    return resposta.data;
  },

  async obterPorId(id) {
    const resposta = await http.get(`/atletas/${id}`);
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

  async informarEmailPendente(id, email) {
    const resposta = await http.put(`/atletas/pendencias/${id}/email`, { email });
    return resposta.data;
  },

  async remover(id) {
    await http.delete(`/atletas/${id}`);
  }
};
