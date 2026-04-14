import { http } from './http';

export const convitesCadastroServico = {
  async listar() {
    const resposta = await http.get('/convites-cadastro');
    return resposta.data;
  },

  async listarAtletasElegiveis() {
    const resposta = await http.get('/convites-cadastro/atletas-elegiveis');
    return resposta.data;
  },

  async obterPorId(id) {
    const resposta = await http.get(`/convites-cadastro/${id}`);
    return resposta.data;
  },

  async obterLinkAceite(id) {
    const resposta = await http.get(`/convites-cadastro/${id}/link-aceite`);
    return resposta.data;
  },

  async obterPublico(identificadorOuToken) {
    const resposta = await http.get(`/convites-cadastro/publico/${encodeURIComponent(identificadorOuToken)}`);
    return resposta.data;
  },

  async criar(dados) {
    const resposta = await http.post('/convites-cadastro', dados);
    return resposta.data;
  },

  async enviarEmail(id) {
    const resposta = await http.post(`/convites-cadastro/${id}/enviar-email`);
    return resposta.data;
  },

  async enviarWhatsapp(id) {
    const resposta = await http.post(`/convites-cadastro/${id}/enviar-whatsapp`);
    return resposta.data;
  },

  async desativar(id) {
    await http.delete(`/convites-cadastro/${id}`);
  }
};
