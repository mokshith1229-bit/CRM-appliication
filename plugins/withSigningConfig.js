const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Configure the release signing config in the Android build.gradle
 */
const withSigningConfig = (config) => {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Prepare the signing config block
    const signingConfigBlock = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }`;

    // 2. Replace the existing signingConfigs block
    // We target the entire block from 'signingConfigs {' to the next 'buildTypes {'
    if (contents.includes('signingConfigs {') && contents.includes('buildTypes {')) {
        contents = contents.replace(/signingConfigs\s*\{[\s\S]*?\}\s*(?=buildTypes\s*\{)/, signingConfigBlock + '\n\n    ');
    }

    // 3. Ensure debug build type uses debug signing config
    if (contents.includes('debug {')) {
        contents = contents.replace(
            /(debug\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.(debug|release)/,
            '$1signingConfigs.debug'
        );
    }

    // 4. Ensure release build type uses release signing config
    if (contents.includes('release {')) {
        contents = contents.replace(
            /(release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.(debug|release)/,
            '$1signingConfigs.release'
        );
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withSigningConfig;
