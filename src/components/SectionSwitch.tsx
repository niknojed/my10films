import Link from "next/link";
import { SECTIONS, SECTION_INFO, type Section } from "@/lib/sections";

/** Films and Shows. Real links, so each section has its own address, history entry and canonical. */
export default function SectionSwitch({ current }: { current: Section }) {
  return (
    <nav aria-label="Section" className="switch">
      {SECTIONS.map((s) => (
        <Link key={s} href={SECTION_INFO[s].path} aria-current={s === current ? "page" : undefined}>
          {SECTION_INFO[s].nav}
        </Link>
      ))}
    </nav>
  );
}
