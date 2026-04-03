import { http } from './http';

export const pendenciasServico = {
  async listar() {
    const resposta = await http.get('/pendencias');
    return resposta.data;
  },

  async aprovarPartida(id, observacao) {
    const resposta = await http.post(`/pendencias/${id}/aprovar`, { observacao: observacao || null });
    return resposta.data;
  },

  async contestarPartida(id, observacao) {
    const resposta = await http.post(`/pendencias/${id}/contestar`, { observacao: observacao || null });
    return resposta.data;
  },

  async completarContato(id, email) {
    const resposta = await http.put(`/pendencias/${id}/contato`, { email });
    return resposta.data;
  }
};
