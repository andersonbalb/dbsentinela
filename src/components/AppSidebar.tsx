import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Bell, Zap, Server, SlidersHorizontal,
  LogOut, Database, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/alerts", icon: Bell, label: "Alertas" },
  { to: "/slow-queries", icon: Zap, label: "Slow Queries" },
  { to: "/databases", icon: Server, label: "Bancos de Dados" },
  { to: "/thresholds", icon: SlidersHorizontal, label: "Thresholds" },
];

const AppSidebar = () => {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Database className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <span className="font-bold font-mono text-primary text-sm neon-text">
            DB Monitor
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                isActive
                  ? "bg-primary/10 text-primary neon-border"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              } ${collapsed ? "justify-center" : ""}`
            }
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
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
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-md text-muted-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
