# Regras específicas da API

- Controller cuida de HTTP, autorização, binding e status code
- Regra de negócio fica na aplicação e no domínio
- Não expor entidades diretamente; seguir DTOs e mapeadores já existentes
- Reutilizar rotas, padrões de request/response e mensagens já adotados
- Validar entrada sem duplicar invariantes do serviço ou do domínio
- Propagar `CancellationToken` e manter respostas claras e consistentes
- Fluxos novos devem preferir ampliar endpoints existentes antes de criar controller paralelo sem necessidade
- Para importação CSV, manter upload em `multipart/form-data` e devolver resumo por linha, sem mover validação para controller
- Em importação ou criação em lote, reutilizar os serviços já existentes de atleta, dupla, inscrição e partida; não criar atalho direto no controller
- Em fluxos que dependem de dupla inscrita no campeonato, considerar a ordem normalizada dos atletas para evitar falso negativo de inscrição
