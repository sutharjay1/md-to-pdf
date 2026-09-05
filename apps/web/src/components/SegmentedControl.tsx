import { useLayoutEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@md-to-pdf/ui/components/tabs";

export type View = "write" | "preview" | "html" | "pdf";

type Option = { value: View; label: string };

type Props = {
  value: View;
  onChange: (view: View) => void;
  options: Option[];
};

export function SegmentedControl({ value, onChange, options }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });

  useLayoutEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (!list || !active) return;
    setIndicator({ x: active.offsetLeft, width: active.offsetWidth });
  }, [value, options]);

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as View)}>
      <TabsList
        ref={listRef}
        className="relative h-7 self-center gap-0.5 bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-7"
      >
        <span
          aria-hidden
          className="absolute top-0 left-0 h-7 rounded-md bg-muted transition-[translate,width] duration-(--dur-move) ease-(--ease-out-expo)"
          style={{ translate: `${indicator.x}px 0`, width: indicator.width }}
        />
        {options.map((o) => (
          <TabsTrigger
            key={o.value}
            value={o.value}
            className="relative z-10 h-7 px-2.5 text-[13px] text-muted-foreground data-[state=active]:text-primary-text dark:data-[state=active]:text-primary-text data-[state=active]:bg-transparent group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none transition-colors duration-(--dur-fast)"
          >
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
