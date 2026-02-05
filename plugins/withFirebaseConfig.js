const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const withFirebaseConfig = (config) => {
  // 1. Add Google Services Classpath to Project Build Gradle
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('com.google.gms:google-services')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {
        classpath('com.google.gms:google-services:4.4.4')`
      );
    }
    return config;
  });

  // 2. Add Plugin and Dependencies to App Build Gradle
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Apply plugin if not present
    let newContents = contents;
    if (!newContents.includes("apply plugin: 'com.google.gms.google-services'") && 
        !newContents.includes('apply plugin: "com.google.gms.google-services"')) {
       // Insert after com.android.application
       newContents = newContents.replace(
         /apply plugin: "com\.android\.application"/,
         `apply plugin: "com.android.application"\napply plugin: "com.google.gms.google-services"`
       );
    }

    // Add Dependencies if not present
    if (!newContents.includes('firebase-bom')) {
      newContents = newContents.replace(
        /dependencies\s*{/,
        `dependencies {
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:34.8.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-messaging'`
      );
    }
    
    config.modResults.contents = newContents;
    return config;
  });

  return config;
};

module.exports = withFirebaseConfig;
