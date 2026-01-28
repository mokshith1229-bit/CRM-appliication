# Expo Go QR Code Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: QR Code Not Appearing
**Symptoms**: Terminal shows no QR code after running `npm start`

**Solutions**:
1. **Check if Metro bundler started**:
   - Look for "Metro waiting on..." message
   - Should show a URL like `exp://192.168.x.x:8081`

2. **Press `r` in terminal** to reload and show QR code again

3. **Try tunnel mode**:
   ```bash
   npm start -- --tunnel
   ```
   This creates a public URL that works even with network restrictions

---

### Issue 2: QR Code Scan Fails
**Symptoms**: Expo Go says "Unable to connect" or "Network error"

**Solutions**:

#### A. Check Network Connection
- ✅ **Both phone and computer must be on the SAME WiFi network**
- ❌ Don't use phone's mobile data
- ❌ Don't use VPN on either device
- ✅ Disable any firewall temporarily

#### B. Use Tunnel Mode (Most Reliable)
```bash
# Stop current server (Ctrl+C)
npm start -- --tunnel
```
Wait for the new QR code to appear, then scan again.

#### C. Use Direct Connection
1. In Expo Go app, tap "Enter URL manually"
2. Type the URL shown in terminal (e.g., `exp://192.168.1.5:8081`)

---

### Issue 3: "Incompatible Expo SDK Version"
**Symptoms**: Error about SDK version mismatch

**Solution**:
1. Update Expo Go app from Play Store
2. Or downgrade Expo in project:
   ```bash
   npm install expo@latest
   ```

---

### Issue 4: Firewall Blocking Connection
**Symptoms**: QR code scans but connection times out

**Solutions**:
1. **Temporarily disable Windows Firewall**:
   - Windows Security → Firewall & network protection
   - Turn off for Private networks

2. **Or allow Node.js through firewall**:
   - Windows Security → Firewall → Allow an app
   - Find Node.js and check both Private and Public

3. **Use tunnel mode** (bypasses firewall):
   ```bash
   npm start -- --tunnel
   ```

---

### Issue 5: "Something went wrong" Error
**Symptoms**: Generic error in Expo Go

**Solutions**:
1. **Clear Expo Go cache**:
   - Open Expo Go
   - Go to Projects tab
   - Long press on your project
   - Select "Clear cache"

2. **Restart development server**:
   - Press `Ctrl+C` in terminal
   - Run `npm start` again

3. **Clear Metro bundler cache**:
   ```bash
   npm start -- --clear
   ```

---

## Step-by-Step Troubleshooting

### Step 1: Verify Setup
```bash
# In terminal, check if server is running
# You should see:
# - "Metro waiting on..."
# - A QR code
# - URL like exp://192.168.x.x:8081
```

### Step 2: Check Network
- Computer and phone on same WiFi? ✅
- WiFi is 2.4GHz or 5GHz (not guest network)? ✅
- VPN disabled on both devices? ✅

### Step 3: Try Tunnel Mode
```bash
# Stop server: Ctrl+C
npm start -- --tunnel
```
Wait 30-60 seconds for tunnel to establish, then scan QR code.

### Step 4: Manual Connection
1. Note the URL in terminal (e.g., `exp://192.168.1.5:8081`)
2. Open Expo Go app
3. Tap "Enter URL manually"
4. Type the URL
5. Tap "Connect"

---

## Alternative: Use Android Emulator

If QR code continues to fail, use an Android emulator:

1. **Install Android Studio**
2. **Create a virtual device** (AVD)
3. **Start the emulator**
4. **In terminal, press `a`** (or run `npm run android`)

The app will automatically open in the emulator.

---

## Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| No QR code showing | Press `r` in terminal |
| Can't scan QR | Use tunnel: `npm start -- --tunnel` |
| Connection timeout | Check same WiFi, disable firewall |
| SDK version error | Update Expo Go app |
| Generic error | Clear cache in Expo Go |

---

## Still Not Working?

1. **Share the exact error message** you're seeing
2. **Check terminal output** for any red error messages
3. **Try the manual URL entry method**
4. **Use tunnel mode** - most reliable for network issues

---

## Recommended: Use Tunnel Mode

For most reliable connection, always use tunnel mode:

```bash
npm start -- --tunnel
```

This works even with:
- ❌ Different WiFi networks
- ❌ Firewall restrictions
- ❌ Corporate networks
- ❌ Complex network setups

The tunnel creates a public URL that bypasses all network issues!
