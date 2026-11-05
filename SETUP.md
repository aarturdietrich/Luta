# Setting up Luta, step by step

You'll do this once. It takes about 30–45 minutes. At the end, the app lives at a web
address like `https://yourname.github.io/luta/`, sits on both your home screens, and
sends reminders.

**What each piece does, in plain words**

| Piece | Job | Cost |
|---|---|---|
| **Firebase** (Google) | The shared notebook in the cloud. Both phones read and write the same records. Also delivers push notifications. | Free plan |
| **GitHub** | Stores the app's files, and **GitHub Pages** serves them as a website. A daily robot (GitHub Actions) checks dates and sends reminders. | Free |
| **Your phones** | Open the website once, "Add to Home Screen", and from then on it behaves like an app. | — |

> **Try it first (optional).** The app works right now in *demo mode*: records are saved on
> one device only. In Terminal, in this folder, run `python3 -m http.server 5317`,
> then open <http://localhost:5317> in your browser. Press `Ctrl + C` in Terminal to stop it.

---

## Step 1 — Create the Firebase project

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Create a project** (or **Add project**).
3. Name it `luta`. Firebase adds some random letters to make the ID unique, which is fine.
4. When asked about **Google Analytics**, switch it **off**. You don't need it.
5. Click **Create project**, wait, then **Continue**.

You're now on the project's dashboard.

## Step 2 — Register the app and copy its settings

Firebase needs to know a website will talk to it. It then gives you a few lines of settings.

1. On the dashboard, click the **web icon `</>`** ("Add an app to get started").
2. Nickname: `Luta web`. **Don't** tick "Firebase Hosting". Click **Register app**.
3. You'll see code containing `const firebaseConfig = { apiKey: "...", ... }`.
4. Open `firebase-config.js` in this folder and replace each `PASTE_...` value with the matching value
   from that screen (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
   Keep the quotes and commas.
5. Click **Continue to console**.

> These values are **not secret**. Every Firebase website shows them to visitors. What protects your
> data is the PIN plus the security rules in the next step.

## Step 3 — Create the database and lock it down

1. In the left menu: **Build → Firestore Database → Create database**.
2. Location: pick **asia-southeast1 (Singapore)**, the closest to Vietnam. You can't change this later.
3. Choose **Start in production mode** → **Create**.
4. When it's ready, open the **Rules** tab. Delete everything in the box.
5. Open `firestore.rules` from this folder, copy all of it, paste it into the box, and click **Publish**.

These rules say: "only someone who knows the family PIN can reach Luta's records, and nobody can browse
the database."

## Step 4 — Get the push notification key

1. Click the **gear ⚙ next to "Project Overview"** → **Project settings**.
2. Open the **Cloud Messaging** tab.
3. Scroll to **Web configuration → Web Push certificates** → **Generate key pair**.
4. Copy the long key that appears and paste it into `firebase-config.js` in place of `PASTE_VAPID_KEY`.

## Step 5 — Download the key for the reminder robot

The daily reminder job needs permission to read dates and send notifications.

1. Still in **Project settings**, open the **Service accounts** tab.
2. Click **Generate new private key** → **Generate key**. A `.json` file downloads.
3. **Leave it in Downloads. Do not put it in the Luta folder**, and never share it. It's like a password
   to your Firebase project. You'll paste its contents into GitHub in Step 8, then you can delete it.

## Step 6 — Put the app on GitHub

The simplest way for a beginner is **GitHub Desktop** (a free app with buttons instead of commands).

1. Install it from <https://desktop.github.com> and sign in with your GitHub account.
2. **File → Add Local Repository…** → choose this `Luta` folder.
   It'll say it isn't a Git repository yet. Click **create a repository**, then **Create Repository**.
3. Click **Publish repository**.
   - Name: `luta`
   - **Untick "Keep this code private"**. Free GitHub Pages needs a public repository.
     Your records are **not** in the code; they live in Firebase behind the PIN.
4. Click **Publish repository**.

*(Prefer Terminal? Ask Claude to run the `git` commands for you; it'll explain each one first.)*

Later, whenever a file changes: open GitHub Desktop, write a short note bottom-left, click
**Commit to main**, then **Push origin**.

## Step 7 — Turn on GitHub Pages (make it a website)

1. On <https://github.com>, open your `luta` repository.
2. **Settings** (top tab) → **Pages** (left menu).
3. Under **Build and deployment → Source** choose **Deploy from a branch**.
   Branch: **main**, folder: **/ (root)** → **Save**.
4. Wait 1–2 minutes and refresh. The page shows **"Your site is live at https://yourname.github.io/luta/"**.
   Open it to check.

## Step 8 — Switch on daily reminders

1. In the repository: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `FIREBASE_SERVICE_ACCOUNT`
3. Value: open the `.json` file from Step 5 with TextEdit, select all, copy, and paste it here. **Add secret**.
4. You can now delete that `.json` file from Downloads.
5. Open the **Actions** tab. If GitHub asks, click **I understand my workflows, go ahead and enable them**.
6. Click **Daily reminders** → **Run workflow** → **Run workflow** to test it. A green tick means it worked.

From now on it runs every morning at **8:00 Vietnam time**, sending a notification 3 days before and on
the day of each scheduled vaccine and the next deworming.

> GitHub pauses scheduled jobs in repositories with no changes for 60 days. They email you first,
> and one click re-enables it. Any small commit also resets the clock.

## Step 9 — Install on your iPhone

Needs iOS 16.4 or newer for notifications.

1. Open **Safari** (it must be Safari) and go to your `https://yourname.github.io/luta/` address.
2. Tap the **Share** button (square with an arrow) → scroll down → **Add to Home Screen** → **Add**.
3. Open **Luta from the home screen** (not from Safari).
4. Type a **family PIN**. Choose something longer than 4 digits; 8+ letters/numbers is best.
   The first time, it asks to create the tracker. Tap **Create tracker**. Luta's details are filled in.
5. Go to the **Luta** tab → **Reminders → Turn on** → **Allow**.

**Your wife:** same steps on her phone, typing **exactly the same PIN**. (Capital letters don't matter.)
If she sees "Start Luta's tracker?", the PIN is different: tap **Cancel** and try again.

**Android:** open the address in **Chrome** → menu **⋮** → **Install app** (or **Add to Home screen**).

---

### Good to know

- **Photos:** the app shrinks each photo before uploading (about 1600 pixels, sharp on a phone) so it
  fits the free plan. That's room for roughly 2,000+ photos; the Photos tab shows how much space is used.
  Your full-quality originals stay in your camera roll. Tap the share button on a photo to save it.
- **Offline:** the app opens without internet and catches up when you're back online.
- **Forgot the PIN?** Records are still in Firebase (Firestore Database → Data), but the app can't open
  them without the PIN. Write it down somewhere safe.
- **How private is the PIN?** It keeps strangers and search engines out. It isn't bank-grade, which is why
  a longer PIN is better. Don't store anything sensitive in the notes.
- **Reminder time or time zone:** change `cron` and `REMINDER_TZ` in `.github/workflows/reminders.yml`.
