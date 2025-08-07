export type Result<T, E = string> = Success<T> | Error<E>;

export type Success<T> = {
	readonly success: true;
	readonly data: T;
};

export type Error<E = string> = {
	readonly success: false;
	readonly error: E;
};

export const Ok = <T>(data: T): Success<T> => ({
	success: true,
	data
});

export const Err = <E = string>(error: E): Error<E> => ({
	success: false,
	error
});

export const isOk = <T, E>(result: Result<T, E>): result is Success<T> => {
	return result.success;
};

export const isErr = <T, E>(result: Result<T, E>): result is Error<E> => {
	return !result.success;
};

export const unwrap = <T, E>(result: Result<T, E>): T => {
	if (isOk(result)) {
		return result.data;
	}
	throw new TypeError(`Unwrap failed: ${result.error}`);
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
	return isOk(result) ? result.data : defaultValue;
};

export const match = <T, E, R>(
	result: Result<T, E>,
	handlers: {
		ok: (data: T) => R;
		err: (error: E) => R;
	}
): R => {
	return isOk(result) ? handlers.ok(result.data) : handlers.err(result.error);
};

export const mapOk = <T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> => {
	return isOk(result) ? Ok(fn(result.data)) : result;
};

export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
	return isErr(result) ? Err(fn(result.error)) : result;
};

export const asyncTry = async <T>(fn: () => Promise<T>): Promise<Result<T, string>> => {
	try {
		const data = await fn();
		return Ok(data);
	} catch (error) {
		return Err(error instanceof Error ? error.message : String(error));
	}
};

export const syncTry = <T>(fn: () => T): Result<T, string> => {
	try {
		const data = fn();
		return Ok(data);
	} catch (error) {
		return Err(error instanceof Error ? error.message : String(error));
	}
};
