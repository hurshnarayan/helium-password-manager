HELIUM QUICKSTART

THE FASTEST WAY TO GET HELIUM RUNNING

INSTALL REQUIREMENTS

1. Install Node.js from nodejs.org
2. Install Rust from rustup.rs
3. Install Visual Studio Build Tools 2022 (Windows only)

CLONE AND RUN

Open terminal and run these commands:

git clone https://github.com/yourusername/helium.git
cd helium
npm install
npm run tauri:dev

Replace yourusername with the actual repository URL.

That is it. Helium will open in about 2 to 10 minutes (first run takes longer).

FIRST TIME USING HELIUM

1. Enter your email address
2. Create a strong master password (16+ characters)
3. Click Create Vault
4. Add a test password by clicking Add New Item
5. Fill in the name, username, and password
6. Click Save
7. Click the entry to view it
8. Use the eye icon to show the password
9. Use the copy icon to copy username or password

CREATE A PRODUCTION BUILD

When ready to distribute:

npm run tauri:build

Find the installer in src-tauri/target/release/bundle/

COMMON COMMANDS

npm run tauri:dev - Start development server
npm run tauri:build - Build for production
npm run lint - Check code for errors
npm run build - Build React frontend only

TROUBLESHOOTING

Cannot run npm commands
  Install Node.js from nodejs.org and restart terminal

Cannot run rustc or cargo commands
  Install Rust from rustup.rs and restart terminal

Tauri dev fails to compile
  Run npm install again
  Make sure all system requirements are installed
  Check internet connection

Build takes forever on first run
  Normal. First Rust compilation takes 10-20 minutes

NEXT STEPS

Read README.md for full documentation
Read SETUP.md for detailed instructions
Check the app by clicking Settings and testing features

RUNNING ON DIFFERENT COMPUTERS

Share the installer from src-tauri/target/release/bundle/ with others. They can run it to install Helium. Vault files are stored locally in .helium folder in home directory.
