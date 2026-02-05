const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.vivtej.telecrm';
const PACKAGE_PATH = PACKAGE_NAME.replace(/\./g, '/');

const CALL_MODULE_KT = `package ${PACKAGE_NAME}

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "CallModule"
    }

    @ReactMethod
    fun makeCall(phoneNumber: String, promise: Promise) {
        val activity = reactContext.currentActivity

        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity doesn't exist")
            return
        }

        // Check if CALL_PHONE permission is granted
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "CALL_PHONE permission not granted")
            return
        }

        try {
            val intent = Intent(Intent.ACTION_CALL)
            intent.data = Uri.parse("tel:$phoneNumber")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_FAILED", "Failed to initiate call: \${e.message}")
        }
    }

    @ReactMethod
    fun checkCallPermission(promise: Promise) {
        val activity = reactContext.currentActivity
        val context = reactContext

        // Use activity if available, else context
        val contextToUse = activity ?: context

        val hasPermission = ContextCompat.checkSelfPermission(
            contextToUse,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED

        promise.resolve(hasPermission)
    }

    @ReactMethod
    fun endCall(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity doesn't exist")
                return
            }

            val telecomManager = activity.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("END_CALL_FAILED", "Failed to end call: \${e.message}")
        }
    }

    @ReactMethod
    fun openDialer(phoneNumber: String, promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            
            val intent = Intent(Intent.ACTION_DIAL)
            intent.data = Uri.parse("tel:$phoneNumber")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            
            if (activity != null) {
                 activity.startActivity(intent)
            } else {
                 reactContext.startActivity(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DIAL_FAILED", "Failed to open dialer: \${e.message}")
        }
    }
}
`;

const CALL_PACKAGE_KT = `package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class CallPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(CallModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

const withCallModuleFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packageFolder = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', ...PACKAGE_PATH.split('/'));

      // Ensure directory exists
      fs.mkdirSync(packageFolder, { recursive: true });

      // Write files
      fs.writeFileSync(path.join(packageFolder, 'CallModule.kt'), CALL_MODULE_KT);
      fs.writeFileSync(path.join(packageFolder, 'CallPackage.kt'), CALL_PACKAGE_KT);

      return config;
    },
  ]);
};

const withCallPackageLinking = (config) => {
    return withMainApplication(config, (config) => {
        let contents = config.modResults.contents;
        
        // 1. Add Import
        // Check if import already exists
        if (!contents.includes(`import ${PACKAGE_NAME}.CallPackage`)) {
            // Add import after package declaration or other imports
            if (contents.includes(`package ${PACKAGE_NAME}`)) {
                 contents = contents.replace(
                    `package ${PACKAGE_NAME}`, 
                    `package ${PACKAGE_NAME}\n\nimport ${PACKAGE_NAME}.CallPackage`
                 );
            }
        }

        // 2. Add Package to getPackages()
        // Looking for: add(CallPackage())
        if (!contents.includes('add(CallPackage())')) {
            // Try to find the PackageList applies
            // Default template often has: 
            // override fun getPackages(): List<ReactPackage> =
            //   PackageList(this).packages.apply { ... }
            if (contents.includes('PackageList(this).packages.apply {')) {
                contents = contents.replace(
                    'PackageList(this).packages.apply {',
                    'PackageList(this).packages.apply {\n              add(CallPackage())'
                );
            } else if (contents.includes('return Arrays.<ReactPackage>asList(')) {
                // Java MainApplication support (legacy)
                 contents = contents.replace(
                    'return Arrays.<ReactPackage>asList(',
                    'return Arrays.<ReactPackage>asList(\n          new CallPackage(),'
                );
            }
        }
        
        config.modResults.contents = contents;
        return config;
    });
};

const withCallModule = (config) => {
    config = withCallModuleFiles(config);
    config = withCallPackageLinking(config);
    return config;
};

module.exports = withCallModule;
