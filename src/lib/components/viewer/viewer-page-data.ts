import type { ViewerPageData } from '$lib/../routes/viewer/[image_path]/+page';

export const VIEWER_PAGE_DATA_CONTEXT = Symbol('viewerPageDataContext');

export type ViewerPageDataContext = {
	state: ViewerPageData;
};
