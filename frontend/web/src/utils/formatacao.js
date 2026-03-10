export function formatarData(data) {
  if (!data) {
    return '-';
  }

  return new Date(data).toLocaleDateString('pt-BR');
}

export function formatarDataHora(data) {
  if (!data) {
    return '-';
  }

  return new Date(data).toLocaleString('pt-BR');
}

export function paraInputData(data) {
  if (!data) {
    return '';
  }

  const objetoData = new Date(data);
  const ano = objetoData.getFullYear();
  const mes = String(objetoData.getMonth() + 1).padStart(2, '0');
  const dia = String(objetoData.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function paraInputDataHora(data) {
  if (!data) {
    return '';
  }

  const objetoData = new Date(data);
  const ano = objetoData.getFullYear();
  const mes = String(objetoData.getMonth() + 1).padStart(2, '0');
  const dia = String(objetoData.getDate()).padStart(2, '0');
  const horas = String(objetoData.getHours()).padStart(2, '0');
  const minutos = String(objetoData.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
}
