# Quick Start Guide

## 🚀 Getting Started

### Step 1: Fix PowerShell (if needed)

If you encountered the PowerShell execution policy error, run this command in PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**OR** use Command Prompt (cmd.exe) instead of PowerShell for all commands.

---

### Step 2: Install Dependencies

Open terminal in the project directory and run:

```bash
npm install
```

This will install:
- Expo SDK
- React Native
- Zustand (state management)
- AsyncStorage (data persistence)
- React Native Gesture Handler
- React Native Reanimated

---

### Step 3: Start the App

```bash
npm start
```

This will:
1. Start the Expo development server
2. Show a QR code in the terminal
3. Open Expo DevTools in your browser

---

### Step 4: Run on Device

**Option A: Physical Android Device**
1. Install "Expo Go" from Google Play Store
2. Scan the QR code from the terminal
3. App will load on your device

**Option B: Android Emulator**
1. Make sure Android Studio is installed
2. Start an Android emulator
3. Press `a` in the terminal (or run `npm run android`)

**Option C: iOS Device/Simulator** (Mac only)
1. Install "Expo Go" from App Store
2. Scan QR code or press `i` for simulator

---

## 📱 Using the App

### Filter Contacts
Tap any filter tab at the top:
- **All** - Show all contacts
- **Interested** - Show interested leads
- **Not Interested** - Show rejected leads
- **Hot Call** - Show hot leads
- **Warm Call** - Show warm leads
- **Cold Call** - Show cold leads

### Quick Actions (Single Tap)
Tap any contact to open quick actions:
- 📞 **Call** - Dial the contact
- 💬 **WhatsApp** - Send WhatsApp message
- ✉️ **Message** - Send SMS
- 📧 **Mail** - Send email
- 📝 **Write Notes** - Add/view notes

### Update Status (Long Press)
Long press any contact to quickly change their status:
- Interested
- Not Interested
- Hot Call
- Warm Call
- Cold Call
- Personal

### Manage Notes
1. Tap contact → "Write Notes"
2. Add new notes in the input field
3. Edit existing notes by tapping "Edit"
4. Delete notes by tapping "Delete"
5. All notes are automatically saved

---

## 🔧 Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### Metro bundler issues
```bash
npm start -- --clear
```

### App not loading
1. Make sure your phone and computer are on the same WiFi
2. Try restarting the Expo server
3. Check firewall settings

### Platform intents not working
- **WhatsApp**: Make sure WhatsApp is installed
- **Call/SMS**: These should work on all devices
- **Email**: Requires an email app configured

---

## 📝 Notes

- All data is stored locally on your device
- No internet connection required after initial setup
- 18 mock contacts are pre-loaded
- All changes persist across app restarts

---

## 🎯 Next Steps

1. Test all features using the mock data
2. Customize the app icon (see `assets/README.md`)
3. Modify mock data in `src/data/mockContacts.js`
4. Add your own contacts
5. Deploy to production when ready

---

## 📚 Documentation

- [README.md](file:///c:/Users/bhara/Desktop/caller/README.md) - Full documentation
- [Walkthrough](file:///C:/Users/bhara/.gemini/antigravity/brain/50c24094-b37e-4100-a5bb-99da2b39c82f/walkthrough.md) - Detailed feature walkthrough
- [Expo Docs](https://docs.expo.dev/) - Expo documentation

---

## ✅ Ready to Go!

Your app is fully built and ready to run. Just install dependencies and start the development server! 🚀
