import type { GridPageData } from '$lib/../routes/grid/[dir_path]/+page';

export const GRID_PAGE_DATA_CONTEXT = Symbol('gridPageDataContext');

export type GridPageDataContext = {
	state: GridPageData;
};
