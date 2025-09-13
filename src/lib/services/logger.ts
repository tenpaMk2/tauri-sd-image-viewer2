import { attachConsole, debug, error, info, warn } from '@tauri-apps/plugin-log';

const forwardConsole = (
	fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
	logger: (...args: any[]) => Promise<void>,
) => {
	const original = console[fnName];
	console[fnName] = (...args) => {
		if (args.join().includes('For best results, use the `fetch` that is passed to you')) return;

		original(...args);
		logger(args.join(', '));
	};
};

export const initializeLogger = async () => {
	// plugin-logを初期化
	await attachConsole();

	// console関数をTauriのログ関数に転送
	// console.logはinfoレベルに設定（traceから変更）
	forwardConsole('log', info);
	forwardConsole('debug', debug);
	forwardConsole('info', info);
	forwardConsole('warn', warn);
	forwardConsole('error', error);

	console.log('ログシステムが初期化されました');
};
