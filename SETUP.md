HELIUM SETUP AND RUNNING GUIDE

SYSTEM REQUIREMENTS

Before running Helium, make sure your system has the following installed:

Node.js version 16 or higher
npm (comes with Node.js)
Rust (for building the backend)
Git (for cloning the repository)

WINDOWS REQUIREMENTS

Windows 10 or later
Visual Studio Build Tools 2022 (for compilation)

MAC REQUIREMENTS

macOS 10.13 or later
Xcode Command Line Tools
Homebrew (optional but recommended)

LINUX REQUIREMENTS

Ubuntu 20.04 or later (or equivalent)
Build essential tools (gcc, make, etc.)
libssl-dev for OpenSSL

INSTALLATION STEPS

STEP ONE: INSTALL NODE.JS

Visit nodejs.org and download the LTS version for your operating system. Run the installer and follow the prompts. Verify the installation by opening a terminal and running:

node --version
npm --version

You should see version numbers for both.

STEP TWO: INSTALL RUST

Visit rustup.rs and follow the installation instructions for your operating system. For Windows, download the installer. For Mac and Linux, open a terminal and run:

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

Follow the prompts and add Rust to your PATH as instructed. Verify the installation by running:

rustc --version
cargo --version

STEP THREE: CLONE THE HELIUM REPOSITORY

Open a terminal and navigate to where you want to store Helium. Run:

git clone https://github.com/yourusername/helium.git
cd helium

Replace yourusername with the actual repository URL.

STEP FOUR: INSTALL PROJECT DEPENDENCIES

Navigate to the project root directory (where package.json is located) and run:

npm install

This downloads and installs all the JavaScript dependencies for the frontend. This may take a few minutes. Wait for it to complete before proceeding.

RUNNING IN DEVELOPMENT MODE

Once everything is installed, you can run Helium in development mode. This starts a live development server where you can make changes and see them instantly.

From the project root directory, run:

npm run tauri:dev

This command:

1. Starts the Vite development server for the frontend
2. Compiles the Rust backend
3. Launches Helium as a native desktop application

The first time you run this, compilation may take several minutes as Rust builds everything. Subsequent runs will be much faster.

You will see a Helium window open on your screen. You can now test the application.

MAKING CHANGES DURING DEVELOPMENT

While npm run tauri:dev is running:

Changes to React files are reflected instantly in the running app
Changes to Rust backend files require restarting the dev server
To restart, press Ctrl+C in the terminal and run npm run tauri:dev again

BUILDING FOR PRODUCTION

When you are ready to create a production build of Helium, run:

npm run tauri:build

This command:

1. Builds the React frontend for production (optimized and minified)
2. Compiles the Rust backend in release mode
3. Creates native installers for your operating system

The installers will be located in:

src-tauri/target/release/bundle/

On Windows, you will get a .msi installer.
On Mac, you will get a .dmg installer.
On Linux, you will get various formats like .deb and .rpm depending on your distribution.

COMMON ISSUES AND SOLUTIONS

RUST NOT FOUND

If you get a command not found error for rustc or cargo, Rust may not be properly installed. Reinstall Rust using the instructions above. Make sure to restart your terminal after installation.

NODE NOT FOUND

If you get a command not found error for node or npm, Node.js may not be installed or not in your PATH. Reinstall Node.js from nodejs.org.

DEPENDENCIES NOT INSTALLING

If npm install fails, try:

Clearing the npm cache: npm cache clean --force
Deleting node_modules and package-lock.json: rm -rf node_modules package-lock.json
Running npm install again

TAURI DEV NOT STARTING

If npm run tauri:dev fails to compile:

Make sure all system requirements are installed
Try npm install again to ensure all dependencies are present
On Windows, install Visual Studio Build Tools 2022
On Mac, run xcode-select --install to install command line tools
On Linux, install build-essential: sudo apt-get install build-essential

COMPILATION TAKING TOO LONG

The first Rust compilation takes a long time (10-20 minutes depending on your computer). This is normal. Subsequent builds are much faster. You can speed up initial compilation by using:

npm run tauri:dev -- --release

However this uses more memory during compilation.

PORT ALREADY IN USE

If you get an error that port 5173 is already in use, another application is using that port. Either close the other application or kill the process using that port.

On Windows:

netstat -ano | findstr :5173
taskkill /PID [PID] /F

On Mac and Linux:

lsof -i :5173
kill -9 [PID]

TESTING THE APP

Once Helium is running:

1. Create a new vault by entering an email and master password
2. Add a test password entry
3. Verify you can view and copy the password
4. Test the Encryption Details viewer
5. Try the Password Generator
6. Test Autotype if you have accessibility permissions set up

TROUBLESHOOTING BUILDS

FRONTEND BUILD ERRORS

If you see errors about React or JavaScript code:

Check that all imports are correct
Run npm install again
Clear node_modules and reinstall if needed

BACKEND BUILD ERRORS

If you see Rust compilation errors:

Make sure Rust is up to date: rustup update
Check the error message carefully, it usually describes what is wrong
Search for the error message online
Try deleting target directory: rm -rf src-tauri/target

LINKER ERRORS ON LINUX

If you get linker errors, install development headers:

Ubuntu: sudo apt-get install libssl-dev libsoup-3.0-dev webkit2gtk-4.1-dev
Fedora: sudo dnf install openssl-devel libsoup-devel webkit2gtk3-devel

PERMISSION DENIED ON MAC

If you get permission denied errors when running Tauri dev:

Make sure you have proper permissions on the project directory
Try: chmod -R u+w .helium if the .helium folder exists

ENVIRONMENT SETUP

If you want to use Helium in multiple projects or terminals:

The app is self-contained. Just run npm run tauri:dev from the helium directory each time.

No additional environment variables are required.

Development builds store data in .helium in your home directory.

WORKFLOW

Here is a typical workflow for developing Helium:

1. Open a terminal in the helium directory
2. Run: npm run tauri:dev
3. Wait for the app to open
4. Make changes to frontend code (React components)
5. See changes instantly in the running app
6. For backend changes, press Ctrl+C and run npm run tauri:dev again
7. Test your changes thoroughly
8. Commit your changes: git add . && git commit -m "Your message"
9. Push to repository: git push origin main

BUILDING FOR DISTRIBUTION

When you are ready to share Helium:

1. Run: npm run tauri:build
2. Navigate to src-tauri/target/release/bundle/
3. Find the installer for your operating system
4. Share the installer with others
5. Users can run the installer to install Helium on their computer

UPDATING DEPENDENCIES

Periodically update dependencies to get security patches:

npm update

For major updates:

npm outdated

This shows which packages have newer versions available.

ADDITIONAL RESOURCES

Vite Documentation: vitejs.dev
React Documentation: react.dev
Tauri Documentation: tauri.app
Rust Documentation: doc.rust-lang.org

SUPPORT

If you encounter issues:

1. Check this guide again
2. Search for the error message online
3. Check the GitHub issues page
4. Check Tauri, React, and Rust documentation

Remember: Most issues are solvable with patience. Read error messages carefully as they usually describe exactly what went wrong.
