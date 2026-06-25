class SplitMove {
    constructor(options) {
        this.leftPanel = document.getElementById(options.leftId);
        this.rightPanel = document.getElementById(options.rightId);
        this.container = document.getElementById(options.containerId);
        this.direction = options.direction || 'horizontal';
        this.defaultPercent = options.defaultPercent || 50;
        this.storageKey = `splitmove_${options.containerId}`;
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        this.init();
    }

    init() {
        this.resizer = document.createElement('div');
        this.resizer.className = `resizer resizer-${this.direction}`;
        this.container.insertBefore(this.resizer, this.rightPanel);
        const savedPercent = localStorage.getItem(this.storageKey);
        this.applySize(savedPercent ? parseFloat(savedPercent) : this.defaultPercent);
        this.resizer.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.resizer.addEventListener('touchstart', (e) => this.onMouseDown(e), { passive: false });
        if (this.container.style.height == null || this.container.style.height == undefined || this.container.style.height == '') {
            this.container.style.height = '100%';
        }
        if (this.container.style.width == null || this.container.style.width == undefined || this.container.style.width == '') {
            this.container.style.width = '100%';
        }
        const style = document.createElement('style');
        style.textContent =
            `
                #${this.container.id} { 
                    display: flex; 
                    width: 100%; 
                    border: 1px solid #ccc; 
                    overflow: hidden; 
                }
                .panel { overflow: auto; }
                .resizer { 
                    background: var(--tranfer-color2); 
                    position: relative; 
                    z-index: 10; 
                    touch-action: none;
                }
                .resizer:hover { background: var(--main-color); }
                .resizer-horizontal { width: 4px; cursor: col-resize; height: 100%; } /* Tăng độ rộng lên 8px cho dễ chạm bằng tay */
                .resizer-vertical { height: 4px; cursor: row-resize; width: 100%; }
                .resizing { 
                    cursor: col-resize; 
                    user-select: none; 
                    touch-action: none; 
                }
            `;
        document.head.appendChild(style);
    }
    applySize(percent, persist) {
        if (this.direction === 'horizontal') {
            this.leftPanel.style.width = `${percent}%`;
            this.rightPanel.style.width = `${100 - percent}%`;
            this.container.style.flexDirection = 'row';
        } else {
            this.leftPanel.style.height = `${percent}%`;
            this.rightPanel.style.height = `${100 - percent}%`;
            this.container.style.flexDirection = 'column';
        }
        // Chỉ ghi localStorage khi kết thúc kéo, không ghi liên tục mỗi mousemove.
        if (persist !== false) {
            localStorage.setItem(this.storageKey, percent);
        }
    }
    onMouseDown(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        // Cache rect container một lần khi bắt đầu kéo (tránh reflow mỗi mousemove).
        this._rect = this.container.getBoundingClientRect();
        this._lastPercent = null;
        this._raf = null;
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('touchmove', this.boundMouseMove, { passive: false });
        document.addEventListener('touchend', this.boundMouseUp);
        this.container.classList.add('resizing');
    }
    onMouseMove(e) {
        if (!this.container.classList.contains('resizing')) {
            return;
        }
        const containerRect = this._rect || this.container.getBoundingClientRect();
        let percent;
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        if (this.direction === 'horizontal') {
            const offset = clientX - containerRect.left;
            percent = (offset / containerRect.width) * 100;
        } else {
            const offset = clientY - containerRect.top;
            percent = (offset / containerRect.height) * 100;
        }

        if (percent > 5 && percent < 95) {
            this._lastPercent = percent;
            // Gom cập nhật kích thước vào 1 frame để kéo mượt.
            if (this._raf == null) {
                this._raf = requestAnimationFrame(() => {
                    this._raf = null;
                    if (this._lastPercent != null) this.applySize(this._lastPercent, false);
                });
            }
        }
    }
    onMouseUp() {
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundMouseMove);
        document.removeEventListener('touchend', this.boundMouseUp);
        this.container.classList.remove('resizing');
        if (this._raf != null) { cancelAnimationFrame(this._raf); this._raf = null; }
        // Lưu vị trí cuối cùng.
        if (this._lastPercent != null) {
            this.applySize(this._lastPercent, true);
            this._lastPercent = null;
        }
    }
}