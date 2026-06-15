import CradleLogo from "@/components/CradleLogo";

interface PageHeaderProps {
  title:      string;
  subtitle?:  string;
  actions?:   React.ReactNode;
  statusRow?: React.ReactNode;
  /** Dashboard only — shows Cradle logo lockup instead of title */
  branded?:   boolean;
}

export default function PageHeader({ title, subtitle, actions, statusRow, branded }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-3">
          {branded ? (
            /* Dashboard: just the logo lockup, nothing else on this line */
            <div className="flex items-center gap-2.5 text-foreground">
              <CradleLogo size={26} className="shrink-0" />
              <span className="text-[19px] font-bold tracking-tight leading-none">Cradle</span>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">{title}</h1>
              {subtitle && <p className="text-[11px] text-muted-foreground mt-1 leading-none">{subtitle}</p>}
            </div>
          )}
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
        {statusRow}
      </div>
    </header>
  );
}
