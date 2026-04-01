namespace PlataformaFutevolei.Infraestrutura.Configuracoes;

public class ConfiguracaoWhatsappConviteCadastro
{
    public const string Secao = "WhatsappConvitesCadastro";

    public bool Enabled { get; set; }
    public string AccountSid { get; set; } = string.Empty;
    public string AuthToken { get; set; } = string.Empty;
    public string RemetenteWhatsapp { get; set; } = string.Empty;
    public string UrlApp { get; set; } = "http://localhost:5173";

    public string? ObterMensagemConfiguracaoIncompleta()
    {
        if (!Enabled)
        {
            return "O envio automático de WhatsApp está desabilitado. Defina WhatsappConvitesCadastro:Enabled como true para ativá-lo.";
        }

        var camposAusentes = new List<string>();

        if (string.IsNullOrWhiteSpace(AccountSid))
        {
            camposAusentes.Add($"{Secao}:AccountSid");
        }

        if (string.IsNullOrWhiteSpace(AuthToken))
        {
            camposAusentes.Add($"{Secao}:AuthToken");
        }

        if (string.IsNullOrWhiteSpace(RemetenteWhatsapp))
        {
            camposAusentes.Add($"{Secao}:RemetenteWhatsapp");
        }

        if (string.IsNullOrWhiteSpace(UrlApp))
        {
            camposAusentes.Add($"{Secao}:UrlApp");
        }

        return camposAusentes.Count == 0
            ? null
            : $"O envio automático de WhatsApp não está configurado. Preencha: {string.Join(", ", camposAusentes)}.";
    }

    public string ObterUrlAppBase()
    {
        return string.IsNullOrWhiteSpace(UrlApp)
            ? "http://localhost:5173"
            : UrlApp.Trim().TrimEnd('/');
    }
}
