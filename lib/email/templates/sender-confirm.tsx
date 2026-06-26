import { Html, Head, Body, Container, Section, Text, Link, Hr, Row, Column } from "@react-email/components";

const base = { fontFamily: "'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif" };
const muted = { color: "#57534e" };
const mono  = { fontFamily: "'Geist Mono', ui-monospace, Menlo, monospace", fontSize: 12 };

export function SenderConfirmEmail({
  confirmUrl, signerNames, documentName, sha256, senderIp, expiresAt,
}: {
  confirmUrl: string; signerNames: string[]; documentName?: string;
  sha256?: string; senderIp?: string; expiresAt?: Date;
}) {
  return (
    <Html lang="nb">
      <Head />
      <Body style={{ ...base, background: "#fafaf9", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 540, margin: "0 auto", padding: "24px 0" }}>
          <Section style={{ background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 8, padding: "36px 40px" }}>
            {/* Logo */}
            <Text style={{ ...base, fontWeight: 600, fontSize: 14, letterSpacing: -0.3, marginBottom: 28, marginTop: 0 }}>esign</Text>

            <Text style={{ ...base, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 14px", color: "#0a0a0a" }}>
              Bekreft signeringsoppdrag
            </Text>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 14px" }}>
              Du har bedt om signering av <strong style={{ color: "#0a0a0a" }}>{documentName ?? "dokumentet"}</strong> hos:
            </Text>

            <Section style={{ margin: "0 0 18px" }}>
              {signerNames.map((name, i) => (
                <Text key={i} style={{ ...base, fontSize: 14, color: "#0a0a0a", lineHeight: 1.8, margin: 0 }}>
                  – {name}
                </Text>
              ))}
            </Section>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 18px" }}>
              Klikk knappen under for å se dokumentet og bekrefte oppdraget. Først når du bekrefter, går invitasjonene ut til signantene.
            </Text>

            <Section style={{ margin: "18px 0 22px" }}>
              <Link href={confirmUrl} style={{ display: "inline-block", padding: "12px 22px", background: "#0a0a0a", color: "#ffffff", textDecoration: "none", borderRadius: 6, fontSize: 14, fontWeight: 500 }}>
                Se og bekreft oppdraget
              </Link>
            </Section>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 0" }}>
              Hvis du ikke gjenkjenner dette oppdraget kan du ignorere e-posten — ingenting sendes ut.
            </Text>

            <Hr style={{ borderColor: "#e7e5e4", margin: "28px 0 18px" }} />
            <Text style={{ ...base, ...mono, ...muted, lineHeight: 1.7, margin: 0 }}>
              {senderIp && <>ip &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{senderIp}<br /></>}
              {sha256 && <>sha-256 &nbsp;{sha256.slice(0, 16)}…{sha256.slice(-4)}<br /></>}
              {expiresAt && <>utløper &nbsp;{expiresAt.toLocaleString("nb-NO")}</>}
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
