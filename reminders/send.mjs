// Runs once a day on GitHub Actions (see .github/workflows/reminders.yml).
// Looks at every tracker in Firestore and sends a push to each registered phone
// 3 days before, and on the day of, each scheduled vaccine and the next deworming.
import admin from 'firebase-admin';

const TZ = process.env.REMINDER_TZ || 'Asia/Ho_Chi_Minh';
const APP_URL = process.env.APP_URL || './';
const DRY_RUN = process.env.DRY_RUN === '1';

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
const daysUntil = date => Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
const pretty = date => new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

function reminder(kind, date, what) {
  const d = daysUntil(date);
  const emoji = kind === 'vaccine' ? '💉' : '💊';
  const label = kind === 'vaccine' ? 'vaccine' : 'deworming';
  if (d === 3) return { title: `${emoji} Luta's ${label} is in 3 days`, body: `${what} · ${pretty(date)}` };
  if (d === 0) return { title: `${emoji} Luta's ${label} is today!`, body: what };
  return null;
}

console.log(`Today in ${TZ}: ${today}`);
let sent = 0;

for (const space of await db.collection('spaces').listDocuments()) {
  const tokenDocs = (await space.collection('tokens').get()).docs;
  if (!tokenDocs.length) continue;

  const messages = [];
  const vaccines = await space.collection('vaccines').where('status', '==', 'scheduled').get();
  for (const v of vaccines.docs) {
    const r = reminder('vaccine', v.get('date'), v.get('name') || 'Vaccine');
    if (r) messages.push({ ...r, url: `${APP_URL}#vaccines`, tag: `vax-${v.id}` });
  }
  const settings = await space.collection('meta').doc('settings').get();
  const next = settings.get('nextDeworming');
  if (next) {
    const r = reminder('deworm', next, 'Time for the monthly deworming');
    if (r) messages.push({ ...r, url: `${APP_URL}#deworm`, tag: `deworm-${next}` });
  }

  for (const m of messages) {
    console.log(`→ ${m.title} (${tokenDocs.length} phone(s))`);
    if (DRY_RUN) continue;
    const res = await admin.messaging().sendEachForMulticast({
      tokens: tokenDocs.map(t => t.get('token')),
      data: m,
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    });
    sent += res.successCount;
    // Clean up phones that uninstalled the app or turned notifications off.
    await Promise.all(res.responses.map((r, i) => {
      const code = r.error?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        console.log('  removing an expired phone token');
        return tokenDocs[i].ref.delete();
      }
      if (r.error) console.warn('  send failed:', code, r.error.message);
    }));
  }
}

console.log(`Done. ${sent} notification(s) delivered.`);
