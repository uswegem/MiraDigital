# MiraDigital Mobile App

React Native mobile application for retail customers.

## Prerequisites

- Node.js 18+
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)

## Setup

```bash
# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
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

- PIN/Biometric authentication
- Account dashboard
- Fund transfers
- Loan management
- Bill payments
- Transaction history

## Environment Variables

Create a `.env` file:

```env
API_BASE_URL=https://5.75.185.137/api/v1
```
