const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const src = path.join(config.modRequest.projectRoot, 'assets', 'adi-registration.properties');
      const destDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
      const dest = path.join(destDir, 'adi-registration.properties');

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('[withAdiRegistration] Copied adi-registration.properties to Android assets.');
      } else {
        console.warn('[withAdiRegistration] adi-registration.properties not found in assets/');
      }

      return config;
    },
  ]);
};

module.exports = withAdiRegistration;
