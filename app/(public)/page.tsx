import { CreateForm } from "./create-form";
export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-semibold">esign — gratis elektronisk signering</h1>
      <p className="mt-2 text-sm text-gray-600">Last opp et dokument, legg til signanter, send. Vi sender en bekreftelsesmail til deg først — signantene får e-post først når du bekrefter.</p>
      <CreateForm />
      <section className="mt-12 prose">
        <h2>For utviklere og AI-agenter</h2>
        <p>REST API på <code>/api/v1</code>. MCP-server: <code>npm i -g @newcommerce/esign-mcp</code>.</p>
      </section>
    </main>
  );
}
