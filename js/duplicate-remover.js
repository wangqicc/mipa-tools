/**
 * 移除重复行功能模块
 * 负责文本文件的上传、直接粘贴、移除重复行和结果下载功能
 */
class DuplicateRemover {
    constructor() {
        // DOM元素引用
        this.fileInputTab = document.getElementById('fileInputTab');
        this.textInputTab = document.getElementById('textInputTab');
        this.fileInputSection = document.getElementById('fileInputSection');
        this.textInputSection = document.getElementById('textInputSection');
        this.duplicateFileUpload = document.getElementById('duplicateFileUpload');
        this.clearDuplicateFilesBtn = document.getElementById('clearDuplicateFilesBtn');
        this.duplicateFilesInfo = document.getElementById('duplicateFilesInfo');
        this.directTextInput = document.getElementById('directTextInput');
        this.directTextInputLineNumbers = document.getElementById('directTextInputLineNumbers');
        this.clearTextBtn = document.getElementById('clearTextBtn');
        this.trimLines = document.getElementById('trimLines');
        this.caseSensitive = document.getElementById('caseSensitive');
        this.removeDuplicatesBtn = document.getElementById('removeDuplicatesBtn');
        this.downloadDuplicatesBtn = document.getElementById('downloadDuplicatesBtn');
        this.copyResultsBtn = document.getElementById('copyResultsBtn');
        this.duplicateResults = document.getElementById('duplicateResults');
        this.originalLineCount = document.getElementById('originalLineCount');
        this.uniqueLineCount = document.getElementById('uniqueLineCount');
        this.reducedLineCount = document.getElementById('reducedLineCount');
        this.duplicateResultContent = document.getElementById('duplicateResultContent');
        this.duplicateResultLineNumbers = document.getElementById('duplicateResultLineNumbers');
        this.processingControls = document.getElementById('processingControls'); // 处理选项和按钮容器
        // 验证信息区域
        this.duplicateValidationInfo = document.getElementById('duplicateValidationInfo');
        this.duplicateValidationIcon = document.getElementById('duplicateValidationIcon');
        this.duplicateValidationInfoText = document.getElementById('duplicateValidationInfoText');
        
        // 状态管理
        this.selectedFiles = [];
        this.processedContent = '';
        this.originalCount = 0;
        this.uniqueCount = 0;
        this.currentInputMode = 'text'; // 'file' 或 'text'，默认文本粘贴
        this.autoUpdateEnabled = false; // 控制是否开启自动更新
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 初始化输入方式
        this.switchInputMode(this.currentInputMode);
    }
    
    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 切换输入方式
        if (this.fileInputTab) {
            this.fileInputTab.addEventListener('click', () => this.switchInputMode('file'));
        }
        if (this.textInputTab) {
            this.textInputTab.addEventListener('click', () => this.switchInputMode('text'));
        }
        
        // 监听文件上传
        if (this.duplicateFileUpload) {
            this.duplicateFileUpload.addEventListener('change', this.handleFileUpload.bind(this));
        }
        
        // 清空文件上传
        if (this.clearDuplicateFilesBtn) {
            this.clearDuplicateFilesBtn.addEventListener('click', this.clearFiles.bind(this));
        }
        
        // 清空文本输入
        if (this.clearTextBtn) {
            this.clearTextBtn.addEventListener('click', this.clearText.bind(this));
        }
        
        // 移除重复行按钮点击
        if (this.removeDuplicatesBtn) {
            this.removeDuplicatesBtn.addEventListener('click', this.removeDuplicates.bind(this));
        }
        
        // 下载处理结果按钮点击
        if (this.downloadDuplicatesBtn) {
            this.downloadDuplicatesBtn.addEventListener('click', this.downloadResults.bind(this));
        }
        
        // 复制到剪贴板按钮点击
        if (this.copyResultsBtn) {
            this.copyResultsBtn.addEventListener('click', this.copyToClipboard.bind(this));
        }
        
        // 添加自动更新功能：当处理选项变化时自动重新处理
        if (this.caseSensitive) {
            this.caseSensitive.addEventListener('change', () => this.autoUpdateResults());
        }
        if (this.trimLines) {
            this.trimLines.addEventListener('change', () => this.autoUpdateResults());
        }
        // 添加防抖函数
        this.debounce = (func, delay) => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            this.debounceTimer = setTimeout(func, delay);
        };
        
        // 直接文本输入变化时更新控件可见性并自动处理结果
        if (this.directTextInput) {
            this.directTextInput.addEventListener('input', () => {
                const hasInput = this.directTextInput.value.trim();
                
                // 更新控件可见性
                this.updateControlsVisibility();
                
                // 更新行号显示
                this.updateLineNumbers(this.directTextInput, this.directTextInputLineNumbers);
                
                if (hasInput) {
                    // 如果有输入内容，使用防抖处理，避免频繁更新结果
                    this.debounce(() => {
                        this.autoUpdateResults();
                    }, 300);
                } else {
                    // 如果没有输入内容，立即清除处理结果，不使用防抖
                    this.processedContent = '';
                    this.duplicateResults.classList.add('hidden');
                    this.downloadDuplicatesBtn.classList.add('hidden');
                    this.copyResultsBtn.classList.add('hidden');
                    this.originalCount = 0;
                    this.uniqueCount = 0;
                    this.autoUpdateEnabled = false;
                    this.hideValidationInfo();
                }
            });
            
            // 添加滚动事件监听，使行号随内容滚动
            this.directTextInput.addEventListener('scroll', () => {
                if (this.directTextInputLineNumbers) {
                    this.directTextInputLineNumbers.scrollTop = this.directTextInput.scrollTop;
                }
            });
        }
        
        // 结果内容区域滚动事件监听，使行号随内容滚动
        if (this.duplicateResultContent) {
            this.duplicateResultContent.addEventListener('scroll', () => {
                if (this.duplicateResultLineNumbers) {
                    this.duplicateResultLineNumbers.scrollTop = this.duplicateResultContent.scrollTop;
                }
            });
        }
    }
    
    /**
     * 切换输入方式
     */
    switchInputMode(mode) {
        this.currentInputMode = mode;
        
        // 清空所有状态，参考文本搜索功能的设计
        this.clearAll();
        
        // 更新标签样式
        if (mode === 'file') {
            this.fileInputTab.classList.remove('bg-gray-200', 'text-gray-700');
            this.fileInputTab.classList.add('bg-primary', 'text-white');
            this.textInputTab.classList.remove('bg-primary', 'text-white');
            this.textInputTab.classList.add('bg-gray-200', 'text-gray-700');
            
            this.fileInputSection.classList.remove('hidden');
            this.textInputSection.classList.add('hidden');
        } else {
            this.textInputTab.classList.remove('bg-gray-200', 'text-gray-700');
            this.textInputTab.classList.add('bg-primary', 'text-white');
            this.fileInputTab.classList.remove('bg-primary', 'text-white');
            this.fileInputTab.classList.add('bg-gray-200', 'text-gray-700');
            
            this.textInputSection.classList.remove('hidden');
            this.fileInputSection.classList.add('hidden');
        }
        
        // 更新处理选项和按钮的可见性
        this.updateControlsVisibility();
    }
    
    /**
     * 更新行号显示
     * @param {HTMLElement} textElement - 文本元素
     * @param {HTMLElement} lineNumbersElement - 行号元素
     */
    updateLineNumbers(textElement, lineNumbersElement) {
        if (!textElement || !lineNumbersElement) return;
        
        const text = textElement.value || textElement.textContent;
        const lines = text.split('\n').length;
        
        let lineNumbersHTML = '';
        for (let i = 1; i <= lines; i++) {
            lineNumbersHTML += `<div>${i}</div>`;
        }
        
        lineNumbersElement.innerHTML = lineNumbersHTML;
    }
    
    /**
     * 更新处理选项和按钮的可见性
     */
    updateControlsVisibility() {
        // 检查是否有输入内容
        const hasInput = this.currentInputMode === 'text' 
            ? this.directTextInput && this.directTextInput.value.trim() 
            : this.selectedFiles.length > 0;
        
        // 显示或隐藏处理选项和按钮
        if (this.processingControls) {
            if (hasInput) {
                this.processingControls.classList.remove('hidden');
            } else {
                this.processingControls.classList.add('hidden');
            }
        }
    }
    
    /**
     * 清空所有状态
     */
    clearAll() {
        // 清空文件相关
        if (this.duplicateFileUpload) {
            this.duplicateFileUpload.value = '';
        }
        this.selectedFiles = [];
        this.clearDuplicateFilesBtn.classList.add('hidden');
        this.duplicateFilesInfo.classList.add('hidden');
        
        // 清除文件信息容器
        const container = document.getElementById('fileInfoContainer');
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        this.fileInfoContainer = null;
        
        // 清空粘贴相关
        if (this.directTextInput) {
            this.directTextInput.value = '';
        }
        this.clearTextBtn.classList.add('hidden');
        
        // 清空行号显示
        if (this.directTextInputLineNumbers) {
            this.directTextInputLineNumbers.innerHTML = '';
        }
        
        // 清空处理结果和状态
        this.processedContent = '';
        this.originalCount = 0;
        this.uniqueCount = 0;
        this.autoUpdateEnabled = false;
        
        // 重置处理选项
        if (this.trimLines) {
            this.trimLines.checked = false;
        }
        if (this.caseSensitive) {
            this.caseSensitive.checked = true;
        }
        
        // 隐藏处理结果区域
        this.duplicateResults.classList.add('hidden');
        this.downloadDuplicatesBtn.classList.add('hidden');
        this.copyResultsBtn.classList.add('hidden');
        
        // 重置结果统计
        this.originalLineCount.textContent = '0';
        this.uniqueLineCount.textContent = '0';
        this.reducedLineCount.textContent = '0';
        
        // 清空结果内容
        this.duplicateResultContent.textContent = '';
        
        // 清空结果行号显示
        if (this.duplicateResultLineNumbers) {
            this.duplicateResultLineNumbers.innerHTML = '';
        }
        
        // 隐藏验证信息
        this.hideValidationInfo();
        
        // 更新处理选项和按钮的可见性
        this.updateControlsVisibility();
    }
    
    /**
     * 处理文件上传
     */
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) {
            // 用户取消了文件选择
            this.clearAll();
            this.updateControlsVisibility();
            return;
        }
        
        // 更新当前输入模式为文件模式
        this.currentInputMode = 'file';
        
        // 显示上传信息
        this.clearDuplicateFilesBtn.classList.remove('hidden');
        
        // 清空之前的处理结果
        this.processedContent = '';
        this.originalCount = 0;
        this.uniqueCount = 0;
        this.autoUpdateEnabled = false;
        this.duplicateResults.classList.add('hidden');
        this.downloadDuplicatesBtn.classList.add('hidden');
        this.copyResultsBtn.classList.add('hidden');
        this.originalLineCount.textContent = '0';
        this.uniqueLineCount.textContent = '0';
        this.reducedLineCount.textContent = '0';
        this.duplicateResultContent.textContent = '';
        
        // 读取文件内容
        this.selectedFiles = [];
        this.readFiles(files);
    }
    
    /**
     * 读取文件内容
     */
    async readFiles(files) {
        try {
            const readPromises = files.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        resolve({
                            name: file.name,
                            content: e.target.result,
                            size: file.size
                        });
                    };
                    reader.onerror = () => {
                        resolve({
                            name: file.name,
                            content: '',
                            size: 0,
                            error: '文件读取失败'
                        });
                    };
                    reader.readAsText(file);
                });
            });
            
            const results = await Promise.all(readPromises);
            this.selectedFiles = results;
            
            // 更新文件信息
            const successCount = results.filter(f => !f.error).length;
            const errorCount = results.length - successCount;
            
            let infoText = `已加载 ${successCount} 个文件`;
            if (errorCount > 0) {
                infoText += ` (${errorCount} 个文件读取失败)`;
            }
            
            // 创建或更新统一的文件信息容器
            this.createOrUpdateFileInfoContainer(infoText);
            
            // 创建并添加所选文件列表
            this.renderSelectedFilesList();
            
            // 更新处理选项和按钮的可见性
            this.updateControlsVisibility();
            
        } catch (err) {
            // 创建或更新错误状态的统一容器
            this.createOrUpdateFileInfoContainer(`文件读取失败: ${err.message}`, true);
            // 清除文件列表
            this.clearSelectedFilesList();
            
            // 更新处理选项和按钮的可见性
            this.updateControlsVisibility();
        }
    }
    
    /**
     * 创建或更新统一的文件信息容器
     */
    createOrUpdateFileInfoContainer(infoText, isError = false) {
        // 查找或创建容器
        let container = document.getElementById('fileInfoContainer');
        if (!container) {
            // 隐藏原始的duplicateFilesInfo元素
            this.duplicateFilesInfo.classList.add('hidden');
            
            // 创建新的统一容器 - 合并样式
            container = document.createElement('div');
            container.id = 'fileInfoContainer';
            container.className = 'p-4 bg-white rounded-md border border-gray-200 shadow-sm mb-4';
            
            // 将容器添加到原始元素位置
            this.duplicateFilesInfo.parentNode.insertBefore(container, this.duplicateFilesInfo);
        }
        
        // 清除容器内容
        container.innerHTML = '';
        
        // 添加文件信息标题区域
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center';
        
        // 添加图标
        const icon = document.createElement('i');
        if (isError) {
            icon.className = 'fa fa-exclamation-circle text-danger mr-2';
        } else {
            icon.className = 'fa fa-folder-open text-blue-500 mr-2';
        }
        headerDiv.appendChild(icon);
        
        // 添加文件信息标题文本
        const infoTitle = document.createElement('div');
        infoTitle.className = isError ? 'text-sm font-medium text-danger' : 'text-sm font-medium text-gray-800';
        infoTitle.textContent = infoText;
        headerDiv.appendChild(infoTitle);
        
        container.appendChild(headerDiv);
        
        // 保存容器引用
        this.fileInfoContainer = container;
    }
    
    /**
     * 渲染所选文件列表
     */
    renderSelectedFilesList() {
        // 检查是否已有文件列表元素，有的话先移除
        this.clearSelectedFilesList();
        
        if (this.selectedFiles.length === 0) {
            return;
        }
        
        // 确保有文件信息容器
        if (!this.fileInfoContainer) {
            return;
        }
        
        // 使用更精致的分隔线设计，增强视觉连接
        const separator = document.createElement('div');
        separator.className = 'mt-3 mb-2 border-t border-gray-200';
        this.fileInfoContainer.appendChild(separator);
        
        // 文件列表区域 - 直接集成到主容器
        const fileList = document.createElement('ul');
        fileList.id = 'selectedFilesList';
        fileList.className = 'space-y-1 mt-2';
        
        this.selectedFiles.forEach(file => {
            const fileItem = document.createElement('li');
            fileItem.className = 'flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors';
            
            // 文件信息部分
            const fileInfo = document.createElement('div');
            fileInfo.className = 'flex items-center flex-1 overflow-hidden';
            
            // 文件图标
            const fileIcon = document.createElement('i');
            if (file.error) {
                fileIcon.className = 'fa fa-file-o text-danger mr-2';
            } else {
                // 根据文件类型设置不同图标
                const ext = file.name.split('.').pop().toLowerCase();
                if (['txt', 'log'].includes(ext)) {
                    fileIcon.className = 'fa fa-file-text-o text-blue-400 mr-2';
                } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
                    fileIcon.className = 'fa fa-file-archive-o text-yellow-600 mr-2';
                } else {
                    fileIcon.className = 'fa fa-file-o text-gray-400 mr-2';
                }
            }
            fileInfo.appendChild(fileIcon);
            
            // 文件名 - 确保在容器内显示，不溢出
            const fileName = document.createElement('span');
            fileName.className = file.error ? 'text-danger line-through' : 'text-gray-700';
            fileName.textContent = file.name;
            fileName.style.whiteSpace = 'nowrap';
            fileName.style.overflow = 'hidden';
            fileName.style.textOverflow = 'ellipsis';
            fileName.style.flexShrink = '1';
            fileName.title = file.name;
            fileInfo.appendChild(fileName);
            
            // 添加文件大小信息
            const sizeSpan = document.createElement('span');
            if (file.error) {
                sizeSpan.className = 'text-xs text-danger';
                sizeSpan.textContent = '(读取失败)';
            } else if (file.size > 0) {
                sizeSpan.className = 'text-xs text-gray-500';
                sizeSpan.textContent = this.formatFileSize(file.size);
            }
            
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(sizeSpan);
            fileList.appendChild(fileItem);
        });
        
        // 直接添加到容器
        this.fileInfoContainer.appendChild(fileList);
    }
    
    /**
     * 清除所选文件列表
     */
    clearSelectedFilesList() {
        // 移除文件列表元素
        const existingList = document.getElementById('selectedFilesList');
        if (existingList) {
            // 如果有分隔线也移除
            const separator = existingList.previousElementSibling;
            if (separator && separator.className.includes('border-t')) {
                separator.remove();
            }
            
            existingList.remove();
        }
    }
    
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    /**
     * 清空文件选择
     */
    clearFiles() {
        this.clearAll();
    }
    
    /**
     * 清空文本输入
     */
    clearText() {
        this.clearAll();
    }

    /**
     * 移除重复行
     */
    async removeDuplicates() {
        let allContent = '';
        let hasContent = false;
        
        if (this.currentInputMode === 'file') {
            // 从文件获取内容
            if (this.selectedFiles.length > 0) {
                // 合并所有文件内容
                this.selectedFiles.forEach(file => {
                    if (!file.error) {
                        allContent += file.content + '\n';
                        hasContent = true;
                    }
                });
            }
        } else {
            // 从直接输入获取内容
            if (this.directTextInput && this.directTextInput.value.trim()) {
                allContent = this.directTextInput.value;
                hasContent = true;
            }
        }
        
        // 如果没有内容，隐藏处理结果区域
        if (!hasContent) {
            this.duplicateResults.classList.add('hidden');
            this.downloadDuplicatesBtn.classList.add('hidden');
            this.copyResultsBtn.classList.add('hidden');
            this.processedContent = '';
            this.hideValidationInfo();
            return;
        }
        
        // 显示处理中信息
        this.showValidationInfo('正在处理中...', 'info', 'fa fa-spinner fa-spin');
        
        try {
            // 获取处理选项
            const trimLines = this.trimLines && this.trimLines.checked;
            const caseSensitive = this.caseSensitive && this.caseSensitive.checked;
            
            // 使用setTimeout将文本处理逻辑放到下一个事件循环中，避免阻塞主线程
            const result = await new Promise((resolve) => {
                setTimeout(() => {
                    const result = this.processTextSync(allContent, trimLines, caseSensitive);
                    resolve(result);
                }, 0);
            });
            
            this.originalCount = result.originalCount;
            this.uniqueCount = result.uniqueCount;
            this.processedContent = result.processedContent;
            
            // 更新UI
            this.originalLineCount.textContent = this.originalCount;
            this.uniqueLineCount.textContent = this.uniqueCount;
            this.reducedLineCount.textContent = this.originalCount - this.uniqueCount;
            
            // 优化结果显示，使用虚拟滚动提高性能
            this.virtualResultDisplay(this.processedContent);
            
            this.duplicateResults.classList.remove('hidden');
            this.downloadDuplicatesBtn.classList.remove('hidden');
            this.copyResultsBtn.classList.remove('hidden');
            
            // 更新结果区域的行号显示
            this.updateLineNumbers(this.duplicateResultContent, this.duplicateResultLineNumbers);
            
            // 显示处理成功信息
            this.showValidationInfo('处理完成', 'success', 'fa fa-check-circle');
            
            // 首次调用后开启自动更新
            this.autoUpdateEnabled = true;
        } catch (error) {
            console.error('处理文本时出错:', error);
            this.showValidationInfo(`处理文本时出错: ${error.message}`, 'error', 'fa fa-exclamation-circle');
        }
    }
    
    /**
     * 同步处理文本
     */
    processTextSync(content, trimLines, caseSensitive) {
        // 处理内容
        const lines = content.split('\n');
        const originalCount = lines.length;
        
        const uniqueLines = new Set();
        const resultLines = [];
        
        lines.forEach(line => {
            let processedLine = line;
            let finalLine = line;
            
            // 去除行首尾空白
            if (trimLines) {
                processedLine = processedLine.trim();
                finalLine = processedLine;
            }
            
            // 转换为小写（如果不区分大小写）
            if (!caseSensitive) {
                processedLine = processedLine.toLowerCase();
            }
            
            // 检查是否已存在
            if (!uniqueLines.has(processedLine)) {
                uniqueLines.add(processedLine);
                resultLines.push(finalLine);
            }
        });
        
        const uniqueCount = resultLines.length;
        const processedContent = resultLines.join('\n');
        
        return { originalCount, uniqueCount, processedContent };
    }
    
    /**
     * 显示处理结果
     */
    virtualResultDisplay(content) {
        // 直接设置textContent，这是最高效的方式
        this.duplicateResultContent.textContent = content;
    }
    
    /**
     * 设置提示信息自动隐藏
     */
    setAutoHide() {
        // 清除之前的定时器
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        
        // 设置新的定时器，3秒后隐藏
        this.hideTimer = setTimeout(() => {
            this.hideValidationInfo();
        }, 3000);
    }
    
    /**
     * 显示验证成功信息
     * @param {string} message - 成功信息
     */
    showValidationSuccess(message) {
        if (this.duplicateValidationInfo && this.duplicateValidationIcon && this.duplicateValidationInfoText) {
            this.duplicateValidationIcon.className = 'fa fa-check-circle text-success mr-2';
            this.duplicateValidationInfoText.textContent = message;
            this.duplicateValidationInfoText.className = 'text-sm sm:text-base text-success';
            this.duplicateValidationInfo.className = 'p-3 rounded-lg border border-success/20 bg-success/5 mb-6 flex items-center font-medium';
            this.duplicateValidationInfo.classList.remove('hidden');
            
            // 3秒后自动隐藏
            this.setAutoHide();
        }
    }
    
    /**
     * 显示验证错误信息
     * @param {string} message - 错误信息
     */
    showValidationError(message) {
        if (this.duplicateValidationInfo && this.duplicateValidationIcon && this.duplicateValidationInfoText) {
            this.duplicateValidationIcon.className = 'fa fa-exclamation-circle text-danger mr-2';
            this.duplicateValidationInfoText.textContent = message;
            this.duplicateValidationInfoText.className = 'text-sm sm:text-base text-danger';
            this.duplicateValidationInfo.className = 'p-3 rounded-lg border border-danger/20 bg-danger/5 mb-6 flex items-center font-medium';
            this.duplicateValidationInfo.classList.remove('hidden');
            
            // 3秒后自动隐藏
            this.setAutoHide();
        }
    }
    
    /**
     * 显示验证信息（兼容旧代码）
     */
    showValidationInfo(message, type, iconClass) {
        if (type === 'success') {
            this.showValidationSuccess(message);
        } else if (type === 'error') {
            this.showValidationError(message);
        } else {
            // 处理中信息
            if (this.duplicateValidationInfo && this.duplicateValidationIcon && this.duplicateValidationInfoText) {
                this.duplicateValidationInfoText.textContent = message;
                this.duplicateValidationInfo.className = 'p-3 rounded-lg border border-primary/20 bg-primary/5 mb-3 flex items-center font-medium';
                this.duplicateValidationIcon.className = 'animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-primary mr-3 text-primary';
                this.duplicateValidationInfoText.className = 'text-sm text-primary';
                this.duplicateValidationInfo.classList.remove('hidden');
            }
        }
    }
    
    /**
     * 隐藏验证信息
     */
    hideValidationInfo() {
        if (this.duplicateValidationInfo) {
            this.duplicateValidationInfo.classList.add('hidden');
        }
    }
    
    /**
     * 自动更新结果
     */
    autoUpdateResults() {
        // 只有当autoUpdateEnabled为true时才执行自动更新
        if (this.autoUpdateEnabled) {
            // 使用防抖处理，避免频繁更新结果
            this.debounce(() => {
                this.removeDuplicates();
            }, 500);
        }
    }
    
    /**
     * 下载结果
     */
    downloadResults() {
        if (!this.processedContent) {
            this.showValidationError('没有可导出的处理结果');
            return;
        }
        
        // 使用FileSaver.js创建下载链接，与其他功能保持一致
        const blob = new Blob([this.processedContent], { type: 'text/plain;charset=utf-8' });
        const fileName = `unique_lines_${new Date().getTime()}.txt`;
        saveAs(blob, fileName);
        
        // 显示下载成功提示，与JSON格式化功能保持一致
        this.showValidationSuccess('已成功下载处理结果文件');
    }
    
    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
        if (!this.processedContent) {
            this.showValidationError('没有可复制的处理结果');
            return;
        }
        
        try {
            // 优先使用现代的 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(this.processedContent);
            } else {
                // 备选方案：使用传统的 execCommand 方法
                this.fallbackCopyTextToClipboard(this.processedContent);
            }
            
            // 显示复制成功提示，与JSON格式化功能保持一致
            this.showValidationSuccess('已成功复制到剪贴板');
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            this.showValidationError('复制失败，请手动复制内容');
        }
    }
    
    /**
     * 复制到剪贴板的备选方案
     */
    fallbackCopyTextToClipboard(text) {
        // 创建一个临时的 textarea 元素
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // 确保元素不可见但可选中
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        
        // 添加到文档
        document.body.appendChild(textArea);
        
        // 选择并复制文本
        textArea.focus();
        textArea.select();
        
        // 执行复制命令
        document.execCommand('copy');
        
        // 清理临时元素
        document.body.removeChild(textArea);
    }
}

// 下载移除重复行实例
window.duplicateRemover = new DuplicateRemover();