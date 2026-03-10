export function extrairMensagemErro(erro) {
  if (erro?.response?.data?.erro) {
    return erro.response.data.erro;
  }

  if (erro?.response?.data?.message) {
    return erro.response.data.message;
  }

  if (erro?.message) {
    return erro.message;
  }

  return 'Ocorreu um erro inesperado.';
}
