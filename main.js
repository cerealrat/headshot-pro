const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 700,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: true,
			preload: path.join(__dirname, 'preload.js')
		}
	});
	mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

// --- INPUT VALIDATION ---

function sanitizeInt(val, min, max) {
	const n = parseInt(val, 10);
	if (isNaN(n) || n < min || n > max) throw new Error(`Value ${val} out of range [${min}, ${max}]`);
	return n;
}

function sanitizeFloat(val, min, max) {
	const n = parseFloat(val);
	if (isNaN(n) || n < min || n > max) throw new Error(`Value ${val} out of range [${min}, ${max}]`);
	return n;
}

function sanitizeHex(val) {
	if (!/^#[0-9a-fA-F]{6}$/.test(val)) throw new Error(`Invalid hex color: ${val}`);
	return val;
}

function validateOptions(options) {
	return {
		color:       sanitizeHex(options.color),
		scale:       sanitizeFloat(options.scale, 0.5, 1.0),
		width:       sanitizeInt(options.width, 100, 5000),
		height:      sanitizeInt(options.height, 100, 5000),
		erode:       sanitizeInt(options.erode, 0, 40),
		fg:          sanitizeInt(options.fg, 100, 255),
		bg:          sanitizeInt(options.bg, 0, 50),
		transparent: !!options.transparent
	};
}

function hexToRgbString(hex) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `${r},${g},${b}`;
}

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function getPythonPath() {
	if (isDev) return 'python3';
	const binaryName = process.platform === 'win32' ? 'engine.exe' : 'engine';
	return path.join(process.resourcesPath, 'engine', binaryName);
}

// --- TEMP FILE CLEANUP ---

function getPreviewPath() {
	return path.join(app.getPath('userData'), 'preview_temp.png');
}

app.on('before-quit', () => {
	const previewPath = getPreviewPath();
	try {
		if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);
	} catch (e) {
		console.error('Failed to clean up preview temp file:', e);
	}
});

// --- IPC HANDLERS ---

// 1. SELECT FOLDER
ipcMain.handle('select-folder', async () => {
	const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
	const folderPath = result.filePaths[0];

	if (folderPath) {
		const files = fs.readdirSync(folderPath);
		const firstImage = files.find(file => /\.(jpg|jpeg|png)$/i.test(file));
		return { folderPath, firstImage };
	}
	return null;
});

// 2. OPEN FOLDER IN SYSTEM EXPLORER
ipcMain.handle('open-path', async (event, folderPath) => {
	await shell.openPath(folderPath);
});

// 3. RUN PREVIEW
ipcMain.on('run-preview', (event, data) => {
	let options;
	try {
		options = validateOptions(data.options);
	} catch (e) {
		event.reply('preview-error', `Invalid options: ${e.message}`);
		return;
	}

	const { inputPath, filename } = data;
	const outputFullPath = getPreviewPath();
	const inputFileFullPath = path.join(inputPath, filename);

	let args = isDev ? ['engine.py'] : [];
	args.push(
		'--file', inputFileFullPath,
		'--output', outputFullPath,
		'--color', hexToRgbString(options.color),
		'--scale', String(options.scale),
		'--width', String(options.width),
		'--height', String(options.height),
		'--erode', String(options.erode),
		'--fg', String(options.fg),
		'--bg', String(options.bg)
	);
	if (options.transparent) args.push('--transparent');

	const pythonProcess = spawn(getPythonPath(), args);

	pythonProcess.stderr.on('data', (data) => {
		console.error('Engine stderr:', data.toString());
	});

	pythonProcess.on('close', (code) => {
		if (code !== 0) {
			event.reply('preview-error', `Engine exited with code ${code}`);
		} else {
			event.reply('preview-result', outputFullPath);
		}
	});
});

// 4. RUN BATCH
ipcMain.on('run-batch', (event, data) => {
	let options;
	try {
		options = validateOptions(data.options);
	} catch (e) {
		event.reply('python-error', `Invalid options: ${e.message}`);
		return;
	}

	const { inputPath } = data;
	const outputFolder = path.join(inputPath, '_Processed');

	let args = isDev ? ['engine.py'] : [];
	args.push(
		'--input', inputPath,
		'--output', outputFolder,
		'--color', hexToRgbString(options.color),
		'--scale', String(options.scale),
		'--width', String(options.width),
		'--height', String(options.height),
		'--erode', String(options.erode),
		'--fg', String(options.fg),
		'--bg', String(options.bg)
	);
	if (options.transparent) args.push('--transparent');

	const pythonProcess = spawn(getPythonPath(), args);

	pythonProcess.stderr.on('data', (data) => {
		console.error('Engine stderr:', data.toString());
	});

	// Handle combined messages (e.g. "PROGRESS...\nDONE")
	pythonProcess.stdout.on('data', (data) => {
		const lines = data.toString().split('\n');
		lines.forEach(line => {
			const cleanLine = line.trim();
			if (cleanLine) event.reply('python-output', cleanLine);
		});
	});

	pythonProcess.on('close', (code) => {
		if (code !== 0) {
			event.reply('python-error', `Engine exited with code ${code}`);
		}
	});
});