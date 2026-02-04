const { withAndroidManifest } = require('@expo/config-plugins');

const withCallLogPermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const permissions = [
      'android.permission.READ_CALL_LOG',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_PHONE_NUMBERS'
    ];

    permissions.forEach((permission) => {
      if (!androidManifest.manifest['uses-permission']) {
        androidManifest.manifest['uses-permission'] = [];
      }
      
      const existingPermissions = androidManifest.manifest['uses-permission'].map(
        (perm) => perm.$['android:name']
      );

      if (!existingPermissions.includes(permission)) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });
};

module.exports = withCallLogPermissions;
