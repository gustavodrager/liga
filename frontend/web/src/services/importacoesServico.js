import { http } from './http';

export const importacoesServico = {
  async importar(tipo, arquivo, opcoes = {}) {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    if (opcoes.campeonatoId) {
      formData.append('campeonatoId', opcoes.campeonatoId);
    }

    const resposta = await http.post(`/importacoes/${tipo}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return resposta.data;
  }
};
