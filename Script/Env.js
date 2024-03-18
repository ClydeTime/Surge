function Env(name, opts) {
	return new (class {
		constructor(name, opts) {
			this.name = name
			this.version = '1.7.4'
			this.data = null
			this.logs = []
			this.isMute = false
			this.isNeedRewrite = false
			this.logSeparator = '\n'
			this.encoding = 'utf-8'
			this.startTime = new Date().getTime()
			Object.assign(this, opts)
			this.log('', `🔔${this.name}, 开始!`)
		}

		platform() {
			if ('undefined' !== typeof $environment && $environment['surge-version'])
				return 'Surge'
			if ('undefined' !== typeof $environment && $environment['stash-version'])
				return 'Stash'
			if ('undefined' !== typeof module && !!module.exports) return 'Node.js'
			if ('undefined' !== typeof $task) return 'Quantumult X'
			if ('undefined' !== typeof $loon) return 'Loon'
			if ('undefined' !== typeof $rocket) return 'Shadowrocket'
			if ('undefined' !== typeof Egern) return 'Egern'
		}

		isQuanX() {
			return 'Quantumult X' === this.platform()
		}

		isSurge() {
			return 'Surge' === this.platform()
		}

		isLoon() {
			return 'Loon' === this.platform()
		}

		isShadowrocket() {
			return 'Shadowrocket' === this.platform()
		}

		isStash() {
			return 'Stash' === this.platform()
		}

		isEgern() {
			return 'Egern' === this.platform()
		}

		toObj(str, defaultValue = null) {
			try {
				return JSON.parse(str)
			} catch {
				return defaultValue
			}
		}

		toStr(obj, defaultValue = null) {
			try {
				return JSON.stringify(obj)
			} catch {
				return defaultValue
			}
		}

		lodash_get(object = {}, path = "", defaultValue = undefined) {
			// translate array case to dot case, then split with .
			// a[0].b -> a.0.b -> ['a', '0', 'b']
			if (!Array.isArray(path)) path = this.toPath(path)
			const result = path.reduce((previousValue, currentValue) => {
				return Object(previousValue)[currentValue] // null undefined get attribute will throwError, Object() can return a object 
			}, object)
			return (result === undefined) ? defaultValue : result
		}

		lodash_set(object = {}, path = "", value) {
			if (!Array.isArray(path)) path = this.toPath(path)
			path
				.slice(0, -1)
				.reduce(
					(previousValue, currentValue, currentIndex) =>
						(Object(previousValue[currentValue]) === previousValue[currentValue])
							? previousValue[currentValue]
							: previousValue[currentValue] = (/^\d+$/.test(path[currentIndex + 1]) ? [] : {}),
					object
				)[path[path.length - 1]] = value
			return object
		}

		toPath(value) {
			return value.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
		}

		getItem(keyName = new String, defaultValue = null) {
			let keyValue = defaultValue
			// 如果以 @
			switch (keyName.startsWith('@')) {
				case true:
					const { key, path } = keyName.match(/^@(?<key>[^.]+)(?:\.(?<path>.*))?$/)?.groups
					keyName = key
					let value = this.getItem(keyName, {})
					if (typeof value !== "object") value = {}
					keyValue = this.lodash_get(value, path)
					try {
						keyValue = JSON.parse(keyValue)
					} catch (e) {
						// do nothing
					}
					break
				default:
					switch (this.platform()) {
						case 'Surge':
						case 'Loon':
						case 'Stash':
						case 'Egern':
						case 'Shadowrocket':
							keyValue = $persistentStore.read(keyName)
							break
						case 'Quantumult X':
							keyValue = $prefs.valueForKey(keyName)
							break
						default:
							keyValue = this.data?.[keyName] || null
							break
					}
					try {
						keyValue = JSON.parse(keyValue)
					} catch (e) {
						// do nothing
					}
					break
			}
		return keyValue ?? defaultValue
		}

		setItem(keyName = new String, keyValue = new String) {
			let result = false
			switch (typeof keyValue) {
				case "object":
					keyValue = JSON.stringify(keyValue)
					break
				default:
					keyValue = String(keyValue)
					break
			}
			switch (keyName.startsWith('@')) {
				case true:
					const { key, path } = keyName.match(/^@(?<key>[^.]+)(?:\.(?<path>.*))?$/)?.groups
					keyName = key
					let value = this.getItem(keyName, {})
					if (typeof value !== "object") value = {}
					this.lodash_set(value, path, keyValue)
					result = this.setItem(keyName, value)
					break
				default:
					switch (this.platform()) {
						case 'Surge':
						case 'Loon':
						case 'Stash':
						case 'Egern':
						case 'Shadowrocket':
							result = $persistentStore.write(keyValue, keyName)
							break
						case 'Quantumult X':
							result =$prefs.setValueForKey(keyValue, keyName)
							break
						default:
							result = this.data?.[keyName] || null
							break
					}
					break
			}
			return result
		}

		async fetch(request = {} || "", option = {}) {
			// 初始化参数
			switch (request.constructor) {
				case Object:
					request = { ...request, ...option }
					break
				case String:
					request = { "url": request, ...option }
					break
			}
			// 自动判断请求方法
			if (!request.method) {
				request.method = request.body ?? request.bodyBytes ? "POST" : "GET"
			}
			// 移除请求头中的部分参数, 让其自动生成
			delete request.headers?.Host
			delete request.headers?.[":authority"]
			delete request.headers?.['Content-Length']
			delete request.headers?.['content-length']
			// 定义请求方法（小写）
			const method = request.method.toLocaleLowerCase()
			// 判断平台
			switch (this.platform()) {
				case 'Loon':
				case 'Surge':
				case 'Stash':
				case 'Egern':
				case 'Shadowrocket':
				default:
					// 转换请求参数
					if (request.policy) {
						if (this.isLoon()) request.node = request.policy
						if (this.isStash()) this.lodash_set(request, "headers.X-Stash-Selected-Proxy", encodeURI(request.policy))
					}
					// 禁止重定向
					if (request.followRedirect) {
						if (this.isSurge() || this.isLoon()) request['auto-redirect'] = false
						if (this.isQuanX()) request.opts ? request.opts.redirection = false : request.opts = { redirection: false }
					}
					// 转换请求体
					if (request.bodyBytes && !request.body) {
						request.body = request.bodyBytes
						delete request.bodyBytes
					}
					// 发送请求
					return await new Promise((resolve, reject) => {
						$httpClient[method](request, (error, response, body) => {
							if (error) reject(error)
							else {
								response.ok = /^2\d\d$/.test(response.status)
								response.statusCode = response.status
								if (body) {
									response.body = body
									if (request["binary-mode"] == true) response.bodyBytes = body
								}
								resolve(response)
							}
						})
					})
				case 'Quantumult X':
					// 转换请求参数
					if (request.policy) this.lodash_set(request, "opts.policy", request.policy)
					if (typeof request["auto-redirect"] === "boolean") this.lodash_set(request, "opts.redirection", request["auto-redirect"])
					// 转换请求体
					if (request.body instanceof ArrayBuffer) {
						request.bodyBytes = request.body
						delete request.body
					} else if (ArrayBuffer.isView(request.body)) {
						request.bodyBytes = request.body.buffer.slice(request.body.byteOffset, request.body.byteLength + request.body.byteOffset)
						delete object.body
					} else if (request.body) delete request.bodyBytes
					// 发送请求
					return await $task.fetch(request).then(
						response => {
							response.ok = /^2\d\d$/.test(response.statusCode)
							response.status = response.statusCode
							return response
						},
						reason => Promise.reject(reason.error))
			}
		}

		/**
		 *
		 * 示例:$.time('yyyy-MM-dd qq HH:mm:ss.S')
		 *    :$.time('yyyyMMddHHmmssS')
		 *    y:年 M:月 d:日 q:季 H:时 m:分 s:秒 S:毫秒
		 *    其中y可选0-4位占位符、S可选0-1位占位符，其余可选0-2位占位符
		 * @param {string} fmt 格式化参数
		 * @param {number} 可选: 根据指定时间戳返回格式化日期
		 *
		 */
		time(fmt, ts = null) {
			const date = ts ? new Date(ts) : new Date()
			let o = {
				'M+': date.getMonth() + 1,
				'd+': date.getDate(),
				'H+': date.getHours(),
				'm+': date.getMinutes(),
				's+': date.getSeconds(),
				'q+': Math.floor((date.getMonth() + 3) / 3),
				'S': date.getMilliseconds()
			}
			if (/(y+)/.test(fmt))
				fmt = fmt.replace(
					RegExp.$1,
					(date.getFullYear() + '').slice(4 - RegExp.$1.length)
				)
			for (let k in o)
				if (new RegExp('(' + k + ')').test(fmt))
					fmt = fmt.replace(
						RegExp.$1,
						RegExp.$1.length == 1
							? o[k]
							: ('00' + o[k]).slice(('' + o[k]).length)
					)
			return fmt
		}

		/**
		 *
		 * @param {String} url
		 * @returns {url} 将 'http://url.com/page?name=Adam&surname=Smith' 替换为 'http://url.com/page'
		 */
		getBaseURL(url) {
			return url.replace(/[?#].*$/, '')
		}

		/**
		 *
		 * @param {String} url
		 * @returns {url} 判断URL是否为绝对路径 eg. isAbsoluteURL('/foo/bar') // false
		 */
		isAbsoluteURL(str) {
			return /^[a-z][a-z0-9+.-]*:/.test(str)
		}

		/**
		 *
		 * @param {String} url
		 * @returns {url} 将 URL 参数转换为对象 eg. getURLParameters('http://url.com/page?name=Adam&surname=Smith') // {name: 'Adam', surname: 'Smith'}
		 */
		getURLParameters(url) {
			return (url.match(/([^?=&]+)(=([^&]*))/g) || []).reduce(
				(a, v) => (
					(a[v.slice(0, v.indexOf('='))] = v.slice(v.indexOf('=') + 1)), a
				),
				{}
			)
		}

		/**
		 *
		 * @param {Date} date
		 * @returns {url} 从日期生成 UNIX 时间戳
		 */
		getTimestamp(date = new Date()) {
			return Math.floor(date.getTime() / 1000)
		}

		/**
		 *
		 * @param {Object} options
		 * @returns {String} 将 Object 对象 转换成 queryStr: key=val&name=senku
		 */
		queryStr(options) {
			let params = []
			for (let key in options) {
				if (options.hasOwnProperty(key)) {
					params.push(`${key}=${options[key]}`)
				}
			}
			let queryString = params.join('&')
			return queryString
		}

		/**
		 *
		 * @param {String} options
		 * @returns {Object} 将 queryStr: key=val&name=senku 字符串 转换成 Object
		 */
		queryObj(options) {
			let obj = {}
			let pairs = options.split('&')
			for (let pair of pairs) {
				let keyValue = pair.split('=')
				let key = keyValue[0]
				let value = keyValue[1] || ''
				if (key) {
					obj[key] = value
				}
			}
			return obj
		}

		/**
		 * 系统通知
		 *
		 * > 通知参数: 同时支持 QuanX 和 Loon 两种格式, EnvJs根据运行环境自动转换, Surge 环境不支持多媒体通知
		 *
		 * 示例:
		 * $.msg(title, subt, desc, 'twitter://')
		 * $.msg(title, subt, desc, { 'open-url': 'twitter://', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
		 * $.msg(title, subt, desc, { 'open-url': 'https://bing.com', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
		 *
		 * @param {*} title 标题
		 * @param {*} subt 副标题
		 * @param {*} desc 通知详情
		 * @param {*} opts 通知参数
		 *
		 */
		msg(title = this.name, subt = '', desc = '', opts) {
			const toEnvOpts = rawopts => {
				switch (typeof rawopts) {
					case undefined:
						return rawopts
					case 'string':
						switch (this.platform()) {
							case 'Surge':
							case 'Stash':
							case 'Egern':
							default:
								return { url: rawopts }
							case 'Loon':
							case 'Shadowrocket':
								return rawopts
							case 'Quantumult X':
								return { 'open-url': rawopts }
						}
					case 'object':
						switch (this.platform()) {
							case 'Surge':
							case 'Stash':
							case 'Egern':
							case 'Shadowrocket':
							default: {
								let openUrl =
									rawopts.url || rawopts.openUrl || rawopts['open-url']
								return { url: openUrl }
							}
							case 'Loon': {
								let openUrl =
									rawopts.openUrl || rawopts.url || rawopts['open-url']
								let mediaUrl = rawopts.mediaUrl || rawopts['media-url']
								return { openUrl, mediaUrl }
							}
							case 'Quantumult X': {
								let openUrl =
									rawopts['open-url'] || rawopts.url || rawopts.openUrl
								let mediaUrl = rawopts['media-url'] || rawopts.mediaUrl
								let updatePasteboard =
									rawopts['update-pasteboard'] || rawopts.updatePasteboard
								return {
									'open-url': openUrl,
									'media-url': mediaUrl,
									'update-pasteboard': updatePasteboard
								}
							}
						}
					default:
						return undefined
				}
			}
			if (!this.isMute) {
				switch (this.platform()) {
					case 'Surge':
					case 'Loon':
					case 'Stash':
					case 'Shadowrocket':
					default:
						$notification.post(title, subt, desc, toEnvOpts(opts))
						break
					case 'Quantumult X':
						$notify(title, subt, desc, toEnvOpts(opts))
						break
				}
			}
		}

		log(...logs) {
			if (logs.length > 0) {
				this.logs = [...this.logs, ...logs]
			}
			console.log(logs.join(this.logSeparator))
		}

		logErr(err, msg) {
			switch (this.platform()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Egern':
				case 'Shadowrocket':
				case 'Quantumult X':
				default:
					this.log('', `❗️${this.name}, 错误!`, err, msg)
					break
			}
		}

		wait(time) {
			return new Promise((resolve) => setTimeout(resolve, time))
		}

		done(object = {}) {
			const endTime = new Date().getTime()
			const costTime = (endTime - this.startTime) / 1000
			this.log('', `🔔${this.name}, 结束! 🕛 ${costTime} 秒`)
			switch (this.platform()) {
				case 'Surge':
					if (object.policy) this.lodash_set(object, "headers.X-Surge-Policy", object.policy)
					$done(object)
					break
				case 'Loon':
					if (object.policy) object.node = object.policy
					$done(object)
					break
				case 'Stash':
					if (object.policy) this.lodash_set(object, "headers.X-Stash-Selected-Proxy", encodeURI(object.policy))
					$done(object)
					break
				case 'Egern':
					$done(object)
					break
				case 'Shadowrocket':
				default:
					$done(object)
					break
				case 'Quantumult X':
					if (object.policy) this.lodash_set(object, "opts.policy", object.policy)
					// 移除不可写字段
					delete object["auto-redirect"]
					delete object["auto-cookie"]
					delete object["binary-mode"]
					delete object.charset
					delete object.host
					delete object.insecure
					delete object.method // 1.4.x 不可写
					delete object.opt // $task.fetch() 参数, 不可写
					delete object.path // 可写, 但会与 url 冲突
					delete object.policy
					delete object["policy-descriptor"]
					delete object.scheme
					delete object.sessionIndex
					delete object.statusCode
					delete object.timeout
					if (object.body instanceof ArrayBuffer) {
						object.bodyBytes = object.body
						delete object.body
					} else if (ArrayBuffer.isView(object.body)) {
						object.bodyBytes = object.body.buffer.slice(object.body.byteOffset, object.body.byteLength + object.body.byteOffset)
						delete object.body
					} else if (object.body) delete object.bodyBytes
					$done(object)
					break
			}
		}
	})(name, opts)
}