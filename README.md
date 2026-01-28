# Caller - Contact Manager App

A React Native mobile application for real estate agents and office managers to manage contacts, classify call outcomes, and write notes.

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

## License

MIT
