import {
  Activity, Bell, Blocks, Check, ChevronRight, Clock3, FileCheck2, Fingerprint,
  LayoutDashboard, LockKeyhole, Radar, Settings2, ShieldCheck, Wallet, Waves,
  type LucideIcon
} from "lucide-react";

const projects = [
  { name: "Northstar Protocol", ticker: "NSTAR", chain: "Base", contracts: "3 contracts", status: "Monitoring", tone: "green", updated: "4 min ago" },
  { name: "Orbit Finance", ticker: "ORBT", chain: "Base", contracts: "2 contracts", status: "Review needed", tone: "amber", updated: "18 min ago" },
  { name: "Cedar Network", ticker: "CEDAR", chain: "Base", contracts: "1 contract", status: "Monitoring", tone: "green", updated: "1 hour ago" }
];

const evidence = [
  { icon: Check, title: "Contract bytecode observed", detail: "Northstar Protocol · Base · 4 min ago", status: "Observed" },
  { icon: Wallet, title: "Treasury wallet registered", detail: "Orbit Finance · Project-reported · 18 min ago", status: "Reported" },
  { icon: Activity, title: "Token supply snapshot updated", detail: "Cedar Network · Base · 1 hour ago", status: "Observed" }
];

function NavItem({ icon: Icon, label, active = false }: { icon: LucideIcon; label: string; active?: boolean }) {
  return <a className={`nav-item ${active ? "active" : ""}`} href={active ? "/" : "#"}><Icon size={16} strokeWidth={1.7}/>{label}</a>;
}

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div><div className="brand-name">TRUSTCHAIN</div><div className="brand-sub">PROJECT INTELLIGENCE</div></div>
        </div>
        <div>
          <div className="nav-label">WORKSPACE</div>
          <nav className="nav-list">
            <NavItem icon={LayoutDashboard} label="Overview" active/>
            <NavItem icon={Blocks} label="Projects"/>
            <NavItem icon={FileCheck2} label="Evidence ledger"/>
            <NavItem icon={Radar} label="Monitoring"/>
            <NavItem icon={Bell} label="Alerts"/>
          </nav>
        </div>
        <div>
          <div className="nav-label">MANAGEMENT</div>
          <nav className="nav-list">
            <NavItem icon={Fingerprint} label="Organization"/>
            <NavItem icon={Settings2} label="Settings"/>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={15} color="#42d6a0"/> Evidence-first platform</div>
          <p className="muted text-[10px] leading-relaxed mt-2 mb-0">Trustchain reports observable evidence. It does not certify that a project or asset is safe.</p>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-brand">
          <div className="brand-mark">T</div>
          <div className="brand-name">TRUSTCHAIN</div>
        </div>
        <header className="topbar">
          <div>
            <div className="eyebrow">Workspace / Overview</div>
            <h1 className="page-title">Project intelligence</h1>
            <p className="muted text-sm m-0">A clear view of project evidence, on-chain activity, and monitoring health.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill"><span className="dot"/> Base network</span>
            <span className="pill">Preview · onboarding next</span>
          </div>
        </header>

        <section className="callout flex items-start gap-3">
          <div className="mt-0.5 text-emerald-300"><ShieldCheck size={19}/></div>
          <div>
            <div className="text-sm font-semibold text-emerald-100">Evidence, not promises.</div>
            <p className="muted text-xs leading-relaxed mt-1 mb-0">Trustchain separates independently observed on-chain facts from information supplied by project teams. Every evidence item should retain its source and verification time.</p>
          </div>
        </section>

        <section className="grid-stats">
          <div className="stat-card"><div className="stat-label flex items-center gap-2"><Blocks size={14}/> Projects tracked</div><div className="stat-value">03</div><div className="stat-foot">Demo workspace data</div></div>
          <div className="stat-card"><div className="stat-label flex items-center gap-2"><FileCheck2 size={14}/> Evidence records</div><div className="stat-value">128</div><div className="stat-foot">Illustrative records</div></div>
          <div className="stat-card"><div className="stat-label flex items-center gap-2"><Activity size={14}/> Monitoring checks</div><div className="stat-value">96.8%</div><div className="stat-foot">Illustrative monitoring metric</div></div>
          <div className="stat-card"><div className="stat-label flex items-center gap-2"><Bell size={14}/> Open alerts</div><div className="stat-value">02</div><div className="stat-foot">Illustrative alert count</div></div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-heading">
              <div><div className="panel-title">Tracked projects</div><div className="muted text-[11px] mt-1">Your registered Web3 project portfolio</div></div>
              <a href="#projects" className="text-xs text-emerald-300 no-underline flex items-center gap-1">View all <ChevronRight size={13}/></a>
            </div>
            {projects.map((project) => (
              <div className="project-row" key={project.ticker}>
                <div className="project-icon">{project.ticker.slice(0,1)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{project.name}</div>
                  <div className="muted text-[10px] mt-1">{project.ticker} · {project.chain} · {project.contracts}</div>
                </div>
                <div className="text-right">
                  <span className={`status ${project.tone === "green" ? "status-green" : "status-amber"}`}><span className="dot"/>{project.status}</span>
                  <div className="muted text-[10px] mt-2">{project.updated}</div>
                </div>
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="muted text-[10px]">Demo data · No live chain checks yet</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock3 size={12}/> Preview mode</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div><div className="panel-title">Evidence activity</div><div className="muted text-[11px] mt-1">Latest evidence events</div></div>
              <span className="pill">Preview</span>
            </div>
            {evidence.map((item, index) => {
              const Icon = item.icon;
              return <div className="evidence-item" key={index}>
                <div className="evidence-icon"><Icon size={14}/></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">{item.title}</div>
                  <div className="muted text-[10px] mt-1 leading-relaxed">{item.detail}</div>
                  <div className="text-[9px] text-emerald-300 mt-2">{item.status}</div>
                </div>
              </div>;
            })}
            <a href="#evidence" className="mt-3 text-xs text-emerald-300 no-underline flex items-center gap-1">Open evidence ledger <ChevronRight size={13}/></a>
          </div>
        </section>

        <section className="panel mt-4">
          <div className="panel-heading">
            <div><div className="panel-title">Trustchain verification principles</div><div className="muted text-[11px] mt-1">How evidence is represented across the platform</div></div>
            <LockKeyhole size={17} color="#8fa0b2"/>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div><div className="text-xs font-semibold flex items-center gap-2"><Check size={14} color="#42d6a0"/> Independently observed</div><p className="muted text-[11px] leading-relaxed mt-2">Facts read from a blockchain or independently checked against a trusted source.</p></div>
            <div><div className="text-xs font-semibold flex items-center gap-2"><Fingerprint size={14} color="#e9b86b"/> Project-reported</div><p className="muted text-[11px] leading-relaxed mt-2">Information submitted by a project and clearly attributed to that project.</p></div>
            <div><div className="text-xs font-semibold flex items-center gap-2"><Waves size={14} color="#91a9c5"/> Time-bound evidence</div><p className="muted text-[11px] leading-relaxed mt-2">Evidence includes a timestamp and can become stale when conditions change.</p></div>
          </div>
        </section>

        <p className="footer-note">TRUSTCHAIN PREVIEW · All names, metrics, project records, and activity shown here are illustrative demo data. No live blockchain monitoring or security certification is currently active.</p>
      </main>
    </div>
  );
}