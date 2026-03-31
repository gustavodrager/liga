namespace PlataformaFutevolei.Infraestrutura.Configuracoes;

public class ConfiguracaoEmailConviteCadastro
{
    public const string Secao = "EmailConvitesCadastro";

    public string BaseUrl { get; set; } = "https://api.resend.com";
    public string ApiKey { get; set; } = string.Empty;
    public string RemetenteEmail { get; set; } = string.Empty;
    public string? RemetenteNome { get; set; }
    public string? ReplyTo { get; set; }
    public string UrlApp { get; set; } = "http://localhost:5173";

    public bool EstaConfigurado()
    {
        return !string.IsNullOrWhiteSpace(ApiKey)
            && !string.IsNullOrWhiteSpace(RemetenteEmail)
            && !string.IsNullOrWhiteSpace(UrlApp);
    }

    public string ObterBaseUrl()
    {
        return string.IsNullOrWhiteSpace(BaseUrl)
            ? "https://api.resend.com"
            : BaseUrl.Trim().TrimEnd('/');
    }

    public string ObterUrlAppBase()
    {
        return string.IsNullOrWhiteSpace(UrlApp)
            ? "http://localhost:5173"
            : UrlApp.Trim().TrimEnd('/');
    }

    public string ObterRemetenteFormatado()
    {
        var email = RemetenteEmail.Trim();
        return string.IsNullOrWhiteSpace(RemetenteNome)
            ? email
            : $"{RemetenteNome.Trim()} <{email}>";
    }
}
