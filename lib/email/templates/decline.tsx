import { Html, Head, Body, Container, Section, Text, Link, Hr } from "@react-email/components";

const base = { fontFamily: "'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif" };
const muted = { color: "#57534e" };
const mono  = { fontFamily: "'Geist Mono', ui-monospace, Menlo, monospace", fontSize: 12 };

export function DeclineEmail({
  recipientName, documentName, declinerName, declinerEmail, reason, declinedAt, declinedIp,
}: {
  recipientName: string; documentName: string; declinerName: string;
  declinerEmail?: string; reason: string; declinedAt?: string; declinedIp?: string;
}) {
  return (
    <Html lang="nb">
      <Head />
      <Body style={{ ...base, background: "#fafaf9", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 540, margin: "0 auto", padding: "24px 0" }}>
          <Section style={{ background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 8, padding: "36px 40px" }}>
            <Text style={{ ...base, fontWeight: 600, fontSize: 14, letterSpacing: -0.3, marginBottom: 28, marginTop: 0 }}>esign</Text>

            <Text style={{ ...base, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 14px", color: "#0a0a0a" }}>
              Signeringsoppdrag avbrutt
            </Text>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 14px" }}>Hei {recipientName},</Text>

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 18px" }}>
              <strong style={{ color: "#0a0a0a" }}>{declinerName}</strong> har avvist å signere{" "}
              <strong style={{ color: "#0a0a0a" }}>{documentName}</strong>.
            </Text>

            {reason && (
              <Section style={{ background: "#fafaf9", border: "1px solid #e7e5e4", borderLeft: "3px solid #a8a29e", padding: "12px 16px", borderRadius: 4, margin: "4px 0 18px" }}>
                <Text style={{ ...base, fontSize: 14, ...muted, lineHeight: 1.55, fontStyle: "italic", margin: 0 }}>
                  &quot;{reason}&quot;
                </Text>
              </Section>
            )}

            <Text style={{ ...base, fontSize: 14.5, ...muted, lineHeight: 1.65, margin: "0 0 18px" }}>
              Oppdraget er kansellert. Øvrige signanter er varslet om at de ikke trenger å signere.
            </Text>

            <Section style={{ margin: "18px 0 22px" }}>
              <Link href="/" style={{ display: "inline-block", padding: "12px 22px", background: "#0a0a0a", color: "#ffffff", textDecoration: "none", borderRadius: 6, fontSize: 14, fontWeight: 500 }}>
                Opprett nytt oppdrag
              </Link>
            </Section>

            <Hr style={{ borderColor: "#e7e5e4", margin: "28px 0 18px" }} />
            <Text style={{ ...base, ...mono, ...muted, lineHeight: 1.7, margin: 0 }}>
              {declinerEmail && <>avvist_av &nbsp;&nbsp;{declinerEmail}<br /></>}
              {declinedAt && <>avvist_kl &nbsp;&nbsp;{declinedAt}<br /></>}
              {declinedIp && <>ip &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{declinedIp}</>}
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
