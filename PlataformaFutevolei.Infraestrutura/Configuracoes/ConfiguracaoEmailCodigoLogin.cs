namespace PlataformaFutevolei.Infraestrutura.Configuracoes;

public class ConfiguracaoEmailCodigoLogin
{
    public const string Secao = "EmailCodigoLogin";

    public string? EmailOrigemSobrescrito { get; set; }
    public string? EmailDestinoSobrescrito { get; set; }

    public string ObterEmailDestino(string emailUsuario)
    {
        if (string.IsNullOrWhiteSpace(emailUsuario))
        {
            return string.Empty;
        }

        var emailNormalizado = emailUsuario.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(EmailOrigemSobrescrito) || string.IsNullOrWhiteSpace(EmailDestinoSobrescrito))
        {
            return emailNormalizado;
        }

        var emailOrigemNormalizado = EmailOrigemSobrescrito.Trim().ToLowerInvariant();
        if (!string.Equals(emailNormalizado, emailOrigemNormalizado, StringComparison.OrdinalIgnoreCase))
        {
            return emailNormalizado;
        }

        return EmailDestinoSobrescrito.Trim().ToLowerInvariant();
    }

    public bool DeveSobrescrever(string emailUsuario)
    {
        if (string.IsNullOrWhiteSpace(emailUsuario)
            || string.IsNullOrWhiteSpace(EmailOrigemSobrescrito)
            || string.IsNullOrWhiteSpace(EmailDestinoSobrescrito))
        {
            return false;
        }

        return string.Equals(
            emailUsuario.Trim(),
            EmailOrigemSobrescrito.Trim(),
            StringComparison.OrdinalIgnoreCase);
    }
}
