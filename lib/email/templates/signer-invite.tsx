import { Html, Head, Body, Container, Section, Text, Link, Hr } from "@react-email/components";

const base = { fontFamily: "'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif" };
const muted = { color: "#57534e" };
const mono  = { fontFamily: "'Geist Mono', ui-monospace, Menlo, monospace", fontSize: 12 };

export function SignerInviteEmail({
  signerName, senderEmail, signUrl, documentName, expiresAt, sha256,
}: {
  signerName: string; senderEmail: string; signUrl: string;
  documentName: string; expiresAt: Date; sha256?: string;
}) {
  return (
    <Html lang="nb">
      <Head />
      <Body style={{ ...base, background: "#fafaf9", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 540, margin: "0 auto", padding: "24px 0" }}>
          <Section style={{ background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 8, padding: "36px 40px" }}>
            <Text style={{ ...base, fontWeight: 600, fontSize: 14, letterSpacing: -0.3, marginBottom: 28, marginTop: 0 }}>esign</Text>

            <Text style={{ ...base, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 14px", color: "#0a0a0a" }}>
              Du har et dokument til signering
            </Text>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 14px" }}>Hei {signerName},</Text>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 18px" }}>
              <span style={{ ...mono, color: "#0a0a0a" }}>{senderEmail}</span>{" "}
              har sendt deg <strong style={{ color: "#0a0a0a" }}>{documentName}</strong> til elektronisk signering. Klikk for å åpne og signere.
            </Text>

            <Section style={{ margin: "18px 0 22px" }}>
              <Link href={signUrl} style={{ display: "inline-block", padding: "12px 22px", background: "#0a0a0a", color: "#ffffff", textDecoration: "none", borderRadius: 6, fontSize: 14, fontWeight: 500 }}>
                Åpne og signer
              </Link>
            </Section>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65 }}>
              Lenken utløper <strong style={{ color: "#0a0a0a" }}>{expiresAt.toLocaleString("nb-NO")}</strong>. Signaturen blir verifisert med e-post og eventuell SMS.
            </Text>

            <Hr style={{ borderColor: "#e7e5e4", margin: "28px 0 18px" }} />
            <Text style={{ ...base, ...mono, ...muted, lineHeight: 1.7, margin: 0 }}>
              {sha256 && <>sha-256 &nbsp;&nbsp;&nbsp;{sha256.slice(0, 16)}…{sha256.slice(-4)}<br /></>}
              avsender &nbsp;&nbsp;{senderEmail}
            </Text>
          </Section>
          <Text style={{ ...base, ...mono, color: "#a8a29e", fontSize: 11.5, textAlign: "center", marginTop: 12 }}>
            esign · gratis elektronisk signering · esign.newcommerce.no
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
