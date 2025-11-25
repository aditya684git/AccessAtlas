import { ReactNode } from "react";
import { Home, Camera, MapPin, Settings, Map } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  title?: string;
}

const MobileLayout = ({ children, showNav = true, title }: MobileLayoutProps) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/camera", icon: Camera, label: "Camera" },
    { path: "/tagging", icon: MapPin, label: "Tagging" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background">
      {/* Status Bar */}
      <div className="h-11 bg-background flex items-center justify-between px-4 text-xs">
        <span>9:41</span>
        <div className="flex gap-1">
          <div className="w-4 h-3 border border-foreground rounded-sm" />
          <div className="w-4 h-3 border border-foreground rounded-sm" />
          <div className="w-4 h-3 border border-foreground rounded-sm" />
        </div>
      </div>

      {/* Header */}
      {title && (
        <div className="h-14 bg-background flex items-center justify-center border-b border-border">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full" style={{ minHeight: 0 }}>
        {children}
      </div>

      {/* Bottom Navigation */}
      {showNav && (
        <div className="h-20 bg-card border-t border-border flex items-center justify-around px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1"
              >
                <Icon
                  className={`w-6 h-6 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileLayout;
