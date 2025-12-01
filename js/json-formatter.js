/**
 * JSON格式化功能模块
 * 负责JSON文件的上传、直接粘贴、格式化、压缩、验证和结果导出功能
 */
class JSONFormatter {
    constructor() {
        // DOM元素引用
        this.jsonTextInputTab = document.getElementById('jsonTextInputTab');
        this.jsonFileInputTab = document.getElementById('jsonFileInputTab');
        this.jsonFileInputSection = document.getElementById('jsonFileInputSection');
        this.jsonTextInputSection = document.getElementById('jsonTextInputSection');
        this.jsonFileUpload = document.getElementById('jsonFileUpload');
        this.jsonFilesInfo = document.getElementById('jsonFilesInfo');
        this.jsonFilesInfoText = document.getElementById('jsonFilesInfoText');
        this.jsonDirectTextInput = document.getElementById('jsonDirectTextInput');
        this.jsonDirectTextLineNumbers = document.getElementById('jsonDirectTextLineNumbers');
        this.jsonResultLineNumbers = document.getElementById('jsonResultLineNumbers');
        this.preserveEscapes = document.getElementById('preserveEscapes');
        this.preserveEscapesContainer = document.getElementById('preserveEscapesContainer');
        this.formatJsonBtn = document.getElementById('formatJsonBtn');
        this.compressJsonBtn = document.getElementById('compressJsonBtn');
        this.validateJsonBtn = document.getElementById('validateJsonBtn');
        this.clearJsonResultBtn = document.getElementById('clearJsonResultBtn');
        this.jsonResults = document.getElementById('jsonResults');
        this.jsonResultContent = document.getElementById('jsonResultContent');
        this.copyJsonResultBtn = document.getElementById('copyJsonResultBtn');
        this.downloadJsonResultBtn = document.getElementById('downloadJsonResultBtn');
        this.jsonValidationInfo = document.getElementById('jsonValidationInfo');
        this.validationIcon = document.getElementById('validationIcon');
        this.validationInfoText = document.getElementById('validationInfoText');
        this.jsonFunctionButtons = document.getElementById('jsonFunctionButtons');

        // 当前激活的功能
        this.activeFunction = null;

        // 状态管理
        this.selectedFiles = [];
        this.currentInputMode = 'text'; // 'file' 或 'text'，默认文本粘贴
        this.currentJsonContent = '';

        // 初始化事件监听器
        this.initEventListeners();

        // 初始化输入方式
        this.switchInputMode('text');
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 切换输入方式
        if (this.jsonTextInputTab) {
            this.jsonTextInputTab.addEventListener('click', () => this.switchInputMode('text'));
        }

        if (this.jsonFileInputTab) {
            this.jsonFileInputTab.addEventListener('click', () => this.switchInputMode('file'));
        }

        // 文件上传相关事件
        if (this.jsonFileUpload) {
            this.jsonFileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // 文本输入变化事件 - 添加防抖处理
        if (this.jsonDirectTextInput) {
            this.jsonDirectTextInput.addEventListener('input', () => this.debounce(this.handleInputChange.bind(this), 300));
            // 实时更新行号
            this.jsonDirectTextInput.addEventListener('input', () => this.updateLineNumbers(this.jsonDirectTextInput, this.jsonDirectTextLineNumbers));
            // 滚动同步
            this.jsonDirectTextInput.addEventListener('scroll', () => {
                if (this.jsonDirectTextLineNumbers) {
                    this.jsonDirectTextLineNumbers.scrollTop = this.jsonDirectTextInput.scrollTop;
                }
            });
        }

        // 结果区域滚动同步
        if (this.jsonResultContent) {
            this.jsonResultContent.addEventListener('scroll', () => {
                if (this.jsonResultLineNumbers) {
                    this.jsonResultLineNumbers.scrollTop = this.jsonResultContent.scrollTop;
                }
            });
        }

        // 保留转义字符选项变化事件
        if (this.preserveEscapes) {
            this.preserveEscapes.addEventListener('change', () => this.handlePreserveEscapesChange());
        }

        // 功能按钮事件
        if (this.formatJsonBtn) {
            this.formatJsonBtn.addEventListener('click', () => {
                this.activeFunction = 'format';
                this.showPreserveEscapesOption();
                this.formatJson();
            });
        }

        if (this.compressJsonBtn) {
            this.compressJsonBtn.addEventListener('click', () => {
                this.activeFunction = 'compress';
                this.hidePreserveEscapesOption();
                this.compressJson();
            });
        }

        if (this.validateJsonBtn) {
            this.validateJsonBtn.addEventListener('click', () => {
                this.activeFunction = 'validate';
                this.hidePreserveEscapesOption();
                this.validateJson();
            });
        }

        if (this.clearJsonResultBtn) {
            this.clearJsonResultBtn.addEventListener('click', () => {
                this.activeFunction = null;
                this.hidePreserveEscapesOption();
                this.clearAll();
            });
        }

        if (this.copyJsonResultBtn) {
            this.copyJsonResultBtn.addEventListener('click', () => this.copyResult());
        }

        if (this.downloadJsonResultBtn) {
            this.downloadJsonResultBtn.addEventListener('click', () => this.downloadResult());
        }
    }

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} delay - 延迟时间（毫秒）
     */
    debounce(func, delay) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(func, delay);
    }

    /**
     * 处理输入变化
     */
    handleInputChange() {
        // 检查是否有JSON内容
        const hasContent = this.getCurrentJsonContent().trim().length > 0;

        // 显示或隐藏功能按钮
        this.toggleFunctionButtons(hasContent);

        // 只有在有激活功能时才进行同步处理
        if (hasContent && (this.activeFunction === 'format' || this.activeFunction === 'compress')) {
            if (this.activeFunction === 'format') {
                this.formatJson();
            } else {
                this.compressJson();
            }
        } else if (!hasContent) {
            // 没有内容时清空结果
            this.clearResult();
        }
    }

    /**
     * 显示或隐藏功能按钮
     * @param {boolean} show - 是否显示功能按钮
     */
    toggleFunctionButtons(show) {
        if (this.jsonFunctionButtons) {
            if (show) {
                this.jsonFunctionButtons.classList.remove('hidden');
            } else {
                this.jsonFunctionButtons.classList.add('hidden');
            }
        }
    }

    /**
     * 更新行号显示
     * @param {HTMLElement} textElement - 文本区域元素
     * @param {HTMLElement} lineNumbersElement - 行号显示区域元素
     */
    updateLineNumbers(textElement, lineNumbersElement) {
        if (!textElement || !lineNumbersElement) return;

        // 获取文本内容
        const text = textElement.value || textElement.textContent;
        // 计算行数
        const lines = text.split('\n').length;
        // 生成行号HTML
        let lineNumbersHTML = '';
        for (let i = 1; i <= lines; i++) {
            lineNumbersHTML += `<div>${i}</div>`;
        }
        // 更新行号显示
        lineNumbersElement.innerHTML = lineNumbersHTML;
    }

    /**
     * 显示保留转义字符选项
     */
    showPreserveEscapesOption() {
        if (this.preserveEscapesContainer) {
            this.preserveEscapesContainer.classList.remove('hidden');
        }
    }

    /**
     * 隐藏保留转义字符选项
     */
    hidePreserveEscapesOption() {
        if (this.preserveEscapesContainer) {
            this.preserveEscapesContainer.classList.add('hidden');
        }
    }

    /**
     * 切换输入方式
     * @param {string} mode - 输入方式：'file' 或 'text'
     */
    switchInputMode(mode) {
        this.currentInputMode = mode;

        // 重置所有选项卡样式
        if (this.jsonFileInputTab) {
            this.jsonFileInputTab.classList.remove('bg-primary', 'text-white');
            this.jsonFileInputTab.classList.add('bg-gray-200', 'text-gray-700');
        }

        if (this.jsonTextInputTab) {
            this.jsonTextInputTab.classList.remove('bg-primary', 'text-white');
            this.jsonTextInputTab.classList.add('bg-gray-200', 'text-gray-700');
        }

        // 隐藏所有输入区域
        if (this.jsonFileInputSection) {
            this.jsonFileInputSection.classList.add('hidden');
        }

        if (this.jsonTextInputSection) {
            this.jsonTextInputSection.classList.add('hidden');
        }

        // 根据选择的模式显示对应的输入区域和样式
        if (mode === 'file') {
            if (this.jsonFileInputTab) {
                this.jsonFileInputTab.classList.remove('bg-gray-200', 'text-gray-700');
                this.jsonFileInputTab.classList.add('bg-primary', 'text-white');
            }

            if (this.jsonFileInputSection) {
                this.jsonFileInputSection.classList.remove('hidden');
            }
        } else if (mode === 'text') {
            if (this.jsonTextInputTab) {
                this.jsonTextInputTab.classList.remove('bg-gray-200', 'text-gray-700');
                this.jsonTextInputTab.classList.add('bg-primary', 'text-white');
            }

            if (this.jsonTextInputSection) {
                this.jsonTextInputSection.classList.remove('hidden');
            }
        }

        // 切换输入方式时重置所有状态
        this.clearAll();
        this.activeFunction = null;
        this.hidePreserveEscapesOption();
        // 重置保留转义字符复选框状态
        if (this.preserveEscapes) {
            this.preserveEscapes.checked = true;
        }
    }

    /**
     * 处理文件上传
     * @param {Event} e - 文件上传事件
     */
    handleFileUpload(e) {
        const files = e.target.files;
        this.selectedFiles = Array.from(files);

        if (this.selectedFiles.length > 0) {
            // 显示文件信息
            this.showFilesInfo();

            // 读取文件内容
            this.readFiles();
        } else {
            // 隐藏文件信息
            this.hideFilesInfo();
            // 隐藏功能按钮
            this.toggleFunctionButtons(false);
            // 清空结果
            this.clearResult();
        }
    }

    /**
     * 显示文件信息
     */
    showFilesInfo() {
        if (this.jsonFilesInfo && this.jsonFilesInfoText) {
            const fileNames = this.selectedFiles.map(file => file.name).join(', ');
            this.jsonFilesInfoText.textContent = `已选择 ${this.selectedFiles.length} 个文件: ${fileNames}`;
            this.jsonFilesInfo.classList.remove('hidden');
        }
    }

    /**
     * 隐藏文件信息
     */
    hideFilesInfo() {
        if (this.jsonFilesInfo) {
            this.jsonFilesInfo.classList.add('hidden');
        }
    }

    /**
     * 读取文件内容
     */
    readFiles() {
        if (this.selectedFiles.length === 0) return;

        // 只处理第一个文件
        const file = this.selectedFiles[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            this.currentJsonContent = e.target.result;
            // 保存文件内容但不自动格式化，让用户自主选择操作
            this.showValidationSuccess('文件读取成功，请选择要执行的操作');
            // 显示功能按钮
            this.toggleFunctionButtons(true);
        };

        reader.onerror = () => {
            this.showValidationError('文件读取失败，请检查文件格式');
            // 隐藏功能按钮
            this.toggleFunctionButtons(false);
        };

        reader.readAsText(file);
    }

    /**
     * 清空所有输入和结果
     */
    clearAll() {
        // 清空文本输入
        if (this.jsonDirectTextInput) {
            this.jsonDirectTextInput.value = '';
        }

        // 清空文本输入行号
        if (this.jsonDirectTextLineNumbers) {
            this.jsonDirectTextLineNumbers.innerHTML = '';
        }

        // 清空文件选择
        if (this.jsonFileUpload) {
            this.jsonFileUpload.value = '';
        }

        this.selectedFiles = [];
        this.currentJsonContent = '';

        this.hideFilesInfo();
        this.clearResult();
        this.hideValidationInfo();
        // 隐藏功能按钮
        this.toggleFunctionButtons(false);
    }

    /**
     * 获取当前JSON内容
     * @returns {string} 当前JSON内容
     */
    getCurrentJsonContent() {
        if (this.currentInputMode === 'text') {
            return this.jsonDirectTextInput ? this.jsonDirectTextInput.value : '';
        } else {
            return this.currentJsonContent;
        }
    }

    /**
     * 验证JSON格式
     * @param {string} jsonContent - 要验证的JSON内容
     * @returns {boolean} 是否验证通过
     */
    isValidJson(jsonContent) {
        if (!jsonContent.trim()) {
            this.showValidationError('请输入JSON内容');
            return false;
        }

        try {
            JSON.parse(jsonContent);
            return true;
        } catch (error) {
            // 提取简洁的错误信息
            const errorMsg = error.message.replace(/^Unexpected token/, '意外的标记');
            this.showValidationError(`JSON格式错误: ${errorMsg}`);
            return false;
        }
    }

    /**
     * 格式化JSON
     */
    formatJson() {
        const jsonContent = this.getCurrentJsonContent();

        // 先验证JSON格式
        if (!this.isValidJson(jsonContent)) {
            return;
        }

        try {
            let processedJson = jsonContent;

            if (!this.preserveEscapes || !this.preserveEscapes.checked) {
                // 不保留转义字符 - 转换Unicode转义序列
                processedJson = this.convertUnicodeEscapes(processedJson);
            }

            // 格式化处理后的JSON字符串
            const formattedJson = this.formatJsonString(processedJson, 2);

            this.displayResult(formattedJson);
            this.showValidationSuccess('JSON格式正确，已成功格式化');
        } catch (error) {
            this.showValidationError(`JSON处理错误: ${error.message}`);
        }
    }

    /**
     * 压缩JSON
     */
    compressJson() {
        const jsonContent = this.getCurrentJsonContent();

        if (!this.isValidJson(jsonContent)) {
            return;
        }

        try {
            const compressedJson = this.compressJsonString(jsonContent);

            this.displayResult(compressedJson);
            this.showValidationSuccess('JSON格式正确，已成功压缩');
        } catch (error) {
            this.showValidationError(`JSON处理错误: ${error.message}`);
        }
    }

    /**
     * 转换Unicode转义序列为实际字符
     * @param {string} jsonStr - 原始JSON字符串
     * @returns {string} 转换后的JSON字符串
     */
    convertUnicodeEscapes(jsonStr) {
        // 只转换字符串中的转义序列，不影响其他部分
        return jsonStr.replace(/"(.*?)"/g, (match, strContent) => {
            // 转换字符串内容中的转义序列
            let convertedContent = strContent;

            // 转换Unicode转义序列
            convertedContent = convertedContent.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
            });

            // 转换其他转义序列
            convertedContent = convertedContent.replace(/\\n/g, '\n');
            convertedContent = convertedContent.replace(/\\r/g, '\r');
            convertedContent = convertedContent.replace(/\\t/g, '\t');
            convertedContent = convertedContent.replace(/\\b/g, '\b');
            convertedContent = convertedContent.replace(/\\f/g, '\f');
            convertedContent = convertedContent.replace(/\\"/g, '"');
            convertedContent = convertedContent.replace(/\\'/g, "'");
            convertedContent = convertedContent.replace(/\\\\/g, '\\');

            return `"${convertedContent}"`;
        });
    }

    /**
     * 格式化JSON字符串，保留原始转义字符
     * @param {string} jsonStr - 原始JSON字符串
     * @param {number} indent - 缩进空格数
     * @returns {string} 格式化后的JSON字符串
     */
    formatJsonString(jsonStr, indent) {
        let result = '';
        let level = 0;
        let inString = false;
        let escapeNext = false;
        const indentStr = ' '.repeat(indent);

        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];

            if (escapeNext) {
                result += char;
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                result += char;
                escapeNext = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                result += char;
                continue;
            }

            if (!inString) {
                switch (char) {
                    case '{':
                    case '[':
                        result += char + '\n' + indentStr.repeat(++level);
                        break;
                    case '}':
                    case ']':
                        result += '\n' + indentStr.repeat(--level) + char;
                        break;
                    case ',':
                        result += char + '\n' + indentStr.repeat(level);
                        break;
                    case ':':
                        result += char + ' ';
                        break;
                    case ' ': case '\t': case '\n': case '\r':
                        // 跳过现有空格
                        break;
                    default:
                        result += char;
                }
            } else {
                result += char;
            }
        }

        return result;
    }

    /**
     * 压缩JSON字符串，保留原始转义字符
     * @param {string} jsonStr - 原始JSON字符串
     * @returns {string} 压缩后的JSON字符串
     */
    compressJsonString(jsonStr) {
        let result = '';
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];

            if (escapeNext) {
                result += char;
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                result += char;
                escapeNext = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                result += char;
                continue;
            }

            if (!inString && (char === ' ' || char === '\t' || char === '\n' || char === '\r')) {
                // 跳过空格
                continue;
            }

            result += char;
        }

        return result;
    }

    /**
     * 处理保留转义字符选项变化
     */
    handlePreserveEscapesChange() {
        // 获取当前处理结果
        const resultContent = this.jsonResultContent ? this.jsonResultContent.textContent : '';

        // 如果有处理结果且当前激活了对应功能，重新执行上次的操作
        if (resultContent) {
            if (this.activeFunction === 'format') {
                this.formatJson();
            } else if (this.activeFunction === 'compress') {
                this.compressJson();
            }
        }
    }

    /**
     * 验证JSON
     */
    validateJson() {
        const jsonContent = this.getCurrentJsonContent();

        // 验证时清除之前的处理结果
        this.clearResult();

        // 使用统一的验证方法
        if (this.isValidJson(jsonContent)) {
            this.showValidationSuccess('JSON格式正确');
        }
    }

    /**
     * 显示验证成功信息
     * @param {string} message - 成功信息
     */
    showValidationSuccess(message) {
        if (this.jsonValidationInfo && this.validationIcon && this.validationInfoText) {
            this.validationIcon.className = 'fa fa-check-circle text-success mr-2';
            this.validationInfoText.textContent = message;
            this.validationInfoText.className = 'text-sm sm:text-base text-success';
            this.jsonValidationInfo.className = 'p-3 rounded-lg border border-success/20 bg-success/5 mb-6 flex items-center font-medium';
            this.jsonValidationInfo.classList.remove('hidden');

            // 3秒后自动隐藏
            this.setAutoHide();
        }
    }

    /**
     * 显示验证错误信息
     * @param {string} message - 错误信息
     */
    showValidationError(message) {
        if (this.jsonValidationInfo && this.validationIcon && this.validationInfoText) {
            this.validationIcon.className = 'fa fa-exclamation-circle text-danger mr-2';
            this.validationInfoText.textContent = message;
            this.validationInfoText.className = 'text-sm sm:text-base text-danger';
            this.jsonValidationInfo.className = 'p-3 rounded-lg border border-danger/20 bg-danger/5 mb-6 flex items-center font-medium';
            this.jsonValidationInfo.classList.remove('hidden');

            // 3秒后自动隐藏
            this.setAutoHide();
        }
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
     * 隐藏验证信息
     */
    hideValidationInfo() {
        if (this.jsonValidationInfo) {
            this.jsonValidationInfo.classList.add('hidden');
        }
    }

    /**
     * 显示处理结果
     * @param {string} result - 处理结果
     */
    displayResult(result) {
        if (this.jsonResultContent) {
            this.jsonResultContent.textContent = result;
        }

        // 显示处理结果区域
        if (this.jsonResults) {
            this.jsonResults.classList.remove('hidden');
        }

        // 更新结果区域的行号
        this.updateLineNumbers(this.jsonResultContent, this.jsonResultLineNumbers);
    }

    /**
     * 清空处理结果
     */
    clearResult() {
        if (this.jsonResultContent) {
            this.jsonResultContent.textContent = '';
        }

        // 清空结果行号
        if (this.jsonResultLineNumbers) {
            this.jsonResultLineNumbers.innerHTML = '';
        }

        // 隐藏处理结果区域
        if (this.jsonResults) {
            this.jsonResults.classList.add('hidden');
        }

        // 隐藏保留转义字符选项
        this.hidePreserveEscapesOption();

        this.hideValidationInfo();
    }

    /**
     * 复制结果到剪贴板
     */
    copyResult() {
        if (!this.jsonResultContent) return;

        const resultText = this.jsonResultContent.textContent;

        if (!resultText) {
            this.showValidationError('没有可复制的内容');
            return;
        }

        // 优先使用现代API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(resultText)
                .then(() => {
                    this.showValidationSuccess('已成功复制到剪贴板');
                })
                .catch(() => {
                    // 降级方案
                    this.fallbackCopyTextToClipboard(resultText);
                });
        } else {
            // 使用传统方案
            this.fallbackCopyTextToClipboard(resultText);
        }
    }

    /**
     * 复制到剪贴板的降级方案
     * @param {string} text - 要复制的文本
     */
    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // 避免滚动到页面底部
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showValidationSuccess('已成功复制到剪贴板');
            } else {
                this.showValidationError('复制失败，请手动复制');
            }
        } catch (err) {
            this.showValidationError('复制失败，请手动复制');
        }

        document.body.removeChild(textArea);
    }

    /**
     * 下载结果
     */
    downloadResult() {
        if (!this.jsonResultContent) return;

        const resultText = this.jsonResultContent.textContent;

        if (!resultText) {
            this.showValidationError('没有可下载的内容');
            return;
        }

        // 创建Blob对象
        const blob = new Blob([resultText], { type: 'application/json' });

        // 使用FileSaver库下载
        saveAs(blob, 'formatted.json');

        this.showValidationSuccess('已成功下载JSON文件');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new JSONFormatter();
    });
} else {
    new JSONFormatter();
}