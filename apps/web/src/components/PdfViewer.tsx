import { PDFViewer } from "@/components/extend/pdf-viewer";

type Props = { url: string; fileName: string };

export default function PdfViewer({ url, fileName }: Props) {
  return (
    <PDFViewer
      src={url}
      fileName={fileName}
      showToolbar
      showUpload={false}
      showRotateControls={false}
      showDownload={false}
      className="h-full"
    />
  );
}
