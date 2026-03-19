var __defProp = Object.defineProperty;
var __name = (target, value) =>
	__defProp(target, "name", { value, configurable: true });

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
	return (context, next) => {
		let index = -1;
		return dispatch(0);
		async function dispatch(i) {
			if (i <= index) {
				throw new Error("next() called multiple times");
			}
			index = i;
			let res;
			let isError = false;
			let handler;
			if (middleware[i]) {
				handler = middleware[i][0][0];
				context.req.routeIndex = i;
			} else {
				handler = (i === middleware.length && next) || void 0;
			}
			if (handler) {
				try {
					res = await handler(context, () => dispatch(i + 1));
				} catch (err) {
					if (err instanceof Error && onError) {
						context.error = err;
						res = await onError(err, context);
						isError = true;
					} else {
						throw err;
					}
				}
			} else {
				if (context.finalized === false && onNotFound) {
					res = await onNotFound(context);
				}
			}
			if (res && (context.finalized === false || isError)) {
				context.res = res;
			}
			return context;
		}
		__name(dispatch, "dispatch");
	};
}, "compose");

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(
	async (request, options = /* @__PURE__ */ Object.create(null)) => {
		const { all = false, dot = false } = options;
		const headers =
			request instanceof HonoRequest ? request.raw.headers : request.headers;
		const contentType = headers.get("Content-Type");
		if (
			contentType?.startsWith("multipart/form-data") ||
			contentType?.startsWith("application/x-www-form-urlencoded")
		) {
			return parseFormData(request, { all, dot });
		}
		return {};
	},
	"parseBody",
);
async function parseFormData(request, options) {
	const formData = await request.formData();
	if (formData) {
		return convertFormDataToBodyData(formData, options);
	}
	return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
	const form = /* @__PURE__ */ Object.create(null);
	formData.forEach((value, key) => {
		const shouldParseAllValues = options.all || key.endsWith("[]");
		if (!shouldParseAllValues) {
			form[key] = value;
		} else {
			handleParsingAllValues(form, key, value);
		}
	});
	if (options.dot) {
		Object.entries(form).forEach(([key, value]) => {
			const shouldParseDotValues = key.includes(".");
			if (shouldParseDotValues) {
				handleParsingNestedValues(form, key, value);
				delete form[key];
			}
		});
	}
	return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
	if (form[key] !== void 0) {
		if (Array.isArray(form[key])) {
			form[key].push(value);
		} else {
			form[key] = [form[key], value];
		}
	} else {
		if (!key.endsWith("[]")) {
			form[key] = value;
		} else {
			form[key] = [value];
		}
	}
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
	let nestedForm = form;
	const keys = key.split(".");
	keys.forEach((key2, index) => {
		if (index === keys.length - 1) {
			nestedForm[key2] = value;
		} else {
			if (
				!nestedForm[key2] ||
				typeof nestedForm[key2] !== "object" ||
				Array.isArray(nestedForm[key2]) ||
				nestedForm[key2] instanceof File
			) {
				nestedForm[key2] = /* @__PURE__ */ Object.create(null);
			}
			nestedForm = nestedForm[key2];
		}
	});
}, "handleParsingNestedValues");

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
	const paths = path.split("/");
	if (paths[0] === "") {
		paths.shift();
	}
	return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
	const { groups: groups2, path } = extractGroupsFromPath(routePath);
	const paths = splitPath(path);
	return replaceGroupMarks(paths, groups2);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
	const groups2 = [];
	path = path.replace(/\{[^}]+\}/g, (match2, index) => {
		const mark = `@${index}`;
		groups2.push([mark, match2]);
		return mark;
	});
	return { groups: groups2, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups2) => {
	for (let i = groups2.length - 1; i >= 0; i--) {
		const [mark] = groups2[i];
		for (let j = paths.length - 1; j >= 0; j--) {
			if (paths[j].includes(mark)) {
				paths[j] = paths[j].replace(mark, groups2[i][1]);
				break;
			}
		}
	}
	return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
	if (label === "*") {
		return "*";
	}
	const match2 = label.match(/^:([^{}]+)(?:\{(.+)\})?$/);
	if (match2) {
		const cacheKey = `${label}#${next}`;
		if (!patternCache[cacheKey]) {
			if (match2[2]) {
				patternCache[cacheKey] =
					next && next[0] !== ":" && next[0] !== "*"
						? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)]
						: [label, match2[1], new RegExp(`^${match2[2]}$`)];
			} else {
				patternCache[cacheKey] = [label, match2[1], true];
			}
		}
		return patternCache[cacheKey];
	}
	return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
	try {
		return decoder(str);
	} catch {
		return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
			try {
				return decoder(match2);
			} catch {
				return match2;
			}
		});
	}
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name(
	(str) => tryDecode(str, decodeURI),
	"tryDecodeURI",
);
var getPath = /* @__PURE__ */ __name((request) => {
	const url = request.url;
	const start = url.indexOf("/", url.indexOf(":") + 4);
	let i = start;
	for (; i < url.length; i++) {
		const charCode = url.charCodeAt(i);
		if (charCode === 37) {
			const queryIndex = url.indexOf("?", i);
			const hashIndex = url.indexOf("#", i);
			const end =
				queryIndex === -1
					? hashIndex === -1
						? void 0
						: hashIndex
					: hashIndex === -1
						? queryIndex
						: Math.min(queryIndex, hashIndex);
			const path = url.slice(start, end);
			return tryDecodeURI(
				path.includes("%25") ? path.replace(/%25/g, "%2525") : path,
			);
		} else if (charCode === 63 || charCode === 35) {
			break;
		}
	}
	return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
	const result = getPath(request);
	return result.length > 1 && result.at(-1) === "/"
		? result.slice(0, -1)
		: result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
	if (rest.length) {
		sub = mergePath(sub, ...rest);
	}
	return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
	if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
		return null;
	}
	const segments = path.split("/");
	const results = [];
	let basePath = "";
	segments.forEach((segment) => {
		if (segment !== "" && !/:/.test(segment)) {
			basePath += "/" + segment;
		} else if (/:/.test(segment)) {
			if (/\?/.test(segment)) {
				if (results.length === 0 && basePath === "") {
					results.push("/");
				} else {
					results.push(basePath);
				}
				const optionalSegment = segment.replace("?", "");
				basePath += "/" + optionalSegment;
				results.push(basePath);
			} else {
				basePath += "/" + segment;
			}
		}
	});
	return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
	if (!/[%+]/.test(value)) {
		return value;
	}
	if (value.indexOf("+") !== -1) {
		value = value.replace(/\+/g, " ");
	}
	return value.indexOf("%") !== -1
		? tryDecode(value, decodeURIComponent_)
		: value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
	let encoded;
	if (!multiple && key && !/[%+]/.test(key)) {
		let keyIndex2 = url.indexOf("?", 8);
		if (keyIndex2 === -1) {
			return void 0;
		}
		if (!url.startsWith(key, keyIndex2 + 1)) {
			keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
		}
		while (keyIndex2 !== -1) {
			const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
			if (trailingKeyCode === 61) {
				const valueIndex = keyIndex2 + key.length + 2;
				const endIndex = url.indexOf("&", valueIndex);
				return _decodeURI(
					url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex),
				);
			} else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
				return "";
			}
			keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
		}
		encoded = /[%+]/.test(url);
		if (!encoded) {
			return void 0;
		}
	}
	const results = {};
	encoded ??= /[%+]/.test(url);
	let keyIndex = url.indexOf("?", 8);
	while (keyIndex !== -1) {
		const nextKeyIndex = url.indexOf("&", keyIndex + 1);
		let valueIndex = url.indexOf("=", keyIndex);
		if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
			valueIndex = -1;
		}
		let name = url.slice(
			keyIndex + 1,
			valueIndex === -1
				? nextKeyIndex === -1
					? void 0
					: nextKeyIndex
				: valueIndex,
		);
		if (encoded) {
			name = _decodeURI(name);
		}
		keyIndex = nextKeyIndex;
		if (name === "") {
			continue;
		}
		let value;
		if (valueIndex === -1) {
			value = "";
		} else {
			value = url.slice(
				valueIndex + 1,
				nextKeyIndex === -1 ? void 0 : nextKeyIndex,
			);
			if (encoded) {
				value = _decodeURI(value);
			}
		}
		if (multiple) {
			if (!(results[name] && Array.isArray(results[name]))) {
				results[name] = [];
			}
			results[name].push(value);
		} else {
			results[name] ??= value;
		}
	}
	return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
	return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name(
	(str) => tryDecode(str, decodeURIComponent_),
	"tryDecodeURIComponent",
);
var HonoRequest = /* @__PURE__ */ __name(
	class {
		/**
		 * `.raw` can get the raw Request object.
		 *
		 * @see {@link https://hono.dev/docs/api/request#raw}
		 *
		 * @example
		 * ```ts
		 * // For Cloudflare Workers
		 * app.post('/', async (c) => {
		 *   const metadata = c.req.raw.cf?.hostMetadata?
		 *   ...
		 * })
		 * ```
		 */
		raw;
		#validatedData;
		// Short name of validatedData
		#matchResult;
		routeIndex = 0;
		/**
		 * `.path` can get the pathname of the request.
		 *
		 * @see {@link https://hono.dev/docs/api/request#path}
		 *
		 * @example
		 * ```ts
		 * app.get('/about/me', (c) => {
		 *   const pathname = c.req.path // `/about/me`
		 * })
		 * ```
		 */
		path;
		bodyCache = {};
		constructor(request, path = "/", matchResult = [[]]) {
			this.raw = request;
			this.path = path;
			this.#matchResult = matchResult;
			this.#validatedData = {};
		}
		param(key) {
			return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
		}
		#getDecodedParam(key) {
			const paramKey = this.#matchResult[0][this.routeIndex][1][key];
			const param = this.#getParamValue(paramKey);
			return param && /%/.test(param) ? tryDecodeURIComponent(param) : param;
		}
		#getAllDecodedParams() {
			const decoded = {};
			const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
			for (const key of keys) {
				const value = this.#getParamValue(
					this.#matchResult[0][this.routeIndex][1][key],
				);
				if (value !== void 0) {
					decoded[key] = /%/.test(value) ? tryDecodeURIComponent(value) : value;
				}
			}
			return decoded;
		}
		#getParamValue(paramKey) {
			return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
		}
		query(key) {
			return getQueryParam(this.url, key);
		}
		queries(key) {
			return getQueryParams(this.url, key);
		}
		header(name) {
			if (name) {
				return this.raw.headers.get(name) ?? void 0;
			}
			const headerData = {};
			this.raw.headers.forEach((value, key) => {
				headerData[key] = value;
			});
			return headerData;
		}
		async parseBody(options) {
			return (this.bodyCache.parsedBody ??= await parseBody(this, options));
		}
		#cachedBody = (key) => {
			const { bodyCache, raw: raw2 } = this;
			const cachedBody = bodyCache[key];
			if (cachedBody) {
				return cachedBody;
			}
			const anyCachedKey = Object.keys(bodyCache)[0];
			if (anyCachedKey) {
				return bodyCache[anyCachedKey].then((body) => {
					if (anyCachedKey === "json") {
						body = JSON.stringify(body);
					}
					return new Response(body)[key]();
				});
			}
			return (bodyCache[key] = raw2[key]());
		};
		/**
		 * `.json()` can parse Request body of type `application/json`
		 *
		 * @see {@link https://hono.dev/docs/api/request#json}
		 *
		 * @example
		 * ```ts
		 * app.post('/entry', async (c) => {
		 *   const body = await c.req.json()
		 * })
		 * ```
		 */
		json() {
			return this.#cachedBody("text").then((text) => JSON.parse(text));
		}
		/**
		 * `.text()` can parse Request body of type `text/plain`
		 *
		 * @see {@link https://hono.dev/docs/api/request#text}
		 *
		 * @example
		 * ```ts
		 * app.post('/entry', async (c) => {
		 *   const body = await c.req.text()
		 * })
		 * ```
		 */
		text() {
			return this.#cachedBody("text");
		}
		/**
		 * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
		 *
		 * @see {@link https://hono.dev/docs/api/request#arraybuffer}
		 *
		 * @example
		 * ```ts
		 * app.post('/entry', async (c) => {
		 *   const body = await c.req.arrayBuffer()
		 * })
		 * ```
		 */
		arrayBuffer() {
			return this.#cachedBody("arrayBuffer");
		}
		/**
		 * Parses the request body as a `Blob`.
		 * @example
		 * ```ts
		 * app.post('/entry', async (c) => {
		 *   const body = await c.req.blob();
		 * });
		 * ```
		 * @see https://hono.dev/docs/api/request#blob
		 */
		blob() {
			return this.#cachedBody("blob");
		}
		/**
		 * Parses the request body as `FormData`.
		 * @example
		 * ```ts
		 * app.post('/entry', async (c) => {
		 *   const body = await c.req.formData();
		 * });
		 * ```
		 * @see https://hono.dev/docs/api/request#formdata
		 */
		formData() {
			return this.#cachedBody("formData");
		}
		/**
		 * Adds validated data to the request.
		 *
		 * @param target - The target of the validation.
		 * @param data - The validated data to add.
		 */
		addValidatedData(target, data) {
			this.#validatedData[target] = data;
		}
		valid(target) {
			return this.#validatedData[target];
		}
		/**
		 * `.url()` can get the request url strings.
		 *
		 * @see {@link https://hono.dev/docs/api/request#url}
		 *
		 * @example
		 * ```ts
		 * app.get('/about/me', (c) => {
		 *   const url = c.req.url // `http://localhost:8787/about/me`
		 *   ...
		 * })
		 * ```
		 */
		get url() {
			return this.raw.url;
		}
		/**
		 * `.method()` can get the method name of the request.
		 *
		 * @see {@link https://hono.dev/docs/api/request#method}
		 *
		 * @example
		 * ```ts
		 * app.get('/about/me', (c) => {
		 *   const method = c.req.method // `GET`
		 * })
		 * ```
		 */
		get method() {
			return this.raw.method;
		}
		get [GET_MATCH_RESULT]() {
			return this.#matchResult;
		}
		/**
		 * `.matchedRoutes()` can return a matched route in the handler
		 *
		 * @deprecated
		 *
		 * Use matchedRoutes helper defined in "hono/route" instead.
		 *
		 * @see {@link https://hono.dev/docs/api/request#matchedroutes}
		 *
		 * @example
		 * ```ts
		 * app.use('*', async function logger(c, next) {
		 *   await next()
		 *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
		 *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
		 *     console.log(
		 *       method,
		 *       ' ',
		 *       path,
		 *       ' '.repeat(Math.max(10 - path.length, 0)),
		 *       name,
		 *       i === c.req.routeIndex ? '<- respond from here' : ''
		 *     )
		 *   })
		 * })
		 * ```
		 */
		get matchedRoutes() {
			return this.#matchResult[0].map(([[, route]]) => route);
		}
		/**
		 * `routePath()` can retrieve the path registered within the handler
		 *
		 * @deprecated
		 *
		 * Use routePath helper defined in "hono/route" instead.
		 *
		 * @see {@link https://hono.dev/docs/api/request#routepath}
		 *
		 * @example
		 * ```ts
		 * app.get('/posts/:id', (c) => {
		 *   return c.json({ path: c.req.routePath })
		 * })
		 * ```
		 */
		get routePath() {
			return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex]
				.path;
		}
	},
	"HonoRequest",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
	Stringify: 1,
	BeforeStream: 2,
	Stream: 3,
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
	const escapedString = new String(value);
	escapedString.isEscaped = true;
	escapedString.callbacks = callbacks;
	return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(
	async (str, phase, preserveCallbacks, context, buffer) => {
		if (typeof str === "object" && !(str instanceof String)) {
			if (!(str instanceof Promise)) {
				str = str.toString();
			}
			if (str instanceof Promise) {
				str = await str;
			}
		}
		const callbacks = str.callbacks;
		if (!callbacks?.length) {
			return Promise.resolve(str);
		}
		if (buffer) {
			buffer[0] += str;
		} else {
			buffer = [str];
		}
		const resStr = Promise.all(
			callbacks.map((c) => c({ phase, buffer, context })),
		).then((res) =>
			Promise.all(
				res
					.filter(Boolean)
					.map((str2) => resolveCallback(str2, phase, false, context, buffer)),
			).then(() => buffer[0]),
		);
		if (preserveCallbacks) {
			return raw(await resStr, callbacks);
		} else {
			return resStr;
		}
	},
	"resolveCallback",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
	return {
		"Content-Type": contentType,
		...headers,
	};
}, "setDefaultContentType");
var Context = /* @__PURE__ */ __name(
	class {
		#rawRequest;
		#req;
		/**
		 * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
		 *
		 * @see {@link https://hono.dev/docs/api/context#env}
		 *
		 * @example
		 * ```ts
		 * // Environment object for Cloudflare Workers
		 * app.get('*', async c => {
		 *   const counter = c.env.COUNTER
		 * })
		 * ```
		 */
		env = {};
		#var;
		finalized = false;
		/**
		 * `.error` can get the error object from the middleware if the Handler throws an error.
		 *
		 * @see {@link https://hono.dev/docs/api/context#error}
		 *
		 * @example
		 * ```ts
		 * app.use('*', async (c, next) => {
		 *   await next()
		 *   if (c.error) {
		 *     // do something...
		 *   }
		 * })
		 * ```
		 */
		error;
		#status;
		#executionCtx;
		#res;
		#layout;
		#renderer;
		#notFoundHandler;
		#preparedHeaders;
		#matchResult;
		#path;
		/**
		 * Creates an instance of the Context class.
		 *
		 * @param req - The Request object.
		 * @param options - Optional configuration options for the context.
		 */
		constructor(req, options) {
			this.#rawRequest = req;
			if (options) {
				this.#executionCtx = options.executionCtx;
				this.env = options.env;
				this.#notFoundHandler = options.notFoundHandler;
				this.#path = options.path;
				this.#matchResult = options.matchResult;
			}
		}
		/**
		 * `.req` is the instance of {@link HonoRequest}.
		 */
		get req() {
			this.#req ??= new HonoRequest(
				this.#rawRequest,
				this.#path,
				this.#matchResult,
			);
			return this.#req;
		}
		/**
		 * @see {@link https://hono.dev/docs/api/context#event}
		 * The FetchEvent associated with the current request.
		 *
		 * @throws Will throw an error if the context does not have a FetchEvent.
		 */
		get event() {
			if (this.#executionCtx && "respondWith" in this.#executionCtx) {
				return this.#executionCtx;
			} else {
				throw Error("This context has no FetchEvent");
			}
		}
		/**
		 * @see {@link https://hono.dev/docs/api/context#executionctx}
		 * The ExecutionContext associated with the current request.
		 *
		 * @throws Will throw an error if the context does not have an ExecutionContext.
		 */
		get executionCtx() {
			if (this.#executionCtx) {
				return this.#executionCtx;
			} else {
				throw Error("This context has no ExecutionContext");
			}
		}
		/**
		 * @see {@link https://hono.dev/docs/api/context#res}
		 * The Response object for the current request.
		 */
		get res() {
			return (this.#res ||= new Response(null, {
				headers: (this.#preparedHeaders ??= new Headers()),
			}));
		}
		/**
		 * Sets the Response object for the current request.
		 *
		 * @param _res - The Response object to set.
		 */
		set res(_res) {
			if (this.#res && _res) {
				_res = new Response(_res.body, _res);
				for (const [k, v] of this.#res.headers.entries()) {
					if (k === "content-type") {
						continue;
					}
					if (k === "set-cookie") {
						const cookies = this.#res.headers.getSetCookie();
						_res.headers.delete("set-cookie");
						for (const cookie of cookies) {
							_res.headers.append("set-cookie", cookie);
						}
					} else {
						_res.headers.set(k, v);
					}
				}
			}
			this.#res = _res;
			this.finalized = true;
		}
		/**
		 * `.render()` can create a response within a layout.
		 *
		 * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
		 *
		 * @example
		 * ```ts
		 * app.get('/', (c) => {
		 *   return c.render('Hello!')
		 * })
		 * ```
		 */
		render = (...args) => {
			this.#renderer ??= (content) => this.html(content);
			return this.#renderer(...args);
		};
		/**
		 * Sets the layout for the response.
		 *
		 * @param layout - The layout to set.
		 * @returns The layout function.
		 */
		setLayout = (layout) => (this.#layout = layout);
		/**
		 * Gets the current layout for the response.
		 *
		 * @returns The current layout function.
		 */
		getLayout = () => this.#layout;
		/**
		 * `.setRenderer()` can set the layout in the custom middleware.
		 *
		 * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
		 *
		 * @example
		 * ```tsx
		 * app.use('*', async (c, next) => {
		 *   c.setRenderer((content) => {
		 *     return c.html(
		 *       <html>
		 *         <body>
		 *           <p>{content}</p>
		 *         </body>
		 *       </html>
		 *     )
		 *   })
		 *   await next()
		 * })
		 * ```
		 */
		setRenderer = (renderer) => {
			this.#renderer = renderer;
		};
		/**
		 * `.header()` can set headers.
		 *
		 * @see {@link https://hono.dev/docs/api/context#header}
		 *
		 * @example
		 * ```ts
		 * app.get('/welcome', (c) => {
		 *   // Set headers
		 *   c.header('X-Message', 'Hello!')
		 *   c.header('Content-Type', 'text/plain')
		 *
		 *   return c.body('Thank you for coming')
		 * })
		 * ```
		 */
		header = (name, value, options) => {
			if (this.finalized) {
				this.#res = new Response(this.#res.body, this.#res);
			}
			const headers = this.#res
				? this.#res.headers
				: (this.#preparedHeaders ??= new Headers());
			if (value === void 0) {
				headers.delete(name);
			} else if (options?.append) {
				headers.append(name, value);
			} else {
				headers.set(name, value);
			}
		};
		status = (status) => {
			this.#status = status;
		};
		/**
		 * `.set()` can set the value specified by the key.
		 *
		 * @see {@link https://hono.dev/docs/api/context#set-get}
		 *
		 * @example
		 * ```ts
		 * app.use('*', async (c, next) => {
		 *   c.set('message', 'Hono is hot!!')
		 *   await next()
		 * })
		 * ```
		 */
		set = (key, value) => {
			this.#var ??= /* @__PURE__ */ new Map();
			this.#var.set(key, value);
		};
		/**
		 * `.get()` can use the value specified by the key.
		 *
		 * @see {@link https://hono.dev/docs/api/context#set-get}
		 *
		 * @example
		 * ```ts
		 * app.get('/', (c) => {
		 *   const message = c.get('message')
		 *   return c.text(`The message is "${message}"`)
		 * })
		 * ```
		 */
		get = (key) => {
			return this.#var ? this.#var.get(key) : void 0;
		};
		/**
		 * `.var` can access the value of a variable.
		 *
		 * @see {@link https://hono.dev/docs/api/context#var}
		 *
		 * @example
		 * ```ts
		 * const result = c.var.client.oneMethod()
		 * ```
		 */
		// c.var.propName is a read-only
		get var() {
			if (!this.#var) {
				return {};
			}
			return Object.fromEntries(this.#var);
		}
		#newResponse(data, arg, headers) {
			const responseHeaders = this.#res
				? new Headers(this.#res.headers)
				: (this.#preparedHeaders ?? new Headers());
			if (typeof arg === "object" && "headers" in arg) {
				const argHeaders =
					arg.headers instanceof Headers
						? arg.headers
						: new Headers(arg.headers);
				for (const [key, value] of argHeaders) {
					if (key.toLowerCase() === "set-cookie") {
						responseHeaders.append(key, value);
					} else {
						responseHeaders.set(key, value);
					}
				}
			}
			if (headers) {
				for (const [k, v] of Object.entries(headers)) {
					if (typeof v === "string") {
						responseHeaders.set(k, v);
					} else {
						responseHeaders.delete(k);
						for (const v2 of v) {
							responseHeaders.append(k, v2);
						}
					}
				}
			}
			const status =
				typeof arg === "number" ? arg : (arg?.status ?? this.#status);
			return new Response(data, { status, headers: responseHeaders });
		}
		newResponse = (...args) => this.#newResponse(...args);
		/**
		 * `.body()` can return the HTTP response.
		 * You can set headers with `.header()` and set HTTP status code with `.status`.
		 * This can also be set in `.text()`, `.json()` and so on.
		 *
		 * @see {@link https://hono.dev/docs/api/context#body}
		 *
		 * @example
		 * ```ts
		 * app.get('/welcome', (c) => {
		 *   // Set headers
		 *   c.header('X-Message', 'Hello!')
		 *   c.header('Content-Type', 'text/plain')
		 *   // Set HTTP status code
		 *   c.status(201)
		 *
		 *   // Return the response body
		 *   return c.body('Thank you for coming')
		 * })
		 * ```
		 */
		body = (data, arg, headers) => this.#newResponse(data, arg, headers);
		/**
		 * `.text()` can render text as `Content-Type:text/plain`.
		 *
		 * @see {@link https://hono.dev/docs/api/context#text}
		 *
		 * @example
		 * ```ts
		 * app.get('/say', (c) => {
		 *   return c.text('Hello!')
		 * })
		 * ```
		 */
		text = (text, arg, headers) => {
			return !this.#preparedHeaders &&
				!this.#status &&
				!arg &&
				!headers &&
				!this.finalized
				? new Response(text)
				: this.#newResponse(
						text,
						arg,
						setDefaultContentType(TEXT_PLAIN, headers),
					);
		};
		/**
		 * `.json()` can render JSON as `Content-Type:application/json`.
		 *
		 * @see {@link https://hono.dev/docs/api/context#json}
		 *
		 * @example
		 * ```ts
		 * app.get('/api', (c) => {
		 *   return c.json({ message: 'Hello!' })
		 * })
		 * ```
		 */
		json = (object, arg, headers) => {
			return this.#newResponse(
				JSON.stringify(object),
				arg,
				setDefaultContentType("application/json", headers),
			);
		};
		html = (html, arg, headers) => {
			const res = /* @__PURE__ */ __name(
				(html2) =>
					this.#newResponse(
						html2,
						arg,
						setDefaultContentType("text/html; charset=UTF-8", headers),
					),
				"res",
			);
			return typeof html === "object"
				? resolveCallback(
						html,
						HtmlEscapedCallbackPhase.Stringify,
						false,
						{},
					).then(res)
				: res(html);
		};
		/**
		 * `.redirect()` can Redirect, default status code is 302.
		 *
		 * @see {@link https://hono.dev/docs/api/context#redirect}
		 *
		 * @example
		 * ```ts
		 * app.get('/redirect', (c) => {
		 *   return c.redirect('/')
		 * })
		 * app.get('/redirect-permanently', (c) => {
		 *   return c.redirect('/', 301)
		 * })
		 * ```
		 */
		redirect = (location, status) => {
			const locationString = String(location);
			this.header(
				"Location",
				// Multibyes should be encoded
				// eslint-disable-next-line no-control-regex
				!/[^\x00-\xFF]/.test(locationString)
					? locationString
					: encodeURI(locationString),
			);
			return this.newResponse(null, status ?? 302);
		};
		/**
		 * `.notFound()` can return the Not Found Response.
		 *
		 * @see {@link https://hono.dev/docs/api/context#notfound}
		 *
		 * @example
		 * ```ts
		 * app.get('/notfound', (c) => {
		 *   return c.notFound()
		 * })
		 * ```
		 */
		notFound = () => {
			this.#notFoundHandler ??= () => new Response();
			return this.#notFoundHandler(this);
		};
	},
	"Context",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT =
	"Can not add a route since the matcher is already built.";
var UnsupportedPathError = /* @__PURE__ */ __name(
	class extends Error {},
	"UnsupportedPathError",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
	return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
	if ("getResponse" in err) {
		const res = err.getResponse();
		return c.newResponse(res.body, res);
	}
	console.error(err);
	return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = /* @__PURE__ */ __name(
	class _Hono {
		get;
		post;
		put;
		delete;
		options;
		patch;
		all;
		on;
		use;
		/*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
		router;
		getPath;
		// Cannot use `#` because it requires visibility at JavaScript runtime.
		_basePath = "/";
		#path = "/";
		routes = [];
		constructor(options = {}) {
			const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
			allMethods.forEach((method) => {
				this[method] = (args1, ...args) => {
					if (typeof args1 === "string") {
						this.#path = args1;
					} else {
						this.#addRoute(method, this.#path, args1);
					}
					args.forEach((handler) => {
						this.#addRoute(method, this.#path, handler);
					});
					return this;
				};
			});
			this.on = (method, path, ...handlers) => {
				for (const p of [path].flat()) {
					this.#path = p;
					for (const m of [method].flat()) {
						handlers.map((handler) => {
							this.#addRoute(m.toUpperCase(), this.#path, handler);
						});
					}
				}
				return this;
			};
			this.use = (arg1, ...handlers) => {
				if (typeof arg1 === "string") {
					this.#path = arg1;
				} else {
					this.#path = "*";
					handlers.unshift(arg1);
				}
				handlers.forEach((handler) => {
					this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
				});
				return this;
			};
			const { strict, ...optionsWithoutStrict } = options;
			Object.assign(this, optionsWithoutStrict);
			this.getPath =
				(strict ?? true) ? (options.getPath ?? getPath) : getPathNoStrict;
		}
		#clone() {
			const clone = new _Hono({
				router: this.router,
				getPath: this.getPath,
			});
			clone.errorHandler = this.errorHandler;
			clone.#notFoundHandler = this.#notFoundHandler;
			clone.routes = this.routes;
			return clone;
		}
		#notFoundHandler = notFoundHandler;
		// Cannot use `#` because it requires visibility at JavaScript runtime.
		errorHandler = errorHandler;
		/**
		 * `.route()` allows grouping other Hono instance in routes.
		 *
		 * @see {@link https://hono.dev/docs/api/routing#grouping}
		 *
		 * @param {string} path - base Path
		 * @param {Hono} app - other Hono instance
		 * @returns {Hono} routed Hono instance
		 *
		 * @example
		 * ```ts
		 * const app = new Hono()
		 * const app2 = new Hono()
		 *
		 * app2.get("/user", (c) => c.text("user"))
		 * app.route("/api", app2) // GET /api/user
		 * ```
		 */
		route(path, app2) {
			const subApp = this.basePath(path);
			app2.routes.map((r) => {
				let handler;
				if (app2.errorHandler === errorHandler) {
					handler = r.handler;
				} else {
					handler = /* @__PURE__ */ __name(
						async (c, next) =>
							(
								await compose([], app2.errorHandler)(c, () =>
									r.handler(c, next),
								)
							).res,
						"handler",
					);
					handler[COMPOSED_HANDLER] = r.handler;
				}
				subApp.#addRoute(r.method, r.path, handler);
			});
			return this;
		}
		/**
		 * `.basePath()` allows base paths to be specified.
		 *
		 * @see {@link https://hono.dev/docs/api/routing#base-path}
		 *
		 * @param {string} path - base Path
		 * @returns {Hono} changed Hono instance
		 *
		 * @example
		 * ```ts
		 * const api = new Hono().basePath('/api')
		 * ```
		 */
		basePath(path) {
			const subApp = this.#clone();
			subApp._basePath = mergePath(this._basePath, path);
			return subApp;
		}
		/**
		 * `.onError()` handles an error and returns a customized Response.
		 *
		 * @see {@link https://hono.dev/docs/api/hono#error-handling}
		 *
		 * @param {ErrorHandler} handler - request Handler for error
		 * @returns {Hono} changed Hono instance
		 *
		 * @example
		 * ```ts
		 * app.onError((err, c) => {
		 *   console.error(`${err}`)
		 *   return c.text('Custom Error Message', 500)
		 * })
		 * ```
		 */
		onError = (handler) => {
			this.errorHandler = handler;
			return this;
		};
		/**
		 * `.notFound()` allows you to customize a Not Found Response.
		 *
		 * @see {@link https://hono.dev/docs/api/hono#not-found}
		 *
		 * @param {NotFoundHandler} handler - request handler for not-found
		 * @returns {Hono} changed Hono instance
		 *
		 * @example
		 * ```ts
		 * app.notFound((c) => {
		 *   return c.text('Custom 404 Message', 404)
		 * })
		 * ```
		 */
		notFound = (handler) => {
			this.#notFoundHandler = handler;
			return this;
		};
		/**
		 * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
		 *
		 * @see {@link https://hono.dev/docs/api/hono#mount}
		 *
		 * @param {string} path - base Path
		 * @param {Function} applicationHandler - other Request Handler
		 * @param {MountOptions} [options] - options of `.mount()`
		 * @returns {Hono} mounted Hono instance
		 *
		 * @example
		 * ```ts
		 * import { Router as IttyRouter } from 'itty-router'
		 * import { Hono } from 'hono'
		 * // Create itty-router application
		 * const ittyRouter = IttyRouter()
		 * // GET /itty-router/hello
		 * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
		 *
		 * const app = new Hono()
		 * app.mount('/itty-router', ittyRouter.handle)
		 * ```
		 *
		 * @example
		 * ```ts
		 * const app = new Hono()
		 * // Send the request to another application without modification.
		 * app.mount('/app', anotherApp, {
		 *   replaceRequest: (req) => req,
		 * })
		 * ```
		 */
		mount(path, applicationHandler, options) {
			let replaceRequest;
			let optionHandler;
			if (options) {
				if (typeof options === "function") {
					optionHandler = options;
				} else {
					optionHandler = options.optionHandler;
					if (options.replaceRequest === false) {
						replaceRequest = /* @__PURE__ */ __name(
							(request) => request,
							"replaceRequest",
						);
					} else {
						replaceRequest = options.replaceRequest;
					}
				}
			}
			const getOptions = optionHandler
				? (c) => {
						const options2 = optionHandler(c);
						return Array.isArray(options2) ? options2 : [options2];
					}
				: (c) => {
						let executionContext = void 0;
						try {
							executionContext = c.executionCtx;
						} catch {}
						return [c.env, executionContext];
					};
			replaceRequest ||= (() => {
				const mergedPath = mergePath(this._basePath, path);
				const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
				return (request) => {
					const url = new URL(request.url);
					url.pathname = url.pathname.slice(pathPrefixLength) || "/";
					return new Request(url, request);
				};
			})();
			const handler = /* @__PURE__ */ __name(async (c, next) => {
				const res = await applicationHandler(
					replaceRequest(c.req.raw),
					...getOptions(c),
				);
				if (res) {
					return res;
				}
				await next();
			}, "handler");
			this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
			return this;
		}
		#addRoute(method, path, handler) {
			method = method.toUpperCase();
			path = mergePath(this._basePath, path);
			const r = { basePath: this._basePath, path, method, handler };
			this.router.add(method, path, [handler, r]);
			this.routes.push(r);
		}
		#handleError(err, c) {
			if (err instanceof Error) {
				return this.errorHandler(err, c);
			}
			throw err;
		}
		#dispatch(request, executionCtx, env, method) {
			if (method === "HEAD") {
				return (async () =>
					new Response(
						null,
						await this.#dispatch(request, executionCtx, env, "GET"),
					))();
			}
			const path = this.getPath(request, { env });
			const matchResult = this.router.match(method, path);
			const c = new Context(request, {
				path,
				matchResult,
				env,
				executionCtx,
				notFoundHandler: this.#notFoundHandler,
			});
			if (matchResult[0].length === 1) {
				let res;
				try {
					res = matchResult[0][0][0][0](c, async () => {
						c.res = await this.#notFoundHandler(c);
					});
				} catch (err) {
					return this.#handleError(err, c);
				}
				return res instanceof Promise
					? res
							.then(
								(resolved) =>
									resolved || (c.finalized ? c.res : this.#notFoundHandler(c)),
							)
							.catch((err) => this.#handleError(err, c))
					: (res ?? this.#notFoundHandler(c));
			}
			const composed = compose(
				matchResult[0],
				this.errorHandler,
				this.#notFoundHandler,
			);
			return (async () => {
				try {
					const context = await composed(c);
					if (!context.finalized) {
						throw new Error(
							"Context is not finalized. Did you forget to return a Response object or `await next()`?",
						);
					}
					return context.res;
				} catch (err) {
					return this.#handleError(err, c);
				}
			})();
		}
		/**
		 * `.fetch()` will be entry point of your app.
		 *
		 * @see {@link https://hono.dev/docs/api/hono#fetch}
		 *
		 * @param {Request} request - request Object of request
		 * @param {Env} Env - env Object
		 * @param {ExecutionContext} - context of execution
		 * @returns {Response | Promise<Response>} response of request
		 *
		 */
		fetch = (request, ...rest) => {
			return this.#dispatch(request, rest[1], rest[0], request.method);
		};
		/**
		 * `.request()` is a useful method for testing.
		 * You can pass a URL or pathname to send a GET request.
		 * app will return a Response object.
		 * ```ts
		 * test('GET /hello is ok', async () => {
		 *   const res = await app.request('/hello')
		 *   expect(res.status).toBe(200)
		 * })
		 * ```
		 * @see https://hono.dev/docs/api/hono#request
		 */
		request = (input, requestInit, Env, executionCtx) => {
			if (input instanceof Request) {
				return this.fetch(
					requestInit ? new Request(input, requestInit) : input,
					Env,
					executionCtx,
				);
			}
			input = input.toString();
			return this.fetch(
				new Request(
					/^https?:\/\//.test(input)
						? input
						: `http://localhost${mergePath("/", input)}`,
					requestInit,
				),
				Env,
				executionCtx,
			);
		};
		/**
		 * `.fire()` automatically adds a global fetch event listener.
		 * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
		 * @deprecated
		 * Use `fire` from `hono/service-worker` instead.
		 * ```ts
		 * import { Hono } from 'hono'
		 * import { fire } from 'hono/service-worker'
		 *
		 * const app = new Hono()
		 * // ...
		 * fire(app)
		 * ```
		 * @see https://hono.dev/docs/api/hono#fire
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
		 * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
		 */
		fire = () => {
			addEventListener("fetch", (event) => {
				event.respondWith(
					this.#dispatch(event.request, event, void 0, event.request.method),
				);
			});
		};
	},
	"_Hono",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
	const matchers = this.buildAllMatchers();
	const match2 = /* @__PURE__ */ __name((method2, path2) => {
		const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
		const staticMatch = matcher[2][path2];
		if (staticMatch) {
			return staticMatch;
		}
		const match3 = path2.match(matcher[0]);
		if (!match3) {
			return [[], emptyParam];
		}
		const index = match3.indexOf("", 1);
		return [matcher[1][index], match3];
	}, "match2");
	this.match = match2;
	return match2(method, path);
}
__name(match, "match");

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
	if (a.length === 1) {
		return b.length === 1 ? (a < b ? -1 : 1) : -1;
	}
	if (b.length === 1) {
		return 1;
	}
	if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
		return 1;
	} else if (
		b === ONLY_WILDCARD_REG_EXP_STR ||
		b === TAIL_WILDCARD_REG_EXP_STR
	) {
		return -1;
	}
	if (a === LABEL_REG_EXP_STR) {
		return 1;
	} else if (b === LABEL_REG_EXP_STR) {
		return -1;
	}
	return a.length === b.length ? (a < b ? -1 : 1) : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = /* @__PURE__ */ __name(
	class _Node {
		#index;
		#varIndex;
		#children = /* @__PURE__ */ Object.create(null);
		insert(tokens2, index, paramMap, context, pathErrorCheckOnly) {
			if (tokens2.length === 0) {
				if (this.#index !== void 0) {
					throw PATH_ERROR;
				}
				if (pathErrorCheckOnly) {
					return;
				}
				this.#index = index;
				return;
			}
			const [token, ...restTokens] = tokens2;
			const pattern =
				token === "*"
					? restTokens.length === 0
						? ["", "", ONLY_WILDCARD_REG_EXP_STR]
						: ["", "", LABEL_REG_EXP_STR]
					: token === "/*"
						? ["", "", TAIL_WILDCARD_REG_EXP_STR]
						: token.match(/^:([^{}]+)(?:\{(.+)\})?$/);
			let node;
			if (pattern) {
				const name = pattern[1];
				let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
				if (name && pattern[2]) {
					if (regexpStr === ".*") {
						throw PATH_ERROR;
					}
					regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
					if (/\((?!\?:)/.test(regexpStr)) {
						throw PATH_ERROR;
					}
				}
				node = this.#children[regexpStr];
				if (!node) {
					if (
						Object.keys(this.#children).some(
							(k) =>
								k !== ONLY_WILDCARD_REG_EXP_STR &&
								k !== TAIL_WILDCARD_REG_EXP_STR,
						)
					) {
						throw PATH_ERROR;
					}
					if (pathErrorCheckOnly) {
						return;
					}
					node = this.#children[regexpStr] = new _Node();
					if (name !== "") {
						node.#varIndex = context.varIndex++;
					}
				}
				if (!pathErrorCheckOnly && name !== "") {
					paramMap.push([name, node.#varIndex]);
				}
			} else {
				node = this.#children[token];
				if (!node) {
					if (
						Object.keys(this.#children).some(
							(k) =>
								k.length > 1 &&
								k !== ONLY_WILDCARD_REG_EXP_STR &&
								k !== TAIL_WILDCARD_REG_EXP_STR,
						)
					) {
						throw PATH_ERROR;
					}
					if (pathErrorCheckOnly) {
						return;
					}
					node = this.#children[token] = new _Node();
				}
			}
			node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
		}
		buildRegExpStr() {
			const childKeys = Object.keys(this.#children).sort(compareKey);
			const strList = childKeys.map((k) => {
				const c = this.#children[k];
				return (
					(typeof c.#varIndex === "number"
						? `(${k})@${c.#varIndex}`
						: regExpMetaChars.has(k)
							? `\\${k}`
							: k) + c.buildRegExpStr()
				);
			});
			if (typeof this.#index === "number") {
				strList.unshift(`#${this.#index}`);
			}
			if (strList.length === 0) {
				return "";
			}
			if (strList.length === 1) {
				return strList[0];
			}
			return "(?:" + strList.join("|") + ")";
		}
	},
	"_Node",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = /* @__PURE__ */ __name(
	class {
		#context = { varIndex: 0 };
		#root = new Node();
		insert(path, index, pathErrorCheckOnly) {
			const paramAssoc = [];
			const groups2 = [];
			for (let i = 0; ; ) {
				let replaced = false;
				path = path.replace(/\{[^}]+\}/g, (m) => {
					const mark = `@\\${i}`;
					groups2[i] = [mark, m];
					i++;
					replaced = true;
					return mark;
				});
				if (!replaced) {
					break;
				}
			}
			const tokens2 = path.match(/(?::[^/]+)|(?:\/\*$)|./g) || [];
			for (let i = groups2.length - 1; i >= 0; i--) {
				const [mark] = groups2[i];
				for (let j = tokens2.length - 1; j >= 0; j--) {
					if (tokens2[j].indexOf(mark) !== -1) {
						tokens2[j] = tokens2[j].replace(mark, groups2[i][1]);
						break;
					}
				}
			}
			this.#root.insert(
				tokens2,
				index,
				paramAssoc,
				this.#context,
				pathErrorCheckOnly,
			);
			return paramAssoc;
		}
		buildRegExp() {
			let regexp = this.#root.buildRegExpStr();
			if (regexp === "") {
				return [/^$/, [], []];
			}
			let captureIndex = 0;
			const indexReplacementMap = [];
			const paramReplacementMap = [];
			regexp = regexp.replace(
				/#(\d+)|@(\d+)|\.\*\$/g,
				(_, handlerIndex, paramIndex) => {
					if (handlerIndex !== void 0) {
						indexReplacementMap[++captureIndex] = Number(handlerIndex);
						return "$()";
					}
					if (paramIndex !== void 0) {
						paramReplacementMap[Number(paramIndex)] = ++captureIndex;
						return "";
					}
					return "";
				},
			);
			return [
				new RegExp(`^${regexp}`),
				indexReplacementMap,
				paramReplacementMap,
			];
		}
	},
	"Trie",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
	return (wildcardRegExpCache[path] ??= new RegExp(
		path === "*"
			? ""
			: `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) =>
					metaChar ? `\\${metaChar}` : "(?:|/.*)",
				)}$`,
	));
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
	wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
	const trie = new Trie();
	const handlerData = [];
	if (routes.length === 0) {
		return nullMatcher;
	}
	const routesWithStaticPathFlag = routes
		.map((route) => [!/\*|\/:/.test(route[0]), ...route])
		.sort(([isStaticA, pathA], [isStaticB, pathB]) =>
			isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length,
		);
	const staticMap = /* @__PURE__ */ Object.create(null);
	for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
		const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
		if (pathErrorCheckOnly) {
			staticMap[path] = [
				handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]),
				emptyParam,
			];
		} else {
			j++;
		}
		let paramAssoc;
		try {
			paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
		} catch (e) {
			throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
		}
		if (pathErrorCheckOnly) {
			continue;
		}
		handlerData[j] = handlers.map(([h, paramCount]) => {
			const paramIndexMap = /* @__PURE__ */ Object.create(null);
			paramCount -= 1;
			for (; paramCount >= 0; paramCount--) {
				const [key, value] = paramAssoc[paramCount];
				paramIndexMap[key] = value;
			}
			return [h, paramIndexMap];
		});
	}
	const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
	for (let i = 0, len = handlerData.length; i < len; i++) {
		for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
			const map = handlerData[i][j]?.[1];
			if (!map) {
				continue;
			}
			const keys = Object.keys(map);
			for (let k = 0, len3 = keys.length; k < len3; k++) {
				map[keys[k]] = paramReplacementMap[map[keys[k]]];
			}
		}
	}
	const handlerMap = [];
	for (const i in indexReplacementMap) {
		handlerMap[i] = handlerData[indexReplacementMap[i]];
	}
	return [regexp, handlerMap, staticMap];
}
__name(
	buildMatcherFromPreprocessedRoutes,
	"buildMatcherFromPreprocessedRoutes",
);
function findMiddleware(middleware, path) {
	if (!middleware) {
		return void 0;
	}
	for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
		if (buildWildcardRegExp(k).test(path)) {
			return [...middleware[k]];
		}
	}
	return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = /* @__PURE__ */ __name(
	class {
		name = "RegExpRouter";
		#middleware;
		#routes;
		constructor() {
			this.#middleware = {
				[METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null),
			};
			this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
		}
		add(method, path, handler) {
			const middleware = this.#middleware;
			const routes = this.#routes;
			if (!middleware || !routes) {
				throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
			}
			if (!middleware[method]) {
				[middleware, routes].forEach((handlerMap) => {
					handlerMap[method] = /* @__PURE__ */ Object.create(null);
					Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
						handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
					});
				});
			}
			if (path === "/*") {
				path = "*";
			}
			const paramCount = (path.match(/\/:/g) || []).length;
			if (/\*$/.test(path)) {
				const re = buildWildcardRegExp(path);
				if (method === METHOD_NAME_ALL) {
					Object.keys(middleware).forEach((m) => {
						middleware[m][path] ||=
							findMiddleware(middleware[m], path) ||
							findMiddleware(middleware[METHOD_NAME_ALL], path) ||
							[];
					});
				} else {
					middleware[method][path] ||=
						findMiddleware(middleware[method], path) ||
						findMiddleware(middleware[METHOD_NAME_ALL], path) ||
						[];
				}
				Object.keys(middleware).forEach((m) => {
					if (method === METHOD_NAME_ALL || method === m) {
						Object.keys(middleware[m]).forEach((p) => {
							re.test(p) && middleware[m][p].push([handler, paramCount]);
						});
					}
				});
				Object.keys(routes).forEach((m) => {
					if (method === METHOD_NAME_ALL || method === m) {
						Object.keys(routes[m]).forEach(
							(p) => re.test(p) && routes[m][p].push([handler, paramCount]),
						);
					}
				});
				return;
			}
			const paths = checkOptionalParameter(path) || [path];
			for (let i = 0, len = paths.length; i < len; i++) {
				const path2 = paths[i];
				Object.keys(routes).forEach((m) => {
					if (method === METHOD_NAME_ALL || method === m) {
						routes[m][path2] ||= [
							...(findMiddleware(middleware[m], path2) ||
								findMiddleware(middleware[METHOD_NAME_ALL], path2) ||
								[]),
						];
						routes[m][path2].push([handler, paramCount - len + i + 1]);
					}
				});
			}
		}
		match = match;
		buildAllMatchers() {
			const matchers = /* @__PURE__ */ Object.create(null);
			Object.keys(this.#routes)
				.concat(Object.keys(this.#middleware))
				.forEach((method) => {
					matchers[method] ||= this.#buildMatcher(method);
				});
			this.#middleware = this.#routes = void 0;
			clearWildcardRegExpCache();
			return matchers;
		}
		#buildMatcher(method) {
			const routes = [];
			let hasOwnRoute = method === METHOD_NAME_ALL;
			[this.#middleware, this.#routes].forEach((r) => {
				const ownRoute = r[method]
					? Object.keys(r[method]).map((path) => [path, r[method][path]])
					: [];
				if (ownRoute.length !== 0) {
					hasOwnRoute ||= true;
					routes.push(...ownRoute);
				} else if (method !== METHOD_NAME_ALL) {
					routes.push(
						...Object.keys(r[METHOD_NAME_ALL]).map((path) => [
							path,
							r[METHOD_NAME_ALL][path],
						]),
					);
				}
			});
			if (!hasOwnRoute) {
				return null;
			} else {
				return buildMatcherFromPreprocessedRoutes(routes);
			}
		}
	},
	"RegExpRouter",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = /* @__PURE__ */ __name(
	class {
		name = "SmartRouter";
		#routers = [];
		#routes = [];
		constructor(init) {
			this.#routers = init.routers;
		}
		add(method, path, handler) {
			if (!this.#routes) {
				throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
			}
			this.#routes.push([method, path, handler]);
		}
		match(method, path) {
			if (!this.#routes) {
				throw new Error("Fatal error");
			}
			const routers = this.#routers;
			const routes = this.#routes;
			const len = routers.length;
			let i = 0;
			let res;
			for (; i < len; i++) {
				const router = routers[i];
				try {
					for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
						router.add(...routes[i2]);
					}
					res = router.match(method, path);
				} catch (e) {
					if (e instanceof UnsupportedPathError) {
						continue;
					}
					throw e;
				}
				this.match = router.match.bind(router);
				this.#routers = [router];
				this.#routes = void 0;
				break;
			}
			if (i === len) {
				throw new Error("Fatal error");
			}
			this.name = `SmartRouter + ${this.activeRouter.name}`;
			return res;
		}
		get activeRouter() {
			if (this.#routes || this.#routers.length !== 1) {
				throw new Error("No active router has been determined yet.");
			}
			return this.#routers[0];
		}
	},
	"SmartRouter",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = /* @__PURE__ */ __name(
	class _Node2 {
		#methods;
		#children;
		#patterns;
		#order = 0;
		#params = emptyParams;
		constructor(method, handler, children) {
			this.#children = children || /* @__PURE__ */ Object.create(null);
			this.#methods = [];
			if (method && handler) {
				const m = /* @__PURE__ */ Object.create(null);
				m[method] = { handler, possibleKeys: [], score: 0 };
				this.#methods = [m];
			}
			this.#patterns = [];
		}
		insert(method, path, handler) {
			this.#order = ++this.#order;
			let curNode = this;
			const parts = splitRoutingPath(path);
			const possibleKeys = [];
			for (let i = 0, len = parts.length; i < len; i++) {
				const p = parts[i];
				const nextP = parts[i + 1];
				const pattern = getPattern(p, nextP);
				const key = Array.isArray(pattern) ? pattern[0] : p;
				if (key in curNode.#children) {
					curNode = curNode.#children[key];
					if (pattern) {
						possibleKeys.push(pattern[1]);
					}
					continue;
				}
				curNode.#children[key] = new _Node2();
				if (pattern) {
					curNode.#patterns.push(pattern);
					possibleKeys.push(pattern[1]);
				}
				curNode = curNode.#children[key];
			}
			curNode.#methods.push({
				[method]: {
					handler,
					possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
					score: this.#order,
				},
			});
			return curNode;
		}
		#getHandlerSets(node, method, nodeParams, params) {
			const handlerSets = [];
			for (let i = 0, len = node.#methods.length; i < len; i++) {
				const m = node.#methods[i];
				const handlerSet = m[method] || m[METHOD_NAME_ALL];
				const processedSet = {};
				if (handlerSet !== void 0) {
					handlerSet.params = /* @__PURE__ */ Object.create(null);
					handlerSets.push(handlerSet);
					if (
						nodeParams !== emptyParams ||
						(params && params !== emptyParams)
					) {
						for (
							let i2 = 0, len2 = handlerSet.possibleKeys.length;
							i2 < len2;
							i2++
						) {
							const key = handlerSet.possibleKeys[i2];
							const processed = processedSet[handlerSet.score];
							handlerSet.params[key] =
								params?.[key] && !processed
									? params[key]
									: (nodeParams[key] ?? params?.[key]);
							processedSet[handlerSet.score] = true;
						}
					}
				}
			}
			return handlerSets;
		}
		search(method, path) {
			const handlerSets = [];
			this.#params = emptyParams;
			let curNodes = [this];
			const parts = splitPath(path);
			const curNodesQueue = [];
			for (let i = 0, len = parts.length; i < len; i++) {
				const part = parts[i];
				const isLast = i === len - 1;
				const tempNodes = [];
				for (let j = 0, len2 = curNodes.length; j < len2; j++) {
					const node = curNodes[j];
					const nextNode = node.#children[part];
					if (nextNode) {
						nextNode.#params = node.#params;
						if (isLast) {
							if (nextNode.#children["*"]) {
								handlerSets.push(
									...this.#getHandlerSets(
										nextNode.#children["*"],
										method,
										node.#params,
									),
								);
							}
							handlerSets.push(
								...this.#getHandlerSets(nextNode, method, node.#params),
							);
						} else {
							tempNodes.push(nextNode);
						}
					}
					for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
						const pattern = node.#patterns[k];
						const params =
							node.#params === emptyParams ? {} : { ...node.#params };
						if (pattern === "*") {
							const astNode = node.#children["*"];
							if (astNode) {
								handlerSets.push(
									...this.#getHandlerSets(astNode, method, node.#params),
								);
								astNode.#params = params;
								tempNodes.push(astNode);
							}
							continue;
						}
						const [key, name, matcher] = pattern;
						if (!part && !(matcher instanceof RegExp)) {
							continue;
						}
						const child = node.#children[key];
						const restPathString = parts.slice(i).join("/");
						if (matcher instanceof RegExp) {
							const m = matcher.exec(restPathString);
							if (m) {
								params[name] = m[0];
								handlerSets.push(
									...this.#getHandlerSets(child, method, node.#params, params),
								);
								if (Object.keys(child.#children).length) {
									child.#params = params;
									const componentCount = m[0].match(/\//)?.length ?? 0;
									const targetCurNodes = (curNodesQueue[componentCount] ||= []);
									targetCurNodes.push(child);
								}
								continue;
							}
						}
						if (matcher === true || matcher.test(part)) {
							params[name] = part;
							if (isLast) {
								handlerSets.push(
									...this.#getHandlerSets(child, method, params, node.#params),
								);
								if (child.#children["*"]) {
									handlerSets.push(
										...this.#getHandlerSets(
											child.#children["*"],
											method,
											params,
											node.#params,
										),
									);
								}
							} else {
								child.#params = params;
								tempNodes.push(child);
							}
						}
					}
				}
				curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
			}
			if (handlerSets.length > 1) {
				handlerSets.sort((a, b) => {
					return a.score - b.score;
				});
			}
			return [handlerSets.map(({ handler, params }) => [handler, params])];
		}
	},
	"_Node",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = /* @__PURE__ */ __name(
	class {
		name = "TrieRouter";
		#node;
		constructor() {
			this.#node = new Node2();
		}
		add(method, path, handler) {
			const results = checkOptionalParameter(path);
			if (results) {
				for (let i = 0, len = results.length; i < len; i++) {
					this.#node.insert(method, results[i], handler);
				}
				return;
			}
			this.#node.insert(method, path, handler);
		}
		match(method, path) {
			return this.#node.search(method, path);
		}
	},
	"TrieRouter",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/hono.js
var Hono2 = /* @__PURE__ */ __name(
	class extends Hono {
		/**
		 * Creates an instance of the Hono class.
		 *
		 * @param options - Optional configuration options for the Hono instance.
		 */
		constructor(options = {}) {
			super(options);
			this.router =
				options.router ??
				new SmartRouter({
					routers: [new RegExpRouter(), new TrieRouter()],
				});
		}
	},
	"Hono",
);

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
	const defaults = {
		origin: "*",
		allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
		allowHeaders: [],
		exposeHeaders: [],
	};
	const opts = {
		...defaults,
		...options,
	};
	const findAllowOrigin = ((optsOrigin) => {
		if (typeof optsOrigin === "string") {
			if (optsOrigin === "*") {
				return () => optsOrigin;
			} else {
				return (origin) => (optsOrigin === origin ? origin : null);
			}
		} else if (typeof optsOrigin === "function") {
			return optsOrigin;
		} else {
			return (origin) => (optsOrigin.includes(origin) ? origin : null);
		}
	})(opts.origin);
	const findAllowMethods = ((optsAllowMethods) => {
		if (typeof optsAllowMethods === "function") {
			return optsAllowMethods;
		} else if (Array.isArray(optsAllowMethods)) {
			return () => optsAllowMethods;
		} else {
			return () => [];
		}
	})(opts.allowMethods);
	return /* @__PURE__ */ __name(async function cors2(c, next) {
		function set(key, value) {
			c.res.headers.set(key, value);
		}
		__name(set, "set");
		const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
		if (allowOrigin) {
			set("Access-Control-Allow-Origin", allowOrigin);
		}
		if (opts.credentials) {
			set("Access-Control-Allow-Credentials", "true");
		}
		if (opts.exposeHeaders?.length) {
			set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
		}
		if (c.req.method === "OPTIONS") {
			if (opts.origin !== "*") {
				set("Vary", "Origin");
			}
			if (opts.maxAge != null) {
				set("Access-Control-Max-Age", opts.maxAge.toString());
			}
			const allowMethods = await findAllowMethods(
				c.req.header("origin") || "",
				c,
			);
			if (allowMethods.length) {
				set("Access-Control-Allow-Methods", allowMethods.join(","));
			}
			let headers = opts.allowHeaders;
			if (!headers?.length) {
				const requestHeaders = c.req.header("Access-Control-Request-Headers");
				if (requestHeaders) {
					headers = requestHeaders.split(/\s*,\s*/);
				}
			}
			if (headers?.length) {
				set("Access-Control-Allow-Headers", headers.join(","));
				c.res.headers.append("Vary", "Access-Control-Request-Headers");
			}
			c.res.headers.delete("Content-Length");
			c.res.headers.delete("Content-Type");
			return new Response(null, {
				headers: c.res.headers,
				status: 204,
				statusText: "No Content",
			});
		}
		await next();
		if (opts.origin !== "*") {
			c.header("Vary", "Origin", { append: true });
		}
	}, "cors2");
}, "cors");

// ../../node_modules/.bun/hono@4.11.9/node_modules/hono/dist/helper/factory/index.js
var createMiddleware = /* @__PURE__ */ __name(
	(middleware) => middleware,
	"createMiddleware",
);

// src/utils/crypto.ts
var encoder = new TextEncoder();
async function sha256Hex(input) {
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function generateToken(prefix = "") {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	const base = btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `${prefix}${base}`;
}
__name(generateToken, "generateToken");

// src/utils/http.ts
function jsonError(c, status, message, code) {
	return c.json(
		{
			error: message,
			code,
		},
		status,
	);
}
__name(jsonError, "jsonError");

// src/utils/request.ts
function getBearerToken(c) {
	const auth2 = c.req.header("Authorization");
	if (auth2?.toLowerCase().startsWith("bearer ")) {
		return auth2.slice(7).trim();
	}
	return c.req.header("x-api-key") ?? c.req.header("x-admin-token") ?? null;
}
__name(getBearerToken, "getBearerToken");

// src/middleware/adminAuth.ts
var adminAuth = createMiddleware(async (c, next) => {
	const token = getBearerToken(c);
	if (!token) {
		return jsonError(c, 401, "admin_token_required", "admin_token_required");
	}
	const tokenHash = await sha256Hex(token);
	const session = await c.env.DB.prepare(
		"SELECT id, expires_at FROM admin_sessions WHERE token_hash = ?",
	)
		.bind(tokenHash)
		.first();
	if (!session) {
		return jsonError(c, 401, "invalid_admin_token", "invalid_admin_token");
	}
	if (new Date(String(session.expires_at)).getTime() <= Date.now()) {
		await c.env.DB.prepare("DELETE FROM admin_sessions WHERE id = ?")
			.bind(String(session.id))
			.run();
		return jsonError(c, 401, "admin_session_expired", "admin_session_expired");
	}
	c.set("adminSessionId", String(session.id));
	await next();
});

// src/utils/cache.ts
var CACHE_HEADER = "X-Cache";
var INTERNAL_CACHE_ORIGIN = "https://cache.internal";
function getCacheStorage() {
	const storage = globalThis.caches;
	return storage?.default ?? null;
}
__name(getCacheStorage, "getCacheStorage");
async function buildCacheKey(c, namespace, version) {
	const url = new URL(c.req.url);
	const token = getBearerToken(c);
	const authHash = token ? await sha256Hex(token) : "anonymous";
	const entries = Array.from(url.searchParams.entries());
	entries.push(["__cache_ns", namespace]);
	entries.push(["__cache_v", String(version)]);
	entries.push(["__cache_ah", authHash]);
	entries.sort((a, b) => {
		const keyCompare = a[0].localeCompare(b[0]);
		return keyCompare !== 0 ? keyCompare : a[1].localeCompare(b[1]);
	});
	url.search = new URLSearchParams(entries).toString();
	return new Request(url.toString(), { method: "GET" });
}
__name(buildCacheKey, "buildCacheKey");
function normalizeTtlSeconds(value) {
	if (!Number.isFinite(value) || value <= 0) {
		return 0;
	}
	return Math.floor(value);
}
__name(normalizeTtlSeconds, "normalizeTtlSeconds");
function buildInternalCacheRequest(namespace, key, version) {
	const safeKey = encodeURIComponent(key);
	const url = new URL(`${INTERNAL_CACHE_ORIGIN}/${namespace}/${safeKey}`);
	url.searchParams.set("v", String(version));
	return new Request(url.toString(), { method: "GET" });
}
__name(buildInternalCacheRequest, "buildInternalCacheRequest");
async function withJsonCache(options, loader) {
	const ttlSeconds = normalizeTtlSeconds(options.ttlSeconds);
	if (!options.enabled || ttlSeconds <= 0) {
		return loader();
	}
	const cache = getCacheStorage();
	if (!cache) {
		return loader();
	}
	const cacheKey = buildInternalCacheRequest(
		options.namespace,
		options.key,
		options.version,
	);
	const cached = await cache.match(cacheKey);
	if (cached) {
		return await cached.json();
	}
	const value = await loader();
	if (value !== null || options.cacheNull) {
		const headers = new Headers({ "Cache-Control": `max-age=${ttlSeconds}` });
		const response = new Response(JSON.stringify(value), { headers });
		await cache.put(cacheKey, response);
	}
	return value;
}
__name(withJsonCache, "withJsonCache");
async function withApiCache(c, options, handler) {
	const ttlSeconds = normalizeTtlSeconds(options.ttlSeconds);
	if (!options.enabled || ttlSeconds <= 0 || c.req.method !== "GET") {
		return handler();
	}
	const cache = getCacheStorage();
	if (!cache) {
		return handler();
	}
	const cacheKey = await buildCacheKey(c, options.namespace, options.version);
	const cached = await cache.match(cacheKey);
	if (cached) {
		const response2 = new Response(cached.body, cached);
		response2.headers.set(CACHE_HEADER, "HIT");
		return response2;
	}
	const response = await handler();
	if (!response.ok) {
		return response;
	}
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", `max-age=${ttlSeconds}`);
	headers.set(CACHE_HEADER, "MISS");
	const responseForClient = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
	await cache.put(cacheKey, responseForClient.clone());
	return responseForClient;
}
__name(withApiCache, "withApiCache");

// src/utils/time.ts
function nowIso() {
	return /* @__PURE__ */ new Date().toISOString();
}
__name(nowIso, "nowIso");
var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1e3;
var DEFAULT_SCHEDULE_TIME = "00:10";
function addHours(date, hours) {
	const copy = new Date(date.getTime());
	copy.setHours(copy.getHours() + hours);
	return copy;
}
__name(addHours, "addHours");
function beijingDateString(date = /* @__PURE__ */ new Date()) {
	const beijing = new Date(date.getTime() + BEIJING_OFFSET_MS);
	const year = beijing.getUTCFullYear();
	const month = String(beijing.getUTCMonth() + 1).padStart(2, "0");
	const day = String(beijing.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
__name(beijingDateString, "beijingDateString");
function parseScheduleTime(value) {
	if (!/^\d{2}:\d{2}$/.test(value)) {
		return null;
	}
	const [hour, minute] = value.split(":").map((part) => Number(part));
	if (
		Number.isNaN(hour) ||
		Number.isNaN(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null;
	}
	return { hour, minute };
}
__name(parseScheduleTime, "parseScheduleTime");
function getBeijingDateParts(date = /* @__PURE__ */ new Date()) {
	const beijing = new Date(date.getTime() + BEIJING_OFFSET_MS);
	return {
		year: beijing.getUTCFullYear(),
		month: beijing.getUTCMonth() + 1,
		day: beijing.getUTCDate(),
		hour: beijing.getUTCHours(),
		minute: beijing.getUTCMinutes(),
	};
}
__name(getBeijingDateParts, "getBeijingDateParts");
var DEFAULT_SCHEDULE_PARTS = parseScheduleTime(DEFAULT_SCHEDULE_TIME) ?? {
	hour: 0,
	minute: 10,
};
var resolveScheduleParts = /* @__PURE__ */ __name(
	(value) => parseScheduleTime(value) ?? DEFAULT_SCHEDULE_PARTS,
	"resolveScheduleParts",
);
function computeBeijingScheduleTime(now, scheduleTime) {
	const { year, month, day } = getBeijingDateParts(now);
	const { hour, minute } = resolveScheduleParts(scheduleTime);
	const utcMs =
		Date.UTC(year, month - 1, day, hour, minute, 0) - BEIJING_OFFSET_MS;
	return new Date(utcMs);
}
__name(computeBeijingScheduleTime, "computeBeijingScheduleTime");
function computeNextBeijingRun(now, scheduleTime) {
	const scheduled = computeBeijingScheduleTime(now, scheduleTime);
	if (now.getTime() < scheduled.getTime()) {
		return scheduled;
	}
	const { year, month, day } = getBeijingDateParts(now);
	const { hour, minute } = resolveScheduleParts(scheduleTime);
	const utcMs =
		Date.UTC(year, month - 1, day + 1, hour, minute, 0) - BEIJING_OFFSET_MS;
	return new Date(utcMs);
}
__name(computeNextBeijingRun, "computeNextBeijingRun");

// src/services/settings.ts
var DEFAULT_LOG_RETENTION_DAYS = 30;
var DEFAULT_SESSION_TTL_HOURS = 12;
var DEFAULT_CHECKIN_SCHEDULE_TIME = "00:10";
var DEFAULT_MODEL_FAILURE_COOLDOWN_MINUTES = 10;
var DEFAULT_PROXY_STREAM_USAGE_MODE = "full";
var DEFAULT_PROXY_STREAM_USAGE_MAX_BYTES = 0;
var DEFAULT_PROXY_STREAM_USAGE_MAX_PARSERS = 0;
var DEFAULT_CACHE_ENABLED = true;
var DEFAULT_CACHE_VERSION = 1;
var DEFAULT_CACHE_DASHBOARD_TTL_SECONDS = 30;
var DEFAULT_CACHE_USAGE_TTL_SECONDS = 15;
var DEFAULT_CACHE_MODELS_TTL_SECONDS = 60;
var DEFAULT_CACHE_TOKENS_TTL_SECONDS = 15;
var DEFAULT_CACHE_CHANNELS_TTL_SECONDS = 15;
var DEFAULT_CACHE_CALL_TOKENS_TTL_SECONDS = 15;
var DEFAULT_CACHE_SETTINGS_TTL_SECONDS = 30;
var DEFAULT_PROXY_UPSTREAM_TIMEOUT_MS = 3e4;
var DEFAULT_PROXY_RETRY_MAX_RETRIES = 3;
var DEFAULT_PROXY_USAGE_QUEUE_ENABLED = true;
var DEFAULT_USAGE_QUEUE_DAILY_LIMIT = 1e4;
var DEFAULT_USAGE_QUEUE_DIRECT_WRITE_RATIO = 0.5;
var CACHE_CONFIG_TTL_MS = 1e3;
var SETTING_SNAPSHOT_TTL_MS = 1e3;
var RETENTION_KEY = "log_retention_days";
var SESSION_TTL_KEY = "session_ttl_hours";
var ADMIN_PASSWORD_HASH_KEY = "admin_password_hash";
var CHECKIN_SCHEDULE_TIME_KEY = "checkin_schedule_time";
var MODEL_FAILURE_COOLDOWN_KEY = "model_failure_cooldown_minutes";
var CACHE_ENABLED_KEY = "cache_enabled";
var CACHE_DASHBOARD_TTL_KEY = "cache_ttl_dashboard_seconds";
var CACHE_USAGE_TTL_KEY = "cache_ttl_usage_seconds";
var CACHE_MODELS_TTL_KEY = "cache_ttl_models_seconds";
var CACHE_TOKENS_TTL_KEY = "cache_ttl_tokens_seconds";
var CACHE_CHANNELS_TTL_KEY = "cache_ttl_channels_seconds";
var CACHE_CALL_TOKENS_TTL_KEY = "cache_ttl_call_tokens_seconds";
var CACHE_SETTINGS_TTL_KEY = "cache_ttl_settings_seconds";
var CACHE_VERSION_DASHBOARD_KEY = "cache_v_dashboard";
var CACHE_VERSION_USAGE_KEY = "cache_v_usage";
var CACHE_VERSION_MODELS_KEY = "cache_v_models";
var CACHE_VERSION_TOKENS_KEY = "cache_v_tokens";
var CACHE_VERSION_CHANNELS_KEY = "cache_v_channels";
var CACHE_VERSION_CALL_TOKENS_KEY = "cache_v_call_tokens";
var CACHE_VERSION_SETTINGS_KEY = "cache_v_settings";
var PROXY_UPSTREAM_TIMEOUT_KEY = "proxy_upstream_timeout_ms";
var PROXY_RETRY_MAX_RETRIES_KEY = "proxy_retry_max_retries";
var PROXY_STREAM_USAGE_MODE_KEY = "proxy_stream_usage_mode";
var PROXY_STREAM_USAGE_MAX_BYTES_KEY = "proxy_stream_usage_max_bytes";
var PROXY_STREAM_USAGE_MAX_PARSERS_KEY = "proxy_stream_usage_max_parsers";
var PROXY_USAGE_QUEUE_ENABLED_KEY = "proxy_usage_queue_enabled";
var USAGE_QUEUE_DAILY_LIMIT_KEY = "usage_queue_daily_limit";
var USAGE_QUEUE_DIRECT_WRITE_RATIO_KEY = "usage_queue_direct_write_ratio";
var cacheConfigSnapshot = null;
var retentionSnapshot = null;
var sessionTtlSnapshot = null;
var adminPasswordSnapshot = null;
var checkinScheduleSnapshot = null;
var modelCooldownSnapshot = null;
var settingsCacheControlSnapshot = null;
var CACHE_VERSION_KEYS = {
	dashboard: CACHE_VERSION_DASHBOARD_KEY,
	usage: CACHE_VERSION_USAGE_KEY,
	models: CACHE_VERSION_MODELS_KEY,
	tokens: CACHE_VERSION_TOKENS_KEY,
	channels: CACHE_VERSION_CHANNELS_KEY,
	call_tokens: CACHE_VERSION_CALL_TOKENS_KEY,
	settings: CACHE_VERSION_SETTINGS_KEY,
};
async function readSetting(db, key) {
	const setting = await db
		.prepare("SELECT value FROM settings WHERE key = ?")
		.bind(key)
		.first();
	return setting?.value ? String(setting.value) : null;
}
__name(readSetting, "readSetting");
async function upsertSetting(db, key, value) {
	await db
		.prepare(
			"INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
		)
		.bind(key, value, nowIso())
		.run();
}
__name(upsertSetting, "upsertSetting");
function parsePositiveNumber(value, fallback) {
	if (!value) {
		return fallback;
	}
	const parsed = Number(value);
	if (!Number.isNaN(parsed) && parsed > 0) {
		return parsed;
	}
	return fallback;
}
__name(parsePositiveNumber, "parsePositiveNumber");
function parseNonNegativeSetting(value, fallback) {
	if (!value) {
		return fallback;
	}
	const parsed = Number(value);
	if (!Number.isNaN(parsed) && parsed >= 0) {
		return Math.floor(parsed);
	}
	return fallback;
}
__name(parseNonNegativeSetting, "parseNonNegativeSetting");
function parsePositiveSetting(value, fallback) {
	if (!value) {
		return fallback;
	}
	const parsed = Number(value);
	if (!Number.isNaN(parsed) && parsed > 0) {
		return Math.floor(parsed);
	}
	return fallback;
}
__name(parsePositiveSetting, "parsePositiveSetting");
function parseBooleanSetting(value, fallback) {
	if (value === null || value === void 0) {
		return fallback;
	}
	const normalized = value.trim().toLowerCase();
	if (["1", "true", "yes", "on"].includes(normalized)) {
		return true;
	}
	if (["0", "false", "no", "off"].includes(normalized)) {
		return false;
	}
	return fallback;
}
__name(parseBooleanSetting, "parseBooleanSetting");
function parseRatioSetting(value, fallback) {
	if (!value) {
		return fallback;
	}
	const parsed = Number(value);
	if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
		return Math.min(1, Math.max(0, parsed));
	}
	return fallback;
}
__name(parseRatioSetting, "parseRatioSetting");
async function getCachedSetting(snapshot, loader, onUpdate) {
	if (snapshot && snapshot.expiresAt > Date.now()) {
		return snapshot.value;
	}
	const value = await loader();
	onUpdate({
		value,
		expiresAt: Date.now() + SETTING_SNAPSHOT_TTL_MS,
	});
	return value;
}
__name(getCachedSetting, "getCachedSetting");
function setCacheConfigSnapshot(value) {
	cacheConfigSnapshot = {
		value,
		expiresAt: Date.now() + CACHE_CONFIG_TTL_MS,
	};
}
__name(setCacheConfigSnapshot, "setCacheConfigSnapshot");
function clearCacheConfigSnapshot() {
	cacheConfigSnapshot = null;
}
__name(clearCacheConfigSnapshot, "clearCacheConfigSnapshot");
function setSettingsCacheControlSnapshot(value) {
	settingsCacheControlSnapshot = {
		value,
		expiresAt: Date.now() + CACHE_CONFIG_TTL_MS,
	};
}
__name(setSettingsCacheControlSnapshot, "setSettingsCacheControlSnapshot");
function clearSettingsCacheControlSnapshot() {
	settingsCacheControlSnapshot = null;
}
__name(clearSettingsCacheControlSnapshot, "clearSettingsCacheControlSnapshot");
async function readCacheVersion(db, scope) {
	const key = CACHE_VERSION_KEYS[scope];
	const value = await readSetting(db, key);
	return parsePositiveSetting(value, DEFAULT_CACHE_VERSION);
}
__name(readCacheVersion, "readCacheVersion");
async function bumpCacheVersion(db, scope) {
	const key = CACHE_VERSION_KEYS[scope];
	await db
		.prepare(
			"INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = CAST(settings.value AS INTEGER) + 1, updated_at = excluded.updated_at",
		)
		.bind(key, String(DEFAULT_CACHE_VERSION + 1), nowIso())
		.run();
}
__name(bumpCacheVersion, "bumpCacheVersion");
async function bumpCacheVersions(db, scopes) {
	if (scopes.length === 0) {
		return;
	}
	await Promise.all(scopes.map((scope) => bumpCacheVersion(db, scope)));
	clearCacheConfigSnapshot();
	clearSettingsCacheControlSnapshot();
}
__name(bumpCacheVersions, "bumpCacheVersions");
function normalizeStreamUsageMode(value) {
	const normalized = (value ?? "").toLowerCase();
	if (normalized === "off" || normalized === "full" || normalized === "lite") {
		return normalized;
	}
	return DEFAULT_PROXY_STREAM_USAGE_MODE;
}
__name(normalizeStreamUsageMode, "normalizeStreamUsageMode");
async function getSettingsCacheControl(db) {
	const snapshot = settingsCacheControlSnapshot;
	if (snapshot && snapshot.expiresAt > Date.now()) {
		return snapshot.value;
	}
	const enabled = parseBooleanSetting(
		await readSetting(db, CACHE_ENABLED_KEY),
		DEFAULT_CACHE_ENABLED,
	);
	const ttlSeconds = parseNonNegativeSetting(
		await readSetting(db, CACHE_SETTINGS_TTL_KEY),
		DEFAULT_CACHE_SETTINGS_TTL_SECONDS,
	);
	const version = await readCacheVersion(db, "settings");
	const value = { enabled, ttlSeconds, version };
	setSettingsCacheControlSnapshot(value);
	return value;
}
__name(getSettingsCacheControl, "getSettingsCacheControl");
async function getSettingsSnapshot(db) {
	const control = await getSettingsCacheControl(db);
	return withJsonCache(
		{
			namespace: "settings",
			key: "all",
			version: control.version,
			ttlSeconds: control.ttlSeconds,
			enabled: control.enabled,
		},
		() => listSettings(db),
	);
}
__name(getSettingsSnapshot, "getSettingsSnapshot");
async function getProxyRuntimeSettings(db) {
	const settings2 = await getSettingsSnapshot(db);
	const upstreamTimeout = parsePositiveSetting(
		settings2[PROXY_UPSTREAM_TIMEOUT_KEY] ?? null,
		DEFAULT_PROXY_UPSTREAM_TIMEOUT_MS,
	);
	const retryMaxRetries = parseNonNegativeSetting(
		settings2[PROXY_RETRY_MAX_RETRIES_KEY] ?? null,
		DEFAULT_PROXY_RETRY_MAX_RETRIES,
	);
	const streamUsageMode = normalizeStreamUsageMode(
		settings2[PROXY_STREAM_USAGE_MODE_KEY],
	);
	const streamUsageMaxBytes = parseNonNegativeSetting(
		settings2[PROXY_STREAM_USAGE_MAX_BYTES_KEY] ?? null,
		DEFAULT_PROXY_STREAM_USAGE_MAX_BYTES,
	);
	const streamUsageMaxParsers = parseNonNegativeSetting(
		settings2[PROXY_STREAM_USAGE_MAX_PARSERS_KEY] ?? null,
		DEFAULT_PROXY_STREAM_USAGE_MAX_PARSERS,
	);
	const usageQueueEnabled = parseBooleanSetting(
		settings2[PROXY_USAGE_QUEUE_ENABLED_KEY] ?? null,
		DEFAULT_PROXY_USAGE_QUEUE_ENABLED,
	);
	const usageQueueDailyLimit = parseNonNegativeSetting(
		settings2[USAGE_QUEUE_DAILY_LIMIT_KEY] ?? null,
		DEFAULT_USAGE_QUEUE_DAILY_LIMIT,
	);
	const usageQueueDirectWriteRatio = parseRatioSetting(
		settings2[USAGE_QUEUE_DIRECT_WRITE_RATIO_KEY] ?? null,
		DEFAULT_USAGE_QUEUE_DIRECT_WRITE_RATIO,
	);
	return {
		upstream_timeout_ms: upstreamTimeout,
		retry_max_retries: retryMaxRetries,
		stream_usage_mode: streamUsageMode,
		stream_usage_max_bytes: streamUsageMaxBytes,
		stream_usage_max_parsers: streamUsageMaxParsers,
		usage_queue_enabled: usageQueueEnabled,
		usage_queue_daily_limit: usageQueueDailyLimit,
		usage_queue_direct_write_ratio: usageQueueDirectWriteRatio,
	};
}
__name(getProxyRuntimeSettings, "getProxyRuntimeSettings");
function getRuntimeProxyConfig(env, settings2) {
	const usageQueueBound = Boolean(env.USAGE_QUEUE);
	const usageQueueEnabled = settings2.usage_queue_enabled;
	return {
		...settings2,
		usage_queue_bound: usageQueueBound,
		usage_queue_active: usageQueueEnabled && usageQueueBound,
	};
}
__name(getRuntimeProxyConfig, "getRuntimeProxyConfig");
async function setProxyRuntimeSettings(db, update) {
	const tasks = [];
	if (update.upstream_timeout_ms !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				PROXY_UPSTREAM_TIMEOUT_KEY,
				String(Math.max(0, Math.floor(update.upstream_timeout_ms))),
			),
		);
	}
	if (update.retry_max_retries !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				PROXY_RETRY_MAX_RETRIES_KEY,
				String(Math.max(0, Math.floor(update.retry_max_retries))),
			),
		);
	}
	if (update.stream_usage_mode !== void 0) {
		tasks.push(
			upsertSetting(db, PROXY_STREAM_USAGE_MODE_KEY, update.stream_usage_mode),
		);
	}
	if (update.stream_usage_max_bytes !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				PROXY_STREAM_USAGE_MAX_BYTES_KEY,
				String(Math.max(0, Math.floor(update.stream_usage_max_bytes))),
			),
		);
	}
	if (update.stream_usage_max_parsers !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				PROXY_STREAM_USAGE_MAX_PARSERS_KEY,
				String(Math.max(0, Math.floor(update.stream_usage_max_parsers))),
			),
		);
	}
	if (update.usage_queue_enabled !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				PROXY_USAGE_QUEUE_ENABLED_KEY,
				update.usage_queue_enabled ? "1" : "0",
			),
		);
	}
	if (update.usage_queue_daily_limit !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				USAGE_QUEUE_DAILY_LIMIT_KEY,
				String(Math.max(0, Math.floor(update.usage_queue_daily_limit))),
			),
		);
	}
	if (update.usage_queue_direct_write_ratio !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				USAGE_QUEUE_DIRECT_WRITE_RATIO_KEY,
				String(update.usage_queue_direct_write_ratio),
			),
		);
	}
	if (tasks.length === 0) {
		return;
	}
	await Promise.all(tasks);
	await bumpCacheVersions(db, ["settings"]);
}
__name(setProxyRuntimeSettings, "setProxyRuntimeSettings");
async function getCacheConfig(db) {
	const snapshot = cacheConfigSnapshot;
	if (snapshot && snapshot.expiresAt > Date.now()) {
		return snapshot.value;
	}
	const settings2 = await getSettingsSnapshot(db);
	const enabled = parseBooleanSetting(
		settings2[CACHE_ENABLED_KEY] ?? null,
		DEFAULT_CACHE_ENABLED,
	);
	const dashboardTtl = parseNonNegativeSetting(
		settings2[CACHE_DASHBOARD_TTL_KEY] ?? null,
		DEFAULT_CACHE_DASHBOARD_TTL_SECONDS,
	);
	const usageTtl = parseNonNegativeSetting(
		settings2[CACHE_USAGE_TTL_KEY] ?? null,
		DEFAULT_CACHE_USAGE_TTL_SECONDS,
	);
	const modelsTtl = parseNonNegativeSetting(
		settings2[CACHE_MODELS_TTL_KEY] ?? null,
		DEFAULT_CACHE_MODELS_TTL_SECONDS,
	);
	const tokensTtl = parseNonNegativeSetting(
		settings2[CACHE_TOKENS_TTL_KEY] ?? null,
		DEFAULT_CACHE_TOKENS_TTL_SECONDS,
	);
	const channelsTtl = parseNonNegativeSetting(
		settings2[CACHE_CHANNELS_TTL_KEY] ?? null,
		DEFAULT_CACHE_CHANNELS_TTL_SECONDS,
	);
	const callTokensTtl = parseNonNegativeSetting(
		settings2[CACHE_CALL_TOKENS_TTL_KEY] ?? null,
		DEFAULT_CACHE_CALL_TOKENS_TTL_SECONDS,
	);
	const settingsTtl = parseNonNegativeSetting(
		settings2[CACHE_SETTINGS_TTL_KEY] ?? null,
		DEFAULT_CACHE_SETTINGS_TTL_SECONDS,
	);
	const versionDashboard = parsePositiveSetting(
		settings2[CACHE_VERSION_DASHBOARD_KEY] ?? null,
		DEFAULT_CACHE_VERSION,
	);
	const versionUsage = parsePositiveSetting(
		settings2[CACHE_VERSION_USAGE_KEY] ?? null,
		DEFAULT_CACHE_VERSION,
	);
	const versionModels = parsePositiveSetting(
		settings2[CACHE_VERSION_MODELS_KEY] ?? null,
		DEFAULT_CACHE_VERSION,
	);
	const versionTokens = parsePositiveSetting(
		settings2[CACHE_VERSION_TOKENS_KEY] ?? null,
		DEFAULT_CACHE_VERSION,
	);
	const versionChannels = parsePositiveSetting(
		settings2[CACHE_VERSION_CHANNELS_KEY] ?? null,
		DEFAULT_CACHE_VERSION,
	);
	const versionCallTokens = parsePositiveSetting(
		settings2[CACHE_VERSION_CALL_TOKENS_KEY] ?? null,
		DEFAULT_CACHE_VERSION,
	);
	const versionSettings = parsePositiveSetting(
		settings2[CACHE_VERSION_SETTINGS_KEY] ?? null,
		DEFAULT_CACHE_VERSION,
	);
	const value = {
		enabled,
		dashboard_ttl_seconds: dashboardTtl,
		usage_ttl_seconds: usageTtl,
		models_ttl_seconds: modelsTtl,
		tokens_ttl_seconds: tokensTtl,
		channels_ttl_seconds: channelsTtl,
		call_tokens_ttl_seconds: callTokensTtl,
		settings_ttl_seconds: settingsTtl,
		version_dashboard: versionDashboard,
		version_usage: versionUsage,
		version_models: versionModels,
		version_tokens: versionTokens,
		version_channels: versionChannels,
		version_call_tokens: versionCallTokens,
		version_settings: versionSettings,
	};
	setCacheConfigSnapshot(value);
	return value;
}
__name(getCacheConfig, "getCacheConfig");
async function setCacheConfig(db, update) {
	const tasks = [];
	if (update.enabled !== void 0) {
		tasks.push(
			upsertSetting(db, CACHE_ENABLED_KEY, update.enabled ? "1" : "0"),
		);
	}
	if (update.dashboardTtlSeconds !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				CACHE_DASHBOARD_TTL_KEY,
				String(Math.max(0, Math.floor(update.dashboardTtlSeconds))),
			),
		);
	}
	if (update.usageTtlSeconds !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				CACHE_USAGE_TTL_KEY,
				String(Math.max(0, Math.floor(update.usageTtlSeconds))),
			),
		);
	}
	if (update.modelsTtlSeconds !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				CACHE_MODELS_TTL_KEY,
				String(Math.max(0, Math.floor(update.modelsTtlSeconds))),
			),
		);
	}
	if (update.tokensTtlSeconds !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				CACHE_TOKENS_TTL_KEY,
				String(Math.max(0, Math.floor(update.tokensTtlSeconds))),
			),
		);
	}
	if (update.channelsTtlSeconds !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				CACHE_CHANNELS_TTL_KEY,
				String(Math.max(0, Math.floor(update.channelsTtlSeconds))),
			),
		);
	}
	if (update.callTokensTtlSeconds !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				CACHE_CALL_TOKENS_TTL_KEY,
				String(Math.max(0, Math.floor(update.callTokensTtlSeconds))),
			),
		);
	}
	if (update.settingsTtlSeconds !== void 0) {
		tasks.push(
			upsertSetting(
				db,
				CACHE_SETTINGS_TTL_KEY,
				String(Math.max(0, Math.floor(update.settingsTtlSeconds))),
			),
		);
	}
	if (tasks.length === 0) {
		return getCacheConfig(db);
	}
	await Promise.all(tasks);
	await bumpCacheVersions(db, [
		"dashboard",
		"usage",
		"models",
		"tokens",
		"channels",
		"call_tokens",
		"settings",
	]);
	return getCacheConfig(db);
}
__name(setCacheConfig, "setCacheConfig");
async function getRetentionDays(db) {
	return getCachedSetting(
		retentionSnapshot,
		async () => {
			const value = await readSetting(db, RETENTION_KEY);
			return parsePositiveNumber(value, DEFAULT_LOG_RETENTION_DAYS);
		},
		(next) => {
			retentionSnapshot = next;
		},
	);
}
__name(getRetentionDays, "getRetentionDays");
async function setRetentionDays(db, days) {
	const value = Math.max(1, Math.floor(days)).toString();
	await upsertSetting(db, RETENTION_KEY, value);
	retentionSnapshot = null;
}
__name(setRetentionDays, "setRetentionDays");
async function getSessionTtlHours(db) {
	return getCachedSetting(
		sessionTtlSnapshot,
		async () => {
			const value = await readSetting(db, SESSION_TTL_KEY);
			return parsePositiveNumber(value, DEFAULT_SESSION_TTL_HOURS);
		},
		(next) => {
			sessionTtlSnapshot = next;
		},
	);
}
__name(getSessionTtlHours, "getSessionTtlHours");
async function setSessionTtlHours(db, hours) {
	const value = Math.max(1, Math.floor(hours)).toString();
	await upsertSetting(db, SESSION_TTL_KEY, value);
	sessionTtlSnapshot = null;
}
__name(setSessionTtlHours, "setSessionTtlHours");
async function getAdminPasswordHash(db) {
	return getCachedSetting(
		adminPasswordSnapshot,
		() => readSetting(db, ADMIN_PASSWORD_HASH_KEY),
		(next) => {
			adminPasswordSnapshot = next;
		},
	);
}
__name(getAdminPasswordHash, "getAdminPasswordHash");
async function setAdminPasswordHash(db, hash) {
	if (!hash) {
		return;
	}
	await upsertSetting(db, ADMIN_PASSWORD_HASH_KEY, hash);
	adminPasswordSnapshot = null;
}
__name(setAdminPasswordHash, "setAdminPasswordHash");
async function isAdminPasswordSet(db) {
	const hash = await getAdminPasswordHash(db);
	return Boolean(hash);
}
__name(isAdminPasswordSet, "isAdminPasswordSet");
async function getCheckinScheduleTime(db) {
	return getCachedSetting(
		checkinScheduleSnapshot,
		async () => {
			const timeRaw = await readSetting(db, CHECKIN_SCHEDULE_TIME_KEY);
			return timeRaw && timeRaw.length > 0
				? timeRaw
				: DEFAULT_CHECKIN_SCHEDULE_TIME;
		},
		(next) => {
			checkinScheduleSnapshot = next;
		},
	);
}
__name(getCheckinScheduleTime, "getCheckinScheduleTime");
async function setCheckinScheduleTime(db, time) {
	await upsertSetting(db, CHECKIN_SCHEDULE_TIME_KEY, time);
	checkinScheduleSnapshot = null;
}
__name(setCheckinScheduleTime, "setCheckinScheduleTime");
async function getModelFailureCooldownMinutes(db) {
	return getCachedSetting(
		modelCooldownSnapshot,
		async () => {
			const value = await readSetting(db, MODEL_FAILURE_COOLDOWN_KEY);
			return parsePositiveNumber(value, DEFAULT_MODEL_FAILURE_COOLDOWN_MINUTES);
		},
		(next) => {
			modelCooldownSnapshot = next;
		},
	);
}
__name(getModelFailureCooldownMinutes, "getModelFailureCooldownMinutes");
async function setModelFailureCooldownMinutes(db, minutes) {
	const value = Math.max(1, Math.floor(minutes)).toString();
	await upsertSetting(db, MODEL_FAILURE_COOLDOWN_KEY, value);
	modelCooldownSnapshot = null;
}
__name(setModelFailureCooldownMinutes, "setModelFailureCooldownMinutes");
async function listSettings(db) {
	const result = await db.prepare("SELECT key, value FROM settings").all();
	const map = {};
	for (const row of result.results ?? []) {
		map[String(row.key)] = String(row.value);
	}
	return map;
}
__name(listSettings, "listSettings");

// src/routes/auth.ts
var auth = new Hono2();
auth.post("/login", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body?.password) {
		return jsonError(c, 400, "password_required", "password_required");
	}
	const password = String(body.password);
	const passwordHash = await sha256Hex(password);
	const storedHash = await getAdminPasswordHash(c.env.DB);
	if (!storedHash) {
		await setAdminPasswordHash(c.env.DB, passwordHash);
	} else if (passwordHash !== storedHash) {
		return jsonError(c, 401, "invalid_password", "invalid_password");
	}
	const rawToken = generateToken("admin_");
	const tokenHash = await sha256Hex(rawToken);
	const ttlHours = await getSessionTtlHours(c.env.DB);
	const expiresAt = addHours(
		/* @__PURE__ */ new Date(),
		ttlHours,
	).toISOString();
	await c.env.DB.prepare(
		"INSERT INTO admin_sessions (id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
	)
		.bind(crypto.randomUUID(), tokenHash, expiresAt, nowIso())
		.run();
	return c.json({
		token: rawToken,
		expires_at: expiresAt,
	});
});
auth.post("/logout", adminAuth, async (c) => {
	const sessionId = c.get("adminSessionId");
	if (sessionId) {
		await c.env.DB.prepare("DELETE FROM admin_sessions WHERE id = ?")
			.bind(String(sessionId))
			.run();
	}
	return c.json({ ok: true });
});
var auth_default = auth;

// src/services/channel-call-token-repo.ts
var buildWhere = /* @__PURE__ */ __name((filters) => {
	if (!filters?.channelIds || filters.channelIds.length === 0) {
		return { whereSql: "", bindings: [] };
	}
	const placeholders = filters.channelIds.map(() => "?").join(", ");
	return {
		whereSql: `WHERE channel_id IN (${placeholders})`,
		bindings: filters.channelIds,
	};
}, "buildWhere");
async function listCallTokens(db, filters) {
	if (filters?.channelIds && filters.channelIds.length === 0) {
		return [];
	}
	const { whereSql, bindings } = buildWhere(filters);
	const statement = db.prepare(
		`SELECT * FROM channel_call_tokens ${whereSql} ORDER BY created_at ASC`,
	);
	const rows = await statement.bind(...bindings).all();
	return rows.results ?? [];
}
__name(listCallTokens, "listCallTokens");
async function deleteCallTokensByChannelId(db, channelId) {
	await db
		.prepare("DELETE FROM channel_call_tokens WHERE channel_id = ?")
		.bind(channelId)
		.run();
}
__name(deleteCallTokensByChannelId, "deleteCallTokensByChannelId");
async function insertCallToken(db, input) {
	await db
		.prepare(
			"INSERT INTO channel_call_tokens (id, channel_id, name, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(
			input.id,
			input.channel_id,
			input.name,
			input.api_key,
			input.created_at,
			input.updated_at,
		)
		.run();
}
__name(insertCallToken, "insertCallToken");
async function replaceCallTokensForChannel(db, channelId, tokens2) {
	await deleteCallTokensByChannelId(db, channelId);
	for (const token of tokens2) {
		await insertCallToken(db, token);
	}
}
__name(replaceCallTokensForChannel, "replaceCallTokensForChannel");
async function updateCallTokenModels(db, tokenId, models2, updatedAt) {
	const modelsJson = models2.length > 0 ? JSON.stringify(models2) : null;
	await db
		.prepare(
			"UPDATE channel_call_tokens SET models_json = ?, updated_at = ? WHERE id = ?",
		)
		.bind(modelsJson, updatedAt, tokenId)
		.run();
}
__name(updateCallTokenModels, "updateCallTokenModels");

// src/utils/json.ts
function safeJsonParse(value, fallback) {
	if (!value) {
		return fallback;
	}
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}
__name(safeJsonParse, "safeJsonParse");

// src/services/channel-models.ts
function toModelId(item) {
	if (item && typeof item === "object" && "id" in item) {
		const value = item.id;
		return value === void 0 || value === null ? "" : String(value);
	}
	if (item === void 0 || item === null) {
		return "";
	}
	return String(item);
}
__name(toModelId, "toModelId");
function normalizeModelsInput(input) {
	if (!input) {
		return [];
	}
	if (Array.isArray(input)) {
		return input
			.map((item) => toModelId(item))
			.filter((item) => item.length > 0);
	}
	if (typeof input === "string") {
		return input
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
	if (typeof input === "object") {
		const raw2 = input;
		if (Array.isArray(raw2.data)) {
			return raw2.data
				.map((item) => toModelId(item))
				.filter((item) => item.length > 0);
		}
	}
	return [];
}
__name(normalizeModelsInput, "normalizeModelsInput");
function modelsToJson(models2) {
	const normalized = models2
		.map((model) => String(model).trim())
		.filter((model) => model.length > 0);
	return JSON.stringify(normalized.map((id) => ({ id })));
}
__name(modelsToJson, "modelsToJson");
function extractModelIds(channel) {
	const raw2 = safeJsonParse(channel.models_json, null);
	const models2 = Array.isArray(raw2)
		? raw2
		: Array.isArray(raw2?.data)
			? raw2.data
			: [];
	return models2
		.map((model) => toModelId(model))
		.filter((model) => model.length > 0);
}
__name(extractModelIds, "extractModelIds");
function extractModels(channel) {
	return extractModelIds(channel).map((id) => ({
		id,
		label: id,
		channelId: channel.id,
		channelName: channel.name,
	}));
}
__name(extractModels, "extractModels");
function collectUniqueModelIds(channels2) {
	const models2 = /* @__PURE__ */ new Set();
	for (const channel of channels2) {
		for (const id of extractModelIds(channel)) {
			models2.add(id);
		}
	}
	return Array.from(models2);
}
__name(collectUniqueModelIds, "collectUniqueModelIds");

// src/services/channel-repo.ts
var ORDER_COLUMNS = {
	priority: "priority",
	created_at: "created_at",
	id: "id",
};
function bindIfNeeded(stmt, bindings) {
	if (bindings.length === 0) {
		return stmt;
	}
	return stmt.bind(...bindings);
}
__name(bindIfNeeded, "bindIfNeeded");
function buildWhere2(filters) {
	const where = [];
	const bindings = [];
	if (filters?.status) {
		where.push("status = ?");
		bindings.push(filters.status);
	}
	if (filters?.type !== void 0 && filters?.type !== null) {
		where.push("type = ?");
		bindings.push(filters.type);
	}
	const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
	return { whereSql, bindings };
}
__name(buildWhere2, "buildWhere");
async function listChannels(db, options = {}) {
	const { whereSql, bindings } = buildWhere2(options.filters);
	const orderBy = options.orderBy ?? "created_at";
	const order = options.order ?? "DESC";
	const orderSql = `ORDER BY ${ORDER_COLUMNS[orderBy]} ${order}`;
	const limitSql =
		options.limit !== void 0 && options.offset !== void 0
			? "LIMIT ? OFFSET ?"
			: "";
	const limitBindings =
		options.limit !== void 0 && options.offset !== void 0
			? [options.limit, options.offset]
			: [];
	const statement = db.prepare(
		`SELECT * FROM channels ${whereSql} ${orderSql} ${limitSql}`,
	);
	const rows = await bindIfNeeded(statement, [
		...bindings,
		...limitBindings,
	]).all();
	return rows.results ?? [];
}
__name(listChannels, "listChannels");
async function countChannels(db, filters) {
	const { whereSql, bindings } = buildWhere2(filters);
	const statement = db.prepare(
		`SELECT COUNT(*) as count FROM channels ${whereSql}`,
	);
	const row = await bindIfNeeded(statement, bindings).first();
	return Number(row?.count ?? 0);
}
__name(countChannels, "countChannels");
async function countChannelsByType(db, filters) {
	const { whereSql, bindings } = buildWhere2(filters);
	const statement = db.prepare(
		`SELECT type, COUNT(*) as count FROM channels ${whereSql} GROUP BY type`,
	);
	const counts = await bindIfNeeded(statement, bindings).all();
	const result = {};
	for (const entry of counts.results ?? []) {
		result[String(entry.type)] = Number(entry.count ?? 0);
	}
	return result;
}
__name(countChannelsByType, "countChannelsByType");
async function listActiveChannels(db) {
	const rows = await db
		.prepare("SELECT * FROM channels WHERE status = ?")
		.bind("active")
		.all();
	return rows.results ?? [];
}
__name(listActiveChannels, "listActiveChannels");
async function getChannelById(db, id) {
	const row = await db
		.prepare("SELECT * FROM channels WHERE id = ?")
		.bind(id)
		.first();
	return row ?? null;
}
__name(getChannelById, "getChannelById");
async function channelExists(db, id) {
	const row = await db
		.prepare("SELECT id FROM channels WHERE id = ?")
		.bind(id)
		.first();
	return Boolean(row?.id);
}
__name(channelExists, "channelExists");
async function insertChannel(db, input) {
	await db
		.prepare(
			"INSERT INTO channels (id, name, base_url, api_key, weight, status, rate_limit, models_json, type, group_name, priority, metadata_json, system_token, system_userid, checkin_enabled, checkin_url, last_checkin_date, last_checkin_status, last_checkin_message, last_checkin_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			input.id,
			input.name,
			input.base_url,
			input.api_key,
			input.weight,
			input.status,
			input.rate_limit,
			input.models_json,
			input.type,
			input.group_name,
			input.priority,
			input.metadata_json,
			input.system_token ?? null,
			input.system_userid ?? null,
			typeof input.checkin_enabled === "boolean"
				? input.checkin_enabled
					? 1
					: 0
				: (input.checkin_enabled ?? 0),
			input.checkin_url ?? null,
			input.last_checkin_date ?? null,
			input.last_checkin_status ?? null,
			input.last_checkin_message ?? null,
			input.last_checkin_at ?? null,
			input.created_at,
			input.updated_at,
		)
		.run();
}
__name(insertChannel, "insertChannel");
async function updateChannel(db, id, input) {
	await db
		.prepare(
			"UPDATE channels SET name = ?, base_url = ?, api_key = ?, weight = ?, status = ?, rate_limit = ?, models_json = ?, type = ?, group_name = ?, priority = ?, metadata_json = ?, system_token = ?, system_userid = ?, checkin_enabled = ?, checkin_url = ?, last_checkin_date = ?, last_checkin_status = ?, last_checkin_message = ?, last_checkin_at = ?, updated_at = ? WHERE id = ?",
		)
		.bind(
			input.name,
			input.base_url,
			input.api_key,
			input.weight,
			input.status,
			input.rate_limit,
			input.models_json,
			input.type,
			input.group_name,
			input.priority,
			input.metadata_json,
			input.system_token,
			input.system_userid,
			typeof input.checkin_enabled === "boolean"
				? input.checkin_enabled
					? 1
					: 0
				: (input.checkin_enabled ?? 0),
			input.checkin_url,
			input.last_checkin_date,
			input.last_checkin_status,
			input.last_checkin_message,
			input.last_checkin_at,
			input.updated_at,
			id,
		)
		.run();
}
__name(updateChannel, "updateChannel");
async function updateChannelCheckinResult(db, id, input) {
	await db
		.prepare(
			"UPDATE channels SET last_checkin_date = ?, last_checkin_status = ?, last_checkin_message = ?, last_checkin_at = ?, updated_at = ? WHERE id = ?",
		)
		.bind(
			input.last_checkin_date,
			input.last_checkin_status,
			input.last_checkin_message,
			input.last_checkin_at,
			input.last_checkin_at ?? /* @__PURE__ */ new Date().toISOString(),
			id,
		)
		.run();
}
__name(updateChannelCheckinResult, "updateChannelCheckinResult");
async function deleteChannel(db, id) {
	await db.prepare("DELETE FROM channels WHERE id = ?").bind(id).run();
}
__name(deleteChannel, "deleteChannel");

// src/utils/url.ts
function normalizeBaseUrl(baseUrl) {
	if (!baseUrl) {
		return "";
	}
	const trimmed = baseUrl.trim().replace(/\/+$/, "");
	return trimmed.replace(/\/v1$/i, "");
}
__name(normalizeBaseUrl, "normalizeBaseUrl");

// src/services/channel-model-capabilities.ts
function buildCapabilityMap(rows) {
	const map = /* @__PURE__ */ new Map();
	for (const row of rows) {
		if (!row.channel_id || !row.model) {
			continue;
		}
		const lastOk = Number(row.last_ok_at ?? 0);
		if (!lastOk || lastOk <= 0) {
			continue;
		}
		const set = map.get(row.channel_id) ?? /* @__PURE__ */ new Set();
		set.add(row.model);
		map.set(row.channel_id, set);
	}
	return map;
}
__name(buildCapabilityMap, "buildCapabilityMap");
async function listVerifiedModelsByChannel(db, channelIds) {
	if (channelIds.length === 0) {
		return /* @__PURE__ */ new Map();
	}
	const placeholders = channelIds.map(() => "?").join(", ");
	const rows = await db
		.prepare(
			`SELECT channel_id, model, last_ok_at FROM channel_model_capabilities WHERE channel_id IN (${placeholders}) AND last_ok_at > 0`,
		)
		.bind(...channelIds)
		.all();
	return buildCapabilityMap(rows.results ?? []);
}
__name(listVerifiedModelsByChannel, "listVerifiedModelsByChannel");
async function listModelsByChannelWithFallback(db, channels2) {
	const ids = channels2.map((channel) => channel.id);
	const verified = await listVerifiedModelsByChannel(db, ids);
	const map = /* @__PURE__ */ new Map();
	for (const channel of channels2) {
		const verifiedModels = verified.get(channel.id);
		if (verifiedModels && verifiedModels.size > 0) {
			map.set(channel.id, new Set(verifiedModels));
			continue;
		}
		const declaredModels = extractModelIds(channel);
		if (declaredModels.length > 0) {
			map.set(channel.id, new Set(declaredModels));
		}
	}
	return map;
}
__name(listModelsByChannelWithFallback, "listModelsByChannelWithFallback");
async function listModelEntriesWithFallback(db, channels2) {
	const map = await listModelsByChannelWithFallback(db, channels2);
	const entries = [];
	for (const channel of channels2) {
		const models2 = map.get(channel.id);
		if (!models2) {
			continue;
		}
		for (const id of models2) {
			entries.push({
				id,
				label: id,
				channelId: channel.id,
				channelName: channel.name,
			});
		}
	}
	return entries;
}
__name(listModelEntriesWithFallback, "listModelEntriesWithFallback");
async function listCoolingDownChannelsForModel(
	db,
	channelIds,
	model,
	cooldownSeconds,
	minErrorCount = 1,
) {
	if (!model || channelIds.length === 0 || cooldownSeconds <= 0) {
		return /* @__PURE__ */ new Set();
	}
	const now = Math.floor(Date.now() / 1e3);
	const cutoff = now - cooldownSeconds;
	const placeholders = channelIds.map(() => "?").join(", ");
	const rows = await db
		.prepare(
			`SELECT channel_id, last_err_at, last_ok_at, last_err_count FROM channel_model_capabilities WHERE model = ? AND channel_id IN (${placeholders}) AND last_err_at IS NOT NULL AND last_err_at >= ?`,
		)
		.bind(model, ...channelIds, cutoff)
		.all();
	const blocked = /* @__PURE__ */ new Set();
	for (const row of rows.results ?? []) {
		const lastErr = Number(row.last_err_at ?? 0);
		const lastOk = Number(row.last_ok_at ?? 0);
		const errCount = Number(row.last_err_count ?? 0);
		if (lastErr && lastErr >= lastOk && errCount >= minErrorCount) {
			blocked.add(row.channel_id);
		}
	}
	return blocked;
}
__name(listCoolingDownChannelsForModel, "listCoolingDownChannelsForModel");
async function recordChannelModelError(
	db,
	channelId,
	model,
	errorCode,
	nowSeconds = Math.floor(Date.now() / 1e3),
) {
	if (!model) {
		return;
	}
	const timestamp = nowIso();
	await db
		.prepare(
			"INSERT INTO channel_model_capabilities (channel_id, model, last_ok_at, last_err_at, last_err_code, last_err_count, created_at, updated_at) VALUES (?, ?, 0, ?, ?, 1, ?, ?) ON CONFLICT(channel_id, model) DO UPDATE SET last_err_at = excluded.last_err_at, last_err_code = excluded.last_err_code, last_err_count = COALESCE(channel_model_capabilities.last_err_count, 0) + 1, updated_at = excluded.updated_at",
		)
		.bind(channelId, model, nowSeconds, errorCode, timestamp, timestamp)
		.run();
}
__name(recordChannelModelError, "recordChannelModelError");
async function upsertChannelModelCapabilities(
	db,
	channelId,
	models2,
	nowSeconds = Math.floor(Date.now() / 1e3),
) {
	if (models2.length === 0) {
		return;
	}
	const timestamp = nowIso();
	const stmt = db.prepare(
		"INSERT INTO channel_model_capabilities (channel_id, model, last_ok_at, last_err_at, last_err_code, last_err_count, created_at, updated_at) VALUES (?, ?, ?, NULL, NULL, 0, ?, ?) ON CONFLICT(channel_id, model) DO UPDATE SET last_ok_at = excluded.last_ok_at, last_err_at = NULL, last_err_code = NULL, last_err_count = 0, updated_at = excluded.updated_at",
	);
	const statements = models2.map((model) =>
		stmt.bind(channelId, model, nowSeconds, timestamp, timestamp),
	);
	await db.batch(statements);
}
__name(upsertChannelModelCapabilities, "upsertChannelModelCapabilities");

// src/services/channel-testing.ts
async function fetchChannelModels(baseUrl, apiKey) {
	const target = `${normalizeBaseUrl(baseUrl)}/v1/models`;
	const start = Date.now();
	const response = await fetch(target, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"x-api-key": apiKey,
			"Content-Type": "application/json",
		},
	});
	const elapsed = Date.now() - start;
	if (!response.ok) {
		return { ok: false, elapsed, models: [] };
	}
	const payload = await response.json().catch(() => ({ data: [] }));
	const models2 = normalizeModelsInput(
		Array.isArray(payload) ? payload : (payload.data ?? payload),
	);
	return { ok: true, elapsed, models: models2, payload };
}
__name(fetchChannelModels, "fetchChannelModels");
async function testChannelTokens(
	baseUrl,
	tokens2,
	fetcher = fetchChannelModels,
) {
	if (tokens2.length === 0) {
		return {
			ok: false,
			total: 0,
			success: 0,
			failed: 0,
			elapsed: 0,
			models: [],
			items: [],
		};
	}
	const items = [];
	const modelSet = /* @__PURE__ */ new Set();
	let success = 0;
	let totalElapsed = 0;
	for (const token of tokens2) {
		const result = await fetcher(baseUrl, token.api_key);
		totalElapsed += result.elapsed;
		if (result.ok) {
			success += 1;
			for (const model of result.models) {
				modelSet.add(model);
			}
		}
		items.push({
			tokenId: token.id,
			tokenName: token.name,
			ok: result.ok,
			elapsed: result.elapsed,
			models: result.models,
		});
	}
	const total = tokens2.length;
	const failed = total - success;
	const elapsed = Math.round(totalElapsed / total);
	return {
		ok: success > 0,
		total,
		success,
		failed,
		elapsed,
		models: Array.from(modelSet),
		items,
	};
}
__name(testChannelTokens, "testChannelTokens");
async function updateChannelTestResult(db, id, result) {
	const now = Math.floor(Date.now() / 1e3);
	const current = await db
		.prepare("SELECT status FROM channels WHERE id = ?")
		.bind(id)
		.first();
	const currentStatus = current?.status ?? "active";
	const status =
		currentStatus === "disabled" ? "disabled" : result.ok ? "active" : "error";
	const modelsJson =
		result.modelsJson ?? (result.models ? modelsToJson(result.models) : void 0);
	const sql = modelsJson
		? "UPDATE channels SET status = ?, models_json = ?, test_time = ?, response_time_ms = ?, updated_at = ? WHERE id = ?"
		: "UPDATE channels SET status = ?, test_time = ?, response_time_ms = ?, updated_at = ? WHERE id = ?";
	const stmt = db.prepare(sql);
	if (modelsJson) {
		await stmt
			.bind(status, modelsJson, now, result.elapsed, nowIso(), id)
			.run();
	} else {
		await stmt.bind(status, now, result.elapsed, nowIso(), id).run();
	}
	if (result.ok && result.models && result.models.length > 0) {
		await upsertChannelModelCapabilities(db, id, result.models, now);
	}
}
__name(updateChannelTestResult, "updateChannelTestResult");

// src/routes/channels.ts
var channels = new Hono2();
function resolveChannelId(body) {
	const candidate = body?.id ?? body?.channel_id ?? body?.channelId;
	if (!candidate) {
		return null;
	}
	const normalized = String(candidate).trim();
	return normalized.length > 0 ? normalized : null;
}
__name(resolveChannelId, "resolveChannelId");
channels.get("/", async (c) => {
	const rows = await listChannels(c.env.DB, {
		orderBy: "created_at",
		order: "DESC",
	});
	return c.json({ channels: rows });
});
channels.post("/", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body?.name || !body?.base_url || !body?.api_key) {
		return jsonError(c, 400, "missing_fields", "missing_fields");
	}
	const requestedId = resolveChannelId(body);
	if (requestedId) {
		const exists = await channelExists(c.env.DB, requestedId);
		if (exists) {
			return jsonError(c, 409, "channel_id_exists", "channel_id_exists");
		}
	}
	const id = requestedId ?? generateToken("ch_");
	const now = nowIso();
	await insertChannel(c.env.DB, {
		id,
		name: body.name,
		base_url: normalizeBaseUrl(String(body.base_url)),
		api_key: body.api_key,
		weight: Number(body.weight ?? 1),
		status: body.status ?? "active",
		rate_limit: body.rate_limit ?? 0,
		models_json: JSON.stringify(body.models ?? []),
		type: 1,
		group_name: null,
		priority: 0,
		metadata_json: null,
		created_at: now,
		updated_at: now,
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return c.json({ id });
});
channels.patch("/:id", async (c) => {
	const body = await c.req.json().catch(() => null);
	const id = c.req.param("id");
	if (!body) {
		return jsonError(c, 400, "missing_body", "missing_body");
	}
	const current = await getChannelById(c.env.DB, id);
	if (!current) {
		return jsonError(c, 404, "channel_not_found", "channel_not_found");
	}
	const models2 = body.models ?? safeJsonParse(current.models_json, []);
	await updateChannel(c.env.DB, id, {
		name: body.name ?? current.name,
		base_url: normalizeBaseUrl(String(body.base_url ?? current.base_url)),
		api_key: body.api_key ?? current.api_key,
		weight: Number(body.weight ?? current.weight ?? 1),
		status: body.status ?? current.status,
		rate_limit: body.rate_limit ?? current.rate_limit ?? 0,
		models_json: JSON.stringify(models2),
		type: current.type ?? 1,
		group_name: current.group_name ?? null,
		priority: current.priority ?? 0,
		metadata_json: current.metadata_json ?? null,
		system_token: body.system_token ?? current.system_token ?? null,
		system_userid: body.system_userid ?? current.system_userid ?? null,
		checkin_enabled: body.checkin_enabled ?? current.checkin_enabled ?? 0,
		checkin_url: body.checkin_url ?? current.checkin_url ?? null,
		last_checkin_date: current.last_checkin_date ?? null,
		last_checkin_status: current.last_checkin_status ?? null,
		last_checkin_message: current.last_checkin_message ?? null,
		last_checkin_at: current.last_checkin_at ?? null,
		updated_at: nowIso(),
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return c.json({ ok: true });
});
channels.delete("/:id", async (c) => {
	const id = c.req.param("id");
	await deleteChannel(c.env.DB, id);
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return c.json({ ok: true });
});
channels.post("/:id/test", async (c) => {
	const id = c.req.param("id");
	const channel = await getChannelById(c.env.DB, id);
	if (!channel) {
		return jsonError(c, 404, "channel_not_found", "channel_not_found");
	}
	const callTokenRows = await listCallTokens(c.env.DB, {
		channelIds: [id],
	});
	const tokens2 =
		callTokenRows.length > 0
			? callTokenRows.map((row) => ({
					id: row.id,
					name: row.name,
					api_key: row.api_key,
				}))
			: [
					{
						id: "primary",
						name: "\u4E3B\u8C03\u7528\u4EE4\u724C",
						api_key: String(channel.api_key),
					},
				];
	const summary = await testChannelTokens(String(channel.base_url), tokens2);
	if (!summary.ok) {
		await updateChannelTestResult(c.env.DB, id, {
			ok: false,
			elapsed: summary.elapsed,
		});
		return jsonError(c, 502, "channel_unreachable", "channel_unreachable");
	}
	const tokenIdSet = new Set(callTokenRows.map((row) => row.id));
	for (const item of summary.items) {
		if (!item.ok || !item.tokenId || !tokenIdSet.has(item.tokenId)) {
			continue;
		}
		await updateCallTokenModels(c.env.DB, item.tokenId, item.models, nowIso());
	}
	const models2 = summary.models.map((id2) => ({ id: id2 }));
	await updateChannelTestResult(c.env.DB, id, {
		ok: true,
		elapsed: summary.elapsed,
		models: summary.models,
		modelsJson: modelsToJson(summary.models),
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models", "call_tokens"]);
	return c.json({
		ok: true,
		models: models2,
		token_summary: {
			total: summary.total,
			success: summary.success,
			failed: summary.failed,
		},
	});
});
var channels_default = channels;

// src/routes/dashboard.ts
var dashboard = new Hono2();
function buildDateFilters(query) {
	let sql = " WHERE 1=1";
	const params = [];
	const channelIds = (query.channel_ids ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	const tokenIds = (query.token_ids ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	if (query.from) {
		sql += " AND usage_logs.created_at >= ?";
		params.push(query.from);
	}
	if (query.to) {
		sql += " AND usage_logs.created_at <= ?";
		params.push(query.to);
	}
	if (query.model) {
		sql += " AND usage_logs.model LIKE ? COLLATE NOCASE";
		params.push(`%${query.model}%`);
	}
	if (channelIds.length > 0) {
		sql += ` AND usage_logs.channel_id IN (${channelIds.map(() => "?").join(",")})`;
		params.push(...channelIds);
	}
	if (tokenIds.length > 0) {
		sql += ` AND usage_logs.token_id IN (${tokenIds.map(() => "?").join(",")})`;
		params.push(...tokenIds);
	}
	return { sql, params };
}
__name(buildDateFilters, "buildDateFilters");
dashboard.get("/", async (c) => {
	const cacheConfig = await getCacheConfig(c.env.DB);
	return withApiCache(
		c,
		{
			namespace: "dashboard",
			version: cacheConfig.version_dashboard,
			ttlSeconds: cacheConfig.dashboard_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const query = c.req.query();
			const interval =
				query.interval === "week" || query.interval === "month"
					? query.interval
					: "day";
			const rawLimit = Number(query.limit ?? 30);
			const normalizedLimit = Number.isNaN(rawLimit)
				? 30
				: Math.floor(rawLimit);
			const limit = Math.min(Math.max(normalizedLimit, 1), 366);
			const { sql, params } = buildDateFilters(query);
			const bucketExpression =
				interval === "week"
					? "strftime('%Y-W%W', created_at)"
					: interval === "month"
						? "substr(created_at, 1, 7)"
						: "substr(created_at, 1, 10)";
			const summary = await c.env.DB.prepare(
				`SELECT COUNT(*) as total_requests, COALESCE(SUM(total_tokens), 0) as total_tokens, COALESCE(AVG(latency_ms), 0) as avg_latency, COALESCE(SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END), 0) as total_errors FROM usage_logs${sql}`,
			)
				.bind(...params)
				.first();
			const trend = await c.env.DB.prepare(
				`SELECT ${bucketExpression} as bucket, COUNT(*) as requests, COALESCE(SUM(total_tokens), 0) as tokens FROM usage_logs${sql} GROUP BY bucket ORDER BY bucket ASC LIMIT ?`,
			)
				.bind(...params, limit)
				.all();
			const byModel = await c.env.DB.prepare(
				`SELECT model, COUNT(*) as requests, COALESCE(SUM(total_tokens), 0) as tokens FROM usage_logs${sql} GROUP BY model ORDER BY requests DESC LIMIT 20`,
			)
				.bind(...params)
				.all();
			const byChannel = await c.env.DB.prepare(
				`SELECT channels.id as channel_id, channels.name as channel_name, COUNT(usage_logs.id) as requests, COALESCE(SUM(usage_logs.total_tokens), 0) as tokens FROM usage_logs LEFT JOIN channels ON channels.id = usage_logs.channel_id${sql} GROUP BY channels.id, channels.name ORDER BY requests DESC LIMIT 20`,
			)
				.bind(...params)
				.all();
			const byToken = await c.env.DB.prepare(
				`SELECT tokens.id as token_id, tokens.name as token_name, COUNT(usage_logs.id) as requests, COALESCE(SUM(usage_logs.total_tokens), 0) as tokens FROM usage_logs LEFT JOIN tokens ON tokens.id = usage_logs.token_id${sql} GROUP BY tokens.id, tokens.name ORDER BY requests DESC LIMIT 20`,
			)
				.bind(...params)
				.all();
			return c.json({
				summary: summary ?? {
					total_requests: 0,
					total_tokens: 0,
					avg_latency: 0,
					total_errors: 0,
				},
				trend: trend.results ?? [],
				interval,
				byModel: byModel.results ?? [],
				byChannel: byChannel.results ?? [],
				byToken: byToken.results ?? [],
			});
		},
	);
});
var dashboard_default = dashboard;

// src/routes/models.ts
var models = new Hono2();
models.get("/", async (c) => {
	const cacheConfig = await getCacheConfig(c.env.DB);
	return withApiCache(
		c,
		{
			namespace: "models",
			version: cacheConfig.version_models,
			ttlSeconds: cacheConfig.models_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const channels2 = await listActiveChannels(c.env.DB);
			const entries = await listModelEntriesWithFallback(
				c.env.DB,
				channels2.map((channel) => ({
					id: channel.id,
					name: channel.name,
					models_json: channel.models_json,
				})),
			);
			const map = /* @__PURE__ */ new Map();
			for (const entry of entries) {
				const existing = map.get(entry.id) ?? { id: entry.id, channels: [] };
				existing.channels.push({
					id: entry.channelId,
					name: entry.channelName,
				});
				map.set(entry.id, existing);
			}
			return c.json({
				models: Array.from(map.values()),
			});
		},
	);
});
var models_default = models;

// src/middleware/newApiAuth.ts
function newApiError(c, status, message) {
	return c.json(
		{
			success: false,
			message,
		},
		status,
	);
}
__name(newApiError, "newApiError");
function readNewApiUserId(c) {
	return c.req.header("New-Api-User") ?? c.req.header("new-api-user") ?? null;
}
__name(readNewApiUserId, "readNewApiUserId");
var newApiAuth = createMiddleware(async (c, next) => {
	const token = getBearerToken(c);
	if (!token) {
		return newApiError(c, 401, "unauthorized");
	}
	const tokenHash = await sha256Hex(token);
	const adminPasswordHash = await getAdminPasswordHash(c.env.DB);
	if (adminPasswordHash && tokenHash === adminPasswordHash) {
		c.set("newApiUserId", readNewApiUserId(c));
		await next();
		return;
	}
	const session = await c.env.DB.prepare(
		"SELECT id, expires_at FROM admin_sessions WHERE token_hash = ?",
	)
		.bind(tokenHash)
		.first();
	if (!session) {
		return newApiError(c, 401, "unauthorized");
	}
	if (new Date(String(session.expires_at)).getTime() <= Date.now()) {
		await c.env.DB.prepare("DELETE FROM admin_sessions WHERE id = ?")
			.bind(String(session.id))
			.run();
		return newApiError(c, 401, "session_expired");
	}
	c.set("newApiUserId", readNewApiUserId(c));
	await next();
});

// src/services/channel-status.ts
function toInternalStatus(status) {
	if (status === void 0 || status === null) {
		return "active";
	}
	if (typeof status === "string") {
		const normalized = status.trim().toLowerCase();
		if (["1", "true", "enabled", "enable", "active"].includes(normalized)) {
			return "active";
		}
		if (
			["0", "2", "false", "disabled", "disable", "inactive"].includes(
				normalized,
			)
		) {
			return "disabled";
		}
	}
	if (typeof status === "number") {
		return status === 1 ? "active" : "disabled";
	}
	if (typeof status === "boolean") {
		return status ? "active" : "disabled";
	}
	return "active";
}
__name(toInternalStatus, "toInternalStatus");
function toNewApiStatus(status) {
	return status === "active" ? 1 : 2;
}
__name(toNewApiStatus, "toNewApiStatus");

// src/services/newapi.ts
var DEFAULT_CHANNEL_INFO = {
	is_multi_key: false,
	multi_key_size: 0,
	multi_key_status_list: null,
	multi_key_polling_index: 0,
	multi_key_mode: "",
};
var DEFAULT_NEWAPI_FIELDS = {
	key: "",
	openai_organization: "",
	test_model: "",
	other: "",
	balance: 0,
	balance_updated_time: 0,
	used_quota: 0,
	model_mapping: "",
	status_code_mapping: "",
	auto_ban: 1,
	other_info: "",
	tag: "",
	setting: "",
	param_override: "",
	header_override: "",
	remark: "",
	channel_info: DEFAULT_CHANNEL_INFO,
	settings: "",
};
var KNOWN_KEYS = /* @__PURE__ */ new Set([
	"id",
	"name",
	"type",
	"key",
	"api_key",
	"base_url",
	"baseUrl",
	"weight",
	"status",
	"rate_limit",
	"rateLimit",
	"models",
	"model",
	"model_list",
	"models_list",
	"group",
	"group_name",
	"groups",
	"priority",
]);
function withNewApiDefaults(channel) {
	const merged = { ...channel };
	for (const [key, fallback] of Object.entries(DEFAULT_NEWAPI_FIELDS)) {
		if (merged[key] === void 0 || merged[key] === null) {
			merged[key] = fallback;
		}
	}
	const channelInfo = merged.channel_info;
	if (
		channelInfo &&
		typeof channelInfo === "object" &&
		!Array.isArray(channelInfo)
	) {
		merged.channel_info = { ...DEFAULT_CHANNEL_INFO, ...channelInfo };
	} else {
		merged.channel_info = { ...DEFAULT_CHANNEL_INFO };
	}
	return merged;
}
__name(withNewApiDefaults, "withNewApiDefaults");
function toNumber(value, fallback = null) {
	if (value === null || value === void 0) {
		return fallback;
	}
	const parsed = Number(value);
	return Number.isNaN(parsed) ? fallback : parsed;
}
__name(toNumber, "toNumber");
function normalizeChannelInput(body) {
	const hasModels =
		body &&
		(Object.hasOwn(body, "models") ||
			Object.hasOwn(body, "model") ||
			Object.hasOwn(body, "model_list") ||
			Object.hasOwn(body, "models_list"));
	const models2 = hasModels
		? normalizeModelsInput(
				body?.models ?? body?.model ?? body?.model_list ?? body?.models_list,
			)
		: [];
	const hasGroup =
		body &&
		(Object.hasOwn(body, "group") ||
			Object.hasOwn(body, "group_name") ||
			Object.hasOwn(body, "groups"));
	const groupInput = body?.group ?? body?.group_name ?? null;
	const groupsInput = Array.isArray(body?.groups)
		? body.groups.map((item) => String(item))
		: null;
	const groupName = !hasGroup
		? void 0
		: groupInput
			? String(groupInput)
			: groupsInput && groupsInput.length > 0
				? groupsInput.join(",")
				: null;
	const metadata = {};
	if (body && typeof body === "object") {
		for (const [key, value] of Object.entries(body)) {
			if (KNOWN_KEYS.has(key)) {
				continue;
			}
			metadata[key] = value;
		}
	}
	const hasType = body && Object.hasOwn(body, "type");
	const hasWeight = body && Object.hasOwn(body, "weight");
	const hasStatus = body && Object.hasOwn(body, "status");
	const hasRateLimit =
		body &&
		(Object.hasOwn(body, "rate_limit") || Object.hasOwn(body, "rateLimit"));
	const hasPriority = body && Object.hasOwn(body, "priority");
	return {
		id: body?.id !== void 0 && body?.id !== null ? String(body.id) : void 0,
		name: body?.name ? String(body.name) : void 0,
		type: hasType ? (toNumber(body?.type, 1) ?? 1) : void 0,
		base_url:
			body?.base_url !== void 0 && body?.base_url !== null
				? String(body.base_url)
				: body?.baseUrl !== void 0 && body?.baseUrl !== null
					? String(body.baseUrl)
					: void 0,
		api_key:
			body?.key !== void 0 && body?.key !== null
				? String(body.key)
				: body?.api_key !== void 0 && body?.api_key !== null
					? String(body.api_key)
					: void 0,
		weight: hasWeight ? (toNumber(body?.weight, 1) ?? 1) : void 0,
		status: hasStatus ? toInternalStatus(body?.status) : void 0,
		rate_limit: hasRateLimit
			? (toNumber(body?.rate_limit ?? body?.rateLimit, 0) ?? 0)
			: void 0,
		models: models2,
		models_json: modelsToJson(models2),
		group_name: groupName,
		priority: hasPriority ? (toNumber(body?.priority, 0) ?? 0) : void 0,
		metadata_json:
			Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
	};
}
__name(normalizeChannelInput, "normalizeChannelInput");
function mergeMetadata(existing, incoming) {
	const base = safeJsonParse(existing, {});
	const updates = safeJsonParse(incoming, {});
	const merged = { ...base, ...updates };
	return Object.keys(merged).length > 0 ? JSON.stringify(merged) : null;
}
__name(mergeMetadata, "mergeMetadata");
function toNewApiChannel(channel) {
	const models2 = extractModelIds(channel);
	const metadata = safeJsonParse(channel.metadata_json, {});
	const createdTime = channel.created_at ? Date.parse(channel.created_at) : NaN;
	const updatedTime = channel.updated_at ? Date.parse(channel.updated_at) : NaN;
	return {
		id: channel.id,
		name: channel.name,
		type: Number(channel.type ?? 1),
		status: toNewApiStatus(channel.status),
		priority: Number(channel.priority ?? 0),
		weight: Number(channel.weight ?? 1),
		models: models2.join(","),
		group: channel.group_name ?? "",
		response_time: Number(channel.response_time_ms ?? 0),
		test_time: toNumber(channel.test_time, 0) ?? 0,
		base_url: channel.base_url,
		key: channel.api_key,
		created_time: Number.isNaN(createdTime)
			? void 0
			: Math.floor(createdTime / 1e3),
		updated_time: Number.isNaN(updatedTime)
			? void 0
			: Math.floor(updatedTime / 1e3),
		...metadata,
	};
}
__name(toNewApiChannel, "toNewApiChannel");
function normalizeBaseUrlInput(value) {
	if (!value) {
		return null;
	}
	return normalizeBaseUrl(String(value));
}
__name(normalizeBaseUrlInput, "normalizeBaseUrlInput");

// src/utils/newapi-response.ts
function newApiSuccess(c, data, message = "") {
	return c.json(
		{
			success: true,
			message,
			...(data !== void 0 ? { data } : {}),
		},
		200,
	);
}
__name(newApiSuccess, "newApiSuccess");
function newApiFailure(c, status, message) {
	return c.json(
		{
			success: false,
			message,
		},
		status,
	);
}
__name(newApiFailure, "newApiFailure");

// src/utils/paging.ts
function normalizePage(value, fallback) {
	const parsed = Number(value);
	if (Number.isNaN(parsed) || parsed <= 0) {
		return fallback;
	}
	return Math.floor(parsed);
}
__name(normalizePage, "normalizePage");
function normalizePageSize(value, fallback) {
	const parsed = Number(value);
	if (Number.isNaN(parsed) || parsed <= 0) {
		return fallback;
	}
	return Math.min(200, Math.floor(parsed));
}
__name(normalizePageSize, "normalizePageSize");
function normalizeStatusFilter(value) {
	if (!value) {
		return null;
	}
	const normalized = value.trim().toLowerCase();
	if (normalized === "all") {
		return null;
	}
	if (["enabled", "enable", "1", "active"].includes(normalized)) {
		return "active";
	}
	if (["disabled", "disable", "0", "2", "inactive"].includes(normalized)) {
		return "disabled";
	}
	return null;
}
__name(normalizeStatusFilter, "normalizeStatusFilter");
function normalizeBoolean(value) {
	if (!value) {
		return false;
	}
	const normalized = value.trim().toLowerCase();
	return normalized === "1" || normalized === "true" || normalized === "yes";
}
__name(normalizeBoolean, "normalizeBoolean");

// src/routes/newapiChannels.ts
var newapi = new Hono2({ strict: false });
newapi.use("*", newApiAuth);
function readTag(metadataJson) {
	const metadata = safeJsonParse(metadataJson, {});
	const tag = metadata.tag;
	if (tag === void 0 || tag === null) {
		return null;
	}
	return String(tag);
}
__name(readTag, "readTag");
async function handleModelsList(c) {
	const channels2 = await listActiveChannels(c.env.DB);
	const data = collectUniqueModelIds(channels2).map((id) => ({ id, name: id }));
	return newApiSuccess(c, data);
}
__name(handleModelsList, "handleModelsList");
newapi.get("/", async (c) => {
	const page = normalizePage(c.req.query("p") ?? c.req.query("page"), 1);
	const pageSize = normalizePageSize(
		c.req.query("page_size") ?? c.req.query("limit"),
		20,
	);
	const idSort = normalizeBoolean(c.req.query("id_sort"));
	const statusFilter = normalizeStatusFilter(c.req.query("status"));
	const typeFilter = c.req.query("type");
	const filters = {
		status: statusFilter ?? void 0,
		type: typeFilter ? Number(typeFilter) : void 0,
	};
	const offset = (page - 1) * pageSize;
	const orderBy = idSort ? "id" : "priority";
	const order = idSort ? "ASC" : "DESC";
	const total = await countChannels(c.env.DB, filters);
	const typeCounts = await countChannelsByType(c.env.DB, filters);
	typeCounts.all = total;
	const rows = await listChannels(c.env.DB, {
		filters,
		orderBy,
		order,
		limit: pageSize,
		offset,
	});
	const items = rows.map((row) => {
		const { key: _key, ...rest } = toNewApiChannel(row);
		return withNewApiDefaults(rest);
	});
	return newApiSuccess(c, {
		items,
		total,
		page,
		page_size: pageSize,
		type_counts: typeCounts,
	});
});
newapi.get("/search", async (c) => {
	const page = normalizePage(c.req.query("p") ?? c.req.query("page"), 1);
	const pageSize = normalizePageSize(
		c.req.query("page_size") ?? c.req.query("limit"),
		20,
	);
	const statusFilter = normalizeStatusFilter(c.req.query("status"));
	const typeFilter = c.req.query("type");
	const keyword = c.req.query("keyword") ?? "";
	const group = c.req.query("group") ?? "";
	const model = c.req.query("model") ?? "";
	const filters = {
		status: statusFilter ?? void 0,
		type: typeFilter ? Number(typeFilter) : void 0,
	};
	const rows = await listChannels(c.env.DB, {
		filters,
		orderBy: "priority",
		order: "DESC",
	});
	const filtered = rows.filter((row) => {
		const channel = row;
		const models2 = extractModelIds(channel);
		if (
			keyword &&
			!String(channel.name).includes(keyword) &&
			!String(channel.id).includes(keyword)
		) {
			return false;
		}
		if (group && !String(channel.group_name ?? "").includes(group)) {
			return false;
		}
		if (model && !models2.includes(model)) {
			return false;
		}
		return true;
	});
	const total = filtered.length;
	const offset = (page - 1) * pageSize;
	const items = filtered.slice(offset, offset + pageSize).map((row) => {
		const { key: _key, ...rest } = toNewApiChannel(row);
		return withNewApiDefaults(rest);
	});
	return newApiSuccess(c, {
		items,
		total,
		page,
		page_size: pageSize,
	});
});
newapi.put("/tag", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body?.tag) {
		return newApiFailure(c, 400, "tag\u4E0D\u80FD\u4E3A\u7A7A");
	}
	const tag = String(body.tag).trim();
	const nextTag =
		body.new_tag !== void 0 && body.new_tag !== null
			? String(body.new_tag).trim()
			: null;
	const nextWeight =
		body.weight !== void 0 && body.weight !== null ? Number(body.weight) : null;
	const nextPriority =
		body.priority !== void 0 && body.priority !== null
			? Number(body.priority)
			: null;
	const rows = await listChannels(c.env.DB);
	const targets = rows.filter((row) => readTag(row.metadata_json) === tag);
	for (const row of targets) {
		const metadata = safeJsonParse(row.metadata_json, {});
		if (nextTag && nextTag.length > 0) {
			metadata.tag = nextTag;
		} else if (metadata.tag === void 0 || metadata.tag === null) {
			metadata.tag = tag;
		}
		const mergedMetadata =
			Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
		const weight =
			nextWeight !== null && !Number.isNaN(nextWeight)
				? nextWeight
				: (row.weight ?? 1);
		const priority =
			nextPriority !== null && !Number.isNaN(nextPriority)
				? nextPriority
				: (row.priority ?? 0);
		await c.env.DB.prepare(
			"UPDATE channels SET weight = ?, priority = ?, metadata_json = ?, updated_at = ? WHERE id = ?",
		)
			.bind(weight, priority, mergedMetadata, nowIso(), row.id)
			.run();
	}
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c);
});
newapi.post("/tag/enabled", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body?.tag) {
		return newApiFailure(c, 400, "\u53C2\u6570\u9519\u8BEF");
	}
	const tag = String(body.tag).trim();
	const rows = await listChannels(c.env.DB);
	const targets = rows.filter((row) => readTag(row.metadata_json) === tag);
	for (const row of targets) {
		await c.env.DB.prepare(
			"UPDATE channels SET status = ?, updated_at = ? WHERE id = ?",
		)
			.bind("active", nowIso(), row.id)
			.run();
	}
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c);
});
newapi.post("/tag/disabled", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body?.tag) {
		return newApiFailure(c, 400, "\u53C2\u6570\u9519\u8BEF");
	}
	const tag = String(body.tag).trim();
	const rows = await listChannels(c.env.DB);
	const targets = rows.filter((row) => readTag(row.metadata_json) === tag);
	for (const row of targets) {
		await c.env.DB.prepare(
			"UPDATE channels SET status = ?, updated_at = ? WHERE id = ?",
		)
			.bind("disabled", nowIso(), row.id)
			.run();
	}
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c);
});
newapi.get("/models", handleModelsList);
newapi.get("/models_enabled", handleModelsList);
newapi.post("/", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body) {
		return newApiFailure(c, 400, "\u8BF7\u6C42\u4F53\u4E3A\u7A7A");
	}
	const mode = body.mode ?? "single";
	if (mode !== "single") {
		return newApiFailure(
			c,
			400,
			"\u4EC5\u652F\u6301\u5355\u6E20\u9053\u6DFB\u52A0",
		);
	}
	const payload = body.channel ?? body;
	const parsed = normalizeChannelInput(payload);
	if (!parsed.name || !parsed.base_url || !parsed.api_key) {
		return newApiFailure(c, 400, "\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570");
	}
	const existingId = parsed.id ?? generateToken("ch_");
	const exists = await channelExists(c.env.DB, existingId);
	if (exists) {
		return newApiFailure(c, 409, "\u6E20\u9053\u5DF2\u5B58\u5728");
	}
	const now = nowIso();
	const baseUrl = normalizeBaseUrlInput(parsed.base_url);
	await insertChannel(c.env.DB, {
		id: existingId,
		name: parsed.name,
		base_url: baseUrl ?? normalizeBaseUrl(String(parsed.base_url)),
		api_key: parsed.api_key,
		weight: parsed.weight ?? 1,
		status: parsed.status ?? "active",
		rate_limit: parsed.rate_limit ?? 0,
		models_json: parsed.models_json,
		type: parsed.type ?? 1,
		group_name: parsed.group_name ?? null,
		priority: parsed.priority ?? 0,
		metadata_json: parsed.metadata_json ?? null,
		created_at: now,
		updated_at: now,
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c);
});
newapi.put("/", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body) {
		return newApiFailure(c, 400, "\u8BF7\u6C42\u4F53\u4E3A\u7A7A");
	}
	const payload = body.channel ?? body;
	const id = payload?.id ?? body?.id;
	if (!id) {
		return newApiFailure(c, 400, "\u7F3A\u5C11\u6E20\u9053ID");
	}
	const current = await getChannelById(c.env.DB, String(id));
	if (!current) {
		return newApiFailure(c, 404, "\u6E20\u9053\u4E0D\u5B58\u5728");
	}
	const parsed = normalizeChannelInput(payload);
	const models2 =
		parsed.models.length > 0 ? parsed.models : extractModelIds(current);
	const mergedMetadata = mergeMetadata(
		current.metadata_json,
		parsed.metadata_json,
	);
	const nextBaseUrl =
		normalizeBaseUrlInput(parsed.base_url ?? current.base_url) ??
		String(current.base_url);
	await updateChannel(c.env.DB, String(id), {
		name: parsed.name ?? current.name,
		base_url: nextBaseUrl,
		api_key: parsed.api_key ?? current.api_key,
		weight: parsed.weight ?? current.weight ?? 1,
		status: parsed.status ?? current.status,
		rate_limit: parsed.rate_limit ?? current.rate_limit ?? 0,
		models_json: modelsToJson(models2),
		type: parsed.type ?? current.type ?? 1,
		group_name: parsed.group_name ?? current.group_name ?? null,
		priority: parsed.priority ?? current.priority ?? 0,
		metadata_json: mergedMetadata,
		system_token: current.system_token ?? null,
		system_userid: current.system_userid ?? null,
		checkin_enabled: current.checkin_enabled ?? 0,
		checkin_url: current.checkin_url ?? null,
		last_checkin_date: current.last_checkin_date ?? null,
		last_checkin_status: current.last_checkin_status ?? null,
		last_checkin_message: current.last_checkin_message ?? null,
		last_checkin_at: current.last_checkin_at ?? null,
		updated_at: nowIso(),
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c);
});
newapi.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const existing = await getChannelById(c.env.DB, id);
	if (!existing) {
		return newApiFailure(c, 404, "\u6E20\u9053\u4E0D\u5B58\u5728");
	}
	await deleteChannel(c.env.DB, id);
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c);
});
newapi.get("/test/:id", async (c) => {
	const id = c.req.param("id");
	const channel = await getChannelById(c.env.DB, id);
	if (!channel) {
		return newApiFailure(c, 404, "\u6E20\u9053\u4E0D\u5B58\u5728");
	}
	const result = await fetchChannelModels(
		String(channel.base_url),
		String(channel.api_key),
	);
	if (!result.ok) {
		await updateChannelTestResult(c.env.DB, id, {
			ok: false,
			elapsed: result.elapsed,
		});
		return newApiFailure(c, 502, "\u6E20\u9053\u6D4B\u8BD5\u5931\u8D25");
	}
	await updateChannelTestResult(c.env.DB, id, {
		ok: true,
		elapsed: result.elapsed,
		models: result.models,
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c, void 0, "\u6D4B\u8BD5\u6210\u529F");
});
newapi.post("/test", async (c) => {
	const body = await c.req.json().catch(() => null);
	const id = body?.id;
	if (!id) {
		return newApiFailure(c, 400, "\u7F3A\u5C11\u6E20\u9053ID");
	}
	const channel = await getChannelById(c.env.DB, String(id));
	if (!channel) {
		return newApiFailure(c, 404, "\u6E20\u9053\u4E0D\u5B58\u5728");
	}
	const result = await fetchChannelModels(
		String(channel.base_url),
		String(channel.api_key),
	);
	if (!result.ok) {
		await updateChannelTestResult(c.env.DB, String(id), {
			ok: false,
			elapsed: result.elapsed,
		});
		return newApiFailure(c, 502, "\u6E20\u9053\u6D4B\u8BD5\u5931\u8D25");
	}
	await updateChannelTestResult(c.env.DB, String(id), {
		ok: true,
		elapsed: result.elapsed,
		models: result.models,
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c, void 0, "\u6D4B\u8BD5\u6210\u529F");
});
newapi.get("/fetch_models/:id", async (c) => {
	const id = c.req.param("id");
	const channel = await getChannelById(c.env.DB, id);
	if (!channel) {
		return newApiFailure(c, 404, "\u6E20\u9053\u4E0D\u5B58\u5728");
	}
	const result = await fetchChannelModels(
		String(channel.base_url),
		String(channel.api_key),
	);
	if (!result.ok) {
		await updateChannelTestResult(c.env.DB, id, {
			ok: false,
			elapsed: result.elapsed,
		});
		return newApiFailure(c, 502, "\u83B7\u53D6\u6A21\u578B\u5931\u8D25");
	}
	await updateChannelTestResult(c.env.DB, id, {
		ok: true,
		elapsed: result.elapsed,
		models: result.models,
	});
	await bumpCacheVersions(c.env.DB, ["channels", "models"]);
	return newApiSuccess(c, result.models);
});
newapi.post("/fetch_models", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body?.base_url || !body?.key) {
		return newApiFailure(c, 400, "\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570");
	}
	const result = await fetchChannelModels(
		String(body.base_url),
		String(body.key),
	);
	if (!result.ok) {
		return newApiFailure(c, 502, "\u83B7\u53D6\u6A21\u578B\u5931\u8D25");
	}
	return newApiSuccess(c, result.models);
});
newapi.get("/:id", async (c) => {
	const id = c.req.param("id");
	const channel = await getChannelById(c.env.DB, id);
	if (!channel) {
		return newApiFailure(c, 404, "\u6E20\u9053\u4E0D\u5B58\u5728");
	}
	const metadata = safeJsonParse(channel.metadata_json, {});
	const modelMapping =
		metadata.model_mapping === void 0 || metadata.model_mapping === null
			? "{}"
			: String(metadata.model_mapping);
	const channelInfo =
		metadata.channel_info &&
		typeof metadata.channel_info === "object" &&
		!Array.isArray(metadata.channel_info)
			? metadata.channel_info
			: {
					is_multi_key: false,
					multi_key_mode: "random",
				};
	const output = withNewApiDefaults(toNewApiChannel(channel));
	return newApiSuccess(c, {
		...output,
		model_mapping: modelMapping,
		channel_info: channelInfo,
	});
});
var newapiChannels_default = newapi;

// src/routes/newapiGroups.ts
var groups = new Hono2({ strict: false });
groups.use("*", newApiAuth);
function collectGroups(rows) {
	const names = /* @__PURE__ */ new Set();
	for (const row of rows) {
		const raw2 = row.group_name;
		if (!raw2) {
			continue;
		}
		raw2
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0)
			.forEach((item) => {
				names.add(item);
			});
	}
	if (names.size === 0) {
		names.add("default");
	}
	return Array.from(names).sort((a, b) => a.localeCompare(b));
}
__name(collectGroups, "collectGroups");
groups.get("/", async (c) => {
	const result = await c.env.DB.prepare(
		"SELECT group_name FROM channels",
	).all();
	const data = collectGroups(result.results ?? []);
	return newApiSuccess(c, data);
});
var newapiGroups_default = groups;

// src/routes/newapiUsers.ts
var users = new Hono2({ strict: false });
users.use("*", newApiAuth);
users.get("/models", async (c) => {
	const channels2 = await listActiveChannels(c.env.DB);
	const map = await listModelsByChannelWithFallback(
		c.env.DB,
		channels2.map((channel) => ({
			id: channel.id,
			name: channel.name,
			models_json: channel.models_json,
		})),
	);
	const modelSet = /* @__PURE__ */ new Set();
	for (const models2 of map.values()) {
		for (const id of models2) {
			modelSet.add(id);
		}
	}
	const data = Array.from(modelSet).map((id) => ({
		id,
		name: id,
	}));
	return newApiSuccess(c, data);
});
var newapiUsers_default = users;

// src/services/quota.ts
function canConsumeQuota(quotaTotal, quotaUsed, increment) {
	if (quotaTotal === null || quotaTotal === void 0) {
		return true;
	}
	return quotaUsed + increment <= quotaTotal;
}
__name(canConsumeQuota, "canConsumeQuota");
function normalizeQuota(quotaTotal, quotaUsed) {
	return {
		quotaTotal: quotaTotal ?? null,
		quotaUsed: quotaUsed ?? 0,
	};
}
__name(normalizeQuota, "normalizeQuota");

// src/middleware/tokenAuth.ts
var tokenAuth = createMiddleware(async (c, next) => {
	const token = getBearerToken(c);
	if (!token) {
		return jsonError(c, 401, "token_required", "token_required");
	}
	const tokenHash = await sha256Hex(token);
	const cacheConfig = await getCacheConfig(c.env.DB);
	const record = await withJsonCache(
		{
			namespace: "tokens",
			key: tokenHash,
			version: cacheConfig.version_tokens,
			ttlSeconds: cacheConfig.tokens_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const row = await c.env.DB.prepare(
				"SELECT id, name, quota_total, quota_used, status, allowed_channels, expires_at FROM tokens WHERE key_hash = ?",
			)
				.bind(tokenHash)
				.first();
			return row ?? null;
		},
	);
	if (!record) {
		return jsonError(c, 401, "invalid_token", "invalid_token");
	}
	if (record.expires_at) {
		const parsed = Date.parse(record.expires_at);
		if (!Number.isNaN(parsed) && Date.now() >= parsed) {
			return jsonError(c, 403, "token_expired", "token_expired");
		}
	}
	if (record.status !== "active") {
		return jsonError(c, 403, "token_disabled", "token_disabled");
	}
	const quotaTotal =
		record.quota_total === null || record.quota_total === void 0
			? null
			: Number(record.quota_total);
	const quotaUsed = Number(record.quota_used ?? 0);
	const normalized = normalizeQuota(
		Number.isNaN(quotaTotal) ? null : quotaTotal,
		Number.isNaN(quotaUsed) ? 0 : quotaUsed,
	);
	if (!canConsumeQuota(normalized.quotaTotal, normalized.quotaUsed, 1)) {
		return jsonError(c, 402, "quota_exceeded", "quota_exceeded");
	}
	c.set("tokenRecord", {
		...record,
		quota_total: normalized.quotaTotal,
		quota_used: normalized.quotaUsed,
	});
	await next();
});

// src/services/site-metadata.ts
var DEFAULT_SITE_TYPE = "new-api";
var normalizeOverride = /* @__PURE__ */ __name((value) => {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	return normalizeBaseUrl(trimmed);
}, "normalizeOverride");
function parseSiteMetadata(raw2) {
	const parsed = safeJsonParse(raw2, {});
	const rawType = parsed.site_type;
	const site_type =
		rawType === "done-hub" ||
		rawType === "new-api" ||
		rawType === "subapi" ||
		rawType === "openai" ||
		rawType === "anthropic" ||
		rawType === "gemini"
			? rawType
			: rawType === "custom"
				? "subapi"
				: DEFAULT_SITE_TYPE;
	const overrides =
		parsed.endpoint_overrides && typeof parsed.endpoint_overrides === "object"
			? parsed.endpoint_overrides
			: {};
	return {
		site_type,
		endpoint_overrides: {
			chat_url: normalizeOverride(overrides.chat_url),
			image_url: normalizeOverride(overrides.image_url),
			embedding_url: normalizeOverride(overrides.embedding_url),
		},
	};
}
__name(parseSiteMetadata, "parseSiteMetadata");
function buildSiteMetadata(existing, updates) {
	const base = safeJsonParse(existing, {});
	if (updates.site_type) {
		base.site_type = updates.site_type;
	}
	if (updates.endpoint_overrides) {
		base.endpoint_overrides = {
			chat_url: normalizeOverride(updates.endpoint_overrides.chat_url),
			image_url: normalizeOverride(updates.endpoint_overrides.image_url),
			embedding_url: normalizeOverride(
				updates.endpoint_overrides.embedding_url,
			),
		};
	}
	return Object.keys(base).length > 0 ? JSON.stringify(base) : null;
}
__name(buildSiteMetadata, "buildSiteMetadata");

// src/services/channel-metadata.ts
function normalizeMapping(value) {
	if (!value) {
		return {};
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			return {};
		}
		const parsed = safeJsonParse(trimmed, null);
		return normalizeMapping(parsed);
	}
	if (typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	const output = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry === void 0 || entry === null) {
			continue;
		}
		output[String(key)] = String(entry);
	}
	return output;
}
__name(normalizeMapping, "normalizeMapping");
function readMetadataObject(raw2) {
	return safeJsonParse(raw2, {});
}
__name(readMetadataObject, "readMetadataObject");
function parseChannelMetadata(raw2) {
	const base = readMetadataObject(raw2);
	const site = parseSiteMetadata(raw2);
	return {
		site_type: site.site_type,
		endpoint_overrides: site.endpoint_overrides,
		model_mapping: normalizeMapping(base.model_mapping),
		header_overrides: normalizeMapping(
			base.header_override ?? base.header_overrides ?? base.headers,
		),
		query_overrides: normalizeMapping(
			base.query_override ?? base.query_overrides ?? base.query,
		),
	};
}
__name(parseChannelMetadata, "parseChannelMetadata");
function resolveProvider(siteType) {
	if (siteType === "anthropic") {
		return "anthropic";
	}
	if (siteType === "gemini") {
		return "gemini";
	}
	return "openai";
}
__name(resolveProvider, "resolveProvider");
function resolveMappedModel(modelMapping, model) {
	if (!model) {
		return modelMapping["*"] ?? null;
	}
	return modelMapping[model] ?? modelMapping["*"] ?? model;
}
__name(resolveMappedModel, "resolveMappedModel");

// src/wasm/generated/worker_wasm_core.js
function adapt_chat_json(direction, payload_json, model, now_ms) {
	let deferred4_0;
	let deferred4_1;
	try {
		const ptr0 = passStringToWasm0(
			direction,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ptr1 = passStringToWasm0(
			payload_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len1 = WASM_VECTOR_LEN;
		const ptr2 = passStringToWasm0(
			model,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len2 = WASM_VECTOR_LEN;
		const ret = wasm.adapt_chat_json(
			ptr0,
			len0,
			ptr1,
			len1,
			ptr2,
			len2,
			now_ms,
		);
		deferred4_0 = ret[0];
		deferred4_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
	}
}
__name(adapt_chat_json, "adapt_chat_json");
function adapt_sse_line(payload_json, upstream, downstream, _model) {
	let deferred5_0;
	let deferred5_1;
	try {
		const ptr0 = passStringToWasm0(
			payload_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ptr1 = passStringToWasm0(
			upstream,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len1 = WASM_VECTOR_LEN;
		const ptr2 = passStringToWasm0(
			downstream,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len2 = WASM_VECTOR_LEN;
		const ptr3 = passStringToWasm0(
			_model,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len3 = WASM_VECTOR_LEN;
		const ret = wasm.adapt_sse_line(
			ptr0,
			len0,
			ptr1,
			len1,
			ptr2,
			len2,
			ptr3,
			len3,
		);
		deferred5_0 = ret[0];
		deferred5_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
	}
}
__name(adapt_sse_line, "adapt_sse_line");
function apply_gemini_model_to_path(path, model) {
	let deferred3_0;
	let deferred3_1;
	try {
		const ptr0 = passStringToWasm0(
			path,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ptr1 = passStringToWasm0(
			model,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len1 = WASM_VECTOR_LEN;
		const ret = wasm.apply_gemini_model_to_path(ptr0, len0, ptr1, len1);
		deferred3_0 = ret[0];
		deferred3_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
	}
}
__name(apply_gemini_model_to_path, "apply_gemini_model_to_path");
function build_upstream_chat_request(
	payload_json,
	provider,
	model,
	endpoint,
	is_stream,
	endpoint_overrides_json,
) {
	let deferred6_0;
	let deferred6_1;
	try {
		const ptr0 = passStringToWasm0(
			payload_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ptr1 = passStringToWasm0(
			provider,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len1 = WASM_VECTOR_LEN;
		const ptr2 = passStringToWasm0(
			model,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len2 = WASM_VECTOR_LEN;
		const ptr3 = passStringToWasm0(
			endpoint,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len3 = WASM_VECTOR_LEN;
		const ptr4 = passStringToWasm0(
			endpoint_overrides_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len4 = WASM_VECTOR_LEN;
		const ret = wasm.build_upstream_chat_request(
			ptr0,
			len0,
			ptr1,
			len1,
			ptr2,
			len2,
			ptr3,
			len3,
			is_stream,
			ptr4,
			len4,
		);
		deferred6_0 = ret[0];
		deferred6_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
	}
}
__name(build_upstream_chat_request, "build_upstream_chat_request");
function create_weighted_order(weights_json, seed) {
	let deferred2_0;
	let deferred2_1;
	try {
		const ptr0 = passStringToWasm0(
			weights_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ret = wasm.create_weighted_order(ptr0, len0, seed);
		deferred2_0 = ret[0];
		deferred2_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
	}
}
__name(create_weighted_order, "create_weighted_order");
function detect_downstream_provider(path) {
	let deferred2_0;
	let deferred2_1;
	try {
		const ptr0 = passStringToWasm0(
			path,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ret = wasm.detect_downstream_provider(ptr0, len0);
		deferred2_0 = ret[0];
		deferred2_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
	}
}
__name(detect_downstream_provider, "detect_downstream_provider");
function detect_endpoint_type(provider, path) {
	let deferred3_0;
	let deferred3_1;
	try {
		const ptr0 = passStringToWasm0(
			provider,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ptr1 = passStringToWasm0(
			path,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len1 = WASM_VECTOR_LEN;
		const ret = wasm.detect_endpoint_type(ptr0, len0, ptr1, len1);
		deferred3_0 = ret[0];
		deferred3_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
	}
}
__name(detect_endpoint_type, "detect_endpoint_type");
function normalize_chat_request(
	payload_json,
	provider,
	endpoint,
	model,
	is_stream,
) {
	let deferred5_0;
	let deferred5_1;
	try {
		const ptr0 = passStringToWasm0(
			payload_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ptr1 = passStringToWasm0(
			provider,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len1 = WASM_VECTOR_LEN;
		const ptr2 = passStringToWasm0(
			endpoint,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len2 = WASM_VECTOR_LEN;
		const ptr3 = passStringToWasm0(
			model,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len3 = WASM_VECTOR_LEN;
		const ret = wasm.normalize_chat_request(
			ptr0,
			len0,
			ptr1,
			len1,
			ptr2,
			len2,
			ptr3,
			len3,
			is_stream,
		);
		deferred5_0 = ret[0];
		deferred5_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
	}
}
__name(normalize_chat_request, "normalize_chat_request");
function normalize_usage(payload_json) {
	let deferred2_0;
	let deferred2_1;
	try {
		const ptr0 = passStringToWasm0(
			payload_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ret = wasm.normalize_usage(ptr0, len0);
		deferred2_0 = ret[0];
		deferred2_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
	}
}
__name(normalize_usage, "normalize_usage");
function parse_downstream_model(provider, path, body_json) {
	let deferred4_0;
	let deferred4_1;
	try {
		const ptr0 = passStringToWasm0(
			provider,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ptr1 = passStringToWasm0(
			path,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len1 = WASM_VECTOR_LEN;
		const ptr2 = passStringToWasm0(
			body_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len2 = WASM_VECTOR_LEN;
		const ret = wasm.parse_downstream_model(ptr0, len0, ptr1, len1, ptr2, len2);
		deferred4_0 = ret[0];
		deferred4_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
	}
}
__name(parse_downstream_model, "parse_downstream_model");
function parse_downstream_stream(provider, path, body_json) {
	const ptr0 = passStringToWasm0(
		provider,
		wasm.__wbindgen_malloc,
		wasm.__wbindgen_realloc,
	);
	const len0 = WASM_VECTOR_LEN;
	const ptr1 = passStringToWasm0(
		path,
		wasm.__wbindgen_malloc,
		wasm.__wbindgen_realloc,
	);
	const len1 = WASM_VECTOR_LEN;
	const ptr2 = passStringToWasm0(
		body_json,
		wasm.__wbindgen_malloc,
		wasm.__wbindgen_realloc,
	);
	const len2 = WASM_VECTOR_LEN;
	const ret = wasm.parse_downstream_stream(ptr0, len0, ptr1, len1, ptr2, len2);
	return ret !== 0;
}
__name(parse_downstream_stream, "parse_downstream_stream");
function parse_usage_from_json(payload_json) {
	let deferred2_0;
	let deferred2_1;
	try {
		const ptr0 = passStringToWasm0(
			payload_json,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ret = wasm.parse_usage_from_json(ptr0, len0);
		deferred2_0 = ret[0];
		deferred2_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
	}
}
__name(parse_usage_from_json, "parse_usage_from_json");
function parse_usage_from_sse_line(line) {
	let deferred2_0;
	let deferred2_1;
	try {
		const ptr0 = passStringToWasm0(
			line,
			wasm.__wbindgen_malloc,
			wasm.__wbindgen_realloc,
		);
		const len0 = WASM_VECTOR_LEN;
		const ret = wasm.parse_usage_from_sse_line(ptr0, len0);
		deferred2_0 = ret[0];
		deferred2_1 = ret[1];
		return getStringFromWasm0(ret[0], ret[1]);
	} finally {
		wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
	}
}
__name(parse_usage_from_sse_line, "parse_usage_from_sse_line");
function __wbg_get_imports() {
	const import0 = {
		__proto__: null,
		__wbindgen_init_externref_table: () => {
			const table = wasm.__wbindgen_externrefs;
			const offset = table.grow(4);
			table.set(0, void 0);
			table.set(offset + 0, void 0);
			table.set(offset + 1, null);
			table.set(offset + 2, true);
			table.set(offset + 3, false);
		},
	};
	return {
		__proto__: null,
		"./worker_wasm_core_bg.js": import0,
	};
}
__name(__wbg_get_imports, "__wbg_get_imports");
function getStringFromWasm0(ptr, len) {
	ptr = ptr >>> 0;
	return decodeText(ptr, len);
}
__name(getStringFromWasm0, "getStringFromWasm0");
var cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
	if (
		cachedUint8ArrayMemory0 === null ||
		cachedUint8ArrayMemory0.byteLength === 0
	) {
		cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
	}
	return cachedUint8ArrayMemory0;
}
__name(getUint8ArrayMemory0, "getUint8ArrayMemory0");
function passStringToWasm0(arg, malloc, realloc) {
	if (realloc === void 0) {
		const buf = cachedTextEncoder.encode(arg);
		const ptr2 = malloc(buf.length, 1) >>> 0;
		getUint8ArrayMemory0()
			.subarray(ptr2, ptr2 + buf.length)
			.set(buf);
		WASM_VECTOR_LEN = buf.length;
		return ptr2;
	}
	let len = arg.length;
	let ptr = malloc(len, 1) >>> 0;
	const mem = getUint8ArrayMemory0();
	let offset = 0;
	for (; offset < len; offset++) {
		const code = arg.charCodeAt(offset);
		if (code > 127) break;
		mem[ptr + offset] = code;
	}
	if (offset !== len) {
		if (offset !== 0) {
			arg = arg.slice(offset);
		}
		ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
		const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
		const ret = cachedTextEncoder.encodeInto(arg, view);
		offset += ret.written;
		ptr = realloc(ptr, len, offset, 1) >>> 0;
	}
	WASM_VECTOR_LEN = offset;
	return ptr;
}
__name(passStringToWasm0, "passStringToWasm0");
var cachedTextDecoder = new TextDecoder("utf-8", {
	ignoreBOM: true,
	fatal: true,
});
cachedTextDecoder.decode();
var MAX_SAFARI_DECODE_BYTES = 2146435072;
var numBytesDecoded = 0;
function decodeText(ptr, len) {
	numBytesDecoded += len;
	if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
		cachedTextDecoder = new TextDecoder("utf-8", {
			ignoreBOM: true,
			fatal: true,
		});
		cachedTextDecoder.decode();
		numBytesDecoded = len;
	}
	return cachedTextDecoder.decode(
		getUint8ArrayMemory0().subarray(ptr, ptr + len),
	);
}
__name(decodeText, "decodeText");
var cachedTextEncoder = new TextEncoder();
if (!("encodeInto" in cachedTextEncoder)) {
	cachedTextEncoder.encodeInto = (arg, view) => {
		const buf = cachedTextEncoder.encode(arg);
		view.set(buf);
		return {
			read: arg.length,
			written: buf.length,
		};
	};
}
var WASM_VECTOR_LEN = 0;
var wasmModule;
var wasm;
function __wbg_finalize_init(instance, module) {
	wasm = instance.exports;
	wasmModule = module;
	cachedUint8ArrayMemory0 = null;
	wasm.__wbindgen_start();
	return wasm;
}
__name(__wbg_finalize_init, "__wbg_finalize_init");
function initSync(module) {
	if (wasm !== void 0) return wasm;
	if (module !== void 0) {
		if (Object.getPrototypeOf(module) === Object.prototype) {
			({ module } = module);
		} else {
			console.warn(
				"using deprecated parameters for `initSync()`; pass a single object instead",
			);
		}
	}
	const imports = __wbg_get_imports();
	if (!(module instanceof WebAssembly.Module)) {
		module = new WebAssembly.Module(module);
	}
	const instance = new WebAssembly.Instance(module, imports);
	return __wbg_finalize_init(instance, module);
}
__name(initSync, "initSync");

// src/wasm/core.ts
import wasmModule2 from "./97508e990db18cb89a43fb0fc20f3aeee1b615cb-worker_wasm_core_bg.wasm";

var toJson = /* @__PURE__ */ __name((value) => {
	try {
		return JSON.stringify(value);
	} catch {
		return "null";
	}
}, "toJson");
var randomSeed = /* @__PURE__ */ __name(() => {
	try {
		const values = new BigUint64Array(1);
		crypto.getRandomValues(values);
		const value = values[0];
		return value === 0n ? 1n : value;
	} catch {
		const fallback = BigInt(Date.now());
		return fallback === 0n ? 1n : fallback;
	}
}, "randomSeed");
var wasmCoreInitialized = false;
var ensureWasmCoreInitialized = /* @__PURE__ */ __name(() => {
	if (wasmCoreInitialized) {
		return;
	}
	initSync(wasmModule2);
	wasmCoreInitialized = true;
}, "ensureWasmCoreInitialized");
var warmupWasmCore = /* @__PURE__ */ __name(() => {
	ensureWasmCoreInitialized();
}, "warmupWasmCore");
var normalizeUsageViaWasm = /* @__PURE__ */ __name(
	(raw2) => safeJsonParse(normalize_usage(toJson(raw2)), null),
	"normalizeUsageViaWasm",
);
var parseUsageFromJsonViaWasm = /* @__PURE__ */ __name(
	(payload) => safeJsonParse(parse_usage_from_json(toJson(payload)), null),
	"parseUsageFromJsonViaWasm",
);
var parseUsageFromSseLineViaWasm = /* @__PURE__ */ __name(
	(line) => safeJsonParse(parse_usage_from_sse_line(line), null),
	"parseUsageFromSseLineViaWasm",
);
var createWeightedOrderIndicesViaWasm = /* @__PURE__ */ __name(
	(weights) =>
		safeJsonParse(create_weighted_order(toJson(weights), randomSeed()), null),
	"createWeightedOrderIndicesViaWasm",
);
var detectDownstreamProviderViaWasm = /* @__PURE__ */ __name(
	(path) => detect_downstream_provider(path),
	"detectDownstreamProviderViaWasm",
);
var detectEndpointTypeViaWasm = /* @__PURE__ */ __name(
	(provider, path) => detect_endpoint_type(provider, path),
	"detectEndpointTypeViaWasm",
);
var parseDownstreamModelViaWasm = /* @__PURE__ */ __name(
	(provider, path, body) => {
		const output = parse_downstream_model(provider, path, toJson(body ?? {}));
		return output.length > 0 ? output : null;
	},
	"parseDownstreamModelViaWasm",
);
var parseDownstreamStreamViaWasm = /* @__PURE__ */ __name(
	(provider, path, body) =>
		parse_downstream_stream(provider, path, toJson(body ?? {})),
	"parseDownstreamStreamViaWasm",
);
var applyGeminiModelToPathViaWasm = /* @__PURE__ */ __name(
	(path, model) => apply_gemini_model_to_path(path, model ?? ""),
	"applyGeminiModelToPathViaWasm",
);
var normalizeChatRequestViaWasm = /* @__PURE__ */ __name(
	(payload, provider, endpoint, model, isStream) =>
		safeJsonParse(
			normalize_chat_request(
				toJson(payload ?? {}),
				provider,
				endpoint,
				model ?? "",
				isStream,
			),
			null,
		),
	"normalizeChatRequestViaWasm",
);
var buildUpstreamChatRequestViaWasm = /* @__PURE__ */ __name(
	(payload, provider, model, endpoint, isStream, endpointOverrides) =>
		safeJsonParse(
			build_upstream_chat_request(
				toJson(payload ?? {}),
				provider,
				model ?? "",
				endpoint,
				isStream,
				toJson(endpointOverrides ?? {}),
			),
			null,
		),
	"buildUpstreamChatRequestViaWasm",
);
var adaptChatJsonViaWasm = /* @__PURE__ */ __name(
	(direction, payload, model) =>
		safeJsonParse(
			adapt_chat_json(
				direction,
				toJson(payload),
				model ?? "",
				BigInt(Date.now()),
			),
			null,
		),
	"adaptChatJsonViaWasm",
);
var adaptSseLineViaWasm = /* @__PURE__ */ __name(
	(payload, upstream, downstream, model) =>
		safeJsonParse(
			adapt_sse_line(toJson(payload), upstream, downstream, model ?? ""),
			null,
		),
	"adaptSseLineViaWasm",
);

// src/services/channels.ts
function createWeightedOrder(channels2) {
	const pool = channels2.map((channel) => ({
		...channel,
		weight: Math.max(1, Number(channel.weight) || 1),
	}));
	const wasmOrder = createWeightedOrderIndicesViaWasm(
		pool.map((channel) => channel.weight),
	);
	if (!wasmOrder || wasmOrder.length !== pool.length) {
		throw new Error("Invalid weighted order from wasm");
	}
	const mapped = wasmOrder
		.map((index) => pool[index])
		.filter((item) => Boolean(item));
	if (mapped.length !== pool.length) {
		throw new Error("Weighted order index out of range");
	}
	return mapped;
}
__name(createWeightedOrder, "createWeightedOrder");

// src/services/chat-response-adapter.ts
function writeSseEvent(controller, encoder2, event, data) {
	controller.enqueue(
		encoder2.encode(`event: ${event}
`),
	);
	controller.enqueue(
		encoder2.encode(`data: ${JSON.stringify(data)}

`),
	);
}
__name(writeSseEvent, "writeSseEvent");
function writeOpenAiSseChunk(controller, encoder2, data) {
	controller.enqueue(
		encoder2.encode(`data: ${JSON.stringify(data)}

`),
	);
}
__name(writeOpenAiSseChunk, "writeOpenAiSseChunk");
function parseJsonFromStreamLine(line) {
	const trimmed = line.trim();
	if (!trimmed) {
		return null;
	}
	const payload = trimmed.startsWith("data:")
		? trimmed.slice(5).trim()
		: trimmed;
	if (!payload || payload === "[DONE]") {
		return null;
	}
	return safeJsonParse(payload, null);
}
__name(parseJsonFromStreamLine, "parseJsonFromStreamLine");
function writeGeminiChunk(controller, encoder2, data) {
	controller.enqueue(
		encoder2.encode(`${JSON.stringify(data)}
`),
	);
}
__name(writeGeminiChunk, "writeGeminiChunk");
async function adaptOpenAiJsonToAnthropic(options) {
	const payload = await options.response
		.clone()
		.json()
		.catch(() => null);
	if (!payload) {
		throw new Error("Invalid OpenAI JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"openai_to_anthropic",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: openai_to_anthropic");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}
__name(adaptOpenAiJsonToAnthropic, "adaptOpenAiJsonToAnthropic");
function adaptOpenAiSseToAnthropic(options) {
	if (!options.response.body) {
		return options.response;
	}
	const encoder2 = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const messageId = `msg_${Date.now()}`;
	let buffer = "";
	let started = false;
	let stopped = false;
	let outputTokens = 0;
	const stream = new ReadableStream({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex).trim();
						buffer = buffer.slice(newlineIndex + 1);
						if (!line.startsWith("data:")) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const payload = line.slice(5).trim();
						if (!payload) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (payload === "[DONE]") {
							break;
						}
						const parsed = safeJsonParse(payload, null);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (!started) {
							started = true;
							writeSseEvent(controller, encoder2, "message_start", {
								type: "message_start",
								message: {
									id: messageId,
									type: "message",
									role: "assistant",
									model: options.model ?? "",
									content: [],
									stop_reason: null,
									stop_sequence: null,
									usage: {
										input_tokens: 0,
										output_tokens: 0,
									},
								},
							});
							writeSseEvent(controller, encoder2, "content_block_start", {
								type: "content_block_start",
								index: 0,
								content_block: { type: "text", text: "" },
							});
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"openai",
							"anthropic",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: openai_to_anthropic");
						}
						if (typeof wasmLine.outputTokens === "number") {
							outputTokens = wasmLine.outputTokens;
						}
						const deltaText =
							typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (deltaText) {
							writeSseEvent(controller, encoder2, "content_block_delta", {
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text: deltaText },
							});
						}
						const stopReason =
							typeof wasmLine.stopReason === "string"
								? wasmLine.stopReason
								: null;
						if (stopReason && !stopped) {
							stopped = true;
							writeSseEvent(controller, encoder2, "content_block_stop", {
								type: "content_block_stop",
								index: 0,
							});
							writeSseEvent(controller, encoder2, "message_delta", {
								type: "message_delta",
								delta: { stop_reason: stopReason, stop_sequence: null },
								usage: { output_tokens: outputTokens },
							});
							writeSseEvent(controller, encoder2, "message_stop", {
								type: "message_stop",
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (started && !stopped) {
					writeSseEvent(controller, encoder2, "content_block_stop", {
						type: "content_block_stop",
						index: 0,
					});
					writeSseEvent(controller, encoder2, "message_delta", {
						type: "message_delta",
						delta: { stop_reason: "end_turn", stop_sequence: null },
						usage: { output_tokens: outputTokens || 0 },
					});
					writeSseEvent(controller, encoder2, "message_stop", {
						type: "message_stop",
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, {
		status: options.response.status,
		headers,
	});
}
__name(adaptOpenAiSseToAnthropic, "adaptOpenAiSseToAnthropic");
async function adaptAnthropicJsonToOpenAi(options) {
	const payload = await options.response
		.clone()
		.json()
		.catch(() => null);
	if (!payload) {
		throw new Error("Invalid Anthropic JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"anthropic_to_openai",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: anthropic_to_openai");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}
__name(adaptAnthropicJsonToOpenAi, "adaptAnthropicJsonToOpenAi");
function adaptAnthropicSseToOpenAi(options) {
	if (!options.response.body) {
		return options.response;
	}
	const encoder2 = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const completionId = `chatcmpl_${Date.now()}`;
	const created = Math.floor(Date.now() / 1e3);
	let buffer = "";
	let started = false;
	let stopSent = false;
	const stream = new ReadableStream({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const rawLine = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const line = rawLine.trim();
						if (!line.startsWith("data:")) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const payload = line.slice(5).trim();
						if (!payload || payload === "[DONE]") {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const parsed = safeJsonParse(payload, null);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"anthropic",
							"openai",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: anthropic_to_openai");
						}
						const eventType =
							typeof wasmLine.eventType === "string" ? wasmLine.eventType : "";
						if (!started && eventType === "message_start") {
							started = true;
							writeOpenAiSseChunk(controller, encoder2, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: { role: "assistant" },
										finish_reason: null,
									},
								],
							});
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (eventType === "content_block_delta") {
							const text =
								typeof wasmLine.text === "string" ? wasmLine.text : "";
							if (text) {
								writeOpenAiSseChunk(controller, encoder2, {
									id: completionId,
									object: "chat.completion.chunk",
									created,
									model: options.model ?? "",
									choices: [
										{
											index: 0,
											delta: { content: text },
											finish_reason: null,
										},
									],
								});
							}
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						if (eventType === "message_delta" && !stopSent) {
							const finishReason =
								typeof wasmLine.finishReason === "string"
									? wasmLine.finishReason
									: null;
							writeOpenAiSseChunk(controller, encoder2, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: {},
										finish_reason: finishReason,
									},
								],
							});
							stopSent = true;
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				controller.enqueue(encoder2.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, {
		status: options.response.status,
		headers,
	});
}
__name(adaptAnthropicSseToOpenAi, "adaptAnthropicSseToOpenAi");
async function adaptGeminiJsonToOpenAi(options) {
	const payload = await options.response
		.clone()
		.json()
		.catch(() => null);
	if (!payload) {
		throw new Error("Invalid Gemini JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"gemini_to_openai",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: gemini_to_openai");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}
__name(adaptGeminiJsonToOpenAi, "adaptGeminiJsonToOpenAi");
async function adaptGeminiJsonToAnthropic(options) {
	const payload = await options.response
		.clone()
		.json()
		.catch(() => null);
	if (!payload) {
		throw new Error("Invalid Gemini JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"gemini_to_anthropic",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: gemini_to_anthropic");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}
__name(adaptGeminiJsonToAnthropic, "adaptGeminiJsonToAnthropic");
async function adaptOpenAiJsonToGemini(options) {
	const payload = await options.response
		.clone()
		.json()
		.catch(() => null);
	if (!payload) {
		throw new Error("Invalid OpenAI JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"openai_to_gemini",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: openai_to_gemini");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}
__name(adaptOpenAiJsonToGemini, "adaptOpenAiJsonToGemini");
async function adaptAnthropicJsonToGemini(options) {
	const payload = await options.response
		.clone()
		.json()
		.catch(() => null);
	if (!payload) {
		throw new Error("Invalid Anthropic JSON payload");
	}
	const wasmTransformed = adaptChatJsonViaWasm(
		"anthropic_to_gemini",
		payload,
		options.model,
	);
	if (!wasmTransformed) {
		throw new Error("WASM transform failed: anthropic_to_gemini");
	}
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(JSON.stringify(wasmTransformed), {
		status: options.response.status,
		headers,
	});
}
__name(adaptAnthropicJsonToGemini, "adaptAnthropicJsonToGemini");
function adaptGeminiSseToOpenAi(options) {
	if (!options.response.body) {
		return options.response;
	}
	const encoder2 = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const completionId = `chatcmpl_${Date.now()}`;
	const created = Math.floor(Date.now() / 1e3);
	let buffer = "";
	let started = false;
	let stopped = false;
	const stream = new ReadableStream({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"gemini",
							"openai",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: gemini_to_openai");
						}
						if (!started) {
							started = true;
							writeOpenAiSseChunk(controller, encoder2, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{
										index: 0,
										delta: { role: "assistant" },
										finish_reason: null,
									},
								],
							});
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (text) {
							writeOpenAiSseChunk(controller, encoder2, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [
									{ index: 0, delta: { content: text }, finish_reason: null },
								],
							});
						}
						const finishReason =
							typeof wasmLine.finishReason === "string"
								? wasmLine.finishReason
								: null;
						if (finishReason && !stopped) {
							stopped = true;
							writeOpenAiSseChunk(controller, encoder2, {
								id: completionId,
								object: "chat.completion.chunk",
								created,
								model: options.model ?? "",
								choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				controller.enqueue(encoder2.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}
__name(adaptGeminiSseToOpenAi, "adaptGeminiSseToOpenAi");
function adaptGeminiSseToAnthropic(options) {
	if (!options.response.body) {
		return options.response;
	}
	const encoder2 = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	const messageId = `msg_${Date.now()}`;
	let buffer = "";
	let started = false;
	let stopped = false;
	const stream = new ReadableStream({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"gemini",
							"anthropic",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: gemini_to_anthropic");
						}
						if (!started) {
							started = true;
							writeSseEvent(controller, encoder2, "message_start", {
								type: "message_start",
								message: {
									id: messageId,
									type: "message",
									role: "assistant",
									model: options.model ?? "",
									content: [],
									stop_reason: null,
									stop_sequence: null,
									usage: { input_tokens: 0, output_tokens: 0 },
								},
							});
							writeSseEvent(controller, encoder2, "content_block_start", {
								type: "content_block_start",
								index: 0,
								content_block: { type: "text", text: "" },
							});
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						if (text) {
							writeSseEvent(controller, encoder2, "content_block_delta", {
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text },
							});
						}
						const stopReason =
							typeof wasmLine.stopReason === "string"
								? wasmLine.stopReason
								: null;
						if (stopReason && !stopped) {
							stopped = true;
							writeSseEvent(controller, encoder2, "content_block_stop", {
								type: "content_block_stop",
								index: 0,
							});
							writeSseEvent(controller, encoder2, "message_delta", {
								type: "message_delta",
								delta: { stop_reason: stopReason, stop_sequence: null },
								usage: {
									output_tokens:
										typeof wasmLine.outputTokens === "number"
											? wasmLine.outputTokens
											: 0,
								},
							});
							writeSseEvent(controller, encoder2, "message_stop", {
								type: "message_stop",
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (started && !stopped) {
					writeSseEvent(controller, encoder2, "content_block_stop", {
						type: "content_block_stop",
						index: 0,
					});
					writeSseEvent(controller, encoder2, "message_delta", {
						type: "message_delta",
						delta: { stop_reason: "end_turn", stop_sequence: null },
						usage: { output_tokens: 0 },
					});
					writeSseEvent(controller, encoder2, "message_stop", {
						type: "message_stop",
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "text/event-stream; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}
__name(adaptGeminiSseToAnthropic, "adaptGeminiSseToAnthropic");
function adaptOpenAiSseToGemini(options) {
	if (!options.response.body) {
		return options.response;
	}
	const encoder2 = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	let buffer = "";
	let lastFinishReason = null;
	const stream = new ReadableStream({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"openai",
							"gemini",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: openai_to_gemini");
						}
						const text = typeof wasmLine.text === "string" ? wasmLine.text : "";
						const finishReason =
							typeof wasmLine.finishReason === "string"
								? wasmLine.finishReason
								: null;
						if (finishReason) {
							lastFinishReason = finishReason;
						}
						if (text || finishReason) {
							writeGeminiChunk(controller, encoder2, {
								candidates: [
									{
										content: {
											role: "model",
											parts: text ? [{ text }] : [],
										},
										finishReason: finishReason ?? void 0,
									},
								],
							});
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				if (!lastFinishReason) {
					writeGeminiChunk(controller, encoder2, {
						candidates: [
							{ content: { role: "model", parts: [] }, finishReason: "STOP" },
						],
					});
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}
__name(adaptOpenAiSseToGemini, "adaptOpenAiSseToGemini");
function adaptAnthropicSseToGemini(options) {
	if (!options.response.body) {
		return options.response;
	}
	const encoder2 = new TextEncoder();
	const decoder = new TextDecoder();
	const reader = options.response.body.getReader();
	let buffer = "";
	let lastFinishReason = null;
	const stream = new ReadableStream({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIndex = buffer.indexOf("\n");
					while (newlineIndex !== -1) {
						const line = buffer.slice(0, newlineIndex);
						buffer = buffer.slice(newlineIndex + 1);
						const parsed = parseJsonFromStreamLine(line);
						if (!parsed) {
							newlineIndex = buffer.indexOf("\n");
							continue;
						}
						const wasmLine = adaptSseLineViaWasm(
							parsed,
							"anthropic",
							"gemini",
							options.model,
						);
						if (!wasmLine) {
							throw new Error("WASM SSE transform failed: anthropic_to_gemini");
						}
						const eventType =
							typeof wasmLine.eventType === "string" ? wasmLine.eventType : "";
						if (eventType === "content_block_delta") {
							const text =
								typeof wasmLine.text === "string" ? wasmLine.text : "";
							if (text) {
								writeGeminiChunk(controller, encoder2, {
									candidates: [
										{
											content: { role: "model", parts: [{ text }] },
										},
									],
								});
							}
						}
						if (eventType === "message_delta") {
							lastFinishReason =
								(typeof wasmLine.finishReason === "string"
									? wasmLine.finishReason
									: null) ?? lastFinishReason;
						}
						newlineIndex = buffer.indexOf("\n");
					}
				}
				writeGeminiChunk(controller, encoder2, {
					candidates: [
						{
							content: { role: "model", parts: [] },
							finishReason: lastFinishReason ?? "STOP",
						},
					],
				});
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
	const headers = new Headers(options.response.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	headers.delete("content-length");
	return new Response(stream, { status: options.response.status, headers });
}
__name(adaptAnthropicSseToGemini, "adaptAnthropicSseToGemini");
var adapters = {
	"openai->anthropic": async (options) => {
		if (options.isStream) {
			return adaptOpenAiSseToAnthropic(options);
		}
		return adaptOpenAiJsonToAnthropic(options);
	},
	"openai->gemini": async (options) => {
		if (options.isStream) {
			return adaptOpenAiSseToGemini(options);
		}
		return adaptOpenAiJsonToGemini(options);
	},
	"anthropic->openai": async (options) => {
		if (options.isStream) {
			return adaptAnthropicSseToOpenAi(options);
		}
		return adaptAnthropicJsonToOpenAi(options);
	},
	"anthropic->gemini": async (options) => {
		if (options.isStream) {
			return adaptAnthropicSseToGemini(options);
		}
		return adaptAnthropicJsonToGemini(options);
	},
	"gemini->openai": async (options) => {
		if (options.isStream) {
			return adaptGeminiSseToOpenAi(options);
		}
		return adaptGeminiJsonToOpenAi(options);
	},
	"gemini->anthropic": async (options) => {
		if (options.isStream) {
			return adaptGeminiSseToAnthropic(options);
		}
		return adaptGeminiJsonToAnthropic(options);
	},
};
async function adaptChatResponse(options) {
	if (options.upstreamProvider === options.downstreamProvider) {
		return options.response;
	}
	const key = `${options.upstreamProvider}->${options.downstreamProvider}`;
	const adapter = adapters[key];
	if (!adapter) {
		return options.response;
	}
	return adapter(options);
}
__name(adaptChatResponse, "adaptChatResponse");

// src/services/provider-transform.ts
var TEXT_PART_TYPES = /* @__PURE__ */ new Set([
	"text",
	"input_text",
	"output_text",
	"message",
	"chunk",
]);
function toTextContent(value) {
	if (value === null || value === void 0) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value
			.map((entry) => {
				if (typeof entry === "string") {
					return entry;
				}
				if (entry && typeof entry === "object") {
					const part = entry;
					if (typeof part.text === "string") {
						return part.text;
					}
					if (
						typeof part.type === "string" &&
						TEXT_PART_TYPES.has(part.type) &&
						typeof part.text === "string"
					) {
						return part.text;
					}
				}
				return "";
			})
			.join("");
	}
	if (typeof value === "object") {
		const record = value;
		if (typeof record.text === "string") {
			return record.text;
		}
		if (Array.isArray(record.parts)) {
			return toTextContent(record.parts);
		}
		if (record.content !== void 0) {
			return toTextContent(record.content);
		}
	}
	return "";
}
__name(toTextContent, "toTextContent");
function toNumber2(value) {
	if (value === null || value === void 0) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}
__name(toNumber2, "toNumber");
function detectDownstreamProvider(path) {
	const provider = detectDownstreamProviderViaWasm(path);
	if (
		provider === "openai" ||
		provider === "anthropic" ||
		provider === "gemini"
	) {
		return provider;
	}
	throw new Error(`Unexpected provider from wasm: ${provider}`);
}
__name(detectDownstreamProvider, "detectDownstreamProvider");
function detectEndpointType(provider, path) {
	const endpoint = detectEndpointTypeViaWasm(provider, path);
	if (
		endpoint === "chat" ||
		endpoint === "responses" ||
		endpoint === "embeddings" ||
		endpoint === "images" ||
		endpoint === "passthrough"
	) {
		return endpoint;
	}
	throw new Error(`Unexpected endpoint from wasm: ${endpoint}`);
}
__name(detectEndpointType, "detectEndpointType");
function parseDownstreamModel(provider, path, body) {
	return parseDownstreamModelViaWasm(provider, path, body);
}
__name(parseDownstreamModel, "parseDownstreamModel");
function parseDownstreamStream(provider, path, body) {
	return parseDownstreamStreamViaWasm(provider, path, body);
}
__name(parseDownstreamStream, "parseDownstreamStream");
function normalizeChatRequest(provider, endpoint, body, model, isStream) {
	return normalizeChatRequestViaWasm(body, provider, endpoint, model, isStream);
}
__name(normalizeChatRequest, "normalizeChatRequest");
function normalizeEmbeddingRequest(provider, body, model) {
	if (!body) {
		return null;
	}
	if (provider === "gemini") {
		if (Array.isArray(body.requests)) {
			const inputs = body.requests
				.map((req) => {
					if (!req || typeof req !== "object") {
						return "";
					}
					const record = req;
					return toTextContent(record.content);
				})
				.filter((item) => item.length > 0);
			return { model, inputs };
		}
		const content = body.content ?? body.input;
		return { model, inputs: [toTextContent(content)] };
	}
	const input = body.input ?? body.inputs;
	if (Array.isArray(input)) {
		return {
			model,
			inputs: input.map((item) => toTextContent(item)),
		};
	}
	return { model, inputs: [toTextContent(input)] };
}
__name(normalizeEmbeddingRequest, "normalizeEmbeddingRequest");
function normalizeImageRequest(provider, body, model) {
	if (!body) {
		return null;
	}
	if (provider === "openai") {
		return {
			model,
			prompt: toTextContent(body.prompt),
			n: toNumber2(body.n),
			size: body.size ? String(body.size) : null,
			quality: body.quality ? String(body.quality) : null,
			style: body.style ? String(body.style) : null,
			responseFormat: body.response_format
				? String(body.response_format)
				: null,
		};
	}
	return {
		model,
		prompt: toTextContent(body.prompt ?? body.text ?? body.input),
		n: null,
		size: null,
		quality: null,
		style: null,
		responseFormat: null,
	};
}
__name(normalizeImageRequest, "normalizeImageRequest");
function resolveOverride(override, model) {
	if (!override) {
		return null;
	}
	const resolved = model ? override.replace("{model}", model) : override;
	if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
		return { absolute: resolved };
	}
	return { path: resolved };
}
__name(resolveOverride, "resolveOverride");
function buildUpstreamChatRequest(
	provider,
	normalized,
	model,
	endpoint,
	isStream,
	endpointOverrides,
) {
	return buildUpstreamChatRequestViaWasm(
		normalized,
		provider,
		model,
		endpoint,
		isStream,
		endpointOverrides,
	);
}
__name(buildUpstreamChatRequest, "buildUpstreamChatRequest");
function buildUpstreamEmbeddingRequest(
	provider,
	normalized,
	model,
	endpointOverrides,
) {
	if (provider === "openai") {
		const override2 = resolveOverride(endpointOverrides.embedding_url, model);
		return {
			path: override2?.path ?? "/v1/embeddings",
			absoluteUrl: override2?.absolute,
			body: {
				model,
				input:
					normalized.inputs.length === 1
						? normalized.inputs[0]
						: normalized.inputs,
			},
		};
	}
	if (provider === "anthropic") {
		return null;
	}
	const override = resolveOverride(endpointOverrides.embedding_url, model);
	const isBatch = normalized.inputs.length > 1;
	const defaultPath = isBatch
		? `/v1beta/models/${model}:batchEmbedContents`
		: `/v1beta/models/${model}:embedContent`;
	const body = isBatch
		? {
				requests: normalized.inputs.map((input) => ({
					content: { parts: [{ text: input }] },
				})),
			}
		: {
				content: { parts: [{ text: normalized.inputs[0] ?? "" }] },
			};
	return {
		path: override?.path ?? defaultPath,
		absoluteUrl: override?.absolute,
		body,
	};
}
__name(buildUpstreamEmbeddingRequest, "buildUpstreamEmbeddingRequest");
function buildUpstreamImageRequest(
	provider,
	normalized,
	model,
	endpointOverrides,
) {
	if (provider === "openai") {
		const override2 = resolveOverride(endpointOverrides.image_url, model);
		const body = {
			model,
			prompt: normalized.prompt,
		};
		if (normalized.n !== null) {
			body.n = normalized.n;
		}
		if (normalized.size !== null) {
			body.size = normalized.size;
		}
		if (normalized.quality !== null) {
			body.quality = normalized.quality;
		}
		if (normalized.style !== null) {
			body.style = normalized.style;
		}
		if (normalized.responseFormat !== null) {
			body.response_format = normalized.responseFormat;
		}
		return {
			path: override2?.path ?? "/v1/images/generations",
			absoluteUrl: override2?.absolute,
			body,
		};
	}
	if (provider === "anthropic") {
		return null;
	}
	const override = resolveOverride(endpointOverrides.image_url, model);
	return {
		path: override?.path ?? `/v1beta/models/${model}:generateImage`,
		absoluteUrl: override?.absolute,
		body: {
			prompt: normalized.prompt,
		},
	};
}
__name(buildUpstreamImageRequest, "buildUpstreamImageRequest");
function applyGeminiModelToPath(path, model) {
	return applyGeminiModelToPathViaWasm(path, model);
}
__name(applyGeminiModelToPath, "applyGeminiModelToPath");

// src/services/usage-limiter.ts
var LIMITER_NAME = "usage-limiter";
var DATE_KEY = "usage_date";
var COUNT_KEY = "usage_count";
var getUsageLimiterStub = /* @__PURE__ */ __name(
	(namespace) => namespace.get(namespace.idFromName(LIMITER_NAME)),
	"getUsageLimiterStub",
);
async function reserveUsageQueue(stub, options) {
	const limit = Math.max(0, Math.floor(options.limit));
	const amount = Math.max(1, Math.floor(options.amount ?? 1));
	const response = await stub.fetch("https://usage-limiter/reserve", {
		method: "POST",
		body: JSON.stringify({ limit, amount }),
	});
	if (!response.ok) {
		throw new Error(`usage_limiter_failed:${response.status}`);
	}
	const payload = await response.json();
	return payload;
}
__name(reserveUsageQueue, "reserveUsageQueue");
async function getUsageQueueStatus(stub) {
	const response = await stub.fetch("https://usage-limiter/status");
	if (!response.ok) {
		throw new Error(`usage_limiter_status_failed:${response.status}`);
	}
	const payload = await response.json();
	return payload;
}
__name(getUsageQueueStatus, "getUsageQueueStatus");
var UsageLimiter = class {
	state;
	constructor(state) {
		this.state = state;
	}
	async fetch(request) {
		const url = new URL(request.url);
		if (request.method === "POST" && url.pathname === "/reserve") {
			let limit = 0;
			let amount = 1;
			try {
				const payload = await request.json();
				limit = Math.max(0, Math.floor(Number(payload?.limit ?? 0)));
				amount = Math.max(1, Math.floor(Number(payload?.amount ?? 1)));
			} catch {
				return new Response("Invalid payload", { status: 400 });
			}
			const nowDate = beijingDateString(/* @__PURE__ */ new Date());
			let storedDate = (await this.state.storage.get(DATE_KEY)) ?? null;
			let count = (await this.state.storage.get(COUNT_KEY)) ?? 0;
			if (storedDate !== nowDate) {
				storedDate = nowDate;
				count = 0;
			}
			const nextCount = count + amount;
			const allowed = limit <= 0 ? true : nextCount <= limit;
			if (allowed) {
				count = nextCount;
			}
			await this.state.storage.put({
				[DATE_KEY]: storedDate,
				[COUNT_KEY]: count,
			});
			return new Response(
				JSON.stringify({
					ok: true,
					allowed,
					count,
					limit,
					date: storedDate,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}
		if (request.method === "GET" && url.pathname === "/status") {
			const nowDate = beijingDateString(/* @__PURE__ */ new Date());
			let storedDate = (await this.state.storage.get(DATE_KEY)) ?? null;
			let count = (await this.state.storage.get(COUNT_KEY)) ?? 0;
			if (storedDate !== nowDate) {
				storedDate = nowDate;
				count = 0;
			}
			return new Response(
				JSON.stringify({
					ok: true,
					date: storedDate,
					count,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}
		return new Response("Not Found", { status: 404 });
	}
};
__name(UsageLimiter, "UsageLimiter");

// src/services/usage.ts
var PRUNE_INTERVAL_MS = 60 * 60 * 1e3;
var lastPruneAt = 0;
var lastPruneRetention = null;
async function recordUsage(db, input) {
	const id = crypto.randomUUID();
	const createdAt = nowIso();
	const streamValue =
		input.stream === null || input.stream === void 0
			? null
			: typeof input.stream === "number"
				? input.stream
				: input.stream
					? 1
					: 0;
	const reasoningValue =
		input.reasoningEffort === null || input.reasoningEffort === void 0
			? null
			: String(input.reasoningEffort);
	await db
		.prepare(
			"INSERT INTO usage_logs (id, token_id, channel_id, model, request_path, total_tokens, prompt_tokens, completion_tokens, cost, latency_ms, first_token_latency_ms, stream, reasoning_effort, status, upstream_status, error_code, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			input.tokenId ?? null,
			input.channelId ?? null,
			input.model ?? null,
			input.requestPath ?? null,
			input.totalTokens ?? 0,
			input.promptTokens ?? 0,
			input.completionTokens ?? 0,
			input.cost ?? 0,
			input.latencyMs ?? 0,
			input.firstTokenLatencyMs ?? null,
			streamValue,
			reasoningValue,
			input.status ?? "ok",
			input.upstreamStatus ?? null,
			input.errorCode ?? null,
			input.errorMessage ?? null,
			createdAt,
		)
		.run();
	if (input.tokenId && input.totalTokens) {
		await db
			.prepare(
				"UPDATE tokens SET quota_used = quota_used + ?, updated_at = ? WHERE id = ?",
			)
			.bind(input.totalTokens, createdAt, input.tokenId)
			.run();
	}
}
__name(recordUsage, "recordUsage");
async function pruneUsageLogs(db, retentionDays) {
	const now = Date.now();
	if (
		lastPruneRetention === retentionDays &&
		now - lastPruneAt < PRUNE_INTERVAL_MS
	) {
		return;
	}
	lastPruneRetention = retentionDays;
	lastPruneAt = now;
	const cutoff = /* @__PURE__ */ new Date();
	cutoff.setDate(cutoff.getDate() - retentionDays);
	await db
		.prepare("DELETE FROM usage_logs WHERE created_at < ?")
		.bind(cutoff.toISOString())
		.run();
}
__name(pruneUsageLogs, "pruneUsageLogs");

// src/services/usage-queue.ts
function resolveNowSeconds(value) {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return Math.floor(value);
	}
	return Math.floor(Date.now() / 1e3);
}
__name(resolveNowSeconds, "resolveNowSeconds");
async function processUsageQueueEvent(db, event) {
	if (event.type === "usage") {
		await recordUsage(db, event.payload);
		return;
	}
	if (event.type === "capability_upsert") {
		const nowSeconds = resolveNowSeconds(event.payload.nowSeconds);
		await upsertChannelModelCapabilities(
			db,
			event.payload.channelId,
			event.payload.models,
			nowSeconds,
		);
		return;
	}
	if (event.type === "model_error") {
		const nowSeconds = resolveNowSeconds(event.payload.nowSeconds);
		await recordChannelModelError(
			db,
			event.payload.channelId,
			event.payload.model,
			event.payload.errorCode,
			nowSeconds,
		);
	}
}
__name(processUsageQueueEvent, "processUsageQueueEvent");
async function handleUsageQueue(batch, env, ctx) {
	const tasks = batch.messages.map(async (message) => {
		try {
			await processUsageQueueEvent(env.DB, message.body);
			message.ack();
		} catch (error) {
			console.error("[usage-queue:error]", {
				queue: batch.queue,
				error: error instanceof Error ? error.message : String(error),
			});
			message.retry();
		}
	});
	ctx.waitUntil(Promise.all(tasks));
}
__name(handleUsageQueue, "handleUsageQueue");

// src/utils/reasoning.ts
function readEffort(value) {
	if (typeof value === "string" || typeof value === "number") {
		return value;
	}
	return null;
}
__name(readEffort, "readEffort");
function extractReasoningEffort(input) {
	if (!input || typeof input !== "object") {
		return null;
	}
	const body = input;
	const direct = readEffort(body.reasoning_effort ?? body.reasoningEffort);
	if (direct !== null) {
		return direct;
	}
	const reasoning = body.reasoning;
	if (typeof reasoning === "string" || typeof reasoning === "number") {
		return reasoning;
	}
	if (reasoning && typeof reasoning === "object" && !Array.isArray(reasoning)) {
		return readEffort(reasoning.effort);
	}
	return null;
}
__name(extractReasoningEffort, "extractReasoningEffort");

// src/utils/usage.ts
var USAGE_HINTS = ['"usage"', '"usageMetadata"', '"usage_metadata"'];
function toNumber3(value) {
	if (value === null || value === void 0) {
		return null;
	}
	const num = Number(value);
	return Number.isFinite(num) ? num : null;
}
__name(toNumber3, "toNumber");
function pickNumber(...values) {
	for (const value of values) {
		const parsed = toNumber3(value);
		if (parsed !== null) {
			return parsed;
		}
	}
	return null;
}
__name(pickNumber, "pickNumber");
function normalizeUsage(raw2) {
	return normalizeUsageViaWasm(raw2);
}
__name(normalizeUsage, "normalizeUsage");
function parseUsageFromJson(payload) {
	return parseUsageFromJsonViaWasm(payload);
}
__name(parseUsageFromJson, "parseUsageFromJson");
function parseUsageFromHeaders(headers) {
	const jsonHeader = headers.get("x-usage") ?? headers.get("x-openai-usage");
	if (jsonHeader) {
		const parsed = safeJsonParse(jsonHeader, null);
		const normalized = normalizeUsage(parsed);
		if (normalized) {
			return normalized;
		}
	}
	const totalTokens = pickNumber(
		headers.get("x-usage-total-tokens"),
		headers.get("x-openai-usage-total-tokens"),
	);
	const promptTokens = pickNumber(
		headers.get("x-usage-prompt-tokens"),
		headers.get("x-openai-usage-prompt-tokens"),
	);
	const completionTokens = pickNumber(
		headers.get("x-usage-completion-tokens"),
		headers.get("x-openai-usage-completion-tokens"),
	);
	if (
		totalTokens === null &&
		promptTokens === null &&
		completionTokens === null
	) {
		return null;
	}
	return {
		totalTokens: totalTokens ?? (promptTokens ?? 0) + (completionTokens ?? 0),
		promptTokens: promptTokens ?? 0,
		completionTokens: completionTokens ?? 0,
	};
}
__name(parseUsageFromHeaders, "parseUsageFromHeaders");
async function parseUsageFromSse(response, options = {}) {
	if (!response.body) {
		return { usage: null, firstTokenLatencyMs: null };
	}
	const mode = options.mode ?? "full";
	if (mode === "off") {
		return { usage: null, firstTokenLatencyMs: null };
	}
	const maxBytes =
		typeof options.maxBytes === "number" && options.maxBytes > 0
			? options.maxBytes
			: Number.POSITIVE_INFINITY;
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let usage2 = null;
	const start = Date.now();
	let firstTokenLatencyMs = null;
	let bytesRead = 0;
	const payloadMayContainUsage = /* @__PURE__ */ __name((payload) => {
		if (!payload) {
			return false;
		}
		return USAGE_HINTS.some((hint) => payload.includes(hint));
	}, "payloadMayContainUsage");
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		bytesRead += value?.byteLength ?? 0;
		if (bytesRead > maxBytes) {
			await reader.cancel();
			break;
		}
		buffer += decoder.decode(value, { stream: true });
		let newlineIndex = buffer.indexOf("\n");
		while (newlineIndex !== -1) {
			const line = buffer.slice(0, newlineIndex).trim();
			buffer = buffer.slice(newlineIndex + 1);
			if (line.startsWith("data:")) {
				const payload = line.slice(5).trim();
				if (payload && payload !== "[DONE]") {
					if (firstTokenLatencyMs === null) {
						firstTokenLatencyMs = Date.now() - start;
					}
					if (mode === "lite" && !payloadMayContainUsage(payload)) {
						newlineIndex = buffer.indexOf("\n");
						continue;
					}
					const wasmCandidate = parseUsageFromSseLineViaWasm(line);
					if (wasmCandidate) {
						usage2 = wasmCandidate;
						if (mode === "lite") {
							await reader.cancel();
							return { usage: usage2, firstTokenLatencyMs };
						}
						newlineIndex = buffer.indexOf("\n");
						continue;
					}
				}
			}
			newlineIndex = buffer.indexOf("\n");
		}
	}
	const remaining = buffer.trim();
	if (remaining.startsWith("data:")) {
		const payload = remaining.slice(5).trim();
		if (payload && payload !== "[DONE]") {
			if (firstTokenLatencyMs === null) {
				firstTokenLatencyMs = Date.now() - start;
			}
			if (mode === "lite" && !payloadMayContainUsage(payload)) {
				return { usage: usage2, firstTokenLatencyMs };
			}
			const wasmCandidate = parseUsageFromSseLineViaWasm(remaining);
			if (wasmCandidate) {
				usage2 = wasmCandidate;
				return { usage: usage2, firstTokenLatencyMs };
			}
		}
	}
	return { usage: usage2, firstTokenLatencyMs };
}
__name(parseUsageFromSse, "parseUsageFromSse");

// src/routes/proxy.ts
var proxy = new Hono2();
function scheduleDbWrite(c, task) {
	if (c.executionCtx?.waitUntil) {
		c.executionCtx.waitUntil(task);
	} else {
		task.catch(() => void 0);
	}
}
__name(scheduleDbWrite, "scheduleDbWrite");
var FAILURE_COUNT_THRESHOLD = 2;
var activeStreamUsageParsers = 0;
function normalizeMessage(value) {
	if (!value) {
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}
__name(normalizeMessage, "normalizeMessage");
function getStreamUsageOptions(settings2) {
	return {
		mode: settings2.stream_usage_mode,
		maxBytes: Math.max(0, Math.floor(settings2.stream_usage_max_bytes)),
	};
}
__name(getStreamUsageOptions, "getStreamUsageOptions");
function getStreamUsageMaxParsers(settings2) {
	const maxParsers = Math.max(
		0,
		Math.floor(settings2.stream_usage_max_parsers),
	);
	if (maxParsers === 0) {
		return Number.POSITIVE_INFINITY;
	}
	return maxParsers;
}
__name(getStreamUsageMaxParsers, "getStreamUsageMaxParsers");
function createUsageEventScheduler(c, settings2) {
	const queue = c.env.USAGE_QUEUE;
	const queueBound = Boolean(queue);
	const queueEnabled = settings2.usage_queue_enabled && queueBound;
	const limiter = c.env.USAGE_LIMITER
		? getUsageLimiterStub(c.env.USAGE_LIMITER)
		: null;
	const directRatio = settings2.usage_queue_direct_write_ratio;
	const dailyLimit = settings2.usage_queue_daily_limit;
	let overLimit = false;
	let decisionChain = Promise.resolve();
	const decide = /* @__PURE__ */ __name(async () => {
		if (!queueEnabled) {
			return false;
		}
		if (overLimit) {
			return false;
		}
		if (Math.random() < directRatio) {
			return false;
		}
		if (!limiter || dailyLimit <= 0) {
			return true;
		}
		try {
			const result = await reserveUsageQueue(limiter, {
				limit: dailyLimit,
				amount: 1,
			});
			if (!result.allowed) {
				overLimit = true;
			}
			return result.allowed;
		} catch (error) {
			console.warn("[usage-limiter:reserve_failed]", {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}, "decide");
	const decideSequential = /* @__PURE__ */ __name(() => {
		const decision = decisionChain.then(decide);
		decisionChain = decision.then(() => void 0).catch(() => void 0);
		return decision;
	}, "decideSequential");
	return (event) => {
		const task = decideSequential().then((useQueue) => {
			if (useQueue && queue) {
				return queue.send(event).catch((error) => {
					console.warn("[usage-queue:send_failed]", {
						error: error instanceof Error ? error.message : String(error),
					});
					return processUsageQueueEvent(c.env.DB, event);
				});
			}
			return processUsageQueueEvent(c.env.DB, event);
		});
		scheduleDbWrite(c, task);
	};
}
__name(createUsageEventScheduler, "createUsageEventScheduler");
async function extractErrorDetails(response) {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		const payload = await response
			.clone()
			.json()
			.catch(() => null);
		if (payload && typeof payload === "object") {
			const raw2 = payload;
			const error = raw2.error ?? raw2;
			const errorCode =
				typeof error.code === "string"
					? error.code
					: typeof error.type === "string"
						? error.type
						: null;
			const errorMessage =
				typeof error.message === "string"
					? error.message
					: typeof raw2.message === "string"
						? raw2.message
						: null;
			return {
				errorCode,
				errorMessage: normalizeMessage(errorMessage),
			};
		}
	}
	const text = await response
		.clone()
		.text()
		.catch(() => "");
	return { errorCode: null, errorMessage: normalizeMessage(text) };
}
__name(extractErrorDetails, "extractErrorDetails");
function shouldCooldown(upstreamStatus, errorCode) {
	if (errorCode === "timeout" || errorCode === "exception") {
		return true;
	}
	if (upstreamStatus === 429 || upstreamStatus === 408) {
		return true;
	}
	if (upstreamStatus !== null && upstreamStatus >= 500) {
		return true;
	}
	return false;
}
__name(shouldCooldown, "shouldCooldown");
function channelSupportsModel(channel, model, verifiedModelsByChannel) {
	if (!model) {
		return true;
	}
	const verified = verifiedModelsByChannel.get(channel.id);
	const declaredModels = extractModels(channel).map((entry) => entry.id);
	const metadata = parseChannelMetadata(channel.metadata_json);
	const mapped = resolveMappedModel(metadata.model_mapping, model);
	const hasExplicitMapping = hasExplicitModelMapping(metadata, model);
	const declaredAllows =
		declaredModels.length > 0
			? (mapped ? declaredModels.includes(mapped) : false) ||
				declaredModels.includes(model)
			: null;
	const verifiedAllows =
		verified && verified.size > 0
			? (mapped ? verified.has(mapped) : false) || verified.has(model)
			: null;
	if (hasExplicitMapping) {
		if (verified && verified.size > 0) {
			return Boolean(verifiedAllows);
		}
		if (declaredModels.length > 0) {
			return Boolean(declaredAllows);
		}
		return true;
	}
	if (declaredModels.length > 0 && !declaredAllows) {
		return false;
	}
	if (verified && verified.size > 0) {
		return Boolean(verifiedAllows);
	}
	if (declaredModels.length > 0) {
		return true;
	}
	return false;
}
__name(channelSupportsModel, "channelSupportsModel");
function selectCandidateChannels(
	allowedChannels,
	downstreamModel,
	verifiedModelsByChannel = /* @__PURE__ */ new Map(),
) {
	const modelChannels = allowedChannels.filter((channel) =>
		channelSupportsModel(channel, downstreamModel, verifiedModelsByChannel),
	);
	return modelChannels;
}
__name(selectCandidateChannels, "selectCandidateChannels");
function hasExplicitModelMapping(metadata, downstreamModel) {
	if (downstreamModel) {
		return (
			metadata.model_mapping[downstreamModel] !== void 0 ||
			metadata.model_mapping["*"] !== void 0
		);
	}
	return metadata.model_mapping["*"] !== void 0;
}
__name(hasExplicitModelMapping, "hasExplicitModelMapping");
function resolveUpstreamModelForChannel(
	channel,
	metadata,
	downstreamModel,
	verifiedModelsByChannel = /* @__PURE__ */ new Map(),
) {
	const mapped = resolveMappedModel(metadata.model_mapping, downstreamModel);
	if (!downstreamModel || hasExplicitModelMapping(metadata, downstreamModel)) {
		return { model: mapped, autoMapped: false };
	}
	const verified = verifiedModelsByChannel.get(channel.id);
	const declaredModels = verified
		? Array.from(verified)
		: extractModels(channel).map((entry) => entry.id);
	if (declaredModels.length === 0) {
		return { model: mapped, autoMapped: false };
	}
	if (declaredModels.includes(downstreamModel)) {
		return { model: downstreamModel, autoMapped: false };
	}
	return { model: declaredModels[0] ?? mapped, autoMapped: true };
}
__name(resolveUpstreamModelForChannel, "resolveUpstreamModelForChannel");
function filterAllowedChannels(channels2, tokenRecord) {
	const allowed = safeJsonParse(tokenRecord.allowed_channels, null);
	if (!allowed || allowed.length === 0) {
		return channels2;
	}
	const allowedSet = new Set(allowed);
	return channels2.filter((channel) => allowedSet.has(channel.id));
}
__name(filterAllowedChannels, "filterAllowedChannels");
var normalizeTokenModels = /* @__PURE__ */ __name((raw2) => {
	const parsed = safeJsonParse(raw2 ?? null, null);
	if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
		return null;
	}
	return parsed.map((item) => String(item));
}, "normalizeTokenModels");
var selectTokenForModel = /* @__PURE__ */ __name((tokens2, model) => {
	if (tokens2.length === 0) {
		return { token: null, hasModelList: false };
	}
	if (!model) {
		return { token: tokens2[0], hasModelList: false };
	}
	const tokensWithModels = tokens2.map((token) => ({
		token,
		models: normalizeTokenModels(token.models_json),
	}));
	const hasModelList = tokensWithModels.some((entry) => entry.models);
	if (!hasModelList) {
		return { token: tokens2[0], hasModelList: false };
	}
	const match2 = tokensWithModels.find((entry) =>
		entry.models?.includes(model),
	);
	return { token: match2?.token ?? null, hasModelList };
}, "selectTokenForModel");
function resolveChannelBaseUrl(channel) {
	return normalizeBaseUrl(channel.base_url);
}
__name(resolveChannelBaseUrl, "resolveChannelBaseUrl");
function mergeQuery(base, querySuffix, overrides) {
	const [path, rawQuery] = base.split("?");
	const params = new URLSearchParams(rawQuery ?? "");
	if (querySuffix) {
		const suffix = querySuffix.startsWith("?")
			? querySuffix.slice(1)
			: querySuffix;
		const suffixParams = new URLSearchParams(suffix);
		suffixParams.forEach((value, key) => {
			params.set(key, value);
		});
	}
	for (const [key, value] of Object.entries(overrides)) {
		params.set(key, value);
	}
	const query = params.toString();
	return query ? `${path}?${query}` : path;
}
__name(mergeQuery, "mergeQuery");
function buildUpstreamHeaders(baseHeaders, provider, apiKey, overrides) {
	const headers = new Headers(baseHeaders);
	headers.delete("x-admin-token");
	headers.delete("x-api-key");
	if (provider === "openai") {
		headers.set("Authorization", `Bearer ${apiKey}`);
		headers.set("x-api-key", apiKey);
	} else if (provider === "anthropic") {
		headers.delete("Authorization");
		headers.set("x-api-key", apiKey);
		headers.set("anthropic-version", "2023-06-01");
	} else {
		headers.delete("Authorization");
		headers.set("x-goog-api-key", apiKey);
	}
	for (const [key, value] of Object.entries(overrides)) {
		headers.set(key, value);
	}
	return headers;
}
__name(buildUpstreamHeaders, "buildUpstreamHeaders");
async function fetchWithTimeout(url, init, timeoutMs) {
	if (timeoutMs <= 0) {
		return fetch(url, init);
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timer);
	}
}
__name(fetchWithTimeout, "fetchWithTimeout");
proxy.all("/*", tokenAuth, async (c) => {
	const tokenRecord = c.get("tokenRecord");
	const requestStart = Date.now();
	const [cacheConfig, runtimeSettings] = await Promise.all([
		getCacheConfig(c.env.DB),
		getProxyRuntimeSettings(c.env.DB),
	]);
	const scheduleUsageEvent = createUsageEventScheduler(c, runtimeSettings);
	let requestText = await c.req.text();
	const parsedBody = requestText ? safeJsonParse(requestText, null) : null;
	const downstreamProvider = detectDownstreamProvider(c.req.path);
	const endpointType = detectEndpointType(downstreamProvider, c.req.path);
	const downstreamModel = parseDownstreamModel(
		downstreamProvider,
		c.req.path,
		parsedBody,
	);
	const isStream = parseDownstreamStream(
		downstreamProvider,
		c.req.path,
		parsedBody,
	);
	const reasoningEffort = extractReasoningEffort(parsedBody);
	if (
		downstreamProvider === "openai" &&
		isStream &&
		parsedBody &&
		typeof parsedBody === "object"
	) {
		const streamOptions = parsedBody.stream_options;
		if (!streamOptions || typeof streamOptions !== "object") {
			parsedBody.stream_options = {
				include_usage: true,
			};
		} else if (streamOptions.include_usage !== true) {
			streamOptions.include_usage = true;
		}
		requestText = JSON.stringify(parsedBody);
	}
	let normalizedChat = null;
	let normalizedEmbedding = null;
	let normalizedImage = null;
	if (endpointType === "chat" || endpointType === "responses") {
		normalizedChat = normalizeChatRequest(
			downstreamProvider,
			endpointType,
			parsedBody,
			downstreamModel,
			isStream,
		);
	}
	if (endpointType === "embeddings") {
		normalizedEmbedding = normalizeEmbeddingRequest(
			downstreamProvider,
			parsedBody,
			downstreamModel,
		);
	}
	if (endpointType === "images") {
		normalizedImage = normalizeImageRequest(
			downstreamProvider,
			parsedBody,
			downstreamModel,
		);
	}
	const recordEarlyUsage = /* @__PURE__ */ __name((options) => {
		const latencyMs = Date.now() - requestStart;
		const errorMessage = options.message ?? options.code;
		scheduleUsageEvent({
			type: "usage",
			payload: {
				tokenId: tokenRecord.id,
				channelId: null,
				model: downstreamModel,
				requestPath: c.req.path,
				totalTokens: 0,
				latencyMs,
				firstTokenLatencyMs: isStream ? null : latencyMs,
				stream: isStream,
				reasoningEffort,
				status: "error",
				upstreamStatus: options.status,
				errorCode: options.code,
				errorMessage,
			},
		});
	}, "recordEarlyUsage");
	const recordAttemptUsage = /* @__PURE__ */ __name((options) => {
		const normalized = options.usage ?? {
			totalTokens: 0,
			promptTokens: 0,
			completionTokens: 0,
		};
		scheduleUsageEvent({
			type: "usage",
			payload: {
				tokenId: tokenRecord.id,
				channelId: options.channelId,
				model: downstreamModel,
				requestPath: options.requestPath,
				totalTokens: normalized.totalTokens,
				promptTokens: normalized.promptTokens,
				completionTokens: normalized.completionTokens,
				cost: 0,
				latencyMs: options.latencyMs,
				firstTokenLatencyMs: options.firstTokenLatencyMs,
				stream: isStream,
				reasoningEffort,
				status: options.status,
				upstreamStatus: options.upstreamStatus,
				errorCode: options.errorCode ?? null,
				errorMessage: options.errorMessage ?? null,
			},
		});
	}, "recordAttemptUsage");
	const activeChannels = await withJsonCache(
		{
			namespace: "channels",
			key: "active",
			version: cacheConfig.version_channels,
			ttlSeconds: cacheConfig.channels_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const result = await c.env.DB.prepare(
				"SELECT * FROM channels WHERE status = ?",
			)
				.bind("active")
				.all();
			return result.results ?? [];
		},
	);
	const channelIds = activeChannels.map((channel) => channel.id);
	const callTokenKey = channelIds.slice().sort().join(",");
	const callTokenRows = await withJsonCache(
		{
			namespace: "call_tokens",
			key: callTokenKey,
			version: cacheConfig.version_call_tokens,
			ttlSeconds: cacheConfig.call_tokens_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		() =>
			listCallTokens(c.env.DB, {
				channelIds,
			}),
	);
	const callTokenMap = /* @__PURE__ */ new Map();
	for (const row of callTokenRows) {
		const entry = {
			id: row.id,
			channel_id: row.channel_id,
			name: row.name,
			api_key: row.api_key,
			models_json: row.models_json ?? null,
		};
		const list = callTokenMap.get(row.channel_id) ?? [];
		list.push(entry);
		callTokenMap.set(row.channel_id, list);
	}
	const allowedChannels = filterAllowedChannels(activeChannels, tokenRecord);
	const verifiedModelsByChannel = await listVerifiedModelsByChannel(
		c.env.DB,
		allowedChannels.map((channel) => channel.id),
	);
	let candidates = selectCandidateChannels(
		allowedChannels,
		downstreamModel,
		verifiedModelsByChannel,
	);
	const cooldownMinutes = await getModelFailureCooldownMinutes(c.env.DB);
	const cooldownSeconds = Math.max(0, Math.floor(cooldownMinutes)) * 60;
	if (downstreamModel && cooldownSeconds > 0 && candidates.length > 0) {
		const coolingChannels = await listCoolingDownChannelsForModel(
			c.env.DB,
			candidates.map((channel) => channel.id),
			downstreamModel,
			cooldownSeconds,
			FAILURE_COUNT_THRESHOLD,
		);
		if (coolingChannels.size > 0) {
			candidates = candidates.filter(
				(channel) => !coolingChannels.has(channel.id),
			);
			if (candidates.length === 0) {
				console.warn("[proxy:model_cooldown]", {
					path: c.req.path,
					model: downstreamModel,
					cooldown_minutes: cooldownMinutes,
					blocked_channels: coolingChannels.size,
				});
				recordEarlyUsage({
					status: 503,
					code: "upstream_cooldown",
					message: "upstream_cooldown",
				});
				return jsonError(c, 503, "upstream_cooldown", "upstream_cooldown");
			}
		}
	}
	if (candidates.length === 0 && allowedChannels.length > 0) {
		console.warn("[proxy:no_compatible_channels]", {
			path: c.req.path,
			model: downstreamModel,
			downstream_provider: downstreamProvider,
			allowed_channels: allowedChannels.length,
		});
	}
	if (candidates.length === 0) {
		recordEarlyUsage({
			status: 503,
			code: "no_available_channels",
			message: "no_available_channels",
		});
		return jsonError(c, 503, "no_available_channels", "no_available_channels");
	}
	const targetPath = c.req.path;
	const querySuffix = c.req.url.includes("?")
		? `?${c.req.url.split("?")[1]}`
		: "";
	const maxRetries = Math.max(
		0,
		Math.floor(Number(runtimeSettings.retry_max_retries ?? 3)),
	);
	const ordered = createWeightedOrder(candidates).slice(0, maxRetries + 1);
	const upstreamTimeoutMs = Math.max(
		1e3,
		Number(runtimeSettings.upstream_timeout_ms ?? 3e4),
	);
	const nowSeconds = Math.floor(Date.now() / 1e3);
	let selectedResponse = null;
	let selectedChannel = null;
	let selectedUpstreamProvider = null;
	let selectedUpstreamModel = null;
	let selectedRequestPath = targetPath;
	let selectedImmediateUsage = null;
	let lastResponse = null;
	let lastChannel = null;
	let lastRequestPath = targetPath;
	let lastErrorDetails = null;
	for (const channel of ordered) {
		lastChannel = channel;
		const attemptStart = Date.now();
		const metadata = parseChannelMetadata(channel.metadata_json);
		const upstreamProvider = resolveProvider(metadata.site_type);
		const resolvedModel = resolveUpstreamModelForChannel(
			channel,
			metadata,
			downstreamModel,
			verifiedModelsByChannel,
		);
		const upstreamModel = resolvedModel.model;
		const recordModel = upstreamModel ?? downstreamModel;
		if (
			upstreamProvider === "gemini" &&
			!upstreamModel &&
			endpointType !== "passthrough"
		) {
			continue;
		}
		const baseUrl = resolveChannelBaseUrl(channel);
		const tokens2 = callTokenMap.get(channel.id) ?? [];
		const selection = selectTokenForModel(tokens2, recordModel);
		if (!selection.token && selection.hasModelList && recordModel) {
			continue;
		}
		const apiKey = selection.token?.api_key ?? channel.api_key;
		const headers = buildUpstreamHeaders(
			new Headers(c.req.header()),
			upstreamProvider,
			String(apiKey),
			metadata.header_overrides,
		);
		headers.delete("host");
		headers.delete("content-length");
		let upstreamRequestPath = targetPath;
		let upstreamFallbackPath;
		let upstreamBodyText = requestText || void 0;
		let absoluteUrl;
		const sameProvider = upstreamProvider === downstreamProvider;
		if (endpointType === "passthrough") {
			if (!sameProvider) {
				continue;
			}
			if (upstreamProvider === "gemini") {
				upstreamRequestPath = applyGeminiModelToPath(
					upstreamRequestPath,
					upstreamModel,
				);
			} else if (upstreamModel && parsedBody) {
				upstreamBodyText = JSON.stringify({
					...parsedBody,
					model: upstreamModel,
				});
			}
		} else if (sameProvider && parsedBody) {
			if (upstreamProvider === "gemini") {
				upstreamRequestPath = applyGeminiModelToPath(
					upstreamRequestPath,
					upstreamModel,
				);
			} else if (upstreamModel) {
				upstreamBodyText = JSON.stringify({
					...parsedBody,
					model: upstreamModel,
				});
			}
			if (endpointType === "chat" || endpointType === "responses") {
				if (metadata.endpoint_overrides.chat_url && normalizedChat) {
					const request = buildUpstreamChatRequest(
						upstreamProvider,
						normalizedChat,
						upstreamModel,
						endpointType,
						isStream,
						metadata.endpoint_overrides,
					);
					if (request) {
						upstreamRequestPath = request.path;
						absoluteUrl = request.absoluteUrl;
						upstreamFallbackPath = request.absoluteUrl
							? void 0
							: request.fallbackPath;
					}
				} else if (
					endpointType === "responses" &&
					upstreamProvider === "openai"
				) {
					upstreamFallbackPath = "/responses";
				}
			}
			if (
				endpointType === "embeddings" &&
				metadata.endpoint_overrides.embedding_url
			) {
				if (normalizedEmbedding) {
					const request = buildUpstreamEmbeddingRequest(
						upstreamProvider,
						normalizedEmbedding,
						upstreamModel,
						metadata.endpoint_overrides,
					);
					if (request) {
						upstreamRequestPath = request.path;
						absoluteUrl = request.absoluteUrl;
					}
				}
			}
			if (endpointType === "images" && metadata.endpoint_overrides.image_url) {
				if (normalizedImage) {
					const request = buildUpstreamImageRequest(
						upstreamProvider,
						normalizedImage,
						upstreamModel,
						metadata.endpoint_overrides,
					);
					if (request) {
						upstreamRequestPath = request.path;
						absoluteUrl = request.absoluteUrl;
					}
				}
			}
		} else {
			let built = null;
			if (endpointType === "chat" || endpointType === "responses") {
				if (!normalizedChat) {
					recordEarlyUsage({
						status: 400,
						code: "invalid_body",
						message: "invalid_body",
					});
					return jsonError(c, 400, "invalid_body", "invalid_body");
				}
				const request = buildUpstreamChatRequest(
					upstreamProvider,
					normalizedChat,
					upstreamModel,
					endpointType,
					isStream,
					metadata.endpoint_overrides,
				);
				if (!request) {
					continue;
				}
				built = {
					request,
					bodyText: request.body ? JSON.stringify(request.body) : void 0,
				};
			} else if (endpointType === "embeddings") {
				if (!normalizedEmbedding) {
					recordEarlyUsage({
						status: 400,
						code: "invalid_body",
						message: "invalid_body",
					});
					return jsonError(c, 400, "invalid_body", "invalid_body");
				}
				const request = buildUpstreamEmbeddingRequest(
					upstreamProvider,
					normalizedEmbedding,
					upstreamModel,
					metadata.endpoint_overrides,
				);
				if (!request) {
					continue;
				}
				built = {
					request,
					bodyText: request.body ? JSON.stringify(request.body) : void 0,
				};
			} else if (endpointType === "images") {
				if (!normalizedImage) {
					recordEarlyUsage({
						status: 400,
						code: "invalid_body",
						message: "invalid_body",
					});
					return jsonError(c, 400, "invalid_body", "invalid_body");
				}
				const request = buildUpstreamImageRequest(
					upstreamProvider,
					normalizedImage,
					upstreamModel,
					metadata.endpoint_overrides,
				);
				if (!request) {
					continue;
				}
				built = {
					request,
					bodyText: request.body ? JSON.stringify(request.body) : void 0,
				};
			}
			if (!built) {
				continue;
			}
			upstreamRequestPath = built.request.path;
			absoluteUrl = built.request.absoluteUrl;
			upstreamFallbackPath = built.request.absoluteUrl
				? void 0
				: built.request.fallbackPath;
			upstreamBodyText = built.bodyText;
		}
		const targetBase = absoluteUrl ?? `${baseUrl}${upstreamRequestPath}`;
		const target = mergeQuery(
			targetBase,
			querySuffix,
			metadata.query_overrides,
		);
		try {
			let response = await fetchWithTimeout(
				target,
				{
					method: c.req.method,
					headers,
					body: upstreamBodyText || void 0,
				},
				upstreamTimeoutMs,
			);
			let responsePath = upstreamRequestPath;
			if (
				(response.status === 400 || response.status === 404) &&
				upstreamFallbackPath
			) {
				const fallbackTargetBase = absoluteUrl
					? absoluteUrl
					: `${baseUrl}${upstreamFallbackPath}`;
				const fallbackTarget = mergeQuery(
					fallbackTargetBase,
					querySuffix,
					metadata.query_overrides,
				);
				response = await fetchWithTimeout(
					fallbackTarget,
					{
						method: c.req.method,
						headers,
						body: upstreamBodyText || void 0,
					},
					upstreamTimeoutMs,
				);
				responsePath = upstreamFallbackPath;
			}
			const attemptLatencyMs = Date.now() - attemptStart;
			lastResponse = response;
			lastRequestPath = responsePath;
			if (response.ok) {
				const headerUsage = parseUsageFromHeaders(response.headers);
				let jsonUsage = null;
				if (
					!isStream &&
					response.headers.get("content-type")?.includes("application/json")
				) {
					const data = await response
						.clone()
						.json()
						.catch(() => null);
					jsonUsage = parseUsageFromJson(data);
				}
				const immediateUsage = jsonUsage ?? headerUsage;
				if (!isStream && !immediateUsage) {
					lastErrorDetails = {
						upstreamStatus: response.status,
						errorCode: "usage_missing",
						errorMessage: "usage_missing",
					};
					recordAttemptUsage({
						channelId: channel.id,
						requestPath: responsePath,
						latencyMs: attemptLatencyMs,
						firstTokenLatencyMs: attemptLatencyMs,
						usage: null,
						status: "error",
						upstreamStatus: response.status,
						errorCode: "usage_missing",
						errorMessage: "usage_missing",
					});
					continue;
				}
				if (!isStream) {
					recordAttemptUsage({
						channelId: channel.id,
						requestPath: responsePath,
						latencyMs: attemptLatencyMs,
						firstTokenLatencyMs: attemptLatencyMs,
						usage: immediateUsage,
						status: "ok",
						upstreamStatus: response.status,
					});
				}
				selectedChannel = channel;
				selectedUpstreamProvider = upstreamProvider;
				selectedUpstreamModel = upstreamModel;
				selectedResponse = response;
				selectedRequestPath = responsePath;
				selectedImmediateUsage = immediateUsage;
				lastErrorDetails = null;
				if (recordModel) {
					scheduleUsageEvent({
						type: "capability_upsert",
						payload: {
							channelId: channel.id,
							models: [recordModel],
							nowSeconds,
						},
					});
				}
				break;
			}
			const errorInfo = await extractErrorDetails(response);
			lastErrorDetails = {
				upstreamStatus: response.status,
				errorCode: errorInfo.errorCode,
				errorMessage: errorInfo.errorMessage,
			};
			recordAttemptUsage({
				channelId: channel.id,
				requestPath: responsePath,
				latencyMs: attemptLatencyMs,
				firstTokenLatencyMs: isStream ? null : attemptLatencyMs,
				usage: null,
				status: "error",
				upstreamStatus: response.status,
				errorCode: errorInfo.errorCode,
				errorMessage: errorInfo.errorMessage,
			});
			const cooldownEligible = shouldCooldown(
				response.status,
				errorInfo.errorCode,
			);
			if (recordModel && cooldownSeconds > 0 && cooldownEligible) {
				scheduleUsageEvent({
					type: "model_error",
					payload: {
						channelId: channel.id,
						model: recordModel,
						errorCode: String(response.status),
						nowSeconds,
					},
				});
			}
			if (
				downstreamModel &&
				downstreamModel !== recordModel &&
				cooldownSeconds > 0 &&
				cooldownEligible
			) {
				scheduleUsageEvent({
					type: "model_error",
					payload: {
						channelId: channel.id,
						model: downstreamModel,
						errorCode: String(response.status),
						nowSeconds,
					},
				});
			}
		} catch (error) {
			const isTimeout =
				error instanceof Error &&
				(error.name === "AbortError" ||
					error.message.includes("upstream_timeout"));
			console.error("[proxy:upstream_exception]", {
				channel_id: channel.id,
				upstream_provider: upstreamProvider,
				path: upstreamRequestPath,
				model: downstreamModel,
				upstream_model: upstreamModel,
				timeout_ms: upstreamTimeoutMs,
				reason: isTimeout ? "timeout" : "exception",
				error: error instanceof Error ? error.message : String(error),
			});
			const attemptLatencyMs = Date.now() - attemptStart;
			lastErrorDetails = {
				upstreamStatus: null,
				errorCode: isTimeout ? "timeout" : "exception",
				errorMessage: normalizeMessage(
					error instanceof Error ? error.message : String(error),
				),
			};
			recordAttemptUsage({
				channelId: channel.id,
				requestPath: upstreamRequestPath,
				latencyMs: attemptLatencyMs,
				firstTokenLatencyMs: null,
				usage: null,
				status: "error",
				upstreamStatus: null,
				errorCode: lastErrorDetails.errorCode,
				errorMessage: lastErrorDetails.errorMessage,
			});
			const cooldownEligible = shouldCooldown(
				null,
				isTimeout ? "timeout" : "exception",
			);
			if (recordModel && cooldownSeconds > 0 && cooldownEligible) {
				scheduleUsageEvent({
					type: "model_error",
					payload: {
						channelId: channel.id,
						model: recordModel,
						errorCode: isTimeout ? "timeout" : "exception",
						nowSeconds,
					},
				});
			}
			if (
				downstreamModel &&
				downstreamModel !== recordModel &&
				cooldownSeconds > 0 &&
				cooldownEligible
			) {
				scheduleUsageEvent({
					type: "model_error",
					payload: {
						channelId: channel.id,
						model: downstreamModel,
						errorCode: isTimeout ? "timeout" : "exception",
						nowSeconds,
					},
				});
			}
			lastResponse = null;
		}
	}
	if (!selectedResponse && lastResponse && !lastResponse.ok) {
		console.warn("[proxy:upstream_exhausted]", {
			path: targetPath,
			model: downstreamModel,
			status: lastResponse.status,
			last_channel_id: lastChannel?.id ?? null,
			last_request_path: lastRequestPath,
		});
	}
	if (!selectedResponse) {
		if (lastResponse && !lastResponse.ok) {
			return lastResponse;
		}
		if (lastErrorDetails) {
			const errorCode = lastErrorDetails.errorCode ?? "upstream_unavailable";
			return jsonError(c, 502, errorCode, errorCode);
		}
		console.error("[proxy:unavailable]", {
			path: targetPath,
			model: downstreamModel,
			latency_ms: Date.now() - requestStart,
			last_channel_id: lastChannel?.id ?? null,
		});
		recordEarlyUsage({
			status: 502,
			code: "upstream_unavailable",
			message: "upstream_unavailable",
		});
		return jsonError(c, 502, "upstream_unavailable", "upstream_unavailable");
	}
	if (selectedChannel && isStream) {
		const selectedLatencyMs = Date.now() - requestStart;
		const executionCtx = c.executionCtx;
		const streamUsageOptions = getStreamUsageOptions(runtimeSettings);
		const streamUsageMaxParsers = getStreamUsageMaxParsers(runtimeSettings);
		const canParseStream =
			streamUsageOptions.mode !== "off" &&
			activeStreamUsageParsers < streamUsageMaxParsers;
		if (!canParseStream) {
			recordAttemptUsage({
				channelId: selectedChannel.id,
				requestPath: selectedRequestPath,
				latencyMs: selectedLatencyMs,
				firstTokenLatencyMs: null,
				usage: selectedImmediateUsage,
				status: "ok",
				upstreamStatus: selectedResponse.status,
			});
		} else {
			activeStreamUsageParsers += 1;
			const task = parseUsageFromSse(
				selectedResponse.clone(),
				streamUsageOptions,
			)
				.then((streamUsage) => {
					const usageValue = selectedImmediateUsage ?? streamUsage.usage;
					if (!usageValue) {
						recordAttemptUsage({
							channelId: selectedChannel.id,
							requestPath: selectedRequestPath,
							latencyMs: selectedLatencyMs,
							firstTokenLatencyMs: streamUsage.firstTokenLatencyMs,
							usage: null,
							status: "error",
							upstreamStatus: selectedResponse.status,
							errorCode: "usage_missing",
							errorMessage: "usage_missing",
						});
						return;
					}
					recordAttemptUsage({
						channelId: selectedChannel.id,
						requestPath: selectedRequestPath,
						latencyMs: selectedLatencyMs,
						firstTokenLatencyMs: streamUsage.firstTokenLatencyMs,
						usage: usageValue,
						status: "ok",
						upstreamStatus: selectedResponse.status,
					});
				})
				.catch(() => {
					recordAttemptUsage({
						channelId: selectedChannel.id,
						requestPath: selectedRequestPath,
						latencyMs: selectedLatencyMs,
						firstTokenLatencyMs: null,
						usage: selectedImmediateUsage,
						status: selectedImmediateUsage ? "ok" : "error",
						upstreamStatus: selectedResponse.status,
						errorCode: selectedImmediateUsage ? null : "usage_missing",
						errorMessage: selectedImmediateUsage ? null : "usage_missing",
					});
				})
				.finally(() => {
					activeStreamUsageParsers = Math.max(0, activeStreamUsageParsers - 1);
				});
			if (executionCtx?.waitUntil) {
				executionCtx.waitUntil(task);
			} else {
				task.catch(() => void 0);
			}
		}
	}
	if (selectedUpstreamProvider && endpointType === "chat") {
		const transformed = await adaptChatResponse({
			response: selectedResponse,
			upstreamProvider: selectedUpstreamProvider,
			downstreamProvider,
			model: selectedUpstreamModel ?? downstreamModel,
			isStream,
		});
		if (transformed !== selectedResponse) {
			return transformed;
		}
	}
	return selectedResponse;
});
var proxy_default = proxy;

// src/services/checkin.ts
var buildCheckinUrl = /* @__PURE__ */ __name((baseUrl) => {
	const normalized = normalizeBaseUrl(baseUrl);
	if (!normalized) {
		return "";
	}
	if (normalized.endsWith("/api")) {
		return `${normalized}/user/checkin`;
	}
	return `${normalized}/api/user/checkin`;
}, "buildCheckinUrl");
var resolveCheckinBaseUrl = /* @__PURE__ */ __name((site) => {
	if (site.checkin_url?.trim()) {
		return site.checkin_url;
	}
	return site.base_url;
}, "resolveCheckinBaseUrl");
var summarizePayload = /* @__PURE__ */ __name((payload) => {
	if (!payload) {
		return { type: "null" };
	}
	if (typeof payload !== "object") {
		return { type: typeof payload };
	}
	const record = payload;
	return {
		type: "object",
		keys: Object.keys(record).slice(0, 12),
		signed: record.signed ?? record.is_signed ?? record.already_signed,
		success: record.success,
		status: record.status,
		code: record.code,
		message: record.message ?? record.msg,
		error: record.error,
	};
}, "summarizePayload");
var logCheckin = /* @__PURE__ */ __name((site, stage, data) => {
	console.log("[checkin]", {
		id: site.id,
		name: site.name,
		stage,
		...data,
	});
}, "logCheckin");
var parseSigned = /* @__PURE__ */ __name((payload) => {
	if (!payload || typeof payload !== "object") {
		return false;
	}
	const record = payload;
	const message = String(
		record.message ?? record.msg ?? record.error ?? "",
	).trim();
	if (message.includes("\u5DF2\u7B7E\u5230")) {
		return true;
	}
	const data = record.data;
	if (data && typeof data === "object") {
		const dataRecord = data;
		if (dataRecord.checkin_date || dataRecord.checked_in || dataRecord.signed) {
			return true;
		}
	}
	return Boolean(
		record.signed ??
			record.is_signed ??
			record.checked ??
			record.checkin ??
			record.already_signed ??
			record.checked_in,
	);
}, "parseSigned");
var extractCheckinDate = /* @__PURE__ */ __name((payload) => {
	if (!payload || typeof payload !== "object") {
		return null;
	}
	const record = payload;
	const data = record.data;
	if (data && typeof data === "object") {
		const date = data.checkin_date;
		if (typeof date === "string" && date.trim()) {
			return date.trim();
		}
	}
	const message = String(
		record.message ?? record.msg ?? record.error ?? "",
	).trim();
	if (message.includes("\u5DF2\u7B7E\u5230")) {
		return beijingDateString();
	}
	return null;
}, "extractCheckinDate");
var parseMessage = /* @__PURE__ */ __name((payload, fallback) => {
	if (!payload || typeof payload !== "object") {
		return fallback;
	}
	const record = payload;
	const msg = record.message ?? record.msg ?? record.error;
	if (typeof msg === "string" && msg.trim()) {
		return msg;
	}
	return fallback;
}, "parseMessage");
var readJson = /* @__PURE__ */ __name(async (response) => {
	try {
		return await response.json();
	} catch (_error) {
		return null;
	}
}, "readJson");
var readError = /* @__PURE__ */ __name(async (response) => {
	const payload = await readJson(response);
	return parseMessage(payload, `HTTP ${response.status}`);
}, "readError");
async function runCheckin(site) {
	const endpoint = buildCheckinUrl(resolveCheckinBaseUrl(site));
	if (!endpoint) {
		return {
			id: site.id,
			name: site.name,
			status: "failed",
			message: "\u7AD9\u70B9 URL \u4E3A\u7A7A",
		};
	}
	if (!site.system_token || !site.system_token.trim()) {
		return {
			id: site.id,
			name: site.name,
			status: "failed",
			message: "\u7F3A\u5C11\u7CFB\u7EDF\u4EE4\u724C",
		};
	}
	const headers = new Headers();
	headers.set("Authorization", `Bearer ${site.system_token}`);
	if (site.system_userid?.trim()) {
		headers.set("New-Api-User", site.system_userid.trim());
	} else {
		return {
			id: site.id,
			name: site.name,
			status: "failed",
			message: "\u7F3A\u5C11 userid",
		};
	}
	try {
		logCheckin(site, "status:request", { endpoint });
		const statusResp = await fetch(endpoint, { method: "GET", headers });
		logCheckin(site, "status:response", {
			status: statusResp.status,
			ok: statusResp.ok,
		});
		if (!statusResp.ok) {
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: await readError(statusResp),
			};
		}
		const statusPayload = await readJson(statusResp);
		if (!statusPayload) {
			logCheckin(site, "status:invalid-json", {});
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: "\u7B7E\u5230\u72B6\u6001\u8FD4\u56DE\u975E JSON",
			};
		}
		logCheckin(site, "status:payload", {
			payload: summarizePayload(statusPayload),
		});
		if (parseSigned(statusPayload)) {
			return {
				id: site.id,
				name: site.name,
				status: "skipped",
				message: parseMessage(statusPayload, "\u4ECA\u65E5\u5DF2\u7B7E\u5230"),
				checkin_date: extractCheckinDate(statusPayload),
			};
		}
		const checkinResp = await fetch(endpoint, { method: "POST", headers });
		logCheckin(site, "checkin:response", {
			status: checkinResp.status,
			ok: checkinResp.ok,
		});
		if (!checkinResp.ok) {
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: await readError(checkinResp),
			};
		}
		const checkinPayload = await readJson(checkinResp);
		if (!checkinPayload) {
			logCheckin(site, "checkin:invalid-json", {});
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: "\u7B7E\u5230\u54CD\u5E94\u975E JSON",
			};
		}
		logCheckin(site, "checkin:payload", {
			payload: summarizePayload(checkinPayload),
		});
		if (parseSigned(checkinPayload)) {
			return {
				id: site.id,
				name: site.name,
				status: "skipped",
				message: parseMessage(checkinPayload, "\u4ECA\u65E5\u5DF2\u7B7E\u5230"),
				checkin_date: extractCheckinDate(checkinPayload),
			};
		}
		const record = checkinPayload;
		const codeValue = record.code;
		const numericCode =
			typeof codeValue === "number"
				? codeValue
				: typeof codeValue === "string"
					? Number(codeValue)
					: null;
		const explicitFailure = Boolean(
			record.success === false ||
				record.status === "error" ||
				(record.error && String(record.error).length > 0) ||
				(numericCode !== null &&
					!Number.isNaN(numericCode) &&
					numericCode !== 0),
		);
		if (explicitFailure) {
			logCheckin(site, "checkin:explicit-failure", {
				payload: summarizePayload(checkinPayload),
			});
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: parseMessage(checkinPayload, "\u7B7E\u5230\u5931\u8D25"),
				checkin_date: extractCheckinDate(checkinPayload),
			};
		}
		logCheckin(site, "verify:request", { endpoint });
		const verifyResp = await fetch(endpoint, { method: "GET", headers });
		logCheckin(site, "verify:response", {
			status: verifyResp.status,
			ok: verifyResp.ok,
		});
		if (!verifyResp.ok) {
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: await readError(verifyResp),
			};
		}
		const verifyPayload = await readJson(verifyResp);
		if (!verifyPayload) {
			logCheckin(site, "verify:invalid-json", {});
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: "\u7B7E\u5230\u9A8C\u8BC1\u54CD\u5E94\u975E JSON",
			};
		}
		logCheckin(site, "verify:payload", {
			payload: summarizePayload(verifyPayload),
		});
		if (!parseSigned(verifyPayload)) {
			return {
				id: site.id,
				name: site.name,
				status: "failed",
				message: parseMessage(verifyPayload, "\u7B7E\u5230\u672A\u751F\u6548"),
				checkin_date: extractCheckinDate(verifyPayload),
			};
		}
		return {
			id: site.id,
			name: site.name,
			status: "success",
			message: parseMessage(checkinPayload, "\u7B7E\u5230\u6210\u529F"),
			checkin_date:
				extractCheckinDate(checkinPayload) ?? extractCheckinDate(verifyPayload),
		};
	} catch (error) {
		return {
			id: site.id,
			name: site.name,
			status: "failed",
			message: error.message || "\u8BF7\u6C42\u5931\u8D25",
		};
	}
}
__name(runCheckin, "runCheckin");
function summarizeCheckin(results) {
	return results.reduce(
		(acc, item) => {
			acc.total += 1;
			if (item.status === "success") {
				acc.success += 1;
			} else if (item.status === "failed") {
				acc.failed += 1;
			} else {
				acc.skipped += 1;
			}
			return acc;
		},
		{ total: 0, success: 0, failed: 0, skipped: 0 },
	);
}
__name(summarizeCheckin, "summarizeCheckin");

// src/services/checkin-runner.ts
async function runCheckinAll(db, now = /* @__PURE__ */ new Date()) {
	const channelRows = await listChannels(db, { orderBy: "created_at" });
	const results = [];
	const today = beijingDateString(now);
	for (const channel of channelRows) {
		const rawEnabled = channel.checkin_enabled ?? 0;
		const checkinEnabled =
			typeof rawEnabled === "boolean" ? rawEnabled : Number(rawEnabled) === 1;
		if (!checkinEnabled) {
			continue;
		}
		const alreadyChecked =
			channel.last_checkin_date === today &&
			(channel.last_checkin_status === "success" ||
				channel.last_checkin_status === "skipped");
		if (alreadyChecked) {
			results.push({
				id: channel.id,
				name: channel.name,
				status: "skipped",
				message:
					channel.last_checkin_message ?? "\u4ECA\u65E5\u5DF2\u7B7E\u5230",
				checkin_date: channel.last_checkin_date ?? today,
			});
			continue;
		}
		const result = await runCheckin({
			id: channel.id,
			name: channel.name,
			base_url: String(channel.base_url),
			checkin_url: channel.checkin_url ?? null,
			system_token: channel.system_token ?? null,
			system_userid: channel.system_userid ?? null,
		});
		const checkinDate = result.checkin_date ?? today;
		await updateChannelCheckinResult(db, channel.id, {
			last_checkin_date: checkinDate,
			last_checkin_status: result.status,
			last_checkin_message: result.message,
			last_checkin_at: now.toISOString(),
		});
		results.push({ ...result, checkin_date: checkinDate });
	}
	return {
		results,
		summary: summarizeCheckin(results),
		runsAt: now.toISOString(),
	};
}
__name(runCheckinAll, "runCheckinAll");
async function runCheckinSingle(
	db,
	channelId,
	now = /* @__PURE__ */ new Date(),
) {
	const channel = await getChannelById(db, channelId);
	if (!channel) {
		return null;
	}
	const today = beijingDateString(now);
	const alreadyChecked =
		channel.last_checkin_date === today &&
		(channel.last_checkin_status === "success" ||
			channel.last_checkin_status === "skipped");
	if (alreadyChecked) {
		return {
			result: {
				id: channel.id,
				name: channel.name,
				status: "skipped",
				message:
					channel.last_checkin_message ?? "\u4ECA\u65E5\u5DF2\u7B7E\u5230",
				checkin_date: channel.last_checkin_date ?? today,
			},
			runsAt: now.toISOString(),
		};
	}
	const result = await runCheckin({
		id: channel.id,
		name: channel.name,
		base_url: String(channel.base_url),
		checkin_url: channel.checkin_url ?? null,
		system_token: channel.system_token ?? null,
		system_userid: channel.system_userid ?? null,
	});
	const checkinDate = result.checkin_date ?? today;
	await updateChannelCheckinResult(db, channel.id, {
		last_checkin_date: checkinDate,
		last_checkin_status: result.status,
		last_checkin_message: result.message,
		last_checkin_at: now.toISOString(),
	});
	return {
		result: { ...result, checkin_date: checkinDate },
		runsAt: now.toISOString(),
	};
}
__name(runCheckinSingle, "runCheckinSingle");

// src/services/checkin-scheduler.ts
var SCHEDULER_NAME = "checkin-scheduler";
var LAST_RUN_DATE_KEY = "last_run_date";
var getCheckinSchedulerStub = /* @__PURE__ */ __name(
	(namespace) => namespace.get(namespace.idFromName(SCHEDULER_NAME)),
	"getCheckinSchedulerStub",
);
var shouldRunCheckin = /* @__PURE__ */ __name(
	(now, scheduleTime, lastRunDate) => {
		const today = beijingDateString(now);
		if (lastRunDate && lastRunDate === today) {
			return false;
		}
		const scheduledAt = computeBeijingScheduleTime(now, scheduleTime);
		return now.getTime() >= scheduledAt.getTime();
	},
	"shouldRunCheckin",
);
var shouldResetLastRun = /* @__PURE__ */ __name(
	(currentTime, nextTime) => currentTime !== nextTime,
	"shouldResetLastRun",
);
var computeNextAlarmAt = /* @__PURE__ */ __name((now, scheduleTime, reset) => {
	if (!reset) {
		return computeNextBeijingRun(now, scheduleTime);
	}
	const scheduledAt = computeBeijingScheduleTime(now, scheduleTime);
	if (now.getTime() >= scheduledAt.getTime()) {
		return new Date(now.getTime() + 1e3);
	}
	return scheduledAt;
}, "computeNextAlarmAt");
var CheckinScheduler = class {
	state;
	env;
	constructor(state, env) {
		this.state = state;
		this.env = env;
	}
	async fetch(request) {
		const url = new URL(request.url);
		if (request.method === "POST" && url.pathname === "/reschedule") {
			let reset = false;
			try {
				const payload = await request.json();
				reset = Boolean(payload?.reset);
			} catch {
				reset = false;
			}
			const result = await this.reschedule(/* @__PURE__ */ new Date(), reset);
			return new Response(JSON.stringify({ ok: true, ...result }), {
				headers: { "Content-Type": "application/json" },
			});
		}
		if (request.method === "GET" && url.pathname === "/status") {
			const lastRunDate =
				(await this.state.storage.get(LAST_RUN_DATE_KEY)) ?? null;
			return new Response(
				JSON.stringify({
					ok: true,
					last_run_date: lastRunDate,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}
		return new Response("Not Found", { status: 404 });
	}
	async alarm() {
		await this.handleAlarm();
	}
	async handleAlarm() {
		const now = /* @__PURE__ */ new Date();
		const scheduleTime = await getCheckinScheduleTime(this.env.DB);
		const lastRunDate =
			(await this.state.storage.get(LAST_RUN_DATE_KEY)) ?? null;
		if (shouldRunCheckin(now, scheduleTime, lastRunDate)) {
			await runCheckinAll(this.env.DB, now);
			await this.state.storage.put(LAST_RUN_DATE_KEY, beijingDateString(now));
		}
		await this.reschedule(now);
	}
	async reschedule(now = /* @__PURE__ */ new Date(), reset = false) {
		const scheduleTime = await getCheckinScheduleTime(this.env.DB);
		if (reset) {
			await this.state.storage.delete(LAST_RUN_DATE_KEY);
		}
		const nextRun = computeNextAlarmAt(now, scheduleTime, reset);
		await this.state.storage.setAlarm(nextRun.getTime());
		return { nextRunAt: nextRun.toISOString() };
	}
};
__name(CheckinScheduler, "CheckinScheduler");

// src/routes/settings.ts
var settings = new Hono2();
settings.get("/", async (c) => {
	const retention = await getRetentionDays(c.env.DB);
	const sessionTtlHours = await getSessionTtlHours(c.env.DB);
	const adminPasswordSet = await isAdminPasswordSet(c.env.DB);
	const checkinScheduleTime = await getCheckinScheduleTime(c.env.DB);
	const modelFailureCooldownMinutes = await getModelFailureCooldownMinutes(
		c.env.DB,
	);
	const runtimeSettings = await getProxyRuntimeSettings(c.env.DB);
	const runtimeConfig = getRuntimeProxyConfig(c.env, runtimeSettings);
	const cacheConfig = await getCacheConfig(c.env.DB);
	let usageQueueStatus = null;
	if (c.env.USAGE_LIMITER) {
		try {
			const status = await getUsageQueueStatus(
				getUsageLimiterStub(c.env.USAGE_LIMITER),
			);
			usageQueueStatus = {
				count: status.count,
				date: status.date,
				limit: runtimeSettings.usage_queue_daily_limit,
				enabled: runtimeSettings.usage_queue_enabled,
				bound: runtimeConfig.usage_queue_bound,
				active: runtimeConfig.usage_queue_active,
			};
		} catch (error) {
			console.warn("[settings:usage_queue_status_failed]", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	} else {
		usageQueueStatus = {
			count: null,
			date: null,
			limit: runtimeSettings.usage_queue_daily_limit,
			enabled: runtimeSettings.usage_queue_enabled,
			bound: runtimeConfig.usage_queue_bound,
			active: runtimeConfig.usage_queue_active,
		};
	}
	return c.json({
		log_retention_days: retention,
		session_ttl_hours: sessionTtlHours,
		admin_password_set: adminPasswordSet,
		checkin_schedule_time: checkinScheduleTime,
		model_failure_cooldown_minutes: modelFailureCooldownMinutes,
		runtime_config: runtimeConfig,
		runtime_settings: runtimeSettings,
		cache_config: cacheConfig,
		usage_queue_status: usageQueueStatus,
	});
});
settings.put("/", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body) {
		return jsonError(c, 400, "settings_required", "settings_required");
	}
	let touched = false;
	let cacheTouched = false;
	let runtimeTouched = false;
	const cachePatch = {};
	const runtimePatch = {};
	let scheduleTouched = false;
	let scheduleReset = false;
	if (body.log_retention_days !== void 0) {
		const days = Number(body.log_retention_days);
		if (Number.isNaN(days) || days < 1) {
			return jsonError(
				c,
				400,
				"invalid_log_retention_days",
				"invalid_log_retention_days",
			);
		}
		await setRetentionDays(c.env.DB, days);
		touched = true;
	}
	if (body.session_ttl_hours !== void 0) {
		const hours = Number(body.session_ttl_hours);
		if (Number.isNaN(hours) || hours < 1) {
			return jsonError(
				c,
				400,
				"invalid_session_ttl_hours",
				"invalid_session_ttl_hours",
			);
		}
		await setSessionTtlHours(c.env.DB, hours);
		touched = true;
	}
	if (body.model_failure_cooldown_minutes !== void 0) {
		const minutes = Number(body.model_failure_cooldown_minutes);
		if (Number.isNaN(minutes) || minutes < 1) {
			return jsonError(
				c,
				400,
				"invalid_model_failure_cooldown_minutes",
				"invalid_model_failure_cooldown_minutes",
			);
		}
		await setModelFailureCooldownMinutes(c.env.DB, minutes);
		touched = true;
	}
	if (body.cache_enabled !== void 0) {
		const raw2 = body.cache_enabled;
		let enabled = null;
		if (typeof raw2 === "boolean") {
			enabled = raw2;
		} else if (typeof raw2 === "number") {
			enabled = raw2 !== 0;
		} else if (typeof raw2 === "string") {
			const normalized = raw2.trim().toLowerCase();
			if (["1", "true", "yes", "on"].includes(normalized)) {
				enabled = true;
			} else if (["0", "false", "no", "off"].includes(normalized)) {
				enabled = false;
			}
		}
		if (enabled === null) {
			return jsonError(
				c,
				400,
				"invalid_cache_enabled",
				"invalid_cache_enabled",
			);
		}
		cachePatch.enabled = enabled;
		cacheTouched = true;
	}
	if (body.cache_ttl_dashboard_seconds !== void 0) {
		const ttl = Number(body.cache_ttl_dashboard_seconds);
		if (Number.isNaN(ttl) || ttl < 0) {
			return jsonError(
				c,
				400,
				"invalid_cache_ttl_dashboard_seconds",
				"invalid_cache_ttl_dashboard_seconds",
			);
		}
		cachePatch.dashboardTtlSeconds = Math.floor(ttl);
		cacheTouched = true;
	}
	if (body.cache_ttl_usage_seconds !== void 0) {
		const ttl = Number(body.cache_ttl_usage_seconds);
		if (Number.isNaN(ttl) || ttl < 0) {
			return jsonError(
				c,
				400,
				"invalid_cache_ttl_usage_seconds",
				"invalid_cache_ttl_usage_seconds",
			);
		}
		cachePatch.usageTtlSeconds = Math.floor(ttl);
		cacheTouched = true;
	}
	if (body.cache_ttl_models_seconds !== void 0) {
		const ttl = Number(body.cache_ttl_models_seconds);
		if (Number.isNaN(ttl) || ttl < 0) {
			return jsonError(
				c,
				400,
				"invalid_cache_ttl_models_seconds",
				"invalid_cache_ttl_models_seconds",
			);
		}
		cachePatch.modelsTtlSeconds = Math.floor(ttl);
		cacheTouched = true;
	}
	if (body.cache_ttl_tokens_seconds !== void 0) {
		const ttl = Number(body.cache_ttl_tokens_seconds);
		if (Number.isNaN(ttl) || ttl < 0) {
			return jsonError(
				c,
				400,
				"invalid_cache_ttl_tokens_seconds",
				"invalid_cache_ttl_tokens_seconds",
			);
		}
		cachePatch.tokensTtlSeconds = Math.floor(ttl);
		cacheTouched = true;
	}
	if (body.cache_ttl_channels_seconds !== void 0) {
		const ttl = Number(body.cache_ttl_channels_seconds);
		if (Number.isNaN(ttl) || ttl < 0) {
			return jsonError(
				c,
				400,
				"invalid_cache_ttl_channels_seconds",
				"invalid_cache_ttl_channels_seconds",
			);
		}
		cachePatch.channelsTtlSeconds = Math.floor(ttl);
		cacheTouched = true;
	}
	if (body.cache_ttl_call_tokens_seconds !== void 0) {
		const ttl = Number(body.cache_ttl_call_tokens_seconds);
		if (Number.isNaN(ttl) || ttl < 0) {
			return jsonError(
				c,
				400,
				"invalid_cache_ttl_call_tokens_seconds",
				"invalid_cache_ttl_call_tokens_seconds",
			);
		}
		cachePatch.callTokensTtlSeconds = Math.floor(ttl);
		cacheTouched = true;
	}
	if (body.cache_ttl_settings_seconds !== void 0) {
		const ttl = Number(body.cache_ttl_settings_seconds);
		if (Number.isNaN(ttl) || ttl < 0) {
			return jsonError(
				c,
				400,
				"invalid_cache_ttl_settings_seconds",
				"invalid_cache_ttl_settings_seconds",
			);
		}
		cachePatch.settingsTtlSeconds = Math.floor(ttl);
		cacheTouched = true;
	}
	if (body.proxy_upstream_timeout_ms !== void 0) {
		const timeoutMs = Number(body.proxy_upstream_timeout_ms);
		if (Number.isNaN(timeoutMs) || timeoutMs < 0) {
			return jsonError(
				c,
				400,
				"invalid_proxy_upstream_timeout_ms",
				"invalid_proxy_upstream_timeout_ms",
			);
		}
		runtimePatch.upstream_timeout_ms = Math.floor(timeoutMs);
		runtimeTouched = true;
	}
	if (body.proxy_retry_max_retries !== void 0) {
		const retryMaxRetries = Number(body.proxy_retry_max_retries);
		if (
			Number.isNaN(retryMaxRetries) ||
			retryMaxRetries < 0 ||
			!Number.isInteger(retryMaxRetries)
		) {
			return jsonError(
				c,
				400,
				"invalid_proxy_retry_max_retries",
				"invalid_proxy_retry_max_retries",
			);
		}
		runtimePatch.retry_max_retries = retryMaxRetries;
		runtimeTouched = true;
	}
	if (body.proxy_stream_usage_mode !== void 0) {
		const mode = String(body.proxy_stream_usage_mode).trim().toLowerCase();
		if (!["full", "lite", "off"].includes(mode)) {
			return jsonError(
				c,
				400,
				"invalid_proxy_stream_usage_mode",
				"invalid_proxy_stream_usage_mode",
			);
		}
		runtimePatch.stream_usage_mode = mode;
		runtimeTouched = true;
	}
	if (body.proxy_stream_usage_max_bytes !== void 0) {
		const maxBytes = Number(body.proxy_stream_usage_max_bytes);
		if (Number.isNaN(maxBytes) || maxBytes < 0) {
			return jsonError(
				c,
				400,
				"invalid_proxy_stream_usage_max_bytes",
				"invalid_proxy_stream_usage_max_bytes",
			);
		}
		runtimePatch.stream_usage_max_bytes = Math.floor(maxBytes);
		runtimeTouched = true;
	}
	if (body.proxy_stream_usage_max_parsers !== void 0) {
		const maxParsers = Number(body.proxy_stream_usage_max_parsers);
		if (Number.isNaN(maxParsers) || maxParsers < 0) {
			return jsonError(
				c,
				400,
				"invalid_proxy_stream_usage_max_parsers",
				"invalid_proxy_stream_usage_max_parsers",
			);
		}
		runtimePatch.stream_usage_max_parsers = Math.floor(maxParsers);
		runtimeTouched = true;
	}
	if (body.proxy_usage_queue_enabled !== void 0) {
		const raw2 = body.proxy_usage_queue_enabled;
		let enabled = null;
		if (typeof raw2 === "boolean") {
			enabled = raw2;
		} else if (typeof raw2 === "number") {
			enabled = raw2 !== 0;
		} else if (typeof raw2 === "string") {
			const normalized = raw2.trim().toLowerCase();
			if (["1", "true", "yes", "on"].includes(normalized)) {
				enabled = true;
			} else if (["0", "false", "no", "off"].includes(normalized)) {
				enabled = false;
			}
		}
		if (enabled === null) {
			return jsonError(
				c,
				400,
				"invalid_proxy_usage_queue_enabled",
				"invalid_proxy_usage_queue_enabled",
			);
		}
		runtimePatch.usage_queue_enabled = enabled;
		runtimeTouched = true;
	}
	if (body.usage_queue_daily_limit !== void 0) {
		const limit = Number(body.usage_queue_daily_limit);
		if (Number.isNaN(limit) || limit < 0) {
			return jsonError(
				c,
				400,
				"invalid_usage_queue_daily_limit",
				"invalid_usage_queue_daily_limit",
			);
		}
		runtimePatch.usage_queue_daily_limit = Math.floor(limit);
		runtimeTouched = true;
	}
	if (body.usage_queue_direct_write_ratio !== void 0) {
		const ratio = Number(body.usage_queue_direct_write_ratio);
		if (Number.isNaN(ratio) || ratio < 0 || ratio > 1) {
			return jsonError(
				c,
				400,
				"invalid_usage_queue_direct_write_ratio",
				"invalid_usage_queue_direct_write_ratio",
			);
		}
		runtimePatch.usage_queue_direct_write_ratio = ratio;
		runtimeTouched = true;
	}
	if (typeof body.admin_password === "string" && body.admin_password.trim()) {
		const hash = await sha256Hex(body.admin_password.trim());
		await setAdminPasswordHash(c.env.DB, hash);
		touched = true;
	}
	if (body.checkin_schedule_time !== void 0) {
		const currentTime = await getCheckinScheduleTime(c.env.DB);
		const timeValue = String(body.checkin_schedule_time).trim();
		if (!/^\d{2}:\d{2}$/.test(timeValue)) {
			return jsonError(
				c,
				400,
				"invalid_checkin_schedule_time",
				"invalid_checkin_schedule_time",
			);
		}
		const [hour, minute] = timeValue.split(":").map((value) => Number(value));
		if (
			Number.isNaN(hour) ||
			Number.isNaN(minute) ||
			hour < 0 ||
			hour > 23 ||
			minute < 0 ||
			minute > 59
		) {
			return jsonError(
				c,
				400,
				"invalid_checkin_schedule_time",
				"invalid_checkin_schedule_time",
			);
		}
		await setCheckinScheduleTime(c.env.DB, timeValue);
		touched = true;
		scheduleTouched = true;
		scheduleReset = shouldResetLastRun(currentTime, timeValue);
	}
	if (cacheTouched) {
		await setCacheConfig(c.env.DB, cachePatch);
		touched = true;
	}
	if (runtimeTouched) {
		await setProxyRuntimeSettings(c.env.DB, runtimePatch);
		touched = true;
	}
	if (!touched) {
		return jsonError(c, 400, "settings_empty", "settings_empty");
	}
	if (scheduleTouched) {
		const scheduler = getCheckinSchedulerStub(c.env.CHECKIN_SCHEDULER);
		await scheduler.fetch("https://checkin-scheduler/reschedule", {
			method: "POST",
			...(scheduleReset ? { body: JSON.stringify({ reset: true }) } : {}),
		});
	}
	return c.json({ ok: true });
});
settings.post("/cache/refresh", async (c) => {
	await bumpCacheVersions(c.env.DB, [
		"dashboard",
		"usage",
		"models",
		"tokens",
		"channels",
		"call_tokens",
		"settings",
	]);
	return c.json({ ok: true });
});
var settings_default = settings;

// src/routes/sites.ts
var sites = new Hono2();
var parseSiteType = /* @__PURE__ */ __name((value) => {
	if (
		value === "done-hub" ||
		value === "new-api" ||
		value === "subapi" ||
		value === "openai" ||
		value === "anthropic" ||
		value === "gemini"
	) {
		return value;
	}
	if (value === "custom") {
		return "subapi";
	}
	return "new-api";
}, "parseSiteType");
var trimValue = /* @__PURE__ */ __name((value) => {
	if (typeof value !== "string") {
		return "";
	}
	return value.trim();
}, "trimValue");
var DEFAULT_BASE_URL_BY_TYPE = {
	openai: "https://api.openai.com",
	anthropic: "https://api.anthropic.com",
	gemini: "https://generativelanguage.googleapis.com",
};
var resolveBaseUrl = /* @__PURE__ */ __name((siteType, raw2) => {
	const trimmed = trimValue(raw2);
	if (trimmed) {
		return normalizeBaseUrl(trimmed);
	}
	const fallback = DEFAULT_BASE_URL_BY_TYPE[siteType];
	if (fallback) {
		return normalizeBaseUrl(fallback);
	}
	return "";
}, "resolveBaseUrl");
var parseBoolean = /* @__PURE__ */ __name((value, fallback = false) => {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "string") {
		return value.toLowerCase() === "true";
	}
	return fallback;
}, "parseBoolean");
var normalizeCallTokens = /* @__PURE__ */ __name(
	(rawTokens, fallbackApiKey) => {
		const tokens2 =
			rawTokens?.map((token, index) => ({
				name: trimValue(token.name) || `\u8C03\u7528\u4EE4\u724C${index + 1}`,
				api_key: trimValue(token.api_key),
			})) ?? [];
		const filtered = tokens2.filter((token) => token.api_key.length > 0);
		if (filtered.length > 0) {
			return filtered;
		}
		const fallback = trimValue(fallbackApiKey);
		if (fallback) {
			return [
				{
					name: "\u4E3B\u8C03\u7528\u4EE4\u724C",
					api_key: fallback,
				},
			];
		}
		return [];
	},
	"normalizeCallTokens",
);
var toCallTokenRows = /* @__PURE__ */ __name(
	(channelId, tokens2, now) =>
		tokens2.map((token) => ({
			id: generateToken("ct_"),
			channel_id: channelId,
			name: token.name,
			api_key: token.api_key,
			created_at: now,
			updated_at: now,
		})),
	"toCallTokenRows",
);
var buildSiteRecord = /* @__PURE__ */ __name((channel, callTokens) => {
	const metadata = parseSiteMetadata(channel.metadata_json);
	const rawEnabled = channel.checkin_enabled ?? 0;
	const checkinEnabled =
		typeof rawEnabled === "boolean" ? rawEnabled : Number(rawEnabled) === 1;
	return {
		id: channel.id,
		name: channel.name,
		base_url: channel.base_url,
		weight: Number(channel.weight ?? 1),
		status: channel.status,
		site_type: metadata.site_type,
		api_key: channel.api_key,
		system_token: channel.system_token ?? null,
		system_userid: channel.system_userid ?? null,
		checkin_enabled: checkinEnabled,
		checkin_id: null,
		checkin_url: channel.checkin_url ?? null,
		call_tokens: callTokens,
		last_checkin_date: channel.last_checkin_date ?? null,
		last_checkin_status: channel.last_checkin_status ?? null,
		last_checkin_message: channel.last_checkin_message ?? null,
		last_checkin_at: channel.last_checkin_at ?? null,
		created_at: channel.created_at ?? null,
		updated_at: channel.updated_at ?? null,
	};
}, "buildSiteRecord");
sites.get("/", async (c) => {
	const channels2 = await listChannels(c.env.DB, {
		orderBy: "created_at",
		order: "DESC",
	});
	const channelIds = channels2.map((channel) => channel.id);
	const callTokenRows = await listCallTokens(c.env.DB, {
		channelIds,
	});
	const callTokenMap = /* @__PURE__ */ new Map();
	for (const row of callTokenRows) {
		const entry = {
			id: row.id,
			name: row.name,
			api_key: row.api_key,
		};
		const list = callTokenMap.get(row.channel_id) ?? [];
		list.push(entry);
		callTokenMap.set(row.channel_id, list);
	}
	const sitesList = channels2.map((channel) => {
		const tokens2 = callTokenMap.get(channel.id) ?? [];
		const callTokens =
			tokens2.length > 0
				? tokens2
				: channel.api_key
					? [
							{
								id: "",
								name: "\u4E3B\u8C03\u7528\u4EE4\u724C",
								api_key: channel.api_key,
							},
						]
					: [];
		return buildSiteRecord(channel, callTokens);
	});
	return c.json({ sites: sitesList });
});
sites.post("/", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body) {
		return jsonError(c, 400, "missing_body", "missing_body");
	}
	const name = trimValue(body.name);
	if (!name) {
		return jsonError(c, 400, "missing_name", "missing_name");
	}
	const id = generateToken("ch_");
	const now = nowIso();
	const siteType = parseSiteType(body.site_type);
	const baseUrl = resolveBaseUrl(siteType, body.base_url);
	if (!baseUrl) {
		return jsonError(c, 400, "missing_base_url", "missing_base_url");
	}
	const callTokens = normalizeCallTokens(body.call_tokens, body.api_key);
	if (callTokens.length === 0) {
		return jsonError(c, 400, "missing_call_tokens", "missing_call_tokens");
	}
	const systemToken = trimValue(body.system_token ?? body.checkin_token);
	const systemUser = trimValue(body.system_userid ?? body.checkin_userid);
	const checkinUrl =
		body.checkin_url !== void 0 && body.checkin_url !== null
			? trimValue(body.checkin_url)
			: "";
	const checkinEnabled =
		siteType === "new-api"
			? parseBoolean(body.checkin_enabled, body.checkin_status === "active")
			: false;
	if (checkinEnabled && (!systemToken || !systemUser)) {
		return jsonError(
			c,
			400,
			"missing_checkin_credentials",
			"missing_checkin_credentials",
		);
	}
	const metadataJson = buildSiteMetadata(null, {
		site_type: siteType,
	});
	await insertChannel(c.env.DB, {
		id,
		name,
		base_url: baseUrl,
		api_key: callTokens[0].api_key,
		weight: Number(body.weight ?? 1),
		status: body.status ?? "active",
		rate_limit: 0,
		models_json: "[]",
		type: 1,
		group_name: null,
		priority: 0,
		metadata_json: metadataJson,
		system_token: systemToken || null,
		system_userid: systemUser || null,
		checkin_enabled: checkinEnabled ? 1 : 0,
		checkin_url: checkinUrl || null,
		last_checkin_date: null,
		last_checkin_status: null,
		last_checkin_message: null,
		last_checkin_at: null,
		created_at: now,
		updated_at: now,
	});
	await replaceCallTokensForChannel(
		c.env.DB,
		id,
		toCallTokenRows(id, callTokens, now),
	);
	await bumpCacheVersions(c.env.DB, ["channels", "models", "call_tokens"]);
	return c.json({ id });
});
sites.patch("/:id", async (c) => {
	const body = await c.req.json().catch(() => null);
	const id = c.req.param("id");
	if (!body) {
		return jsonError(c, 400, "missing_body", "missing_body");
	}
	const current = await getChannelById(c.env.DB, id);
	if (!current) {
		return jsonError(c, 404, "site_not_found", "site_not_found");
	}
	const currentMetadata = parseSiteMetadata(current.metadata_json);
	const nextSiteType = body.site_type
		? parseSiteType(body.site_type)
		: currentMetadata.site_type;
	const baseUrl =
		body.base_url !== void 0
			? resolveBaseUrl(nextSiteType, body.base_url)
			: normalizeBaseUrl(String(current.base_url));
	if (!baseUrl) {
		return jsonError(c, 400, "missing_base_url", "missing_base_url");
	}
	const shouldUpdateTokens =
		body.call_tokens !== void 0 || body.api_key !== void 0;
	const callTokens = shouldUpdateTokens
		? normalizeCallTokens(body.call_tokens, body.api_key ?? current.api_key)
		: [];
	if (shouldUpdateTokens && callTokens.length === 0) {
		return jsonError(c, 400, "missing_call_tokens", "missing_call_tokens");
	}
	const metadataJson =
		body.site_type !== void 0
			? buildSiteMetadata(current.metadata_json, {
					site_type: nextSiteType,
				})
			: (current.metadata_json ?? null);
	const nextSystemToken =
		body.system_token !== void 0 || body.checkin_token !== void 0
			? trimValue(body.system_token ?? body.checkin_token)
			: trimValue(current.system_token ?? "");
	const nextSystemUser =
		body.system_userid !== void 0 || body.checkin_userid !== void 0
			? trimValue(body.system_userid ?? body.checkin_userid)
			: trimValue(current.system_userid ?? "");
	const nextCheckinUrl =
		body.checkin_url !== void 0
			? body.checkin_url !== null
				? trimValue(body.checkin_url)
				: ""
			: trimValue(current.checkin_url ?? "");
	const currentCheckinEnabled =
		typeof current.checkin_enabled === "boolean"
			? current.checkin_enabled
			: Number(current.checkin_enabled ?? 0) === 1;
	const nextCheckinEnabled =
		nextSiteType === "new-api"
			? body.checkin_enabled !== void 0 || body.checkin_status !== void 0
				? parseBoolean(body.checkin_enabled, body.checkin_status === "active")
				: currentCheckinEnabled
			: false;
	if (nextCheckinEnabled && (!nextSystemToken || !nextSystemUser)) {
		return jsonError(
			c,
			400,
			"missing_checkin_credentials",
			"missing_checkin_credentials",
		);
	}
	await updateChannel(c.env.DB, id, {
		name: body.name ?? current.name,
		base_url: baseUrl,
		api_key: shouldUpdateTokens ? callTokens[0].api_key : current.api_key,
		weight: Number(body.weight ?? current.weight ?? 1),
		status: body.status ?? current.status,
		rate_limit: current.rate_limit ?? 0,
		models_json: current.models_json ?? "[]",
		type: current.type ?? 1,
		group_name: current.group_name ?? null,
		priority: current.priority ?? 0,
		metadata_json: metadataJson,
		system_token: nextSystemToken || null,
		system_userid: nextSystemUser || null,
		checkin_enabled: nextCheckinEnabled ? 1 : 0,
		checkin_url: nextCheckinUrl || null,
		last_checkin_date: current.last_checkin_date ?? null,
		last_checkin_status: current.last_checkin_status ?? null,
		last_checkin_message: current.last_checkin_message ?? null,
		last_checkin_at: current.last_checkin_at ?? null,
		updated_at: nowIso(),
	});
	if (shouldUpdateTokens) {
		await replaceCallTokensForChannel(
			c.env.DB,
			id,
			toCallTokenRows(id, callTokens, nowIso()),
		);
	}
	await bumpCacheVersions(c.env.DB, ["channels", "models", "call_tokens"]);
	return c.json({ ok: true });
});
sites.delete("/:id", async (c) => {
	const id = c.req.param("id");
	await deleteChannel(c.env.DB, id);
	await bumpCacheVersions(c.env.DB, ["channels", "models", "call_tokens"]);
	return c.json({ ok: true });
});
sites.post("/checkin-all", async (c) => {
	const result = await runCheckinAll(c.env.DB, /* @__PURE__ */ new Date());
	return c.json({
		results: result.results,
		summary: result.summary,
		runs_at: result.runsAt,
	});
});
sites.post("/:id/checkin", async (c) => {
	const id = c.req.param("id");
	const result = await runCheckinSingle(
		c.env.DB,
		id,
		/* @__PURE__ */ new Date(),
	);
	if (!result) {
		return jsonError(c, 404, "site_not_found", "site_not_found");
	}
	return c.json({
		result: result.result,
		runs_at: result.runsAt,
	});
});
var sites_default = sites;

// src/routes/tokens.ts
var tokens = new Hono2();
var normalizeAllowedChannels = /* @__PURE__ */ __name((raw2) => {
	if (!raw2) {
		return null;
	}
	const parsed = safeJsonParse(raw2, null);
	if (!Array.isArray(parsed) || parsed.length === 0) {
		return null;
	}
	return parsed.map((item) => String(item));
}, "normalizeAllowedChannels");
var normalizeExpiresAt = /* @__PURE__ */ __name((value) => {
	if (value === void 0) {
		return { value: null, valid: true };
	}
	if (value === null) {
		return { value: null, valid: true };
	}
	if (typeof value !== "string") {
		return { value: null, valid: false };
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return { value: null, valid: true };
	}
	const parsed = Date.parse(trimmed);
	if (Number.isNaN(parsed)) {
		return { value: null, valid: false };
	}
	return { value: new Date(parsed).toISOString(), valid: true };
}, "normalizeExpiresAt");
tokens.get("/", async (c) => {
	const result = await c.env.DB.prepare(
		"SELECT id, name, key_prefix, quota_total, quota_used, status, allowed_channels, expires_at, created_at, updated_at FROM tokens ORDER BY created_at DESC",
	).all();
	const tokens2 = (result.results ?? []).map((row) => ({
		...row,
		allowed_channels: normalizeAllowedChannels(row.allowed_channels ?? null),
	}));
	return c.json({ tokens: tokens2 });
});
tokens.post("/", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (!body?.name) {
		return jsonError(c, 400, "name_required", "name_required");
	}
	const rawToken = generateToken("sk-");
	const tokenHash = await sha256Hex(rawToken);
	const id = crypto.randomUUID();
	const now = nowIso();
	const keyPrefix = rawToken.slice(0, 8);
	const quotaTotal =
		body.quota_total === null || body.quota_total === void 0
			? null
			: Number(body.quota_total);
	const expiresAt = normalizeExpiresAt(body.expires_at);
	if (!expiresAt.valid) {
		return jsonError(c, 400, "invalid_expires_at", "invalid_expires_at");
	}
	await c.env.DB.prepare(
		"INSERT INTO tokens (id, name, key_hash, key_prefix, token_plain, quota_total, quota_used, status, allowed_channels, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	)
		.bind(
			id,
			body.name,
			tokenHash,
			keyPrefix,
			rawToken,
			Number.isNaN(quotaTotal) ? null : quotaTotal,
			0,
			body.status ?? "active",
			JSON.stringify(body.allowed_channels ?? null),
			expiresAt.value,
			now,
			now,
		)
		.run();
	await bumpCacheVersions(c.env.DB, ["tokens"]);
	return c.json({
		id,
		token: rawToken,
	});
});
tokens.patch("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json().catch(() => null);
	if (!body) {
		return jsonError(c, 400, "missing_body", "missing_body");
	}
	const existing = await c.env.DB.prepare("SELECT * FROM tokens WHERE id = ?")
		.bind(id)
		.first();
	if (!existing) {
		return jsonError(c, 404, "token_not_found", "token_not_found");
	}
	const existingAllowed = safeJsonParse(existing.allowed_channels, null);
	const quotaTotalUpdate =
		body.quota_total === null || body.quota_total === void 0
			? existing.quota_total
			: Number(body.quota_total);
	const quotaUsedUpdate =
		body.quota_used === null || body.quota_used === void 0
			? existing.quota_used
			: Number(body.quota_used);
	let expiresAtUpdate = existing.expires_at ?? null;
	if (Object.hasOwn(body, "expires_at")) {
		const normalized = normalizeExpiresAt(body.expires_at);
		if (!normalized.valid) {
			return jsonError(c, 400, "invalid_expires_at", "invalid_expires_at");
		}
		expiresAtUpdate = normalized.value;
	}
	await c.env.DB.prepare(
		"UPDATE tokens SET name = ?, quota_total = ?, quota_used = ?, status = ?, allowed_channels = ?, expires_at = ?, updated_at = ? WHERE id = ?",
	)
		.bind(
			body.name ?? existing.name,
			Number.isNaN(quotaTotalUpdate) ? existing.quota_total : quotaTotalUpdate,
			Number.isNaN(quotaUsedUpdate) ? existing.quota_used : quotaUsedUpdate,
			body.status ?? existing.status,
			JSON.stringify(body.allowed_channels ?? existingAllowed ?? null),
			expiresAtUpdate,
			nowIso(),
			id,
		)
		.run();
	await bumpCacheVersions(c.env.DB, ["tokens"]);
	return c.json({ ok: true });
});
tokens.get("/:id/reveal", async (c) => {
	const id = c.req.param("id");
	const record = await c.env.DB.prepare(
		"SELECT token_plain FROM tokens WHERE id = ?",
	)
		.bind(id)
		.first();
	if (!record) {
		return jsonError(c, 404, "token_not_found", "token_not_found");
	}
	return c.json({ token: record.token_plain ?? null });
});
tokens.delete("/:id", async (c) => {
	const id = c.req.param("id");
	await c.env.DB.prepare("DELETE FROM tokens WHERE id = ?").bind(id).run();
	await bumpCacheVersions(c.env.DB, ["tokens"]);
	return c.json({ ok: true });
});
var tokens_default = tokens;

// src/routes/usage.ts
var usage = new Hono2();
usage.get("/", async (c) => {
	const cacheConfig = await getCacheConfig(c.env.DB);
	return withApiCache(
		c,
		{
			namespace: "usage",
			version: cacheConfig.version_usage,
			ttlSeconds: cacheConfig.usage_ttl_seconds,
			enabled: cacheConfig.enabled,
		},
		async () => {
			const query = c.req.query();
			const filters = [];
			const params = [];
			if (query.from) {
				filters.push("usage_logs.created_at >= ?");
				params.push(query.from);
			}
			if (query.to) {
				filters.push("usage_logs.created_at <= ?");
				params.push(query.to);
			}
			if (query.model) {
				const model = String(query.model).trim();
				if (model) {
					filters.push("usage_logs.model LIKE ? COLLATE NOCASE");
					params.push(`%${model}%`);
				}
			}
			if (query.channel_id) {
				filters.push("usage_logs.channel_id = ?");
				params.push(query.channel_id);
			}
			if (query.token_id) {
				filters.push("usage_logs.token_id = ?");
				params.push(query.token_id);
			}
			if (query.channel_ids) {
				const channelIds = String(query.channel_ids)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (channelIds.length > 0) {
					const placeholders = channelIds.map(() => "?").join(", ");
					filters.push(`usage_logs.channel_id IN (${placeholders})`);
					params.push(...channelIds);
				}
			}
			if (query.token_ids) {
				const tokenIds = String(query.token_ids)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (tokenIds.length > 0) {
					const placeholders = tokenIds.map(() => "?").join(", ");
					filters.push(`usage_logs.token_id IN (${placeholders})`);
					params.push(...tokenIds);
				}
			}
			if (query.models) {
				const models2 = String(query.models)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (models2.length > 0) {
					const placeholders = models2.map(() => "?").join(", ");
					filters.push(`usage_logs.model IN (${placeholders})`);
					params.push(...models2);
				}
			}
			if (query.statuses) {
				const statuses = String(query.statuses)
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				if (statuses.length > 0) {
					const numericStatuses = statuses
						.map((item) => Number(item))
						.filter((value) => !Number.isNaN(value));
					const textStatuses = statuses.filter((item) =>
						Number.isNaN(Number(item)),
					);
					const statusFilters = [];
					if (numericStatuses.length > 0) {
						const placeholders = numericStatuses.map(() => "?").join(", ");
						statusFilters.push(
							`usage_logs.upstream_status IN (${placeholders})`,
						);
						params.push(...numericStatuses);
					}
					if (textStatuses.length > 0) {
						const placeholders = textStatuses.map(() => "?").join(", ");
						statusFilters.push(`usage_logs.status IN (${placeholders})`);
						params.push(...textStatuses);
					}
					if (statusFilters.length > 0) {
						filters.push(`(${statusFilters.join(" OR ")})`);
					}
				}
			}
			if (query.channel) {
				const channel = String(query.channel).trim();
				if (channel) {
					filters.push("channels.name LIKE ? COLLATE NOCASE");
					params.push(`%${channel}%`);
				}
			}
			if (query.token) {
				const token = String(query.token).trim();
				if (token) {
					filters.push("tokens.name LIKE ? COLLATE NOCASE");
					params.push(`%${token}%`);
				}
			}
			if (query.status) {
				const rawStatus = String(query.status).trim();
				if (rawStatus) {
					const numericStatus = Number(rawStatus);
					if (Number.isNaN(numericStatus)) {
						filters.push("usage_logs.status LIKE ? COLLATE NOCASE");
						params.push(`%${rawStatus}%`);
					} else {
						filters.push("usage_logs.upstream_status = ?");
						params.push(numericStatus);
					}
				}
			}
			const rawLimit = Number(query.limit ?? 50);
			const normalizedLimit = Number.isNaN(rawLimit)
				? 50
				: Math.floor(rawLimit);
			const limit = Math.min(Math.max(normalizedLimit, 1), 200);
			const rawOffset = Number(query.offset ?? 0);
			const normalizedOffset = Number.isNaN(rawOffset)
				? 0
				: Math.max(0, Math.floor(rawOffset));
			const whereSql =
				filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
			const baseSql =
				"FROM usage_logs LEFT JOIN channels ON channels.id = usage_logs.channel_id LEFT JOIN tokens ON tokens.id = usage_logs.token_id";
			const retention = await getRetentionDays(c.env.DB);
			await pruneUsageLogs(c.env.DB, retention);
			const countRow = await c.env.DB.prepare(
				`SELECT COUNT(*) as total ${baseSql} ${whereSql}`,
			)
				.bind(...params)
				.first();
			const total = Number(countRow?.total ?? 0);
			const listSql = `SELECT usage_logs.*, channels.name as channel_name, tokens.name as token_name ${baseSql} ${whereSql} ORDER BY usage_logs.created_at DESC LIMIT ? OFFSET ?`;
			const result = await c.env.DB.prepare(listSql)
				.bind(...params, limit, normalizedOffset)
				.all();
			return c.json({
				logs: result.results ?? [],
				total,
				limit,
				offset: normalizedOffset,
			});
		},
	);
});
var usage_default = usage;

// src/index.ts
var app = new Hono2({ strict: false });
warmupWasmCore();
app.use(
	"/api/*",
	cors({
		origin: (_origin, c) => {
			const allowed = c.env.CORS_ORIGIN ?? "*";
			return allowed === "*"
				? "*"
				: allowed.split(",").map((item) => item.trim());
		},
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"x-api-key",
			"x-admin-token",
			"New-Api-User",
		],
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	}),
);
app.use(
	"/v1/*",
	cors({
		origin: "*",
		allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
		allowMethods: ["GET", "POST", "OPTIONS"],
	}),
);
app.use(
	"/v1beta/*",
	cors({
		origin: "*",
		allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
		allowMethods: ["GET", "POST", "OPTIONS"],
	}),
);
app.use("/api/*", async (c, next) => {
	if (
		c.req.path === "/api/auth/login" ||
		c.req.path.startsWith("/api/channel") ||
		c.req.path.startsWith("/api/user") ||
		c.req.path.startsWith("/api/group")
	) {
		return next();
	}
	return adminAuth(c, next);
});
app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/auth", auth_default);
app.route("/api/channels", channels_default);
app.route("/api/sites", sites_default);
app.route("/api/models", models_default);
app.route("/api/tokens", tokens_default);
app.route("/api/usage", usage_default);
app.route("/api/dashboard", dashboard_default);
app.route("/api/settings", settings_default);
app.route("/api/channel", newapiChannels_default);
app.route("/api/user", newapiUsers_default);
app.route("/api/group", newapiGroups_default);
app.route("/v1", proxy_default);
app.route("/v1beta", proxy_default);
app.onError((err, c) => {
	console.error("[app:error]", {
		method: c.req.method,
		path: c.req.path,
		message: err.message,
		stack: err.stack,
	});
	if (
		c.req.path === "/api" ||
		c.req.path.startsWith("/api/") ||
		c.req.path === "/v1" ||
		c.req.path.startsWith("/v1/") ||
		c.req.path === "/v1beta" ||
		c.req.path.startsWith("/v1beta/")
	) {
		return c.json({ error: "Internal Server Error" }, 500);
	}
	return c.text("Internal Server Error", 500);
});
app.notFound(async (c) => {
	const path = c.req.path;
	if (
		path === "/api" ||
		path.startsWith("/api/") ||
		path === "/v1" ||
		path.startsWith("/v1/")
	) {
		return c.json({ error: "Not Found" }, 404);
	}
	const assets = c.env.ASSETS;
	if (!assets) {
		return c.text("Not Found", 404);
	}
	const res = await assets.fetch(c.req.raw);
	if (res.status !== 404) {
		return res;
	}
	const accept = c.req.header("accept") ?? "";
	const isHtml = accept.includes("text/html");
	const isFile = path.includes(".");
	if (!isHtml || isFile) {
		return res;
	}
	const url = new URL(c.req.url);
	url.pathname = "/index.html";
	return assets.fetch(new Request(url.toString(), c.req.raw));
});
var src_default = {
	fetch: app.fetch,
	queue: handleUsageQueue,
};
export { CheckinScheduler, UsageLimiter, src_default as default };
//# sourceMappingURL=index.js.map
