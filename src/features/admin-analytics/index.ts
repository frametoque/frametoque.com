// Public API for the Admin Analytics Module
// Other parts of the app should ONLY import from here.

// Components
// export { AnalyticsDashboard } from "./components/AnalyticsDashboard";

// Data Fetching (Server Components only)
export { getDashboardStats } from "./api/get-stats";

// Server Actions (Mutations)
export { updateAnalyticsSetting } from "./actions/update-settings";
