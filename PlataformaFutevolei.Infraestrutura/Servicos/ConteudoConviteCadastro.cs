using System.Net;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Infraestrutura.Servicos;

internal static class ConteudoConviteCadastro
{
    public static string MontarLinkConvite(string urlAppBase, string identificadorPublico)
    {
        return $"{urlAppBase.TrimEnd('/')}/cadastro/convite/{Uri.EscapeDataString(identificadorPublico)}";
    }

    public static string MontarAssuntoEmail()
    {
        return "Seu convite para acessar a Plataforma QuebraNunca Futevôlei";
    }

    public static string MontarTextoEmail(ConviteCadastro conviteCadastro, string linkConvite, string codigoConvite)
    {
        return string.Join(
            "\n",
            [
                "Olá!",
                string.Empty,
                "Você foi convidado(a) para usar a Plataforma QuebraNunca Futevôlei como organizador(a).",
                "Preparamos um link pessoal para você criar sua senha e fazer seu primeiro acesso.",
                string.Empty,
                $"E-mail liberado para o convite: {conviteCadastro.Email}",
                $"Código do convite: {codigoConvite}",
                string.Empty,
                "Abra o link abaixo, informe o código do convite e conclua seu cadastro:",
                linkConvite,
                string.Empty,
                "Importante: este link é individual e só permite concluir o acesso com o e-mail convidado."
            ]);
    }

    public static string MontarHtmlEmail(ConviteCadastro conviteCadastro, string linkConvite, string codigoConvite)
    {
        var email = WebUtility.HtmlEncode(conviteCadastro.Email);
        var link = WebUtility.HtmlEncode(linkConvite);
        var codigoConviteCodificado = WebUtility.HtmlEncode(codigoConvite);

        return $"""
            <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
              <p>Olá!</p>
              <p>Você foi convidado(a) para usar a <strong>Plataforma QuebraNunca Futevôlei</strong> como organizador(a).</p>
              <p>Preparamos um link pessoal para você criar sua senha e fazer seu primeiro acesso.</p>
              <p><strong>E-mail liberado para o convite:</strong> {email}</p>
              <p><strong>Código do convite:</strong> {codigoConviteCodificado}</p>
              <p>
                <a href="{link}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;">
                  Abrir convite
                </a>
              </p>
              <p>Se preferir, você também pode abrir este link diretamente:</p>
              <p><a href="{link}">{link}</a></p>
              <p><strong>Importante:</strong> abra o link acima e informe o código do convite para concluir o cadastro com o e-mail convidado.</p>
            </div>
            """;
    }

    public static string MontarTextoWhatsapp(ConviteCadastro conviteCadastro, string linkConvite, string codigoConvite)
    {
        return string.Join(
            "\n",
            [
                "Olá!",
                string.Empty,
                "Você recebeu um convite para acessar a Plataforma QuebraNunca Futevôlei como organizador(a).",
                "Use o link abaixo e o código do convite para criar sua senha e concluir seu primeiro acesso:",
                linkConvite,
                string.Empty,
                $"Código do convite: {codigoConvite}",
                $"E-mail liberado para o convite: {conviteCadastro.Email}",
                "Importante: este link é individual e só funciona com o e-mail convidado."
            ]);
    }
}
