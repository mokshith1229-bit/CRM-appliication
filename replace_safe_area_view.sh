#!/bin/bash

# Script to replace deprecated SafeAreaView with react-native-safe-area-context version

echo "🔄 Replacing deprecated SafeAreaView across the mobile app..."

# List of files to update
files=(
  "src/navigation/CustomDrawer.js"
  "src/screens/ContactDetailScreen.js"
  "src/screens/CreateLeadScreen.js"
  "src/screens/IncomingCallScreen.js"
  "src/screens/SubscriptionReminderScreen.js"
  "src/screens/BookSiteVisitScreen.js"
  "src/screens/ForwardProjectScreen.js"
  "src/screens/MyStatisticsScreen.js"
  "src/screens/MyProfileScreen.js"
  "src/screens/InAppCallScreen.js"
  "src/screens/QuickContactScreen.js"
  "src/screens/FilteredContactsScreen.js"
  "src/screens/HighDemandProjectsScreen.js"
  "src/screens/HomeScreen.js"
  "src/screens/CampaignLeadsScreen.js"
)

cd "/home/cs/Desktop/Vivtej APPS/TELECRM/CRM-appliication"

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  📝 Updating $file..."
    
    # Remove SafeAreaView from react-native import
    sed -i 's/SafeAreaView,[ ]*//g' "$file"
    sed -i 's/,[ ]*SafeAreaView//g' "$file"
    sed -i 's/{ SafeAreaView }/{ }/g' "$file"
    
    # Add import for SafeAreaView from react-native-safe-area-context
    # Check if the import already exists
    if ! grep -q "react-native-safe-area-context" "$file"; then
      # Add the import after the react-native import
      sed -i "/from 'react-native';/a import { SafeAreaView } from 'react-native-safe-area-context';" "$file"
    fi
  else
    echo "  ⚠️  File not found: $file"
  fi
done

echo "✅ SafeAreaView replacement complete!"
echo "📌 Please verify the changes and test the app."
