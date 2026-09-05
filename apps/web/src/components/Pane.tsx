type Props = { header: React.ReactNode; children: React.ReactNode; className?: string };

export function Pane({ header, children, className = "" }: Props) {
  return (
    <section className={`flex min-h-0 flex-col ${className}`}>
      <div className="h-9 shrink-0 flex items-center justify-between px-4 border-b text-[13px]">{header}</div>
      <div className="relative min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
