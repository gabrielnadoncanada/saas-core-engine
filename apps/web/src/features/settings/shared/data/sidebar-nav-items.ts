import { routes } from "@/shared/constants/routes";
import type { SidebarNavItem } from "../model/sidebar-data";

export const sidebarNavItems: SidebarNavItem[] = [
  {
    title: "Profile",
    href: routes.app.settingsProfile,
    icon: "user-cog",
  },
  {
    title: "Authentication",
    href: routes.app.settingsAuthentication,
    icon: "wrench",
  },
  {
    title: "Security",
    href: routes.app.settingsSecurity,
    icon: "shield",
  },
  {
    title: "Display",
    href: routes.app.settingsDisplay,
    icon: "monitor",
  },
];
