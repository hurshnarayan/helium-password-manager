HELIUM PASSWORD MANAGER

WHAT IS HELIUM

Helium is a password manager that keeps your passwords safe on your computer. Think of it like a secure vault where you store passwords, usernames, credit card information, and other sensitive data. The key difference is that everything is locked with military-grade encryption that even Helium developers cannot break into.

Unlike other password managers that store your data on the internet on a company server, Helium keeps everything on your device only. You have complete control. Nobody can access your data remotely because it is not stored anywhere except your computer.

WHY DO YOU NEED HELIUM

Most people reuse the same password for many websites. If one website gets hacked and your password is leaked, hackers can use that password to access your other accounts like email, bank, or social media. This puts you at serious risk.

With Helium, you can use a different unique password for every website without having to remember them. You only need to remember one master password to unlock your vault and access all your other passwords.

HOW HELIUM KEEPS YOUR DATA SECURE

Your passwords are protected with three layers of encryption working together. This is called quantum-safe encryption because it protects your data even against potential future threats from quantum computers.

LAYER ONE: YOUR MASTER PASSWORD

When you create your Helium vault, you set a master password. This password is the key to everything. Helium never stores your master password anywhere. Instead, it uses a special algorithm called Argon2id to convert your password into a very long random number called a key. This process is one-way, meaning someone cannot reverse it to find your password even if they have the key.

The Argon2id algorithm is designed to be slow and require lots of computer memory. This intentional slowness makes it extremely difficult for someone to guess your password through brute force attacks where they try millions of passwords per second. Helium uses these settings:

Three iterations of processing
19456 kilobytes of memory
4 parallel threads processing at the same time

Every time you save a new password to your vault, a fresh random salt is created. The salt is like a unique ingredient added to your password before processing. Even if two people use the exact same password, their encryption keys will be completely different because of their unique salts. This means hackers cannot use precomputed tables of common passwords.

LAYER TWO: QUANTUM-SAFE KEY ENCAPSULATION

The second layer protects your data against a future threat: quantum computers. Regular computers that exist today struggle to break modern encryption, but someday quantum computers might be able to. Helium uses a technology called ML-KEM-768 which is designed specifically to resist quantum computer attacks.

Here is how it works:

For each password you save, Helium generates a unique pair of keys. A public key that is used to create encrypted information and a secret key that is kept stored safely. The public key is used to create a shared secret, which is a random number that both sides can have without anyone else knowing it. Only the person with the secret key can figure out what the shared secret is. This is stored safely in your vault file.

When you want to decrypt your data, Helium uses the secret key to recover the shared secret again.

LAYER THREE: THE FINAL ENCRYPTION KEY

The password derived key from Layer One and the shared secret from Layer Two are combined together using a mathematical operation called XOR. This creates the final 256-bit encryption key that is used to encrypt your actual password data.

The formula is: Final Key equals Argon2id key XOR ML-KEM shared secret

This combines the security of two completely different systems. Even if someone could break Argon2id, they still could not decrypt your data without the ML-KEM secret key. And even if they had that, they would still need your master password. This redundancy is what makes Helium so secure.

DATA ENCRYPTION WITH AES-256-GCM

Once the final key is created, your password data is encrypted using AES-256-GCM. AES is the Advanced Encryption Standard, the same algorithm used by the United States government, military, and banks worldwide. The GCM part adds an authentication tag that proves your data has not been tampered with.

SUMMARY OF ENCRYPTION

1. You enter your master password
2. Helium converts it to a key using Argon2id with a unique salt
3. Helium generates a quantum-safe shared secret using ML-KEM
4. Both keys are combined together
5. Your password data is encrypted with this final key using AES-256-GCM
6. Everything is stored in your vault file on your computer

HOW DECRYPTION WORKS

When you want to access your passwords:

1. You enter your master password
2. Helium reads the salt stored with each password and derives the same key using Argon2id
3. Helium uses the ML-KEM secret key to recover the same shared secret
4. Both keys are combined the same way
5. The final key is used to decrypt your password data
6. The authentication tag is checked to ensure nothing was modified

If you entered your password wrong, the keys will not match and decryption will fail. This is why there is no backdoor or way to recover a forgotten master password.

USING HELIUM

CREATING YOUR VAULT

1. Install and launch Helium
2. You will see a login screen
3. Enter your email address and create a strong master password
4. Click Create Vault
5. Helium creates your vault file stored at your home directory in a hidden folder called .helium

ACCESSING YOUR VAULT

1. Launch Helium
2. Enter your email and master password
3. Click Login
4. Your vault opens showing all your saved passwords

ADDING A PASSWORD

1. Click the plus button or Add New Item in your vault
2. Enter the name of the service (like Gmail)
3. Enter your username or email for that service
4. Enter the password
5. Optionally add the website URL and any notes
6. Click Save

Your password is immediately encrypted with all three security layers and stored in your vault file.

VIEWING AND COPYING PASSWORDS

1. Click on any entry in your vault list
2. The right panel shows the details
3. Click the eye icon next to the password to show or hide it
4. Click the copy button next to the password to copy it to your clipboard
5. Click the copy button next to the username to copy the username

The password will automatically be cleared from your clipboard after 8 seconds for security.

EDITING A PASSWORD

1. Click on a password entry
2. Click the Edit button
3. Make your changes
4. Click Save
5. You will be asked to confirm the change by entering your master password again

DELETING A PASSWORD

1. Click on a password entry
2. Click the Delete button
3. Confirm when asked
4. The password is permanently deleted

SEARCHING YOUR VAULT

1. Use the search box at the top of your password list
2. Type part of a password name or username
3. Results appear instantly as you type
4. Click any result to view it

PASSWORD STRENGTH INDICATOR

When you add or edit a password, Helium shows a strength meter. This helps you understand how secure your password is:

Very Weak: Red bar. These passwords are easy to guess.
Weak: Orange bar. Some randomness but could be stronger.
Fair: Yellow bar. Reasonable security for many uses.
Good: Light blue bar. Quite secure.
Very Strong: Dark blue bar. Excellent security.

AUTOTYPE FEATURE

WHAT IS AUTOTYPE

Autotype is a feature that automatically types your username and password into login forms. Instead of manually copying and pasting, you can use Autotype to fill in forms instantly. This is especially useful on mobile devices or systems where copying and pasting is inconvenient.

HOW AUTOTYPE WORKS

When you use Autotype, Helium simulates keyboard input to your computer. It types out your credentials as if you were typing them yourself. This is safer than browser extensions because Helium is not connected to your browser, so websites cannot secretly access your passwords.

SETTING UP AUTOTYPE

1. Click on a password entry in your vault
2. Scroll down to the AutoType Sequence section
3. By default it is set to USERNAME and PASSWORD
4. This means Helium will type your username, press Tab, then type your password

You can customize the sequence using these commands:

USERNAME: Helium types your username
PASSWORD: Helium types your password
TAB: Simulates pressing the Tab key to move to the next field
ENTER: Simulates pressing the Enter key to submit the form
SLEEP 500: Pauses for 500 milliseconds (useful for slow forms)

EXAMPLES

If your login form has a username field, then a password field, then a submit button, you would use:

USERNAME TAB PASSWORD ENTER

If there is a delay before the password field appears:

USERNAME SLEEP 1000 TAB PASSWORD ENTER

If the form requires you to press Enter twice:

USERNAME TAB PASSWORD ENTER ENTER

USING AUTOTYPE

1. Open the login website in your browser
2. Click into the first field (username field)
3. In Helium, find the password entry
4. Click Test AutoType to see what will be typed
5. Once you confirm the sequence is correct, click Save Sequence
6. Next time you click Test AutoType, it will type the credentials for real
7. Adjust the sequence if needed using Reset to go back to the default

IMPORTANT NOTES ABOUT AUTOTYPE

Autotype requires accessibility permissions on your system. This allows Helium to simulate keyboard input. You will be prompted to grant these permissions when you first use Autotype. Without these permissions, Autotype cannot function.

On Windows: Go to Settings > Privacy > Accessibility and add Helium to the list
On Mac: Go to System Preferences > Security and Privacy > Accessibility and add Helium to the list
On Linux: Permissions depend on your window manager but generally require XTest extension

USING THE PASSWORD GENERATOR

Helium includes a password generator to create strong passwords:

1. Click the Generator button in the left sidebar or in the Add Password form
2. Set your preferences:
   Length: How many characters
   Uppercase letters: Include A-Z
   Lowercase letters: Include a-z
   Numbers: Include 0-9
   Symbols: Include special characters like at sign hash dollar percent
3. Click Generate
4. A new password is created and shown
5. Click Copy to copy it to your clipboard
6. Use it when creating new accounts

UNDERSTANDING YOUR DATA STORAGE

Your vault is stored in a single file on your computer. The location depends on your operating system:

Windows: C:\Users\YourUsername\.helium\youremail_com.vault
Mac: /Users/YourUsername/.helium/youremail_com.vault
Linux: /home/YourUsername/.helium/youremail_com.vault

This file contains all your encrypted passwords. Even if someone steals this file, they cannot read it without your master password and the quantum-safe keys stored locally.

Helium does not upload this file anywhere. It stays on your device. This is different from cloud-based password managers where your data is stored on a company server.

BACKING UP YOUR VAULT

Since your vault file is stored locally, you should back it up regularly:

1. Copy the .helium folder from your home directory to an external drive or backup location
2. Keep multiple backups in case one gets corrupted
3. Store backups in a secure location

If you lose your vault file and do not have a backup, you cannot recover your passwords. There is no central server holding a copy.

SECURITY BEST PRACTICES

USE A STRONG MASTER PASSWORD

Your master password is the only key to your entire vault. Make it:

At least 16 characters long
Mix uppercase and lowercase letters
Include numbers and symbols
Not a common phrase or word

Example of a strong password: BlueMountain47DollarSunrise

Do not use birthdays, names, or simple words.

KEEP YOUR COMPUTER SECURE

Helium is only as secure as your computer. If someone has access to your computer and can watch you type your master password, they can access your vault. Use security best practices:

Enable password protection on your computer
Keep your operating system and software updated
Use antivirus software
Do not use untrusted networks to access Helium
Lock your computer when you step away

NEVER SHARE YOUR MASTER PASSWORD

Never tell anyone your master password. Not even Helium support staff will ask for it. If someone claims to be from Helium and asks for your master password, they are trying to scam you.

REGULARLY UPDATE HELIUM

Keep Helium up to date with the latest version. Updates include:

Security improvements
Bug fixes
New features

Check for updates regularly in the Settings menu.

VIEWING ENCRYPTION DETAILS

You can see exactly how your passwords are encrypted:

1. Click on any password entry
2. Click the lock icon to view Encryption Details
3. You will see three layers displayed:
   Layer One shows the salt used for Argon2id
   Layer Two shows the ML-KEM secret encapsulation
   Layer Three shows the actual encrypted password data

Click on each layer to see the complete hexadecimal values. This is for technical verification only.

LIMITATIONS AND NOTES

Helium only works on your local computer. It does not sync across devices. If you have multiple computers, you need to copy your vault file to each one.

If you format your hard drive or reinstall your operating system, your vault file will be deleted unless you have a backup.

Helium cannot recover a forgotten master password. Make sure you remember it or write it down and store it somewhere safe.

Helium is not a cloud backup solution. You are responsible for backing up your vault file.

TROUBLESHOOTING

CANNOT LOGIN

Verify you are entering the correct email and master password. Remember that passwords are case-sensitive. If you forgot your master password, you cannot recover your vault. There is no way to reset it.

AUTOTYPE NOT WORKING

Make sure you have granted Helium accessibility permissions on your system. Go to System Settings and add Helium to the list of apps allowed to control your computer. Ensure the AutoType sequence is correct for your login form. Try clicking Test AutoType first to verify the sequence.

VAULT FILE MISSING

If you cannot find your vault file, check that hidden files are visible on your computer. The .helium folder starts with a dot, so it is hidden by default. On Windows and Mac, you can enable viewing hidden files in your file explorer settings.

PASSWORDS NOT SAVING

Make sure you have enough disk space on your computer. If your hard drive is full, new passwords cannot be saved. Also verify that the .helium folder exists and your user account has write permissions.

SLOWNESS WHEN OPENING VAULT

When you open your vault, Helium must decrypt each password entry. On older computers this can take a few seconds. This is normal and intentional because the encryption is deliberately slow to protect against brute force attacks.

CLIPBOARD NOT CLEARING

After you copy a password, it is held in your clipboard for 8 seconds, then automatically cleared for security. If it is not clearing, your operating system may be using a different clipboard system. You can manually clear it by copying something else.

TECHNICAL ARCHITECTURE

FRONTEND

Built with React and JavaScript. This is the user interface you see and interact with. React is a JavaScript framework that makes the interface responsive and fast.

BACKEND

Built with Rust for maximum security and performance. Handles all encryption and decryption operations. Rust is a programming language designed from the ground up to prevent entire classes of security vulnerabilities.

FRAMEWORK

Tauri allows the React frontend and Rust backend to run as a native desktop application on Windows, Mac, and Linux. This means Helium runs with the same security and performance as a native application.

CRYPTOGRAPHIC LIBRARIES USED

Argon2id: Password hashing with memory hardening
ML-KEM-768: Post-quantum key encapsulation from NIST standards
AES-256-GCM: Symmetric encryption and authentication
Random number generation: Used for salts and quantum-safe parameters

All data is processed locally on your computer. No internet connection is required to use Helium.

FREQUENTLY ASKED QUESTIONS

IS MY DATA REALLY SECURE

Yes. Helium uses military-grade encryption with three security layers. Your data is protected against current and future threats including quantum computers. The combination of Argon2id for password security, ML-KEM-768 for quantum resistance, and AES-256-GCM for data protection makes this virtually impossible to crack.

WHAT IF HELIUM GETS HACKED

Helium itself does not store any data. Your passwords are stored only on your computer in an encrypted file. If Helium the company were to disappear tomorrow, your passwords would remain safely encrypted on your device. You can access them by using compatible decryption tools that implement the same cryptographic standards.

CAN I USE HELIUM ON MY PHONE

Currently, Helium is designed for Windows, Mac, and Linux computers. Mobile versions are not yet available. You can manually copy your vault file to a phone for use with compatible decryption apps, but this requires manual management.

WHAT HAPPENS IF I FORGET MY MASTER PASSWORD

Unfortunately, there is no recovery option. Your vault is permanently locked. This is a feature, not a bug. It ensures that no one, including Helium developers, can access your vault without your master password. Make sure you remember your master password or store it securely somewhere safe.

CAN I EXPORT MY PASSWORDS

This feature is not currently available. Your passwords are stored in an encrypted format that is tied to your specific vault. You cannot export them as plain text for security reasons.

DO I NEED TO PAY FOR HELIUM

Check the project repository for current licensing and pricing information.

CAN I SYNC HELIUM ACROSS MULTIPLE DEVICES

Currently, Helium does not support cloud sync. You can manually copy your vault file to another computer and access your passwords there, but you must manage this yourself.

IS HELIUM OPEN SOURCE

Check the project repository for information about open source availability and source code access.

GETTING HELP

If you encounter issues or have questions:

1. Check this README for answers to common questions
2. Review the Troubleshooting section above
3. Check the Settings menu for additional options and information

REMEMBER

Your security is your responsibility. Choose a strong master password, keep your computer secure, and regularly back up your vault file. Do not reuse master passwords across different systems. Do not write your master password on sticky notes or in unencrypted files. Keep Helium updated with the latest security patches.
