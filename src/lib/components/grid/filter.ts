export const FILTER_CONTEXT = Symbol('filterContext');

export type RatingOperator = '<=' | '=' | '>=';

export type FilterState = {
	/** フィルタパネルが表示されているかどうか */
	isFilterPanelVisible: boolean;
	/** Rating値（0 = フィルタなし、1-5 = 指定されたRating） */
	ratingValue: number;
	/** Rating比較演算子 */
	ratingOperator: RatingOperator;
	/** ファイル名フィルタパターン（glob形式） */
	filenamePattern: string;
	/** フィルタがアクティブかどうか */
	isActive: boolean;
};

export type FilterActions = {
	/** フィルタパネルの表示/非表示を切り替え */
	toggleFilterPanel: () => void;
	/** Rating値を設定 */
	setRatingValue: (rating: number) => void;
	/** Rating演算子を設定 */
	setRatingOperator: (operator: RatingOperator) => void;
	/** ファイル名パターンを設定 */
	setFilenamePattern: (pattern: string) => void;
	/** すべてのフィルタをクリア */
	clearFilters: () => void;
	/** 指定された画像パスリストをフィルタリング */
	filterImages: (imagePaths: string[], metadataStores: Map<string, any>) => string[];
};

export type FilterContext = {
	state: FilterState;
	actions: FilterActions;
};
