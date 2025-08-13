import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    name: "crewhq-total-rebuild",
    slug: "crewhq-total-rebuild",
    version: "1.0.0",  // Your version number
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ashleyglenn.crewhq",
      buildNumber: "1",
      pushNotifications: {
        enable: true,
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false  // Add this line to avoid delays
      } // iOS build number
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.ashleyglenn.crewhq",
      versionCode: 1  // Android build number
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-camera",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      QR_BYPASS: process.env.EXPO_PUBLIC_QR_BYPASS ?? "false",
      router: {},
      eas: {
        projectId: "ee5e4779-8f0d-49d0-8bae-720bc0820e08"
      }
    }
  };
};
