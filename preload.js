const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	selectFolder:     () => ipcRenderer.invoke('select-folder'),
	openPath:         (p) => ipcRenderer.invoke('open-path', p),
	runPreview:       (data) => ipcRenderer.send('run-preview', data),
	runBatch:         (data) => ipcRenderer.send('run-batch', data),
	onPreviewResult:  (cb) => ipcRenderer.on('preview-result',  (_, val) => cb(val)),
	onPreviewError:   (cb) => ipcRenderer.on('preview-error',   (_, val) => cb(val)),
	onPythonOutput:   (cb) => ipcRenderer.on('python-output',   (_, val) => cb(val)),
	onPythonError:    (cb) => ipcRenderer.on('python-error',    (_, val) => cb(val)),
});