/**
 * 文本文件搜索模块
 * 负责文本文件的上传、选择、正则表达式搜索和关键词高亮功能
 */
class TextSearcher {
    constructor() {
        // DOM元素引用
        // 输入方式切换
        this.textFileInputTab = document.getElementById('textFileInputTab');
        this.textPasteInputTab = document.getElementById('textPasteInputTab');
        this.textFileInputSection = document.getElementById('textFileInputSection');
        this.textPasteInputSection = document.getElementById('textPasteInputSection');
        
        // 文件上传相关
        this.textFileUpload = document.getElementById('textFileUpload');
        this.clearTextFilesBtn = document.getElementById('clearTextFilesBtn');
        this.textFilesInfo = document.getElementById('textFilesInfo');
        
        // 文本粘贴相关
        this.textDirectInput = document.getElementById('textDirectInput');
        this.textDirectInputLineNumbers = document.getElementById('textDirectInputLineNumbers');
        
        // 搜索相关
        this.searchContainer = document.getElementById('searchContainer');
        this.regexSearchInput = document.getElementById('regexSearchInput');
        this.regexSearchBtn = document.getElementById('regexSearchBtn');
        this.caseSensitive = document.getElementById('caseSensitive');
        this.regexSearchOption = document.getElementById('regexSearch');
        this.fullTextSearch = document.getElementById('fullTextSearch');
        this.fullTextSearchContainer = document.getElementById('fullTextSearchContainer');
        
        // 搜索提示信息
        this.searchValidationInfo = document.getElementById('searchValidationInfo');
        this.searchValidationIcon = document.getElementById('searchValidationIcon');
        this.searchValidationText = document.getElementById('searchValidationText');
        this.hideTimer = null;
        this.regexSearchLoading = document.getElementById('regexSearchLoading');

        this.searchResults = document.getElementById('searchResults');
        this.matchCount = document.getElementById('matchCount');
        this.exportResultsBtn = document.getElementById('exportResultsBtn');
        
        // 状态管理
        this.selectedFiles = [];
        this.searchResultsData = [];
        this.currentInputMode = 'paste'; // 'file' 或 'paste'，默认文本粘贴
        this.pastedTextContent = '';
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 初始化输入方式
        this.initInputMode();
    }
    
    /**
     * 初始化输入方式
     */
    initInputMode() {
        this.switchInputMode('paste');
    }
    
    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 输入方式切换
        if (this.textFileInputTab) {
            this.textFileInputTab.addEventListener('click', () => this.switchInputMode('file'));
        }
        
        if (this.textPasteInputTab) {
            this.textPasteInputTab.addEventListener('click', () => this.switchInputMode('paste'));
        }
        
        // 监听文件上传
        if (this.textFileUpload) {
            this.textFileUpload.addEventListener('change', this.handleFileUpload.bind(this));
        }
        
        // 清空上传文件
        if (this.clearTextFilesBtn) {
            this.clearTextFilesBtn.addEventListener('click', this.clearFiles.bind(this));
        }
        
        // 文本粘贴输入变化
        if (this.textDirectInput) {
            this.textDirectInput.addEventListener('input', this.handleTextPaste.bind(this));
            
            // 添加滚动事件监听，使行号随内容滚动
            this.textDirectInput.addEventListener('scroll', () => {
                if (this.textDirectInputLineNumbers) {
                    this.textDirectInputLineNumbers.scrollTop = this.textDirectInput.scrollTop;
                }
            });
        }
        

        
        // 搜索按钮点击
        if (this.regexSearchBtn) {
            this.regexSearchBtn.addEventListener('click', this.performSearch.bind(this));
        }
        
        // 输入框回车搜索
        if (this.regexSearchInput) {
            this.regexSearchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
        
        // 搜索选项变化时重新搜索
        if (this.caseSensitive) {
            this.caseSensitive.addEventListener('change', this.performSearch.bind(this));
        }
        if (this.regexSearchOption) {
            this.regexSearchOption.addEventListener('change', (e) => {
                // 显示/隐藏全文搜索选项
                if (this.fullTextSearchContainer) {
                    this.fullTextSearchContainer.style.display = e.target.checked ? 'flex' : 'none';
                }
                
                // 当取消正则搜索时，重置全文搜索选项
                if (!e.target.checked && this.fullTextSearch) {
                    this.fullTextSearch.checked = false;
                }
                
                // 重新搜索
                this.performSearch();
            });
        }
        if (this.fullTextSearch) {
            this.fullTextSearch.addEventListener('change', this.performSearch.bind(this));
        }
        
        // 正则表达式语法提示展开/收起
        const regexHelpToggle = document.getElementById('regexHelpToggle');
        const regexHelpContent = document.getElementById('regexHelpContent');
        if (regexHelpToggle && regexHelpContent) {
            regexHelpToggle.addEventListener('click', () => {
                const isHidden = regexHelpContent.classList.contains('hidden');
                const chevron = regexHelpToggle.querySelector('.fa-chevron-down');
                
                if (isHidden) {
                    regexHelpContent.classList.remove('hidden');
                    chevron.style.transform = 'rotate(180deg)';
                } else {
                    regexHelpContent.classList.add('hidden');
                    chevron.style.transform = 'rotate(0deg)';
                }
            });
        }
        
        // 下载结果
        if (this.exportResultsBtn) {
            this.exportResultsBtn.addEventListener('click', this.exportResults.bind(this));
        }
        
        // 复制结果按钮的事件监听器将在renderSearchResults方法中动态绑定，避免引用未定义的元素
    }
    
    /**
     * 切换输入方式
     * @param {string} mode - 输入方式：'file' 或 'paste'
     */
    switchInputMode(mode) {
        this.currentInputMode = mode;
        
        // 重置所有选项卡样式
        if (this.textFileInputTab) {
            this.textFileInputTab.classList.remove('bg-primary', 'text-white');
            this.textFileInputTab.classList.add('bg-gray-200', 'text-gray-700');
        }
        
        if (this.textPasteInputTab) {
            this.textPasteInputTab.classList.remove('bg-primary', 'text-white');
            this.textPasteInputTab.classList.add('bg-gray-200', 'text-gray-700');
        }
        
        // 隐藏所有输入区域
        if (this.textFileInputSection) {
            this.textFileInputSection.classList.add('hidden');
        }
        
        if (this.textPasteInputSection) {
            this.textPasteInputSection.classList.add('hidden');
        }
        
        // 根据选择的模式显示对应的输入区域和样式
        if (mode === 'paste') {
            if (this.textPasteInputTab) {
                this.textPasteInputTab.classList.remove('bg-gray-200', 'text-gray-700');
                this.textPasteInputTab.classList.add('bg-primary', 'text-white');
            }
            
            if (this.textPasteInputSection) {
                this.textPasteInputSection.classList.remove('hidden');
            }
        } else if (mode === 'file') {
            if (this.textFileInputTab) {
                this.textFileInputTab.classList.remove('bg-gray-200', 'text-gray-700');
                this.textFileInputTab.classList.add('bg-primary', 'text-white');
            }
            
            if (this.textFileInputSection) {
                this.textFileInputSection.classList.remove('hidden');
            }
        }
        
        // 切换输入方式时重置状态
        this.clearAll();
    }
    
    /**
     * 更新行号显示
     */
    updateLineNumbers() {
        if (!this.textDirectInput || !this.textDirectInputLineNumbers) return;
        
        const text = this.textDirectInput.value;
        const lines = text.split('\n').length;
        
        let lineNumbersHTML = '';
        for (let i = 1; i <= lines; i++) {
            lineNumbersHTML += `<div>${i}</div>`;
        }
        
        this.textDirectInputLineNumbers.innerHTML = lineNumbersHTML;
    }
    
    /**
     * 处理文本粘贴输入
     */
    handleTextPaste() {
        const textContent = this.textDirectInput.value;
        this.pastedTextContent = textContent;
        
        // 更新行号显示
        this.updateLineNumbers();
        
        if (textContent.trim()) {
            // 显示搜索容器
            this.searchContainer.classList.remove('hidden');
            
            // 如果已经有搜索关键词，自动重新搜索
            const pattern = this.regexSearchInput.value.trim();
            if (pattern) {
                this.performSearch();
            }
        } else {
            // 隐藏搜索容器
            this.searchContainer.classList.add('hidden');
            
            // 清除之前的搜索结果
            this.clearSearchResults();
            
            // 清空行号显示
            this.textDirectInputLineNumbers.innerHTML = '';
        }
    }
    
    /**
     * 处理文件上传
     */
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) {
            // 用户取消了文件选择，确保重置UI状态，避免显示长条
            this.textFilesInfo.textContent = '';
            this.textFilesInfo.classList.add('hidden');
            this.clearTextFilesBtn.classList.add('hidden');
            this.searchContainer.classList.add('hidden');
            this.fileInfoContainer = null;
            // 清除可能存在的文件信息容器
            const container = document.getElementById('fileInfoContainer');
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
            
            // 清空搜索输入框内容
            if (this.regexSearchInput) {
                this.regexSearchInput.value = '';
            }
            
            // 清空搜索结果和状态
            this.searchResultsData = [];
            this.searchResults.innerHTML = '';
            this.matchCount.textContent = '0';
            
            return;
        }
        
        // 显示上传信息
        this.clearTextFilesBtn.classList.remove('hidden');
        this.searchContainer.classList.remove('hidden');
        
        // 读取文件内容
        this.selectedFiles = [];
        // 清除之前的搜索结果
        this.searchResultsData = [];
        this.searchResults.innerHTML = '';
        this.matchCount.textContent = '0';
        this.readFiles(files);
    }
    
    /**
     * 读取文件内容
     */
    async readFiles(files) {
        this.regexSearchLoading.classList.remove('hidden');
        
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
            
            // 创建并添加所选文件列表（将在容器内部添加）
            this.renderSelectedFilesList();
            
        } catch (err) {
            // 创建或更新错误状态的统一容器
            this.createOrUpdateFileInfoContainer(`文件读取失败: ${err.message}`, true);
            // 清除文件列表
            this.clearSelectedFilesList();
        } finally {
            this.regexSearchLoading.classList.add('hidden');
        }
    }
    
    /**
     * 创建或更新统一的文件信息容器
     */
    createOrUpdateFileInfoContainer(infoText, isError = false) {
        // 查找或创建容器
        let container = document.getElementById('fileInfoContainer');
        if (!container) {
            // 隐藏原始的textFilesInfo元素
            this.textFilesInfo.classList.add('hidden');
            
            // 创建新的统一容器 - 合并样式
            container = document.createElement('div');
            container.id = 'fileInfoContainer';
            container.className = 'p-4 bg-white rounded-md border border-gray-200 shadow-sm mb-4';
            
            // 将容器添加到原始元素位置
            this.textFilesInfo.parentNode.insertBefore(container, this.textFilesInfo);
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
     * 渲染所选文件列表 - 改进版本：将文件列表与文件信息合并到一处
     */
    renderSelectedFilesList() {
        // 检查是否已有文件列表元素，有的话先移除
        this.clearSelectedFilesList();
        
        if (this.selectedFiles.length === 0) {
            // 确保有文件信息容器
            if (!this.fileInfoContainer) {
                return;
            }
            
            // 使用与第二部分完全一致的空状态样式
            const emptyFileSection = document.createElement('div');
            emptyFileSection.className = 'mt-3 flex flex-col items-center justify-center text-center';
            
            // 添加事件监听器阻止事件冒泡到文件选择器
            emptyFileSection.addEventListener('click', (e) => {
                e.stopPropagation();
                // 添加明确的视觉反馈，表明点击这里不会触发文件选择
                emptyFileSection.style.opacity = '0.8';
                setTimeout(() => {
                    emptyFileSection.style.opacity = '1';
                }, 150);
            });
            
            const icon = document.createElement('i');
            icon.className = 'fa fa-folder-open text-blue-500 mb-2';
            icon.style.fontSize = '24px';
            icon.style.opacity = '0.7';
            
            const textNode = document.createTextNode('未选择文件');
            const textContainer = document.createElement('div');
            textContainer.className = 'text-sm font-medium text-gray-800';
            textContainer.appendChild(textNode);
            
            emptyFileSection.appendChild(icon);
            emptyFileSection.appendChild(textContainer);
            this.fileInfoContainer.appendChild(emptyFileSection);
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
        
        // 文件列表区域 - 直接集成到主容器，不再使用额外的listContainer
        // 文件列表使用grid布局，显示更整洁
        const fileList = document.createElement('ul');
        fileList.id = 'selectedFilesList';
        fileList.className = 'space-y-1 mt-2';
        
        this.selectedFiles.forEach(file => {
            const fileItem = document.createElement('li');
            fileItem.className = 'flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors';
            
            // 文件信息部分
            const fileInfo = document.createElement('div');
            fileInfo.className = 'flex items-center flex-1 overflow-hidden'; // 添加overflow-hidden确保不溢出
            
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
            fileName.style.whiteSpace = 'nowrap'; // 确保不换行
            fileName.style.overflow = 'hidden'; // 隐藏溢出内容
            fileName.style.textOverflow = 'ellipsis'; // 溢出部分显示省略号
            fileName.style.flexShrink = '1'; // 允许压缩
            fileName.title = file.name; // 添加悬停提示显示完整文件名
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
     * 清除所选文件列表 - 改进版本
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
     * 执行正则搜索
     */
    async performSearch() {
        let pattern = this.regexSearchInput.value.trim();
        
        // 只有当有搜索内容时，才执行搜索
        if (!pattern) {
            // 没有搜索内容时，不执行搜索，也不显示提示
            return;
        }
        
        // 不需要处理转义字符，因为浏览器已经将输入的\n解释为\n了
        
        // 根据当前输入模式检查内容
        if (this.currentInputMode === 'file' && this.selectedFiles.length === 0) {
            this.showSearchError('请先选择文件');
            return;
        }
        
        if (this.currentInputMode === 'paste' && !this.pastedTextContent.trim()) {
            this.showSearchError('请先粘贴文本内容');
            return;
        }
        
        // 显示搜索中
        this.regexSearchLoading.classList.remove('hidden');
        this.searchResults.classList.add('hidden');
        
        try {
            let searchPattern;
            let isRegex = this.regexSearchOption && this.regexSearchOption.checked;
            
            // 构建搜索模式
            if (isRegex) {
                // 正则搜索
                let flags = 'g'; // 全局匹配
                if (!this.caseSensitive.checked) {
                    flags += 'i'; // 忽略大小写
                }
                if (this.fullTextSearch.checked) {
                    flags += 's'; // 允许 . 匹配换行符
                }
                searchPattern = new RegExp(pattern, flags);
            } else {
                // 普通文本搜索
                // 转义特殊字符，将搜索内容作为普通文本处理
                const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let flags = 'g'; // 全局匹配
                if (!this.caseSensitive.checked) {
                    flags += 'i'; // 忽略大小写
                }
                searchPattern = new RegExp(escapedPattern, flags);
            }
            
            // 搜索内容
            this.searchResultsData = [];
            let totalMatches = 0;
            
            // 异步搜索处理
            const searchContent = async (content, fileName) => {
                let matches = [];
                
                // 使用setTimeout将搜索任务放到下一个事件循环，避免阻塞主线程
                await new Promise(resolve => setTimeout(resolve, 0));
                
                if (this.fullTextSearch.checked) {
                    // 优化的全文搜索，限制匹配数量
                    matches = await this.findFullTextMatchesOptimized(content, searchPattern);
                } else {
                    // 对于普通搜索，也需要异步处理，避免阻塞主线程
                    await new Promise(resolve => setTimeout(resolve, 0));
                    matches = this.findMatchesInText(content, searchPattern);
                }
                
                if (matches.length > 0) {
                    this.searchResultsData.push({
                        file: fileName,
                        matches: matches,
                        total: matches.length
                    });
                    totalMatches += matches.length;
                }
            };
            
            if (this.currentInputMode === 'file') {
                // 文件模式：搜索文件内容
                const totalFiles = this.selectedFiles.length;
                
                for (let i = 0; i < totalFiles; i++) {
                    const file = this.selectedFiles[i];
                    if (file.error || !file.content) continue;
                    

                    
                    await searchContent(file.content, file.name);
                }
            } else {
                // 粘贴模式：搜索粘贴的文本
                await searchContent(this.pastedTextContent, '粘贴的文本');
            }
            
            // 渲染搜索结果
            this.renderSearchResults();
            this.matchCount.textContent = totalMatches;
            this.searchResults.classList.remove('hidden');
            
        } catch (err) {
            this.showSearchError(`搜索错误: ${err.message}`);
        } finally {
            this.regexSearchLoading.classList.add('hidden');
        }
    }
    

    
    /**
     * 在文本中查找匹配项（按行搜索）
     */
    findMatchesInText(text, regex) {
        const lines = text.split('\n');
        const matches = [];
        
        lines.forEach((line, lineNumber) => {
            let match;
            const lineMatches = [];
            
            // 查找当前行的所有匹配项
            while ((match = regex.exec(line)) !== null) {
                lineMatches.push({
                    text: match[0],
                    index: match.index
                });
                
                // 防止无限循环
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
            
            if (lineMatches.length > 0) {
                matches.push({
                    lineNumber: lineNumber + 1, // 行号从1开始
                    line: line,
                    matches: lineMatches
                });
            }
        });
        
        return matches;
    }
    
    /**
     * 优化的全文搜索方法，提高搜索速度（异步版本）
     */
    async findFullTextMatchesOptimized(text, regex) {
        const matches = [];
        // 移除MAX_MATCHES限制，允许返回所有匹配结果
        const PROCESS_INTERVAL = 5000; // 每处理5000个字符就让出主线程
        const MAX_PROCESS_TIME = 10000; // 增加最大处理时间到10秒，避免过早中断搜索
        
        // 重置正则表达式的lastIndex
        regex.lastIndex = 0;
        
        // 查找所有匹配项
        let match;
        let matchCount = 0;
        let processedChars = 0;
        const startTime = Date.now();
        
        // 对于大文件，我们需要分块处理，以避免阻塞主线程
        while ((match = regex.exec(text)) !== null) {
            // 检查是否超时
            if (Date.now() - startTime > MAX_PROCESS_TIME) {
                console.warn('Search timed out after', MAX_PROCESS_TIME, 'ms');
                break;
            }
            
            matchCount++;
            processedChars += match[0].length;
            
            // 获取匹配项的基本信息
            const matchText = match[0];
            const matchStart = match.index;
            
            // 计算匹配项的起始行号
            const startLine = (text.substring(0, matchStart).match(/\n/g) || []).length + 1;
            
            // 获取匹配的首行（匹配开始位置之前的最后一行）
            const textBeforeMatch = text.substring(0, matchStart);
            const lastNewlineBeforeMatch = textBeforeMatch.lastIndexOf('\n');
            const matchFirstLine = text.substring(lastNewlineBeforeMatch + 1, matchStart);
            
            // 组合匹配结果：如果首行不为空，则显示首行+匹配内容，否则只显示匹配内容
            let combinedMatchText;
            let matchIndexInCombined;
            
            if (matchFirstLine.trim() === '') {
                // 首行为空，说明匹配项从行首开始，只显示匹配内容
                combinedMatchText = matchText;
                matchIndexInCombined = 0;
            } else {
                // 首行不为空，显示首行+匹配内容
                combinedMatchText = matchFirstLine + matchText;
                matchIndexInCombined = matchFirstLine.length;
            }
            
            // 截断超过2000字符的匹配内容
            const displayText = combinedMatchText.substring(0, 2000) + (combinedMatchText.length > 2000 ? '...' : '');
            
            // 计算匹配内容在截断后的displayText中的实际位置和长度
            let actualMatchIndex = matchIndexInCombined;
            let actualMatchText = matchText;
            
            // 如果combinedMatchText被截断了，需要调整匹配内容
            if (combinedMatchText.length > 2000) {
                // 计算匹配内容在截断后的displayText中的起始位置
                actualMatchIndex = Math.min(matchIndexInCombined, 1999);
                
                // 计算匹配内容在截断后的displayText中的结束位置
                const matchEndInCombined = matchIndexInCombined + matchText.length;
                const actualMatchEnd = Math.min(matchEndInCombined, 2000);
                
                // 截取实际的匹配内容
                actualMatchText = combinedMatchText.substring(actualMatchIndex, actualMatchEnd);
            }
            
            // 添加到结果中
            matches.push({
                lineNumber: startLine, // 起始行号
                line: displayText, // 显示匹配的首行+匹配内容，超过1500字符截断
                matches: [{
                    text: actualMatchText, // 实际匹配的文本
                    index: actualMatchIndex // 匹配内容在截断后文本中的实际位置
                }],
                isFullTextMatch: true, // 标记为全文匹配
                isMultiLine: matchText.includes('\n') // 标记是否为跨多行匹配
            });
            
            // 防止无限循环
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            // 每处理一定数量的字符，就让出主线程，避免阻塞
            if (processedChars >= PROCESS_INTERVAL) {
                processedChars = 0;
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return matches;
    }
    
    /**
     * 显示搜索成功提示信息
     * @param {string} message - 成功信息
     */
    showSearchSuccess(message) {
        if (this.searchValidationInfo && this.searchValidationIcon && this.searchValidationText) {
            this.searchValidationIcon.className = 'fa fa-check-circle text-success mr-2';
            this.searchValidationText.textContent = message;
            this.searchValidationText.className = 'text-sm sm:text-base text-success';
            this.searchValidationInfo.className = 'p-3 rounded-lg border border-success/20 bg-success/5 mb-3 flex items-center font-medium';
            this.searchValidationInfo.classList.remove('hidden');
            
            // 3秒后自动隐藏
            this.setSearchAutoHide();
        }
    }
    
    /**
     * 显示搜索错误提示信息
     * @param {string} message - 错误信息
     */
    showSearchError(message) {
        if (this.searchValidationInfo && this.searchValidationIcon && this.searchValidationText) {
            this.searchValidationIcon.className = 'fa fa-exclamation-circle text-danger mr-2';
            this.searchValidationText.textContent = message;
            this.searchValidationText.className = 'text-sm sm:text-base text-danger';
            this.searchValidationInfo.className = 'p-3 rounded-lg border border-danger/20 bg-danger/5 mb-3 flex items-center font-medium';
            this.searchValidationInfo.classList.remove('hidden');
            
            // 3秒后自动隐藏
            this.setSearchAutoHide();
        }
    }
    
    /**
     * 隐藏搜索提示信息
     */
    hideSearchValidationInfo() {
        if (this.searchValidationInfo) {
            this.searchValidationInfo.classList.add('hidden');
        }
    }
    
    /**
     * 设置搜索提示信息自动隐藏
     */
    setSearchAutoHide() {
        // 清除之前的定时器
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        
        // 设置新的定时器，3秒后隐藏
        this.hideTimer = setTimeout(() => {
            this.hideSearchValidationInfo();
        }, 3000);
    }
    
    /**
     * 清空所有状态
     */
    clearAll() {
        // 清空文件相关
        if (this.textFileUpload) {
            this.textFileUpload.value = '';
        }
        this.selectedFiles = [];
        this.textFilesInfo.classList.add('hidden');
        this.clearTextFilesBtn.classList.add('hidden');
        
        // 清空粘贴相关
        if (this.textDirectInput) {
            this.textDirectInput.value = '';
        }
        this.pastedTextContent = '';
        
        // 清空行号显示
        if (this.textDirectInputLineNumbers) {
            this.textDirectInputLineNumbers.innerHTML = '';
        }
        
        // 清空搜索相关
        if (this.regexSearchInput) {
            this.regexSearchInput.value = '';
        }
        
        // 重置搜索选项
        this.resetSearchOptions();
        
        this.searchContainer.classList.add('hidden');
        this.clearSearchResults();
        
        // 清除文件信息容器
        const container = document.getElementById('fileInfoContainer');
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        this.fileInfoContainer = null;
    }
    
    /**
     * 重置搜索选项
     */
    resetSearchOptions() {
        // 重置区分大小写选项
        if (this.caseSensitive) {
            this.caseSensitive.checked = false;
        }
        
        // 重置正则搜索选项
        if (this.regexSearchOption) {
            this.regexSearchOption.checked = false;
        }
        
        // 重置全文搜索选项并隐藏容器
        if (this.fullTextSearch) {
            this.fullTextSearch.checked = false;
        }
        if (this.fullTextSearchContainer) {
            this.fullTextSearchContainer.style.display = 'none';
        }
    }
    
    /**
     * 清空搜索结果
     */
    clearSearchResults() {
        this.searchResultsData = [];
        this.searchResults.innerHTML = '';
        this.matchCount.textContent = '0';
        this.searchResults.classList.add('hidden');
    }
    
    /**
     * 渲染搜索结果
     */
    renderSearchResults() {
        this.searchResults.innerHTML = '';
        
        // 计算搜索统计信息
        const totalMatches = this.searchResultsData.reduce((sum, file) => sum + file.total, 0);
        const matchedFiles = this.searchResultsData.length;
        
        // 添加搜索结果标题和操作按钮
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3';
        headerDiv.innerHTML = `
            <h3 class="font-medium text-gray-700 text-lg">搜索结果 <span class="text-sm text-gray-500">(共匹配 <span id="matchCount">${totalMatches}</span> 项)</span></h3>
            <div class="flex flex-wrap gap-3">
                <button id="copyResultsBtn" class="px-4 py-2 bg-info text-white rounded-lg hover:bg-info/90 transition-colors btn whitespace-nowrap text-sm">
                    <i class="fa fa-copy mr-2"></i>复制
                </button>
                <button id="exportResultsBtn" class="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors btn whitespace-nowrap text-sm">
                    <i class="fa fa-download mr-2"></i>下载
                </button>
            </div>
        `;
        this.searchResults.appendChild(headerDiv);
        
        if (this.searchResultsData.length === 0) {
            const emptyResult = document.createElement('div');
            // 使用与第一部分完全一致的空状态样式
            emptyResult.className = 'px-4 py-8 text-center text-gray-500';
            emptyResult.innerHTML = '<i class="fa fa-file-text-o fa-2x mb-2 block opacity-30"></i>未找到匹配内容';
            this.searchResults.appendChild(emptyResult);
            return;
        }
        
        // 按文件分组显示结果，确保每个文件的搜索结果独立显示
        this.searchResultsData.forEach((fileResult, fileIndex) => {
            // 为非第一个文件添加顶部分隔
            if (fileIndex > 0) {
                const separator = document.createElement('div');
                separator.className = 'h-2 bg-gray-50';
                this.searchResults.appendChild(separator);
            }
            
            // 文件标题区域 - 使用卡片样式增强独立性
            const fileCard = document.createElement('div');
            fileCard.className = 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden';
            
            // 为文件结果设置唯一ID
            const fileResultId = `file-result-${fileIndex}`;
            fileCard.dataset.fileId = fileResultId;
            
            // 文件标题 - 添加展开收起功能
            const fileHeader = document.createElement('div');
            fileHeader.className = 'px-4 py-3 bg-gray-50 border-b border-gray-200 font-medium text-gray-800 cursor-pointer';
            fileHeader.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="flex items-center">
                        <i class="fa fa-chevron-down mr-2 transition-transform duration-200"></i>
                        <i class="fa fa-file-text-o mr-2"></i>${fileResult.file}
                    </span>
                    <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded">${fileResult.total} 个匹配</span>
                </div>
            `;
            fileCard.appendChild(fileHeader);
            
            // 匹配行列表容器
            const matchesContainer = document.createElement('div');
            matchesContainer.id = fileResultId + '-content';
            matchesContainer.className = 'file-results-content'; // 添加类名便于选择
            
            // 匹配行列表
            const matchItems = [];
            fileResult.matches.forEach((match, index) => {
                const matchItem = document.createElement('div');
                matchItem.className = `px-4 py-3 border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`;
                
                // 生成带高亮的行内容
                const highlightedLine = this.highlightMatches(match.line, match.matches);
                
                // 显示行号
                const lineNumberDisplay = `第${match.lineNumber}行`;
                
                matchItem.innerHTML = `
                    <div class="flex gap-4">
                        <div class="text-right min-w-[100px]">
                            <span class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">${lineNumberDisplay}</span>
                        </div>
                        <div class="flex-1 font-mono text-sm whitespace-pre overflow-x-auto">${highlightedLine}</div>
                    </div>
                `;
                
                matchItems.push(matchItem);
            });
            
            // 只显示前5个匹配项，其余的添加到折叠区域
            const visibleMatches = matchItems.slice(0, 5);
            const hiddenMatches = matchItems.slice(5);
            
            // 添加可见的匹配项
            visibleMatches.forEach(item => matchesContainer.appendChild(item));
            
            // 如果有隐藏的匹配项，添加展开按钮
            if (hiddenMatches.length > 0) {
                const showMoreBtn = document.createElement('div');
                showMoreBtn.className = 'px-4 py-2 bg-gray-50 text-center cursor-pointer hover:bg-gray-100 transition-colors';
                showMoreBtn.innerHTML = `
                    <span class="text-sm text-primary font-medium">
                        <i class="fa fa-chevron-down mr-1"></i>显示更多 ${hiddenMatches.length} 个匹配项
                    </span>
                `;
                showMoreBtn.addEventListener('click', () => {
                    // 显示所有隐藏的匹配项
                    hiddenMatches.forEach(item => matchesContainer.appendChild(item));
                    // 移除展开按钮
                    showMoreBtn.remove();
                });
                matchesContainer.appendChild(showMoreBtn);
            }
            
            // 将匹配内容容器添加到文件卡片中
            fileCard.appendChild(matchesContainer);
            
            // 添加展开收起事件监听
            fileHeader.addEventListener('click', () => {
                const chevron = fileHeader.querySelector('.fa-chevron-down');
                const isExpanded = !matchesContainer.classList.contains('hidden');
                
                if (isExpanded) {
                    matchesContainer.classList.add('hidden');
                    chevron.style.transform = 'rotate(-90deg)';
                } else {
                    matchesContainer.classList.remove('hidden');
                    chevron.style.transform = 'rotate(0deg)';
                }
            });
            
            // 默认展开
            matchesContainer.classList.remove('hidden');
            this.searchResults.appendChild(fileCard);
        });
        
        // 重新绑定下载和复制按钮事件
        const exportBtn = document.getElementById('exportResultsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', this.exportResults.bind(this));
        }
        
        const copyBtn = document.getElementById('copyResultsBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', this.copyToClipboard.bind(this));
        }
    }
    
    /**
     * 高亮匹配的关键词
     */
    highlightMatches(line, matches) {
        // 按位置倒序排序，避免替换时位置偏移
        const sortedMatches = [...matches].sort((a, b) => b.index - a.index);
        
        let highlightedLine = line;
        sortedMatches.forEach(match => {
            const beforeMatch = highlightedLine.substring(0, match.index);
            const matchText = highlightedLine.substring(match.index, match.index + match.text.length);
            const afterMatch = highlightedLine.substring(match.index + match.text.length);
            
            highlightedLine = beforeMatch + 
                `<span class="text-highlight">${matchText}</span>` + 
                afterMatch;
        });
        
        return highlightedLine;
    }
    
    /**
     * 下载搜索结果
     */
    exportResults() {
        if (this.searchResultsData.length === 0) {
            this.showSearchError('没有可下载的搜索结果');
            return;
        }
        
        // 构建下载内容
        let exportContent = `搜索结果报告
==============
搜索关键词: ${this.regexSearchInput.value}
区分大小写: ${this.caseSensitive.checked ? '是' : '否'}
搜索时间: ${new Date().toLocaleString()}
匹配总数: ${this.searchResultsData.reduce((sum, file) => sum + file.total, 0)}

`;
        
        // 逐文件添加结果
        this.searchResultsData.forEach(fileResult => {
            exportContent += `文件: ${fileResult.file}\n`;
            exportContent += `匹配数: ${fileResult.total}\n`;
            exportContent += `-`.repeat(50) + `\n`;
            
            fileResult.matches.forEach(match => {
                // 输出匹配内容
                let lineContent = `${match.line}\n`;
                
                // 移除用【】标记匹配的关键词功能
                exportContent += lineContent;
            });
            
            exportContent += `\n`;
        });
        
        // 创建下载链接
        const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
        const fileName = `search_results_${new Date().getTime()}.txt`;
        saveAs(blob, fileName);
        
        // 显示下载成功提示，与JSON格式化功能保持一致
        this.showSearchSuccess('已成功下载搜索结果文件');
    }
    
    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
        if (this.searchResultsData.length === 0) {
            this.showSearchError('没有可复制的搜索结果');
            return;
        }
        
        try {
            // 构建要复制的内容，只包含匹配到的内容
            let copyContent = '';
            
            // 逐文件添加结果
            this.searchResultsData.forEach(fileResult => {
                fileResult.matches.forEach(match => {
                    // 只输出匹配行内容
                    copyContent += `${match.line}\n`;
                });
            });
            
            // 优先使用现代的 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(copyContent);
            } else {
                // 备选方案：使用传统的 execCommand 方法
                this.fallbackCopyTextToClipboard(copyContent);
            }
            
            // 显示复制成功提示，与JSON格式化功能保持一致
            this.showSearchSuccess('已成功复制到剪贴板');
            
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            this.showSearchError('复制失败，请手动复制内容');
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
    
    /**
     * 清空文件选择
     */
    clearFiles() {
        try {
            // 使用clearAll方法处理大部分状态重置
            this.clearAll();
        } catch (error) {
            console.error('清空文件时出错:', error);
        }
    }
}

// 下载文本搜索器实例
window.textSearcher = new TextSearcher();