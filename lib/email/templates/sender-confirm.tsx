import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

export function SenderConfirmEmail({ confirmUrl, signerNames }: { confirmUrl: string; signerNames: string[] }) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Bekreft signeringsoppdrag</Heading>
        <Text>Du har bedt oss sende et dokument til signering hos: {signerNames.join(", ")}.</Text>
        <Text>Klikk under for å bekrefte. Først da går invitasjonen ut til signantene.</Text>
        <Button href={confirmUrl} style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 6 }}>Bekreft signeringsoppdrag</Button>
        <Text style={{ fontSize: 12, color: "#666" }}>Hvis du ikke ba om dette, kan du trygt ignorere e-posten.</Text>
      </Container>
    </Body></Html>
  );
}
