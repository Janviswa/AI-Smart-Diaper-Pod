import { NavLink } from "react-router-dom";
import { LayoutDashboard, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to:"/dashboard", icon:LayoutDashboard, label:"Monitor" },
  { to:"/history",   icon:History,         label:"History", badge:1 },
  { to:"/settings",  icon:Settings,        label:"Settings" },
];

const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/60">
    <div className="flex items-stretch h-[62px] max-w-lg mx-auto px-2">
      {navItems.map(({ to, icon:Icon, label, badge }) => (
        <NavLink key={to} to={to}
          className="relative flex flex-col items-center justify-center flex-1 gap-1">
          {({ isActive }) => (
            <>
              {/* Active top bar */}
              <span className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all duration-300",
                isActive ? "w-8 bg-primary" : "w-0"
              )} />

              <div className={cn(
                "relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200",
                isActive ? "bg-primary/12" : "hover:bg-muted/60"
              )}>
                <Icon
                  className={cn("w-5 h-5 transition-all duration-200", isActive ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {badge && badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>

              <span className={cn("text-[10px] leading-none", isActive ? "text-primary font-bold" : "text-muted-foreground font-medium")}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default BottomNav;
