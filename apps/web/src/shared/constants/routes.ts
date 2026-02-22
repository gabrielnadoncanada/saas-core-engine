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
    users: "/dashboard/users",
    organizations: "/dashboard/organizations",
    subscriptions: "/dashboard/subscriptions",
    billing: "/dashboard/billing",
    team: "/dashboard/team",
    roles: "/dashboard/roles",
    sessions: "/dashboard/sessions",
    settings: "/dashboard/settings",
  },
} as const;
