// 图片裁切工具核心逻辑 - 基于 Cropper.js 实现
class ImageCropper {
    constructor() {
        this.image = null;
        this.cropMode = 'custom'; // 'custom' 或 'circle'
        this.cropArea = { x: 0, y: 0, width: 200, height: 200 };
        this.zoom = 100;
        this.cropper = null; // Cropper.js 实例
        this.resultImage = null;
        this.init();
    }
    init() {
        // 绑定方法的this上下文
        this.preventDefaults = this.preventDefaults.bind(this);
        this.highlight = this.highlight.bind(this);
        this.unhighlight = this.unhighlight.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.updateRealTimePreview = this.updateRealTimePreview.bind(this);
        // 添加防抖处理
        this.debouncedUpdatePreview = this.debounce(this.updateRealTimePreview, 100);
        this.bindEvents();
    }
    // 防抖函数
    debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    bindEvents() {
        // 拖拽上传事件
        const dropArea = document.getElementById('drop-area');
        const fileInput = document.getElementById('file-input');
        if (!dropArea || !fileInput) {
            console.error('Missing required DOM elements');
            return;
        }
        // 拖拽事件
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => this.highlight(dropArea), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => this.unhighlight(dropArea), false);
        });
        dropArea.addEventListener('drop', (e) => this.handleDrop(e), false);
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e), false);
        // 裁切模式切换
        const customCropBtn = document.getElementById('custom-crop-btn');
        const circleCropBtn = document.getElementById('circle-crop-btn');
        if (customCropBtn) {
            customCropBtn.addEventListener('click', () => this.setCropMode('custom'));
        }
        if (circleCropBtn) {
            circleCropBtn.addEventListener('click', () => this.setCropMode('circle'));
        }
        // 精确尺寸输入
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        const xInput = document.getElementById('x-input');
        const yInput = document.getElementById('y-input');
        if (widthInput) {
            widthInput.addEventListener('input', (e) => this.updateCropSize(e.target.value, null));
        }
        if (heightInput) {
            heightInput.addEventListener('input', (e) => this.updateCropSize(null, e.target.value));
        }
        if (xInput) {
            xInput.addEventListener('input', (e) => this.updateCropPosition(e.target.value, null));
        }
        if (yInput) {
            yInput.addEventListener('input', (e) => this.updateCropPosition(null, e.target.value));
        }
        // 缩放控制
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => this.setZoom(e.target.value));
        }
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.adjustZoom(10));
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.adjustZoom(-10));
        }
        // 操作按钮
        const resetBtn = document.getElementById('reset-btn');
        const cropBtn = document.getElementById('crop-btn');
        const downloadBtn = document.getElementById('download-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        if (cropBtn) {
            cropBtn.addEventListener('click', () => this.cropImage());
        }
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadImage());
        }
    }
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    highlight(element) {
        element.classList.add('dragover');
    }
    unhighlight(element) {
        element.classList.remove('dragover');
    }
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }
    handleFileSelect(e) {
        const files = e.target.files;
        this.handleFiles(files);
    }
    handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
                this.loadImage(file);
            } else {
                alert('请选择小于10MB的图片文件！');
            }
        }
    }
    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.zoom = 100;
                this.resultImage = null;
                // 初始化Cropper.js
                this.initCropper();
                // 更新UI
                this.updatePreview();
                this.enableControls();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    initCropper() {
        const imgPreview = document.getElementById('image-preview');
        const container = document.getElementById('image-container');
        if (!imgPreview || !container || !this.image) {
            console.error('Missing required elements for cropper initialization');
            return;
        }
        // 设置图片源
        imgPreview.src = this.image.src;
        // 根据当前裁剪模式设置样式类
        const imageContainer = document.getElementById('image-container');
        if (imageContainer) {
            if (this.cropMode === 'circle') {
                imageContainer.classList.add('circle-crop');
            } else {
                imageContainer.classList.remove('circle-crop');
            }
        }
        // 销毁之前的Cropper实例（如果存在）
        if (this.cropper) {
            try {
                this.cropper.destroy();
                this.cropper = null;
            } catch (error) {
                console.error('Error destroying cropper:', error);
                this.cropper = null;
            }
        }
        // 确保图片已经加载完成
        const initializeCropper = () => {
            try {
                // 创建新的Cropper实例
                this.cropper = new Cropper(imgPreview, {
                    aspectRatio: this.cropMode === 'circle' ? 1 : null,
                    viewMode: 1,
                    dragMode: 'crop',
                    autoCropArea: 0.5,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: true,
                    responsive: true,
                    modal: true,
                    background: true,
                    crop: (event) => {
                        // 更新裁剪区域信息
                        this.cropArea = {
                            x: event.detail.x,
                            y: event.detail.y,
                            width: event.detail.width,
                            height: event.detail.height
                        };
                        // 更新输入框
                        this.updateInputs();
                        // 实时更新裁剪结果预览（使用防抖）
                        this.debouncedUpdatePreview();
                    },
                    zoom: (event) => {
                        // 更新缩放值
                        this.zoom = Math.round(event.detail.ratio * 100);
                        // 更新滑块值
                        const zoomSlider = document.getElementById('zoom-slider');
                        if (zoomSlider) {
                            zoomSlider.value = this.zoom;
                            const zoomValue = document.getElementById('zoom-value');
                            if (zoomValue) {
                                zoomValue.textContent = `${this.zoom}%`;
                            }
                        }
                        // 实时更新裁剪结果预览（使用防抖）
                        this.debouncedUpdatePreview();
                    }
                });
            } catch (error) {
                console.error('Error initializing cropper:', error);
            }
        };
        // 如果图片已经加载完成，直接初始化，否则等加载完成后初始化
        if (imgPreview.complete) {
            initializeCropper();
        } else {
            imgPreview.onload = initializeCropper;
        }
    }
    updatePreview() {
        // 显示裁切预览区域，隐藏上传提示
        const uploadTip = document.getElementById('upload-tip');
        const imageContainer = document.getElementById('image-container');
        const cropSettings = document.getElementById('crop-settings');
        uploadTip.classList.add('hidden');
        imageContainer.classList.remove('hidden');
        // 显示裁切设置区域
        if (cropSettings) {
            cropSettings.classList.remove('hidden');
        }
    }
    setCropMode(mode) {
        this.cropMode = mode;
        // 获取图片容器
        const imageContainer = document.getElementById('image-container');
        // 更新按钮状态
        const customBtn = document.getElementById('custom-crop-btn');
        const circleBtn = document.getElementById('circle-crop-btn');
        if (mode === 'custom') {
            customBtn.classList.add('bg-primary', 'text-white');
            customBtn.classList.remove('bg-gray-100', 'text-gray-700');
            circleBtn.classList.remove('bg-primary', 'text-white');
            circleBtn.classList.add('bg-gray-100', 'text-gray-700');
            // 移除圆形裁剪样式
            if (imageContainer) {
                imageContainer.classList.remove('circle-crop');
            }
        } else {
            circleBtn.classList.add('bg-primary', 'text-white');
            circleBtn.classList.remove('bg-gray-100', 'text-gray-700');
            customBtn.classList.remove('bg-primary', 'text-white');
            customBtn.classList.add('bg-gray-100', 'text-gray-700');
            // 添加圆形裁剪样式
            if (imageContainer) {
                imageContainer.classList.add('circle-crop');
            }
        }
        // 重置Cropper实例，应用新的裁剪模式
        if (this.cropper) {
            // 更新aspectRatio
            this.cropper.setAspectRatio(mode === 'circle' ? 1 : null);
            // 如果是圆形模式，保持宽高相等
            if (mode === 'circle') {
                const cropBoxData = this.cropper.getCropBoxData();
                const size = Math.max(cropBoxData.width, cropBoxData.height);
                cropBoxData.width = size;
                cropBoxData.height = size;
                this.cropper.setCropBoxData(cropBoxData);
            }
        }
        // 显示/隐藏裁切设置区域
        this.toggleCropSettings(mode);
        // 更新页面标题和描述
        this.updatePageTitle(mode);
    }
    toggleCropSettings(mode) {
        const cropSettings = Array.from(document.querySelectorAll('h2')).find(h2 => h2.textContent === '裁切设置');
        if (cropSettings) {
            const settingsContainer = cropSettings.closest('div');
            if (settingsContainer) {
                const allSections = settingsContainer.querySelectorAll('div');
                if (mode === 'circle') {
                    // 圆形裁切模式下隐藏裁切设置
                    cropSettings.classList.add('hidden');
                    allSections.forEach(section => {
                        const hasButtons = section.querySelector('button');
                        if (hasButtons && (hasButtons.textContent.includes('重置') ||
                                         hasButtons.textContent.includes('裁切') ||
                                         hasButtons.textContent.includes('下载'))) {
                            section.classList.remove('hidden');
                        } else {
                            section.classList.add('hidden');
                        }
                    });
                } else {
                    // 自定义裁切模式下显示所有设置
                    cropSettings.classList.remove('hidden');
                    allSections.forEach(section => {
                        section.classList.remove('hidden');
                    });
                }
            }
        }
    }
    updatePageTitle(mode) {
        const title = document.querySelector('h1');
        const description = document.querySelector('h1 + p');
        if (title && description) {
            if (mode === 'circle') {
                title.textContent = '圆形图片裁切';
                description.textContent = '免费在线圆形图片裁剪工具，一键生成完美圆形头像，支持JPG、PNG、GIF和WebP格式。';
            } else {
                title.textContent = '图片裁切';
                description.textContent = '支持自定义裁切和圆形裁切，支持JPG、PNG、GIF和WebP格式，提供实时预览和精确调整。';
            }
        }
    }
    updateCropSize(width, height) {
        if (this.cropper) {
            const cropBoxData = this.cropper.getCropBoxData();
            if (width) {
                cropBoxData.width = parseFloat(width) || 0;
            }
            if (height) {
                cropBoxData.height = parseFloat(height) || 0;
            }
            // 圆形模式下保持宽高相等
            if (this.cropMode === 'circle') {
                const size = Math.max(cropBoxData.width, cropBoxData.height);
                cropBoxData.width = size;
                cropBoxData.height = size;
            }
            this.cropper.setCropBoxData(cropBoxData);
        }
    }
    updateCropPosition(x, y) {
        if (this.cropper) {
            const cropBoxData = this.cropper.getCropBoxData();
            if (x) {
                cropBoxData.left = parseFloat(x) || 0;
            }
            if (y) {
                cropBoxData.top = parseFloat(y) || 0;
            }
            this.cropper.setCropBoxData(cropBoxData);
        }
    }
    setZoom(zoom) {
        this.zoom = parseInt(zoom) || 100;
        if (this.cropper) {
            // 计算缩放比例
            const scale = this.zoom / 100;
            // 设置缩放
            this.cropper.zoomTo(scale);
        }
        const zoomValue = document.getElementById('zoom-value');
        if (zoomValue) {
            zoomValue.textContent = `${this.zoom}%`;
        }
    }
    adjustZoom(delta) {
        this.zoom = Math.max(10, this.zoom + delta);
        this.setZoom(this.zoom);
    }
    updateInputs() {
        // 更新输入框值，添加空检查避免报错
        const widthInput = document.getElementById('width-input');
        if (widthInput) widthInput.value = Math.round(this.cropArea.width);
        const heightInput = document.getElementById('height-input');
        if (heightInput) heightInput.value = Math.round(this.cropArea.height);
        const xInput = document.getElementById('x-input');
        if (xInput) xInput.value = Math.round(this.cropArea.x);
        const yInput = document.getElementById('y-input');
        if (yInput) yInput.value = Math.round(this.cropArea.y);
        const zoomSlider = document.getElementById('zoom-slider');
        if (zoomSlider) zoomSlider.value = this.zoom;
        const zoomValue = document.getElementById('zoom-value');
        if (zoomValue) zoomValue.textContent = `${this.zoom}%`;
    }
    enableControls() {
        // 不再需要启用裁切图片按钮，现在通过updateRealTimePreview实时启用下载按钮
        // 这个方法可以保留，用于未来扩展或作为初始化钩子
    }
    updateRealTimePreview() {
        if (!this.cropper) return;
        // 获取实时裁剪结果，使用高质量设置，因为要用于下载
        let croppedCanvas = this.cropper.getCroppedCanvas({
            type: 'image/png',
            quality: 1, // 高质量生成结果，确保下载质量
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        // 检查croppedCanvas是否有有效尺寸
        if (croppedCanvas.width === 0 || croppedCanvas.height === 0) {
            return;
        }
        let realTimeResult;
        // 如果是圆形裁切模式，将正方形转换为圆形
        if (this.cropMode === 'circle') {
            const circleCanvas = document.createElement('canvas');
            const ctx = circleCanvas.getContext('2d');
            const size = Math.min(croppedCanvas.width, croppedCanvas.height);
            circleCanvas.width = size;
            circleCanvas.height = size;
            // 绘制圆形
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, false);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.clip();
            // 将裁剪后的图片绘制到圆形画布上
            ctx.drawImage(
                croppedCanvas,
                (size - croppedCanvas.width) / 2,
                (size - croppedCanvas.height) / 2
            );
            // 获取圆形裁剪结果
            realTimeResult = circleCanvas.toDataURL('image/png');
        } else {
            // 普通矩形裁剪结果
            realTimeResult = croppedCanvas.toDataURL('image/png');
        }
        // 更新实时预览和resultImage
        const resultPreview = document.getElementById('result-preview');
        const resultImage = document.getElementById('result-image');
        // 设置结果图片，添加空检查
        if (resultImage) {
            resultImage.src = realTimeResult;
        }
        if (resultPreview) {
            resultPreview.classList.remove('hidden');
        }
        // 更新resultImage，用于下载功能
        this.resultImage = realTimeResult;
        // 启用下载按钮
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
        }
    }
    showResult() {
        const resultPreview = document.getElementById('result-preview');
        const resultImage = document.getElementById('result-image');
        // 设置结果图片，添加空检查
        if (resultImage) {
            resultImage.src = this.resultImage;
        }
        if (resultPreview) {
            resultPreview.classList.remove('hidden');
        }
        // 启用下载按钮，添加空检查
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
        }
    }
    downloadImage() {
        if (!this.resultImage) return;
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `cropped-image-${Date.now()}.png`;
        link.href = this.resultImage;
        link.click();
    }
    reset() {
        // 保存当前裁切模式
        const currentCropMode = this.cropMode;
        // 重置所有状态
        this.image = null;
        this.zoom = 100;
        this.resultImage = null;
        // 销毁Cropper实例
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        // 重置UI，添加空检查避免报错
        const imgPreview = document.getElementById('image-preview');
        if (imgPreview) imgPreview.src = '';
        const uploadTip = document.getElementById('upload-tip');
        if (uploadTip) uploadTip.classList.remove('hidden');
        const imageContainer = document.getElementById('image-container');
        if (imageContainer) imageContainer.classList.add('hidden');
        // 隐藏裁切设置区域
        const cropSettings = document.getElementById('crop-settings');
        if (cropSettings) {
            cropSettings.classList.add('hidden');
        }
        const resultPreview = document.getElementById('result-preview');
        if (resultPreview) resultPreview.classList.add('hidden');
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        // 重置按钮状态
        const cropBtn = document.getElementById('crop-btn');
        if (cropBtn) cropBtn.disabled = true;
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) downloadBtn.disabled = true;
        // 重置输入框
        const widthInput = document.getElementById('width-input');
        if (widthInput) widthInput.value = '';
        const heightInput = document.getElementById('height-input');
        if (heightInput) heightInput.value = '';
        const xInput = document.getElementById('x-input');
        if (xInput) xInput.value = '';
        const yInput = document.getElementById('y-input');
        if (yInput) yInput.value = '';
        const zoomSlider = document.getElementById('zoom-slider');
        if (zoomSlider) zoomSlider.value = 100;
        const zoomValue = document.getElementById('zoom-value');
        if (zoomValue) zoomValue.textContent = '100%';
        // 重置裁切模式按钮
        this.setCropMode(currentCropMode);
    }
}