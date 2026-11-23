export default {
  expo: {
    name: "best-coach",
    slug: "best-coach",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundColor: "#ffffff"
      },
      package: "com.bfg.bestcoach"
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
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
      geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || "gemini-3.5-flash-lite",
      aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL || "",
      eas: {
        projectId: "aea1d648-4a18-4dfe-af81-a8201cd5cbb0"
      },
      router: {
        origin: false
      }
    },
    owner: "bfg"
  }
};
