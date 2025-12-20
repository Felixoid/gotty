import { init, Terminal as GhosttyTerminal, FitAddon } from "ghostty-web";

export class Ghostty {
    elem: HTMLElement;
    term: GhosttyTerminal;
    fitAddon: FitAddon;
    resizeListener: () => void;
    resizeObserver: ResizeObserver;

    message: HTMLElement;
    messageTimeout: number;
    messageTimer: ReturnType<typeof setTimeout> | null;

    inputCallback: ((input: string) => void) | null = null;
    resizeCallback: ((columns: number, rows: number) => void) | null = null;

    // Mouse tracking state
    private mouseButtonsPressed: Set<number> = new Set();
    private lastMouseCol: number = 0;
    private lastMouseRow: number = 0;

    constructor(elem: HTMLElement) {
        this.elem = elem;
        this.messageTimer = null;

        this.message = elem.ownerDocument.createElement("div");
        this.message.className = "terminal-overlay";
        this.messageTimeout = 2000;

        this.term = new GhosttyTerminal({
            fontSize: 14,
            // Include emoji fonts and common monospace fonts with good Unicode coverage
            fontFamily: '"Hack Nerd Font", "DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, "Noto Sans Mono", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", monospace',
            theme: {
                background: '#000000',
                foreground: '#ffffff',
            },
        });

        this.term.open(elem);

        // Setup fit addon for auto-resizing
        this.fitAddon = new FitAddon();
        this.term.loadAddon(this.fitAddon);
        this.fitAddon.fit();

        this.resizeListener = () => {
            this.fitAddon.fit();
            const dims = this.info();
            this.showMessage(`${dims.columns}x${dims.rows}`, this.messageTimeout);
            if (this.resizeCallback) {
                this.resizeCallback(dims.columns, dims.rows);
            }
        };

        // Use ResizeObserver to detect container size changes
        this.resizeObserver = new ResizeObserver(() => {
            this.resizeListener();
        });
        this.resizeObserver.observe(elem);

        // Also listen for window resize
        window.addEventListener("resize", this.resizeListener);

        // Setup input handler
        this.term.onData((data: string) => {
            if (this.inputCallback) {
                this.inputCallback(data);
            }
        });

        // Setup mouse tracking (wait for canvas to be created)
        this.setupMouseTracking();
    }

    private setupMouseTracking(): void {
        const canvas = this.elem.querySelector('canvas');
        if (!canvas) {
            // Canvas might not be created yet, retry after a short delay
            setTimeout(() => this.setupMouseTracking(), 100);
            return;
        }

        canvas.addEventListener('mousedown', (e) => this.handleMouseEvent(e, 'press'));
        canvas.addEventListener('mouseup', (e) => this.handleMouseEvent(e, 'release'));
        canvas.addEventListener('mousemove', (e) => this.handleMouseEvent(e, 'move'));
        canvas.addEventListener('wheel', (e) => this.handleWheelEvent(e), { passive: false });

        // Prevent context menu on right-click when mouse tracking is enabled
        canvas.addEventListener('contextmenu', (e) => {
            if (this.term.hasMouseTracking()) {
                e.preventDefault();
            }
        });
    }

    private pixelToCell(x: number, y: number): { col: number; row: number } {
        const canvas = this.elem.querySelector('canvas');
        if (!canvas) return { col: 0, row: 0 };

        const cols = this.term.cols || 80;
        const rows = this.term.rows || 24;
        const cellWidth = canvas.clientWidth / cols;
        const cellHeight = canvas.clientHeight / rows;

        return {
            col: Math.floor(x / cellWidth),
            row: Math.floor(y / cellHeight)
        };
    }

    private handleMouseEvent(e: MouseEvent, type: 'press' | 'release' | 'move'): void {
        if (!this.term.hasMouseTracking()) return;
        if (!this.inputCallback) return;

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { col, row } = this.pixelToCell(x, y);

        // Track button state
        if (type === 'press') {
            this.mouseButtonsPressed.add(e.button);
        } else if (type === 'release') {
            this.mouseButtonsPressed.delete(e.button);
        }

        // For move events, only send if a button is pressed (drag) or any-event mode is enabled
        if (type === 'move') {
            // Skip if position hasn't changed
            if (col === this.lastMouseCol && row === this.lastMouseRow) return;

            // Only send motion if we're dragging (button pressed)
            if (this.mouseButtonsPressed.size === 0) return;
        }

        this.lastMouseCol = col;
        this.lastMouseRow = row;

        // Generate SGR mouse sequence (mode 1006) - most compatible with modern terminals
        // Format: CSI < Cb ; Cx ; Cy M (press) or CSI < Cb ; Cx ; Cy m (release)
        let button: number;
        if (type === 'release') {
            button = e.button; // 0=left, 1=middle, 2=right
        } else if (type === 'move' && this.mouseButtonsPressed.size > 0) {
            // For drag, use the first pressed button + 32 for motion
            button = 32 + Array.from(this.mouseButtonsPressed)[0];
        } else {
            button = e.button;
        }

        // Add modifier keys
        if (e.shiftKey) button += 4;
        if (e.metaKey || e.altKey) button += 8;
        if (e.ctrlKey) button += 16;

        // SGR format uses 1-based coordinates
        const cx = col + 1;
        const cy = row + 1;
        const suffix = type === 'release' ? 'm' : 'M';

        const seq = `\x1b[<${button};${cx};${cy}${suffix}`;
        this.inputCallback(seq);
    }

    private handleWheelEvent(e: WheelEvent): void {
        if (!this.term.hasMouseTracking()) return;
        if (!this.inputCallback) return;

        e.preventDefault();

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { col, row } = this.pixelToCell(x, y);

        // Wheel up = 64, wheel down = 65
        let button = e.deltaY < 0 ? 64 : 65;

        // Add modifier keys
        if (e.shiftKey) button += 4;
        if (e.metaKey || e.altKey) button += 8;
        if (e.ctrlKey) button += 16;

        // SGR format uses 1-based coordinates
        const cx = col + 1;
        const cy = row + 1;

        const seq = `\x1b[<${button};${cx};${cy}M`;
        this.inputCallback(seq);
    }

    info(): { columns: number, rows: number } {
        return {
            columns: this.term.cols || 80,
            rows: this.term.rows || 24
        };
    }

    output(data: string): void {
        this.term.write(data);
    }

    showMessage(message: string, timeout: number): void {
        this.message.textContent = message;
        if (this.message.parentNode !== this.elem) {
            this.elem.appendChild(this.message);
        }

        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }
        if (timeout > 0) {
            this.messageTimer = setTimeout(() => {
                this.removeMessage();
            }, timeout);
        }
    }

    removeMessage(): void {
        if (this.message.parentNode === this.elem) {
            this.elem.removeChild(this.message);
        }
    }

    setWindowTitle(title: string): void {
        document.title = title;
    }

    setPreferences(_value: object): void {
        // Preferences can be handled here if needed
    }

    onInput(callback: (input: string) => void): void {
        this.inputCallback = callback;
    }

    onResize(callback: (columns: number, rows: number) => void): void {
        this.resizeCallback = callback;
        // Trigger initial resize
        const dims = this.info();
        callback(dims.columns, dims.rows);
    }

    deactivate(): void {
        this.inputCallback = null;
        this.resizeCallback = null;
        this.term.blur();
    }

    reset(): void {
        this.removeMessage();
        this.term.clear();
    }

    close(): void {
        this.resizeObserver.disconnect();
        window.removeEventListener("resize", this.resizeListener);
        this.term.dispose();
    }
}

export { init as initGhostty };
