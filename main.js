const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 700,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			webSecurity: false 
		}
	});
	mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

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

// 2. RUN PREVIEW
ipcMain.on('run-preview', (event, data) => {
	const { inputPath, filename, options } = data;
	const previewDir = app.getPath('userData'); 
	const previewFilename = 'preview_temp.png';
	const outputFullPath = path.join(previewDir, previewFilename);
	const inputFileFullPath = path.join(inputPath, filename);

	let args = isDev ? ['engine.py'] : [];
	
	args.push(
		'--file', inputFileFullPath,
		'--output', outputFullPath,
		'--color', hexToRgbString(options.color),
		'--scale', options.scale,
		'--width', options.width,
		'--height', options.height,
		'--erode', options.erode,
		'--fg', options.fg,
		'--bg', options.bg
	);
	if (options.transparent) args.push('--transparent');

	const pythonProcess = spawn(getPythonPath(), args);

	pythonProcess.on('close', (code) => {
		event.reply('preview-result', outputFullPath);
	});
});

// 3. RUN BATCH (With Buffer Fix)
ipcMain.on('run-batch', (event, data) => {
	const { inputPath, options } = data;
	const outputFolder = path.join(inputPath, '_Processed');
	
	let args = isDev ? ['engine.py'] : [];
	
	args.push(
		'--input', inputPath,
		'--output', outputFolder,
		'--color', hexToRgbString(options.color),
		'--scale', options.scale,
		'--width', options.width,
		'--height', options.height,
		'--erode', options.erode,
		'--fg', options.fg,
		'--bg', options.bg
	);
	if (options.transparent) args.push('--transparent');

	const pythonProcess = spawn(getPythonPath(), args);

	// FIX: Handle combined messages (e.g. "PROGRESS... \n DONE")
	pythonProcess.stdout.on('data', (data) => {
		const lines = data.toString().split('\n'); // Split by new line
		lines.forEach(line => {
			const cleanLine = line.trim();
			if (cleanLine) {
				event.reply('python-output', cleanLine);
			}
		});
	});
});