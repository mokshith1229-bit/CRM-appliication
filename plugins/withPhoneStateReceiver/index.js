const { withAndroidManifest, withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const pkg = require('../../package.json');

/**
 * Adds the CallReceiver to the AndroidManifest.xml
 */
const withManifestReceiver = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults.manifest;
        const mainApplication = androidManifest.application[0];

        const receiver = {
            '$': {
                'android:name': '.CallReceiver',
                'android:exported': 'true',
            },
            'intent-filter': [
                {
                    action: [
                        { '$': { 'android:name': 'android.intent.action.PHONE_STATE' } },
                        { '$': { 'android:name': 'com.vivtej.telecrm.SYNC_DAILY' } }
                    ]
                }
            ]
        };

        if (!mainApplication.receiver) {
            mainApplication.receiver = [];
        }

        // Avoid adding receiver twice
        const existsReceiver = mainApplication.receiver.some(r => r['$']['android:name'] === '.CallReceiver');
        if (!existsReceiver) {
            mainApplication.receiver.push(receiver);
        }

        const service = {
            '$': {
                'android:name': '.CallStateService',
                'android:exported': 'false',
                'android:foregroundServiceType': 'dataSync'
            }
        };

        if (!mainApplication.service) {
            mainApplication.service = [];
        }

        // Avoid adding service twice
        const existsService = mainApplication.service.some(s => s['$']['android:name'] === '.CallStateService');
        if (!existsService) {
            mainApplication.service.push(service);
        }

        return config;
    });
};

/**
 * Copies the CallReceiver.kt file to the Android project directory during prebuild.
 */
const withCopyReceiverFile = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            
            // This is derived from app.json "package" (com.vivtej.telecrm)
            const packageName = config.android?.package || 'com.vivtej.telecrm';
            const packagePath = packageName.replace(/\./g, '/');

            const sourcePath = path.join(__dirname, 'android/CallReceiver.kt');
            const destPath = path.join(
                projectRoot,
                'android/app/src/main/java',
                packagePath,
                'CallReceiver.kt'
            );

            // Create target directory if it doesn't exist
            fs.mkdirSync(path.dirname(destPath), { recursive: true });

            // Copy the CallReceiver file
            fs.copyFileSync(sourcePath, destPath);
            console.log(`[withPhoneStateReceiver] Copied CallReceiver.kt to ${destPath}`);

            // Copy the CallStateService file
            const serviceSourcePath = path.join(__dirname, 'android/CallStateService.kt');
            const serviceDestPath = path.join(
                projectRoot,
                'android/app/src/main/java',
                packagePath,
                'CallStateService.kt'
            );
            fs.copyFileSync(serviceSourcePath, serviceDestPath);
            console.log(`[withPhoneStateReceiver] Copied CallStateService.kt to ${serviceDestPath}`);

            return config;
        },
    ]);
};

const withPhoneStateReceiver = (config) => {
    config = withManifestReceiver(config);
    config = withCopyReceiverFile(config);
    return config;
};

module.exports = createRunOncePlugin(
    withPhoneStateReceiver,
    'withPhoneStateReceiver',
    pkg.version
);
