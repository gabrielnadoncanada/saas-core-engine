export const routes = {
  marketing: {
    home: "/",
    pricing: "/pricing",
  },
  auth: {
    login: "/login",
    signup: "/signup",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
  },
  app: {
    dashboard: "/dashboard",
    billing: "/dashboard/billing",
    team: "/dashboard/team",
    sessions: "/dashboard/sessions",
    settings: "/dashboard/settings",
    aiUsage: "/dashboard/ai-usage",
    aiAudit: "/dashboard/ai-audit",
  },
} as const;
