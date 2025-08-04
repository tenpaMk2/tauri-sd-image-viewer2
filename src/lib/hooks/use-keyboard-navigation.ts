// キーボードナビゲーション用のhook
export const createKeyboardNavigationHandler = (
	goToPrevious: () => void,
	goToNext: () => void,
	isInfoPanelFocused: () => boolean
) => {
	const handleKeydown = (event: KeyboardEvent): void => {
		// 情報ペインにフォーカスがある場合はナビゲーションを無効化
		if (isInfoPanelFocused()) return;

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				goToPrevious();
				break;
			case 'ArrowRight':
				event.preventDefault();
				goToNext();
				break;
		}
	};

	return handleKeydown;
};
