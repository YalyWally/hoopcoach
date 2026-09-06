// One-time helper: prints a fresh VAPID keypair for Web Push.
//
// Run this once locally (`npm run generate-vapid-keys` from backend/), then paste
// the two values into your hosting provider's environment variables as
// VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY. Do this exactly once per deployment —
// regenerating later invalidates every push subscription anyone has already
// created, since the public key baked into their subscription no longer matches.
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\nVAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\nSet both as environment variables on your host, then redeploy.\n');
