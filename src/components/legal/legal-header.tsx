import Link from "next/link";

interface LegalHeaderProps {
  currentTab: "privacy" | "terms" | "rally-rules";
}

export function LegalHeader({ currentTab }: LegalHeaderProps) {
  const tabs = [
    { id: "privacy", label: "Privacy Notice", href: "/privacy" },
    { id: "terms", label: "Terms of Use", href: "/terms" },
    { id: "rally-rules", label: "Rally & Raffle Rules", href: "/rally-rules" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e8ded5] bg-[#fcf9f5]/95 backdrop-blur-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Back Link & Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#f5ece9] text-[#1e1b19] border border-[#e8ded5] text-xs font-display font-bold transition shadow-2xs active:scale-95 shrink-0"
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-[#ff5e4d]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Campus Board</span>
          </Link>
          <span className="text-xs text-[#8e706c] font-body border-l border-[#e8ded5] pl-2.5 hidden sm:inline">
            Intramurals 2026
          </span>
        </div>

        {/* Tab navigation */}
        <nav aria-label="Legal Documents" className="flex items-center gap-1 sm:gap-1.5">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-display font-bold transition ${
                  isActive
                    ? "bg-[#ffdad5] text-[#b4281e]"
                    : "text-[#5a413d] hover:bg-white hover:text-[#1e1b19]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function LegalAdvisoryBanner() {
  return (
    <aside aria-label="Advisory Review Notice" className="p-4 rounded-2xl bg-[#fff8f5] border border-[#ffdad5] text-xs text-[#5a413d] font-body flex items-start gap-3 my-4">
      <div className="w-7 h-7 rounded-lg bg-[#ffdad5] text-[#b4281e] flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <div className="leading-relaxed">
        <strong className="font-display font-bold text-[#b4281e] block">
          Institutional Advisory &amp; Compliance Review Notice
        </strong>
        <span>
          This document is published under the Philippine Data Privacy Act of 2012 (RA 10173). The provisions below represent standard student-friendly protections and are subject to final review and endorsement by the Data Protection Officer (DPO), faculty adviser, and student council of{" "}
          <span className="font-mono bg-[#ffdad5]/60 px-1 py-0.5 rounded font-semibold text-[#8e4e14]">[CAMPUS / UNIVERSITY NAME]</span>.
        </span>
      </div>
    </aside>
  );
}
