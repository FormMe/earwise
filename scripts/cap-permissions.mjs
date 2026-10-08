// Adds the microphone permissions the singing exercises need to the native projects.
// Runs after `cap add` / `cap sync`, so regenerated platforms never lose them.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const manifest = 'android/app/src/main/AndroidManifest.xml';
if (existsSync(manifest)) {
  let xml = readFileSync(manifest, 'utf8');
  for (const perm of ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS']) {
    if (!xml.includes(perm)) xml = xml.replace('</manifest>', `    <uses-permission android:name="${perm}" />\n</manifest>`);
  }
  writeFileSync(manifest, xml);
  console.log('Android: microphone permissions ensured');
}

const plist = 'ios/App/App/Info.plist';
if (existsSync(plist)) {
  let xml = readFileSync(plist, 'utf8');
  if (!xml.includes('NSMicrophoneUsageDescription')) {
    xml = xml.replace(
      /<dict>/,
      '<dict>\n\t<key>NSMicrophoneUsageDescription</key>\n\t<string>EarWise слушает, как ты поёшь, чтобы проверить точность нот.</string>',
    );
    writeFileSync(plist, xml);
  }
  console.log('iOS: microphone usage description ensured');
}
