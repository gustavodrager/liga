using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Infraestrutura.Configuracoes;

namespace PlataformaFutevolei.Infraestrutura.Servicos;

public class ResendEmailConviteCadastroServico(
    HttpClient httpClient,
    IOptions<ConfiguracaoEmailConviteCadastro> configuracaoAccessor,
    ILogger<ResendEmailConviteCadastroServico> logger
) : IEnvioEmailConviteCadastroServico
{
    private readonly ConfiguracaoEmailConviteCadastro configuracao = configuracaoAccessor.Value;

    public async Task<ResultadoEnvioEmailConviteDto> EnviarAsync(
        ConviteCadastro conviteCadastro,
        CancellationToken cancellationToken = default)
    {
        if (!configuracao.EstaConfigurado())
        {
            logger.LogInformation(
                "Envio automático de e-mail para o convite {ConviteId} ignorado porque o provedor não está configurado.",
                conviteCadastro.Id);
            return new ResultadoEnvioEmailConviteDto(false, false, null, null);
        }

        var linkConvite = $"{configuracao.ObterUrlAppBase()}/cadastro/convite?token={Uri.EscapeDataString(conviteCadastro.Token)}";
        var payload = CriarPayload(conviteCadastro, linkConvite);

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", configuracao.ApiKey.Trim());
        request.Headers.Add("Idempotency-Key", $"convite-cadastro-{conviteCadastro.Id:N}");
        request.Content = JsonContent.Create(payload);

        try
        {
            var response = await httpClient.SendAsync(request, cancellationToken);
            var conteudo = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var erro = ExtrairMensagemErro(conteudo);
                logger.LogWarning(
                    "Falha ao enviar e-mail automático do convite {ConviteId}. Status {StatusCode}. Erro: {Erro}.",
                    conviteCadastro.Id,
                    (int)response.StatusCode,
                    erro);
                return new ResultadoEnvioEmailConviteDto(true, false, erro, null);
            }

            var identificadorMensagem = ExtrairIdentificadorMensagem(conteudo);
            logger.LogInformation(
                "E-mail automático do convite {ConviteId} enviado com sucesso. Mensagem: {MensagemId}.",
                conviteCadastro.Id,
                identificadorMensagem);

            return new ResultadoEnvioEmailConviteDto(true, true, null, identificadorMensagem);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro ao enviar e-mail automático do convite {ConviteId}.", conviteCadastro.Id);
            return new ResultadoEnvioEmailConviteDto(true, false, ex.Message, null);
        }
    }

    private object CriarPayload(ConviteCadastro conviteCadastro, string linkConvite)
    {
        var assunto = "Seu convite para acessar a Plataforma de Futevôlei";
        var texto = MontarTexto(conviteCadastro, linkConvite);
        var html = MontarHtml(conviteCadastro, linkConvite);

        if (string.IsNullOrWhiteSpace(configuracao.ReplyTo))
        {
            return new
            {
                from = configuracao.ObterRemetenteFormatado(),
                to = new[] { conviteCadastro.Email },
                subject = assunto,
                html,
                text = texto
            };
        }

        return new
        {
            from = configuracao.ObterRemetenteFormatado(),
            to = new[] { conviteCadastro.Email },
            subject = assunto,
            html,
            text = texto,
            reply_to = configuracao.ReplyTo!.Trim()
        };
    }

    private static string MontarTexto(ConviteCadastro conviteCadastro, string linkConvite)
    {
        return string.Join(
            "\n",
            [
                "Olá!",
                string.Empty,
                "Você foi convidado(a) para usar a Plataforma de Futevôlei como organizador(a).",
                "Preparamos um link pessoal para você criar sua senha e fazer seu primeiro acesso.",
                string.Empty,
                $"E-mail liberado para o convite: {conviteCadastro.Email}",
                string.Empty,
                "Abra o link abaixo e conclua seu cadastro:",
                linkConvite,
                string.Empty,
                "Importante: este link é individual e só permite concluir o acesso com o e-mail convidado."
            ]);
    }

    private static string MontarHtml(ConviteCadastro conviteCadastro, string linkConvite)
    {
        var email = WebUtility.HtmlEncode(conviteCadastro.Email);
        var link = WebUtility.HtmlEncode(linkConvite);

        return $"""
            <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
              <p>Olá!</p>
              <p>Você foi convidado(a) para usar a <strong>Plataforma de Futevôlei</strong> como organizador(a).</p>
              <p>Preparamos um link pessoal para você criar sua senha e fazer seu primeiro acesso.</p>
              <p><strong>E-mail liberado para o convite:</strong> {email}</p>
              <p>
                <a href="{link}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;">
                  Criar senha e entrar
                </a>
              </p>
              <p>Se preferir, você também pode abrir este link diretamente:</p>
              <p><a href="{link}">{link}</a></p>
              <p><strong>Importante:</strong> este link é individual e só permite concluir o acesso com o e-mail convidado.</p>
            </div>
            """;
    }

    private static string ExtrairIdentificadorMensagem(string conteudo)
    {
        if (string.IsNullOrWhiteSpace(conteudo))
        {
            return string.Empty;
        }

        try
        {
            using var documento = JsonDocument.Parse(conteudo);
            if (documento.RootElement.TryGetProperty("id", out var id))
            {
                return id.GetString() ?? string.Empty;
            }
        }
        catch (JsonException)
        {
        }

        return string.Empty;
    }

    private static string ExtrairMensagemErro(string conteudo)
    {
        if (string.IsNullOrWhiteSpace(conteudo))
        {
            return "Falha ao enviar o e-mail do convite.";
        }

        try
        {
            using var documento = JsonDocument.Parse(conteudo);
            if (documento.RootElement.TryGetProperty("message", out var mensagem))
            {
                return mensagem.GetString() ?? "Falha ao enviar o e-mail do convite.";
            }

            if (documento.RootElement.TryGetProperty("error", out var erro))
            {
                return erro.GetString() ?? "Falha ao enviar o e-mail do convite.";
            }
        }
        catch (JsonException)
        {
        }

        return conteudo.Length <= 500 ? conteudo : conteudo[..500];
    }
}
