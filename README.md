# Caller - Contact Manager App

A comprehensive mobile CRM application built with React Native and Expo, designed for real estate professionals to manage leads, handle calls, and track sales performance.

## Features

- 📱 **Contact Management**: View and manage all your contacts in one place
- 🏷️ **Status Classification**: Hot Call, Warm Call, Cold Call, Interested, Not Interested, Personal
- 🔍 **Smart Filtering**: Quickly filter contacts by status
- 📝 **Notes System**: Add, edit, and delete notes for each contact
- 📞 **Quick Actions**: Call, WhatsApp, SMS, Email with one tap
- 💾 **Local Persistence**: All data saved locally using AsyncStorage
- 🎨 **Clean UI**: Minimal, mobile-first design with one-hand friendly interactions

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on Android:
```bash
npm run android
```

## Project Structure

```
caller/
├── App.js                          # Root component
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── ContactCard.js
│   │   ├── FilterBar.js
│   │   ├── QuickActionsSheet.js
│   │   ├── StatusOverlay.js
│   │   └── NotesModal.js
│   ├── screens/
│   │   └── HomeScreen.js          # Main contacts screen
│   ├── store/
│   │   └── contactStore.js        # Zustand state management
│   ├── data/
│   │   └── mockContacts.js        # Mock contact data
│   ├── utils/
│   │   ├── storage.js             # AsyncStorage helpers
│   │   └── intents.js             # Platform intents
│   └── constants/
│       └── theme.js               # Design tokens
```

## Usage

### Filtering Contacts
Tap any filter tab at the top to view contacts by status.

### Quick Actions
Single tap on a contact to open quick actions:
- 📞 Call
- 💬 WhatsApp
- ✉️ Message
- 📧 Mail
- 📝 Write Notes

### Updating Status
Long press on a contact to quickly update their status.

### Managing Notes
- Tap "Write Notes" from quick actions
- Add new notes with timestamps
- Edit or delete existing notes
- All notes are automatically saved

## Tech Stack

- **React Native** with Expo
- **Zustand** for state management
- **AsyncStorage** for local persistence
- **React Native Gesture Handler** for interactions

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
