import { open } from '@tauri-apps/plugin-dialog';

/**
 * ダイアログサービス - ファイル・ディレクトリ選択の処理を担当
 */
export const dialogService = {
	/**
	 * ファイル選択ダイアログを開く
	 */
	openFileDialog: async (): Promise<string | null> => {
		console.log('🔄 openFileDialog called');
		try {
			const selected = await open({
				multiple: false,
				filters: [
					{
						name: 'Image Files',
						extensions: ['png', 'jpg', 'jpeg', 'webp'],
					},
				],
			});

			console.log('📁 File selected: ' + selected);

			if (selected && typeof selected === 'string') {
				return selected;
			} else {
				console.log('❌ No file selected or invalid selection');
				return null;
			}
		} catch (error) {
			console.error('❌ File selection error: ' + error);
			return null;
		}
	},

	/**
	 * ディレクトリ選択ダイアログを開く
	 */
	openDirectoryDialog: async (): Promise<string | null> => {
		try {
			console.log('🔄 openDirectoryDialog: Opening dialog');
			const selected = await open({
				directory: true,
				multiple: false,
			});

			console.log('📁 openDirectoryDialog: Selection result', selected);

			if (selected && typeof selected === 'string') {
				return selected;
			} else {
				console.log('❌ openDirectoryDialog: No directory selected');
				return null;
			}
		} catch (error) {
			console.error('❌ openDirectoryDialog: Error occurred', error);
			return null;
		}
	},
};
