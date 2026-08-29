import { Link } from "wouter";

export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link href="/home" className="group inline-flex items-center gap-3" aria-label="Virasat home">
      <span className="brand-tab-mark" aria-hidden="true"><i /><i /><b /></span>
      {!compact && <span className={`brand-wordmark ${light ? "brand-wordmark-light" : ""}`}>Virasat</span>}
    </Link>
  );
}

export function RecordMark() {
  return <span aria-hidden="true" className="inline-block h-3 w-3 border-l-2 border-t-2 border-[#B78A4A]" />;
}
