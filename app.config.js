// Dynamic config — Expo merges app.json (passed as `config`) with what we return here.
// API_URL is injected at build time via .env (local) or eas.json build.env (CI/EAS).
export default ({ config }) => ({
  ...config,
  extra: {
    apiUrl:
      process.env.API_URL ??
      'https://5pqwkyomu6.execute-api.eu-central-1.amazonaws.com/dev',
    eas: {
      projectId: 'ace7f8d3-7406-4001-b0b6-4afbfd53ba26',
    },
  },
});
