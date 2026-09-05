import { Blob as NodeBlob } from "node:buffer";
import { PdfError, requestPdf, type PdfErrorCode } from "@/lib/pdf";

// jsdom's global Blob isn't recognized by the fetch Response constructor here,
// which stringifies it instead of using it as the body; node:buffer's Blob is.
const ok = async () => new Response(new NodeBlob(["%PDF"]) as unknown as Blob, { headers: { "content-type": "application/pdf" } });

it("posts html and page and returns a blob", async () => {
  const fetchImpl = vi.fn<typeof fetch>(ok);
  const blob = await requestPdf("<p/>", "A4", fetchImpl as unknown as typeof fetch);
  expect(blob.size).toBe(4);
  expect(fetchImpl.mock.calls[0][0]).toBe("/api/pdf");
  expect(JSON.parse(fetchImpl.mock.calls[0][1]!.body as string)).toEqual({ html: "<p/>", page: "A4" });
});

it.each([
  [429, "rate-limited"],
  [413, "too-large"],
  [502, "failed"],
])("maps %s to %s", async (status, code) => {
  const fetchImpl = async () => new Response("", { status });
  await expect(requestPdf("<p/>", "A4", fetchImpl as unknown as typeof fetch)).rejects.toMatchObject({
    code: code as PdfErrorCode,
  } satisfies Partial<PdfError>);
});
