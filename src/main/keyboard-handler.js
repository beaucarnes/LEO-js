const { keyboard, Key } = require("@computer-use/nut-js");
const { NUTJS_KEY_MAPPING } = require("../shared/constants");
const state = require("./state");

// Map lowercase characters to Key constants for macOS compatibility
const CHAR_TO_KEY = {
	'a': Key.A, 'b': Key.B, 'c': Key.C, 'd': Key.D, 'e': Key.E,
	'f': Key.F, 'g': Key.G, 'h': Key.H, 'i': Key.I, 'j': Key.J,
	'k': Key.K, 'l': Key.L, 'm': Key.M, 'n': Key.N, 'o': Key.O,
	'p': Key.P, 'q': Key.Q, 'r': Key.R, 's': Key.S, 't': Key.T,
	'u': Key.U, 'v': Key.V, 'w': Key.W, 'x': Key.X, 'y': Key.Y,
	'z': Key.Z,
	'0': Key.Num0, '1': Key.Num1, '2': Key.Num2, '3': Key.Num3,
	'4': Key.Num4, '5': Key.Num5, '6': Key.Num6, '7': Key.Num7,
	'8': Key.Num8, '9': Key.Num9,
	' ': Key.Space,
	'.': Key.Period,
	',': Key.Comma,
	'/': Key.Slash,
	'\\': Key.Backslash,
	';': Key.Semicolon,
	"'": Key.Quote,
	'[': Key.LeftBracket,
	']': Key.RightBracket,
	'-': Key.Minus,
	'=': Key.Equal,
	'`': Key.Grave,
	'\t': Key.Tab,
};

// Shifted versions of keys
const SHIFTED_CHARS = {
	'!': Key.Num1, '@': Key.Num2, '#': Key.Num3, '$': Key.Num4,
	'%': Key.Num5, '^': Key.Num6, '&': Key.Num7, '*': Key.Num8,
	'(': Key.Num9, ')': Key.Num0,
	'_': Key.Minus, '+': Key.Equal,
	'{': Key.LeftBracket, '}': Key.RightBracket,
	'|': Key.Backslash,
	':': Key.Semicolon, '"': Key.Quote,
	'<': Key.Comma, '>': Key.Period, '?': Key.Slash,
	'~': Key.Grave,
};

class KeyboardHandler {
	constructor(hotkeyManager, settingsManager) {
		this.hotkeyManager = hotkeyManager;
		this.settingsManager = settingsManager;
		this.isProcessing = false;

		// Increased delay for macOS compatibility
		keyboard.config.autoDelayMs = 50;
	}

	async typeCharacter(char) {
		if (this.isProcessing) {
			console.log("Already processing, skipping:", char);
			return;
		}

		if (state.isPaused) {
			return;
		}

		this.isProcessing = true;

		const charLower = char.toLowerCase();
		const typingHotkeys = this.settingsManager.get("hotkeys.typing");
		const isInterceptorKey = typingHotkeys.includes(charLower);

		try {
			if (isInterceptorKey) {
				this.hotkeyManager.unregisterKey(charLower);
			}

			await this.typeWithNutJs(char);

			if (isInterceptorKey) {
				this.hotkeyManager.registerKey(charLower);
			}

			this.processQueue();

			if (state.mainWindow) {
				state.mainWindow.webContents.send("character-typed");
			}
		} catch (error) {
			console.error("Error typing character:", error);

			if (isInterceptorKey) {
				this.hotkeyManager.registerKey(charLower);
			}
			state.unlock();
			state.clearQueue();
		} finally {
			this.isProcessing = false;
		}
	}

	async autoTypeBlock(steps, startIndex, speed) {
		const typingHotkeys = this.settingsManager.get("hotkeys.typing");

		for (let i = startIndex; i < steps.length; i++) {
			if (!state.isAutoTyping) {
				break;
			}

			if (steps[i].type === "block") break;
			if (steps[i].type === "char") {
				const char = steps[i].char;
				const charLower = char.toLowerCase();
				const isInterceptorKey = typingHotkeys.includes(charLower);

				try {
					if (isInterceptorKey) {
						this.hotkeyManager.unregisterKey(charLower);
					}

					await this.typeWithNutJs(char);

					if (isInterceptorKey) {
						this.hotkeyManager.registerKey(charLower);
					}

					if (state.mainWindow) {
						state.mainWindow.webContents.send(
							"auto-type-step-complete",
							steps[i].index,
						);
					}

					await new Promise((resolve) => setTimeout(resolve, speed));
				} catch (error) {
					console.error("Error typing character during auto-type:", error);

					if (isInterceptorKey) {
						this.hotkeyManager.registerKey(charLower);
					}
					break;
				}
			}
		}
	}

	async typeWithNutJs(char) {
		// First check special character mappings from constants
		if (NUTJS_KEY_MAPPING[char]) {
			const mapping = NUTJS_KEY_MAPPING[char];

			if (mapping.pause) {
				state.pause();
				await new Promise((resolve) => setTimeout(resolve, mapping.pause));
				state.unpause();
				return;
			}

			if (mapping.modifier) {
				await keyboard.type(mapping.modifier, mapping.key);
			} else if (mapping.shift) {
				await keyboard.type(Key.LeftShift, mapping.key);
			} else {
				await keyboard.type(mapping.key);
			}
			return;
		}

		// Handle newline
		if (char === "\n") {
			await keyboard.type(Key.Enter);
			return;
		}

		// Handle tab
		if (char === "\t") {
			await keyboard.type(Key.Tab);
			return;
		}

		// macOS fix: Use Key constants instead of string characters
		// Check if it's an uppercase letter
		const charLower = char.toLowerCase();
		if (CHAR_TO_KEY[charLower]) {
			const isUpperCase = char !== charLower && /[A-Z]/.test(char);
			if (isUpperCase) {
				await keyboard.type(Key.LeftShift, CHAR_TO_KEY[charLower]);
			} else {
				await keyboard.type(CHAR_TO_KEY[charLower]);
			}
			return;
		}

		// Check if it's a shifted character (like ! @ # etc)
		if (SHIFTED_CHARS[char]) {
			await keyboard.type(Key.LeftShift, SHIFTED_CHARS[char]);
			return;
		}

		// Fallback: try the original string method (may not work on macOS)
		console.log("Fallback typing for char:", char, "code:", char.charCodeAt(0));
		await keyboard.type(char);
	}

	processQueue() {
		if (state.hasQueuedKeys()) {
			const nextKey = state.dequeueKey();
			state.mainWindow.webContents.send("advance-cursor");
		} else {
			state.unlock();
		}
	}
}

module.exports = KeyboardHandler;
