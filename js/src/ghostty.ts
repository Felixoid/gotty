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

    constructor(elem: HTMLElement) {
        this.elem = elem;
        this.messageTimer = null;

        this.message = elem.ownerDocument.createElement("div");
        this.message.className = "terminal-overlay";
        this.messageTimeout = 2000;

        this.term = new GhosttyTerminal({
            fontSize: 14,
            fontFamily: '"DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, monospace',
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
