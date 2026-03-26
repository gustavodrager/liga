import { http } from './http';

export const usuariosServico = {
  async obterMeu() {
    const resposta = await http.get('/usuarios/me');
    return resposta.data;
  },

  async atualizarMeu(dados) {
    const resposta = await http.put('/usuarios/me', dados);
    return resposta.data;
  },

  async vincularMeuAtleta(dados) {
    const resposta = await http.post('/usuarios/me/vincular-atleta', dados);
    return resposta.data;
  },

  async listar(filtros) {
    const resposta = await http.get('/usuarios', {
      params: filtros
    });
    return resposta.data;
  },

  async atualizar(id, dados) {
    const resposta = await http.put(`/usuarios/${id}`, dados);
    return resposta.data;
  }
};
