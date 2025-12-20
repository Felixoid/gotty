import { Ghostty, initGhostty } from "./ghostty";
import { Terminal, WebTTY, protocols } from "./webtty";
import { ConnectionFactory } from "./websocket";

declare var gotty_auth_token: string;
declare var gotty_term: string;

async function main() {
    const elem = document.getElementById("terminal");
    if (elem === null) {
        console.error("Terminal element not found");
        return;
    }

    // Initialize ghostty-web WASM
    await initGhostty();

    const term: Terminal = new Ghostty(elem);

    const httpsEnabled = window.location.protocol === "https:";
    const url = (httpsEnabled ? 'wss://' : 'ws://') + window.location.host + window.location.pathname + 'ws';
    const args = window.location.search;
    const factory = new ConnectionFactory(url, protocols);
    const wt = new WebTTY(term, factory, args, gotty_auth_token);
    const closer = wt.open();

    window.addEventListener("unload", () => {
        closer();
        term.close();
    });
}

main().catch(err => {
    console.error("Failed to initialize terminal:", err);
});
