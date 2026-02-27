import {
  Construction,
  LayoutDashboard,
  Monitor,
  Bug,
  ListTodo,
  FileX,
  HelpCircle,
  Lock,
  Package,
  ServerOff,
  Settings,
  Wrench,
  UserCog,
  UserX,
  Users,
  MessagesSquare,
  ShieldCheck,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
} from "lucide-react";
import { type SidebarData } from "./types";
import { routes } from "@/shared/constants/routes";

export const sidebarData: SidebarData = {
  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Shadcn Admin",
      logo: Command,
      plan: "Vite + ShadcnUI",
    },
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
  ],
  navGroups: [
    {
      title: "SaaS Core",
      items: [
        {
          title: "Workspace",
          icon: LayoutDashboard,
          items: [
            {
              title: "Dashboard",
              url: "/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Team",
              url: "/dashboard/team",
              icon: Users,
            },
            {
              title: "Users",
              url: "/dashboard/users",
              icon: Users,
            },
            {
              title: "Roles",
              url: "/dashboard/roles",
              icon: ShieldCheck,
            },
            {
              title: "Organizations",
              url: "/dashboard/organizations",
              icon: Package,
            },
            {
              title: "Billing",
              url: "/dashboard/billing",
              icon: Settings,
            },
            {
              title: "Subscriptions",
              url: "/dashboard/subscriptions",
              icon: Settings,
            },
            {
              title: "Sessions",
              url: "/dashboard/sessions",
              icon: Monitor,
            },
            {
              title: "Settings",
              url: "/dashboard/settings",
              icon: Settings,
            },
          ],
        },
      ],
    },
    {
      title: "General",
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: LayoutDashboard,
        },
        {
          title: "Tasks",
          url: "/tasks",
          icon: ListTodo,
        },
        {
          title: "Apps",
          url: "/apps",
          icon: Package,
        },
        {
          title: "Chats",
          url: "/chats",
          badge: "3",
          icon: MessagesSquare,
        },
        {
          title: "Users",
          url: "/users",
          icon: Users,
        },
      ],
    },
    {
      title: "Pages",
      items: [
        {
          title: "Auth",
          icon: ShieldCheck,
          items: [
            {
              title: "Sign In",
              url: "/sign-in",
            },
            {
              title: "Sign In (2 Col)",
              url: "/sign-in-2",
            },
            {
              title: "Sign Up",
              url: "/sign-up",
            },
            {
              title: "Forgot Password",
              url: "/forgot-password",
            },
            {
              title: "OTP",
              url: "/otp",
            },
          ],
        },
        {
          title: "Errors",
          icon: Bug,
          items: [
            {
              title: "Unauthorized",
              url: "/errors/unauthorized",
              icon: Lock,
            },
            {
              title: "Forbidden",
              url: "/errors/forbidden",
              icon: UserX,
            },
            {
              title: "Not Found",
              url: "/errors/not-found",
              icon: FileX,
            },
            {
              title: "Internal Server Error",
              url: "/errors/internal-server-error",
              icon: ServerOff,
            },
            {
              title: "Maintenance Error",
              url: "/errors/maintenance-error",
              icon: Construction,
            },
          ],
        },
      ],
    },
    {
      title: "Other",
      items: [
        {
          title: "Settings",
          icon: Settings,
          items: [
            {
              title: "Profile",
              url: routes.app.settingsProfile,
              icon: UserCog,
            },
            {
              title: "Authentication",
              url: routes.app.settingsAuthentication,
              icon: Wrench,
            },
            {
              title: "Security",
              url: routes.app.settingsSecurity,
              icon: ShieldCheck,
            },
            {
              title: "Display",
              url: routes.app.settingsDisplay,
              icon: Monitor,
            },
          ],
        },
        {
          title: "Help Center",
          url: "/help-center",
          icon: HelpCircle,
        },
      ],
    },
  ],
};
