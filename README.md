# Smart Grid Energy

A mobile application for monitoring and managing a smart grid energy network. Built with React Native (Expo) and Firebase, it allows users to view real-time energy flow, monitor battery and solar generation, manage P2P energy sharing between connected households, and track hardware events.

## Features

- **Real-Time Dashboard**: Monitor solar generation, home consumption, and battery storage.
- **Hardware Monitoring**: View live hardware status (contactors, availability mode, grid connection) and diagnostic logs.
- **P2P Energy Trading**: Share excess energy with neighbors connected to the same grid bus.
- **Energy Wallet**: Track energy credits earned from sharing and spent on drawing.
- **Push Notifications**: Receive alerts for hardware faults, power routing changes, and incoming energy requests.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [Firebase CLI](https://firebase.google.com/docs/cli) (optional, for deploying rules)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd smartgrid-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Bootstrap Demo Data (Optional but Recommended)**:
   This deploys the necessary Firestore security rules, creates demo user accounts, and seeds the initial Firebase database structures.
   ```bash
   npm run demo:bootstrap
   ```

## Running the Application

To run the full simulation locally, you will need to start both the mobile app and the hardware simulator.

### 1. Start the Hardware Simulator
The `simulateHardware.js` script mimics the live ESP32 microcontrollers that report house generation, consumption, and battery levels, as well as the main grid contactor states. This populates Firebase with real-time changing data.

Open a terminal and run:
```bash
node simulateHardware.js
```

### 2. Start the Mobile App
In a separate terminal, start the Expo development server:
```bash
npm expo start
```
From here, you can press `a` to open on an Android emulator, `i` to open on an iOS simulator, or scan the QR code with the Expo Go app on your physical device.

## Demo Accounts

If you ran the `demo:bootstrap` command, you can log in to the app using any of the following demo accounts:

- **House A**: `h1.demo@solarshare.com` (Password: `password123`)
- **House B**: `h2.demo@solarshare.com` (Password: `password123`)
- **House C**: `h3.demo@solarshare.com` (Password: `password123`)
