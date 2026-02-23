# Headshot Pro

A hybrid Electron + Python desktop application for batch-normalizing headshots using AI background removal.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:
* **Node.js** and **npm** (for the UI)
* **Python 3.x** and **pip** (for the AI engine)

---

## 🛠️ How to Restore & Install Dependencies

If you are downloading this project from source or returning to it after deleting the heavy folders (`node_modules`, `engine`, etc.), follow these steps to get running again.

### 1. Install JavaScript Libraries
Open your terminal in the project folder and run:
```bash
npm install
```

### 2. Install Python Libraries

Install the required AI and image processing libraries:

```bash
pip3 install rembg pillow pyinstaller
```

---

## ⚙️ Building the Python Engine (Critical Step)

The app relies on a compiled Python executable to handle the heavy AI processing. **You must rebuild this if the `engine/` folder is missing.**

1. **Compile the Script:**
Run this command to create the standalone folder (using `--onedir` for faster startup):
```bash
python3 -m PyInstaller --onedir --name engine engine.py
```


2. **Move the Output:**
The compilation creates a `dist/` folder containing an `engine` folder. You must move that `engine` folder to the root of your project.
*Mac/Linux Command:*
```bash
mv dist/engine .
```

*Windows Command:*
Move the `dist\engine` folder to the main project directory manually.

3. **Cleanup (Optional):**
You can now safely delete the `build/` and `dist/` folders created by PyInstaller.
---

## 🚀 Running in Development Mode

To test the app locally without building a full installer:

```bash
npm start
```

*Note: In development mode, the app uses the `python3` command directly. In production, it looks for the compiled `engine` executable.*

---

## 📦 Building the Standalone App

To create a shareable `.dmg` (Mac) or `.exe` (Windows) installer:

1. Ensure the **`engine/`** folder exists in your project root (see "Building the Python Engine" above).
2. Run the build command:
```bash
npm run dist
```


3. Find your installer in the new **`dist/`** folder.

---

## 🧹 What to Keep vs. Delete

To save space when archiving this project, you can delete the heavy generated folders.

**Safe to Delete:**

* `node_modules/` (Reinstall with `npm install`)
* `engine/` (Rebuild with PyInstaller steps above)
* `dist/` (Rebuild with `npm run dist`)
* `build/` (PyInstaller temp files)
* `__pycache__/`

**Must Keep (Source Code):**

* `engine.py`
* `main.js`
* `index.html`
* `package.json`
* `README.md`
