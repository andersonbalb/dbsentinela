import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Bell, Zap, Server, SlidersHorizontal,
  LogOut, Database, ChevronLeft, ChevronRight, Monitor, Radio, BellRing, Archive, FileBarChart, Workflow, Menu
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/servers", icon: Monitor, label: "Servidores" },
  { to: "/alerts", icon: Bell, label: "Alertas" },
  { to: "/slow-queries", icon: Zap, label: "Slow Queries" },
  { to: "/databases", icon: Server, label: "Bancos de Dados" },
  { to: "/backups", icon: Archive, label: "Backups" },
  { to: "/thresholds", icon: SlidersHorizontal, label: "Thresholds" },
  { to: "/zabbix", icon: Radio, label: "Zabbix Config" },
  { to: "/reports", icon: FileBarChart, label: "Relatórios" },
  { to: "/automations", icon: Workflow, label: "Automações" },
  { to: "/notifications", icon: BellRing, label: "Notificações" },
];

const SidebarContent = ({ logout, user, collapsed, setCollapsed, onNavClick }: {
  logout: () => void;
  user: any;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onNavClick?: () => void;
}) => (
  <>
    <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
      <div className="w-8 h-8 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Database className="w-4 h-4 text-primary" />
      </div>
      {!collapsed && (
        <span className="font-bold font-mono text-primary text-sm neon-text">DB Sentinela</span>
      )}
    </div>

    <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
              isActive
                ? "bg-primary/10 text-primary neon-border"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            } ${collapsed ? "justify-center" : ""}`
          }
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>

    <div className="border-t border-sidebar-border p-3 space-y-2">
      {!collapsed && user && (
        <div className="px-2 mb-2">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-1"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && "Sair"}
        </button>
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-md text-muted-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  </>
);

const AppSidebar = () => {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <div className="flex flex-col h-full">
                <SidebarContent
                  logout={logout}
                  user={user}
                  collapsed={false}
                  setCollapsed={() => {}}
                  onNavClick={() => setOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-7 h-7 rounded bg-primary/15 flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold font-mono text-primary text-sm neon-text">DB Sentinela</span>
        </div>
      </>
    );
  }

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <SidebarContent logout={logout} user={user} collapsed={collapsed} setCollapsed={setCollapsed} />
    </aside>
  );
};

export default AppSidebar;
