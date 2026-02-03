# Real Estate CRM & Caller App

A comprehensive mobile CRM application built with React Native and Expo, designed for real estate professionals to manage leads, handle calls, and track sales performance.

## 🚀 Features

### 👥 Lead & Contact Management
- **Create Leads:** specific forms for adding new leads with source tracking.
- **Smart Filtering:** Filter contacts by status (Hot, Warm, Cold, Interested, Not Interested) and "Site Visit Done".
- **Contact Details:** Detailed view with call history, notes, and reminders.
- **Search:** Instant search by name or phone number.

### 📞 Advanced Call Handling
- **In-App Dialer:** Custom keypad and dialer interface.
- **Call Simulation:** Mock incoming and outgoing call flows for training/testing.
- **Call Logging:** Automatic logging of call duration, status, and outcomes.
- **Quick Actions:** Instant access to Call, WhatsApp, and Notes during/after calls.

### 🏢 Project Management
- **High Demand Projects:** Showcase premium real estate projects.
- **Interactive Gallery:** Horizontal scrolling image galleries for properties.
- **Sharing:** Native share functionality to send project details via WhatsApp/Telegram.
- **Forwarding:** Forward project details directly to selected contacts.

### 📅 Site Visits & Campaigns
- **Book Site Visits:** Schedule and track property visits.
- **Campaign Tracking:** Monitor leads from specific marketing campaigns (Google, Facebook, etc.).
- **Statistics Dashboard:** Visual breakdown of call stats, lead conversion, and performance metrics.

### 🔐 Authentication & Security
- **Secure Login:** Phone number based authentication simulation.
- **Profile Management:** User profile settings and preferences.
- **Data Persistence:** Local storage for contacts, notes, and app state.

## 🛠 Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation:** React Navigation (Stack & Drawer)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Storage:** Async Storage
- **UI Components:** Custom components, Expo Vector Icons, Linear Gradient
- **Charts:** React Native Chart Kit

## 📂 Project Structure

```
src/
├── components/      # Reusable UI components (Cards, Modals, etc.)
├── constants/       # App-wide constants (Colors, Theme, Config)
├── data/            # Mock data and static content
├── navigation/      # Navigation setup (AppNavigator, CustomDrawer)
├── screens/         # Main application screens
├── store/           # Zustand stores for state management
└── utils/           # Helper functions and utilities
```

## ⚡ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/mokshith1229-bit/CRM-appliication.git
    cd CRM-appliication
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Start the development server**
    ```bash
    npx expo start
    ```

4.  **Run on Device/Emulator**
    - **Android:** Press `a` in the terminal or scan the QR code with Expo Go.
    - **iOS:** Press `i` in the terminal or scan the QR code with Expo Go.

## 📱 Key Workflows

- **Adding a Lead:** Go to "Create Lead" from the drawer, fill in details, and save.
- **Making a Call:** Click on a contact to open Quick Actions -> Call, or use the Keypad.
- **Sharing a Project:** Navigate to "Projects", select a project, and click the Share icon.
- **Filtering Site Visits:** Open the sidebar -> Filters -> Select "Site Visit Done".

<<<<<<< HEAD
## 🤝 Contributing

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---
Built with ❤️ using React Native Expo
=======
## 🚀 Features

### 👥 Lead & Contact Management
- **Create Leads:** specific forms for adding new leads with source tracking.
- **Smart Filtering:** Filter contacts by status (Hot, Warm, Cold, Interested, Not Interested) and "Site Visit Done".
- **Contact Details:** Detailed view with call history, notes, and reminders.
- **Search:** Instant search by name or phone number.

### 📞 Advanced Call Handling
- **In-App Dialer:** Custom keypad and dialer interface.
- **Call Simulation:** Mock incoming and outgoing call flows for training/testing.
- **Call Logging:** Automatic logging of call duration, status, and outcomes.
- **Quick Actions:** Instant access to Call, WhatsApp, and Notes during/after calls.

### 🏢 Project Management
- **High Demand Projects:** Showcase premium real estate projects.
- **Interactive Gallery:** Horizontal scrolling image galleries for properties.
- **Sharing:** Native share functionality to send project details via WhatsApp/Telegram.
- **Forwarding:** Forward project details directly to selected contacts.

### 📅 Site Visits & Campaigns
- **Book Site Visits:** Schedule and track property visits.
- **Campaign Tracking:** Monitor leads from specific marketing campaigns (Google, Facebook, etc.).
- **Statistics Dashboard:** Visual breakdown of call stats, lead conversion, and performance metrics.

### 🔐 Authentication & Security
- **Secure Login:** Phone number based authentication simulation.
- **Profile Management:** User profile settings and preferences.
- **Data Persistence:** Local storage for contacts, notes, and app state.
>>>>>>> 651244de07e502682331d187c8ced73b4d71555f
