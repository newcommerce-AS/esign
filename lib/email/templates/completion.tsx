import { Html, Head, Body, Container, Section, Text, Link, Hr } from "@react-email/components";

const base = { fontFamily: "'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif" };
const muted = { color: "#57534e" };
const mono  = { fontFamily: "'Geist Mono', ui-monospace, Menlo, monospace", fontSize: 12 };

export function CompletionEmail({
  recipientName, documentName, allSigners, sha256, attachmentName,
}: {
  recipientName: string; documentName: string;
  allSigners: string[] | { name: string; signedAt: string }[];
  sha256?: string; attachmentName?: string;
}) {
  return (
    <Html lang="nb">
      <Head />
      <Body style={{ ...base, background: "#fafaf9", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 540, margin: "0 auto", padding: "24px 0" }}>
          <Section style={{ background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 8, padding: "36px 40px" }}>
            <Text style={{ ...base, fontWeight: 600, fontSize: 14, letterSpacing: -0.3, marginBottom: 28, marginTop: 0 }}>esign</Text>

            <Text style={{ ...base, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 14px", color: "#0a0a0a" }}>
              Dokumentet er signert
            </Text>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 14px" }}>Hei {recipientName},</Text>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 18px" }}>
              <strong style={{ color: "#0a0a0a" }}>{documentName}</strong> er signert av alle parter:
            </Text>

            <Section style={{ margin: "0 0 18px" }}>
              {allSigners.map((s, i) => {
                const name = typeof s === "string" ? s : s.name;
                const at   = typeof s === "string" ? null : s.signedAt;
                return (
                  <Text key={i} style={{ ...base, fontSize: 14, color: "#0a0a0a", lineHeight: 1.9, margin: 0 }}>
                    ✓ {name}{at ? <span style={{ ...mono, ...muted }}> · {at}</span> : null}
                  </Text>
                );
              })}
            </Section>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 18px" }}>
              Signert PDF ligger som vedlegg — siste side er audit-sporet med full hendelseslogg.
            </Text>

            <Text style={{ ...base, fontSize: 14.5, color: "#0a0a0a", fontWeight: 600, margin: 0 }}>
              Vi har slettet dokumentet fra våre servere. Vedlegget er originalen — behold denne kopien.
            </Text>

            <Hr style={{ borderColor: "#e7e5e4", margin: "28px 0 18px" }} />
            <Text style={{ ...base, ...mono, ...muted, lineHeight: 1.7, margin: 0 }}>
              {attachmentName && <>attachment &nbsp;{attachmentName}<br /></>}
              {sha256 && <>sha-256 &nbsp;&nbsp;&nbsp;&nbsp;{sha256.slice(0, 16)}…{sha256.slice(-4)}<br /></>}
              audit-pages s. siste
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
