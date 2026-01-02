FROM --platform=linux/amd64 reactnativecommunity/react-native-android:v13.2.1

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install npm dependencies
RUN npm ci --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Accept Android SDK licenses
RUN yes | sdkmanager --licenses 2>/dev/null || true

# Build the APK with retry for network issues
CMD ["bash", "-c", "cd android && chmod +x gradlew && ./gradlew assembleRelease --no-daemon --no-parallel -Dorg.gradle.internal.http.socketTimeout=120000 -Dorg.gradle.internal.http.connectionTimeout=120000 && cp app/build/outputs/apk/release/app-release.apk /output/"]
