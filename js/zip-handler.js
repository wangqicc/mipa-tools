/**
 * ZIP文件处理模块
 * 负责ZIP文件的上传、解析、文件列表展示和导出功能
 */
class ZipHandler {
    constructor() {
        // DOM元素引用
        this.zipUpload = document.getElementById('zipUpload');
        this.clearZipBtn = document.getElementById('clearZipBtn');
        this.uploadInfo = document.getElementById('uploadInfo');
        this.fileListContainer = document.getElementById('fileListContainer');
        this.fileList = document.getElementById('fileList');
        this.totalFiles = document.getElementById('totalFiles');
        this.selectedFilesCount = document.getElementById('selectedFilesCount');
        this.toggleSelectBtn = document.getElementById('toggleSelectBtn');
        this.extractBtn = document.getElementById('extractBtn');
        this.extractResult = document.getElementById('extractResult');
        this.zipLoading = document.getElementById('zipLoading');
        this.fileSearchInput = document.getElementById('fileSearchInput');
        this.showSelectedOnlyCheckbox = document.getElementById('showSelectedOnly');
        
        // 状态管理
        this.isAllSelected = false;
        
        // 状态管理
        this.originalZipName = '';
        this.allFiles = [];
        this.filteredFiles = [];
        this.zipObjects = {}; // 存储ZIP对象，用于处理子压缩包
        
        // 初始化事件监听器
        this.initEventListeners();
    }
    
    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 监听ZIP文件上传
        if (this.zipUpload) {
            this.zipUpload.addEventListener('change', this.handleZipUpload.bind(this));
        }
        
        // 清空上传
        if (this.clearZipBtn) {
            this.clearZipBtn.addEventListener('click', this.clearUpload.bind(this));
        }
        
        // 切换全选/取消全选
        if (this.toggleSelectBtn) {
            this.toggleSelectBtn.addEventListener('click', this.toggleSelectAll.bind(this));
        }
        
        // 导出选中文件
        if (this.extractBtn) {
            this.extractBtn.addEventListener('click', this.exportSelectedFiles.bind(this));
        }
        
        // 文件搜索事件
        if (this.fileSearchInput) {
            this.fileSearchInput.addEventListener('input', this.filterFileList.bind(this));
        }
        
        // 只显示已选文件选项事件
        if (this.showSelectedOnlyCheckbox) {
            this.showSelectedOnlyCheckbox.addEventListener('change', this.renderFileList.bind(this));
        }
        
        // 只显示已选文件按钮事件
        this.showSelectedOnlyBtn = document.getElementById('showSelectedOnlyBtn');
        if (this.showSelectedOnlyBtn) {
            this.showSelectedOnlyBtn.addEventListener('click', () => {
                // 切换复选框状态
                if (this.showSelectedOnlyCheckbox) {
                    this.showSelectedOnlyCheckbox.checked = !this.showSelectedOnlyCheckbox.checked;
                    // 更新按钮图标
                    const icon = this.showSelectedOnlyBtn.querySelector('i');
                    if (this.showSelectedOnlyCheckbox.checked) {
                        icon.className = 'fa fa-check-square-o mr-1';
                    } else {
                        icon.className = 'fa fa-square-o mr-1';
                    }
                    // 重新渲染文件列表
                    this.renderFileList();
                }
            });
        }
    }
    
    /**
     * 处理ZIP文件上传
     */
    async handleZipUpload(e) {
        const file = e.target.files[0];
        if (!file || (!file.type.includes('zip') && !file.name.endsWith('.zip'))) {
            this.showMessage('请上传有效的ZIP压缩包！', 'error');
            return;
        }
        
        // 重置列表信息
        this.allFiles = [];
        this.filteredFiles = [];
        this.zipObjects = {};

        // 显示上传信息
        this.originalZipName = file.name.replace(/\.zip$/, '');
        this.uploadInfo.textContent = `正在解析 ${file.name}...`;
        this.uploadInfo.classList.remove('hidden', 'text-success', 'text-danger');
        this.uploadInfo.classList.add('text-gray-500');
        this.clearZipBtn.classList.remove('hidden');
        
        try {
            // 显示加载中
            this.zipLoading.classList.remove('hidden');
            
            // 读取并解析ZIP文件
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    await this.parseZipFile(arrayBuffer, this.originalZipName, '');
                    
                    // 显示文件列表
                    this.fileListContainer.classList.remove('hidden');
                    this.renderFileList();
                    
                    // 更新上传信息
                    this.uploadInfo.textContent = `解析完成！共发现 ${this.allFiles.length} 个文件`;
                    this.uploadInfo.classList.remove('text-gray-500', 'text-danger');
                    this.uploadInfo.classList.add('text-success');
                    
                    // 3秒后自动隐藏上传信息
                    setTimeout(() => {
                        this.uploadInfo.classList.add('hidden');
                    }, 3000);
                    
                    // 显示文件搜索框
                    if (this.allFiles.length > 10 && this.fileSearchInput) {
                        const fileSearchContainer = document.getElementById('fileSearchContainer');
                        if (fileSearchContainer) {
                            fileSearchContainer.classList.remove('hidden');
                        }
                    }
                } catch (err) {
                    this.showMessage(`解析失败：${err.message}`, 'error');
                } finally {
                    this.zipLoading.classList.add('hidden');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            this.showMessage(`解析失败：${err.message}`, 'error');
            this.zipLoading.classList.add('hidden');
        }
    }
    
    /**
     * 递归解析ZIP文件，支持子压缩包
     */
    async parseZipFile(arrayBuffer, zipName, parentPath) {
        try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            
            // 存储ZIP对象，用于后续处理
            const zipPath = parentPath ? `${parentPath}/${zipName}` : zipName;
            this.zipObjects[zipPath] = zip;
            
            // 获取ZIP文件的排序键（保持原始顺序）
            const zipKeys = Object.keys(zip.files);
            
            // 遍历ZIP内所有文件，保持原始顺序
            for (const relativePath of zipKeys) {
                const zipObject = zip.files[relativePath];
                // 跳过文件夹
                if (zipObject.dir) continue;
                
                const fullPath = parentPath ? `${parentPath}/${zipObject.name}` : zipObject.name;
                
                // 检查是否是子压缩包
                if (zipObject.name.endsWith('.zip')) {
                    // 读取子压缩包内容并递归解析，使用try-catch确保子压缩包失败不影响整体解析
                    try {
                        const childZipContent = await zipObject.async('arraybuffer');
                        const childZipName = zipObject.name.replace(/\.zip$/, '');
                        await this.parseZipFile(childZipContent, childZipName, fullPath.replace(/\.zip$/, ''));
                    } catch (err) {
                        // 子压缩包解析失败，记录错误但继续处理其他文件
                        console.warn(`子压缩包解析失败 (${fullPath}):`, err);
                        // 将子压缩包本身作为文件添加到列表中
                        this.allFiles.push({
                            name: zipObject.name.split('/').pop(),
                            path: fullPath,
                            content: null,
                            isSelected: false,
                            zipPath: zipPath,
                            isBinary: true,
                            error: `子压缩包解析失败: ${err.message}`
                        });
                    }
                } else {
                    // 对于普通文件，尝试读取文本内容
                    try {
                        const content = await zipObject.async('text');
                        this.allFiles.push({
                            name: zipObject.name.split('/').pop(),
                            path: fullPath,
                            content: content,
                            isSelected: false,
                            zipPath: zipPath // 记录该文件来自哪个ZIP对象
                        });
                    } catch (e) {
                        // 如果不是文本文件，存储基本信息但不读取内容
                        this.allFiles.push({
                            name: zipObject.name.split('/').pop(),
                            path: fullPath,
                            content: null, // 非文本文件
                            isSelected: false,
                            zipPath: zipPath,
                            isBinary: true
                        });
                    }
                }
            }
        } catch (err) {
            // 根ZIP解析失败，抛出错误
            throw err;
        }
    }
    
    /**
     * 过滤文件列表
     */
    filterFileList() {
        const searchTerm = this.fileSearchInput.value.toLowerCase();
        
        if (!searchTerm.trim()) {
            this.filteredFiles = [...this.allFiles];
            this.renderFileList();
            return;
        }
        
        // 过滤文件
        this.filteredFiles = this.allFiles.filter(file => 
            file.name.toLowerCase().includes(searchTerm)
        );
        
        this.renderFileList();
    }
    
    /**
     * 渲染文件列表
     */
    renderFileList() {
        this.fileList.innerHTML = '';
        
        // 确定要显示的文件列表
        const hasSearchQuery = this.fileSearchInput && this.fileSearchInput.value.trim() !== '';
        let filesToRender = hasSearchQuery ? this.filteredFiles : this.allFiles;
        
        // 如果启用了只显示已选文件，则进一步过滤
        if (this.showSelectedOnlyCheckbox && this.showSelectedOnlyCheckbox.checked) {
            filesToRender = filesToRender.filter(file => file.isSelected);
        }
        
        const totalDisplayed = filesToRender.length;
        
        // 更新文件计数显示
        if (hasSearchQuery) {
            this.totalFiles.textContent = `${totalDisplayed} / ${this.allFiles.length}`;
        } else {
            this.totalFiles.textContent = this.allFiles.length;
        }
        
        // 更新已选文件数量
        const selectedCount = this.allFiles.filter(file => file.isSelected).length;
        if (this.selectedFilesCount) {
            this.selectedFilesCount.textContent = selectedCount;
        }
        
        // 更新全选按钮状态
        if (this.toggleSelectBtn) {
            // 检查当前显示的文件是否全部被选中
            const allSelected = filesToRender.length > 0 && filesToRender.every(file => file.isSelected);
            this.isAllSelected = allSelected;
            
            const toggleBtn = this.toggleSelectBtn;
            if (allSelected) {
                toggleBtn.innerHTML = '<i class="fa fa-check-square-o mr-1"></i>全选';
            } else {
                toggleBtn.innerHTML = '<i class="fa fa-square-o mr-1"></i>全选';
            }
        }
        
        // 如果没有文件要显示，显示提示信息
        if (totalDisplayed === 0) {
            const noResultMsg = document.createElement('div');
            noResultMsg.className = 'px-4 py-8 text-center text-gray-500';
            noResultMsg.innerHTML = '<i class="fa fa-file-text-o fa-2x mb-2 block opacity-30"></i>未找到匹配内容';
            this.fileList.appendChild(noResultMsg);
            return;
        }
        
        // 按ZIP文件分组
        const filesByZip = {};
        filesToRender.forEach(file => {
            if (!filesByZip[file.zipPath]) {
                filesByZip[file.zipPath] = [];
            }
            filesByZip[file.zipPath].push(file);
        });
        
        // 保持ZIP文件的原始加载顺序
        const zipPaths = [...new Set(filesToRender.map(file => file.zipPath))];
        
        // 渲染每个ZIP分组
        zipPaths.forEach(zipPath => {
            const zipFiles = filesByZip[zipPath];
            const isMainZip = zipPath === this.originalZipName;
            const zipDisplayName = isMainZip ? '主压缩包' : zipPath;
            
            // 创建分组标题
            const groupHeader = document.createElement('div');
            groupHeader.className = 'px-4 py-2 bg-gray-100 text-gray-700 font-medium';
            groupHeader.textContent = `${zipDisplayName} (${zipFiles.length} 个文件)`;
            this.fileList.appendChild(groupHeader);
            
            // 渲染该分组下的所有文件
            zipFiles.forEach(file => {
                // 找到原始索引
                const originalIndex = this.allFiles.findIndex(f => f.path === file.path);
                
                const item = document.createElement('div');
                item.className = 'px-4 py-3 file-item-hover flex items-center justify-between group';
                
                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <input type="checkbox" ${file.isSelected ? 'checked' : ''} data-index="${originalIndex}"
                            class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-gray-800 font-medium truncate">${file.name}</span>
                                ${file.isBinary ? '<span class="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">二进制</span>' : ''}
                                ${!isMainZip ? '<span class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">子压缩包</span>' : ''}
                                ${file.error ? '<span class="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">错误</span>' : ''}
                            </div>
                            <div class="text-xs text-gray-500 mt-0.5 truncate" title="${file.path}">${file.path}</div>
                        </div>
                    </div>
                    <button class="view-file-btn text-primary text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                        data-index="${originalIndex}">
                        查看内容
                    </button>
                `;
                
                this.fileList.appendChild(item);
                
                // 添加事件监听器
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.allFiles[index].isSelected = e.target.checked;
                });
                
                // 查看文件内容按钮
                const viewBtn = item.querySelector('.view-file-btn');
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(e.target.dataset.index);
                    this.viewFileContent(index);
                });
            });
        });
    }
    
    /**
     * 查看文件内容
     */
    viewFileContent(index) {
        const file = this.allFiles[index];
        
        // 如果是二进制文件或没有内容，显示提示
        if (file.isBinary || !file.content) {
            alert('无法查看二进制文件内容');
            return;
        }
        
        // 创建新窗口显示文件内容
        const contentWindow = window.open('', '_blank');
        contentWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${file.name} - 文件内容</title>
                <style>
                    body { font-family: monospace; white-space: pre-wrap; word-break: break-all; padding: 20px; }
                    h1 { font-size: 18px; margin-bottom: 10px; }
                    .path { color: #666; font-size: 14px; margin-bottom: 20px; }
                    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
                </style>
            </head>
            <body>
                <h1>${file.name}</h1>
                <div class="path">路径: ${file.path}</div>
                <pre>${contentWindow.document.createTextNode(file.content)}</pre>
            </body>
            </html>
        `);
        contentWindow.document.close();
    }
    
    /**
     * 切换全选/取消全选文件
     */
    toggleSelectAll() {
        this.isAllSelected = !this.isAllSelected;
        const toggleBtn = this.toggleSelectBtn;
        
        // 确定要操作的文件列表
        const hasSearchQuery = this.fileSearchInput && this.fileSearchInput.value.trim() !== '';
        let filesToToggle = hasSearchQuery ? this.filteredFiles : this.allFiles;
        
        // 如果启用了只显示已选文件，我们需要操作所有文件，而不仅仅是显示的文件
        // 因为用户可能希望在只查看已选文件时，取消所有文件的选择
        if (this.showSelectedOnlyCheckbox && this.showSelectedOnlyCheckbox.checked) {
            filesToToggle = this.allFiles;
        }
        
        if (this.isAllSelected) {
            // 全选
            filesToToggle.forEach(file => {
                // 找到原始文件并设置选中状态
                const originalFile = this.allFiles.find(f => f.path === file.path);
                if (originalFile) {
                    originalFile.isSelected = true;
                }
            });
            // 只改变图标，不改变文本
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = 'fa fa-check-square-o mr-1';
            }
        } else {
            // 取消全选
            filesToToggle.forEach(file => {
                // 找到原始文件并取消选中状态
                const originalFile = this.allFiles.find(f => f.path === file.path);
                if (originalFile) {
                    originalFile.isSelected = false;
                }
            });
            // 只改变图标，不改变文本
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = 'fa fa-square-o mr-1';
            }
        }
        
        this.renderFileList();
    }
    
    /**
     * 导出选中的文件
     */
    async exportSelectedFiles() {
        const selectedFiles = this.allFiles.filter(file => file.isSelected);
        if (selectedFiles.length === 0) {
            this.showMessage('请至少选择一个文件！', 'warning');
            return;
        }
        
        // 显示加载中
        this.zipLoading.classList.remove('hidden');
        this.extractBtn.disabled = true;
        
        try {
            // 创建新的ZIP文件
            const newZip = new JSZip();
            
            // 处理文件名冲突
            const fileNameMap = new Map();
            
            for (const file of selectedFiles) {
                // 获取文件名（不含路径）
                let fileName = file.name;
                
                // 处理文件名冲突
                if (fileNameMap.has(fileName)) {
                    const count = fileNameMap.get(fileName) + 1;
                    fileNameMap.set(fileName, count);
                    
                    // 分离文件名和扩展名
                    const lastDotIndex = fileName.lastIndexOf('.');
                    if (lastDotIndex > -1) {
                        const nameWithoutExt = fileName.substring(0, lastDotIndex);
                        const ext = fileName.substring(lastDotIndex);
                        fileName = `${nameWithoutExt}_${count}${ext}`;
                    } else {
                        fileName = `${fileName}_${count}`;
                    }
                } else {
                    fileNameMap.set(fileName, 1);
                }
                
                    // 获取对应的ZIP对象
                const sourceZip = this.zipObjects[file.zipPath];
                
                // 直接使用文件名，不考虑任何路径
                if (file.isBinary || !file.content) {
                    // 对于二进制文件，重新读取原始内容
                    const originalFile = sourceZip.files[file.path.replace(file.zipPath + '/', '')];
                    if (originalFile) {
                        const content = await originalFile.async('arraybuffer');
                        // 确保添加到根目录，不创建任何子目录
                        newZip.file(fileName, content, { createFolders: false });
                    }
                } else {
                    // 对于文本文件，使用已读取的内容
                    // 确保添加到根目录，不创建任何子目录
                    newZip.file(fileName, file.content, { createFolders: false });
                }
            }
            
            // 生成ZIP并下载
            const zipContent = await newZip.generateAsync({
                type: 'blob',
                compression: 'STORE' // 对于小型文件，使用无压缩更快速
            });
            
            // 下载文件名
            const downloadFileName = `${this.originalZipName}_extracted.zip`;
            saveAs(zipContent, downloadFileName);
            
            this.showMessage(`成功导出 ${selectedFiles.length} 个文件！`, 'success');
        } catch (err) {
            this.showMessage(`导出失败：${err.message}`, 'error');
        } finally {
            this.zipLoading.classList.add('hidden');
            this.extractBtn.disabled = false;
        }
    }
    
    /**
     * 清空上传
     */
    clearUpload() {
        this.zipUpload.value = '';
        this.clearZipBtn.classList.add('hidden');
        this.uploadInfo.classList.add('hidden');
        this.fileListContainer.classList.add('hidden');
        this.extractResult.classList.add('hidden');
        this.allFiles = [];
        this.filteredFiles = [];
        this.zipObjects = {};
        this.originalZipName = '';
        
        // 重置搜索框
        if (this.fileSearchInput) {
            this.fileSearchInput.value = '';
            const fileSearchContainer = document.getElementById('fileSearchContainer');
            if (fileSearchContainer) {
                fileSearchContainer.classList.add('hidden');
            }
        }
    }
    
    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        this.extractResult.textContent = message;
        this.extractResult.classList.remove('hidden', 'bg-success/10', 'text-success', 'bg-danger/10', 'text-danger', 'bg-warning/10', 'text-warning');
        
        if (type === 'success') {
            this.extractResult.classList.add('bg-success/10', 'text-success');
        } else if (type === 'error') {
            this.extractResult.classList.add('bg-danger/10', 'text-danger');
        } else if (type === 'warning') {
            this.extractResult.classList.add('bg-warning/10', 'text-warning');
        }
        
        // 3秒后自动隐藏非错误消息
        if (type !== 'error') {
            setTimeout(() => {
                this.extractResult.classList.add('hidden');
            }, 3000);
        }
    }
}

// 导出ZIP处理器实例
window.zipHandler = new ZipHandler();