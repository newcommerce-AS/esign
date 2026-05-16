import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

export function SignerInviteEmail({ signerName, senderEmail, signUrl, documentName, expiresAt }: {
  signerName: string; senderEmail: string; signUrl: string; documentName: string; expiresAt: Date;
}) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Du har et dokument til signering</Heading>
        <Text>Hei {signerName},</Text>
        <Text>{senderEmail} har sendt deg <b>{documentName}</b> til elektronisk signering.</Text>
        <Button href={signUrl} style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 6 }}>Åpne og signer</Button>
        <Text style={{ fontSize: 12, color: "#666" }}>Lenken utløper {expiresAt.toLocaleString("nb-NO")}.</Text>
      </Container>
    </Body></Html>
  );
}
