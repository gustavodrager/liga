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

export function normalizarDataParaApi(data) {
  if (!data) {
    return null;
  }

  const dataNormalizada = data.trim();
  if (!dataNormalizada) {
    return null;
  }

  return `${dataNormalizada}T00:00:00`;
}

export function limparCpf(valor) {
  return (valor || '').replace(/\D/g, '').slice(0, 11);
}

export function formatarCpfParaInput(valor) {
  const cpf = limparCpf(valor);

  if (cpf.length <= 3) {
    return cpf;
  }

  if (cpf.length <= 6) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  }

  if (cpf.length <= 9) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  }

  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function validarCpf(valor) {
  const cpf = limparCpf(valor);

  if (!cpf) {
    return true;
  }

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  function calcularDigito(base, pesoInicial) {
    let soma = 0;

    for (let indice = 0; indice < base.length; indice += 1) {
      soma += Number(base[indice]) * (pesoInicial - indice);
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  const digito2 = calcularDigito(`${cpf.slice(0, 9)}${digito1}`, 11);

  return Number(cpf[9]) === digito1 && Number(cpf[10]) === digito2;
}

export function limparTelefone(valor) {
  return (valor || '').replace(/\D/g, '').slice(0, 11);
}

export function formatarTelefoneParaInput(valor) {
  const telefone = limparTelefone(valor);

  if (telefone.length === 0) {
    return '';
  }

  if (telefone.length <= 2) {
    return `(${telefone}`;
  }

  if (telefone.length <= 6) {
    return `(${telefone.slice(0, 2)}) ${telefone.slice(2)}`;
  }

  if (telefone.length <= 10) {
    return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;
  }

  return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
}
