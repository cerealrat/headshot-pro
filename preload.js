const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	selectFolder: () => ipcRenderer.invoke('select-folder'),
	runPreview: (data) => ipcRenderer.send('run-preview', data),
	runBatch: (data) => ipcRenderer.send('run-batch', data),
	onPreviewResult: (cb) => ipcRenderer.on('preview-result', (_, val) => cb(val)),
	onPythonOutput: (cb) => ipcRenderer.on('python-output', (_, val) => cb(val)),
	openPath: (p) => ipcRenderer.invoke('open-path', p)
});