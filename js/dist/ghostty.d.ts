import { init, Terminal as GhosttyTerminal } from "ghostty-web";
export declare class Ghostty {
    elem: HTMLElement;
    term: GhosttyTerminal;
    resizeListener: () => void;
    resizeObserver: ResizeObserver;
    message: HTMLElement;
    messageTimeout: number;
    messageTimer: ReturnType<typeof setTimeout> | null;
    inputCallback: ((input: string) => void) | null;
    resizeCallback: ((columns: number, rows: number) => void) | null;
    constructor(elem: HTMLElement);
    info(): {
        columns: number;
        rows: number;
    };
    output(data: string): void;
    showMessage(message: string, timeout: number): void;
    removeMessage(): void;
    setWindowTitle(title: string): void;
    setPreferences(_value: object): void;
    onInput(callback: (input: string) => void): void;
    onResize(callback: (columns: number, rows: number) => void): void;
    deactivate(): void;
    reset(): void;
    close(): void;
}
export { init as initGhostty };
