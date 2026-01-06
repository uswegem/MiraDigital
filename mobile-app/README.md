# Let'sGo Mobile App

React Native mobile application for retail customers.

## Prerequisites

- Node.js 18+
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)
- Java 17+ (OpenJDK recommended)

## Setup

1.  **Install dependencies:**
    ```bash
    npm install --legacy-peer-deps
    ```

2.  **iOS Setup:**
    ```bash
    cd ios && pod install && cd ..
    ```

## Running the app

-   **Run on iOS:**
    ```bash
    npm run ios
    ```

-   **Run on Android (development):**
    ```bash
    npm run android
    ```

## Building the Android APK

This section guides you through building a release APK for Android.

### 1. Configure Environment Variables

Create a `.env` file in the project root (`mobile-app/`) with the following content:

```env
API_BASE_URL=https://5.75.185.137/api/v1
```

### 2. Build the APK

You can build the APK directly using Gradle or with Docker.

#### Using Gradle (Recommended)

1.  Navigate to the `android` directory:
    ```bash
    cd android
    ```

2.  Run the `assembleRelease` Gradle task:
    ```bash
    ./gradlew assembleRelease
    ```
    The generated APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.

#### Using Docker

If you have Docker installed, you can use the provided build script.

1.  Navigate to the project root directory (`mobile-app/`).

2.  Run the build script:
    ```bash
    ./docker-build/build-apk.sh
    ```
    The generated APK will be in `docker-build/output/app-release.apk`.

### Build Troubleshooting

-   **Slow builds or daemon issues:** If you experience issues with the Gradle Daemon, try running the build with the `--no-daemon` flag. This can improve stability on some systems.
    ```bash
    ./gradlew --no-daemon assembleRelease
    ```

-   **Build errors:** If you encounter build errors, try cleaning the project first:
    ```bash
    cd android
    ./gradlew clean
    ./gradlew assembleRelease
    ```

-   **Verify Java Version:** Ensure you are using Java 17 or newer.
    ```bash
    java -version
    ```

## Project Structure

```
src/
├── api/           # API client and endpoints
├── components/    # Reusable UI components
├── screens/       # App screens
├── navigation/    # React Navigation setup
├── store/         # Redux store
├── hooks/         # Custom hooks
├── utils/         # Utility functions
└── theme/         # Design system
```

## Features

-   PIN/Biometric authentication
-   Account dashboard
-   Fund transfers
-   Loan management
-   Bill payments
-   Transaction history
