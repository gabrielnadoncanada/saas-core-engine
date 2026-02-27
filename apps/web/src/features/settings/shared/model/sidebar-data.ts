export type SidebarNavIcon = "user-cog" | "wrench" | "shield" | "monitor";

export type SidebarNavItem = {
  href: string;
  title: string;
  icon: SidebarNavIcon;
};
