/*
 * 本脚本旨在实现阿里云盘自动签到，支持Surge,stash,Loon,QuantumultX
 * @author: zqzess
 */


const keyName = 'ADriveCheckIn'
const $ = new Env('阿里云盘')
ADriveInfo = $.getjson(keyName, {})
if (typeof $request !== 'undefined') {
	$.log('🤖获取token')
	GetRefresh_token()
} else {
	$.log('🤖签到操作')
	GetAuthorizationKey()
}

function GetRefresh_token() {
	const body = $.toObj($request.body)
	let headers = { 
		'x-canary': $request.headers['x-canary'],
		'user-agent': $request.headers['user-agent'], 
		'x-device-id': $request.headers['x-device-id'], 
		'cookie': $request.headers['cookie'] 
	}
	let refresh_token = body.refresh_token
	if (refresh_token) {
		if (ADriveInfo.refresh_token) {
			if (ADriveInfo.refresh_token !== refresh_token) {
				ADriveInfo.refresh_token_body = body
				ADriveInfo.refresh_token = refresh_token
				ADriveInfo.headers = headers
				let t = $.setjson(ADriveInfo, keyName)
				if (t) {
					$.msg($.name, '更新阿里网盘refresh_token成功 🎉', '')
				} else {
					$.msg($.name, '更新阿里网盘refresh_token失败‼️', '')
				}
			}
		} else {
			ADriveInfo.refresh_token_body = body
			ADriveInfo.refresh_token = refresh_token
			ADriveInfo.headers = headers
			let t = $.setjson(ADriveInfo, keyName)
			if (t) {
				$.msg($.name, '首次写入阿里网盘refresh_token成功 🎉', '')
			} else {
				$.msg($.name, '首次写入阿里网盘refresh_token失败‼️', '')
			}
		}
	}
	$.done()
}

function GetAuthorizationKey() {
	let option = {
		url: 'https://auth.aliyundrive.com/v2/account/token',
		headers: {
			'Content-Type': 'application/json',
			'accept': '*/*',
			'accept-language': 'zh-CN,zh-Hansq=0.9',
			'x-canary': ADriveInfo.headers['x-canary'],
			'x-device-id': ADriveInfo.headers['x-device-id'],
			'cookie': ADriveInfo.headers['cookie'],
			'user-agent': ADriveInfo.headers['user-agent']
		},
		body: $.toStr(ADriveInfo.refresh_token_body)
	}
	$.log('获取authorization')
	$.post(option, function (error, response, data) {
		if (error) {
			$.log('错误原因：' + error)
			$.msg($.name, '❌签到失败', '刷新authorization失败')
			$.done()
		} else if (!data) {
			$.log('没有获取到数据')
		} else {
			let body = $.toObj(data)
			let refresh_token = body.refresh_token
			let accessKey = 'Bearer ' + body.access_token
			if (refresh_token) {
				ADriveInfo.refresh_token_body.refresh_token = refresh_token
				ADriveInfo.refresh_token = refresh_token
				let t = $.setjson(ADriveInfo, keyName)
				if (t) {
					$.log('刷新阿里网盘refresh_token成功 🎉')
				} else {
					$.msg('刷新阿里网盘refresh_token失败‼️', '', '')
				}
			}
			signCheckin(accessKey)
		}
	})
}

function signCheckin(authorization) {
	let date = new Date()
	let timeStamp = Date.parse(date)
	const xumt = 'defaultFY1_fyjs_not_loaded@@https://pages.aliyundrive.com/mobile-page/web/dailycheck.html@@' + timeStamp
	const url_fetch_sign = {
		url: 'https://member.aliyundrive.com/v1/activity/sign_in_list',
		headers: {
			'Content-Type': 'application/json',
			'accept': 'application/json, text/plain, */*',
			'authorization': authorization,
			'x-canary': ADriveInfo.headers['x-canary'],
			'x-umt': xumt,
			'origin': 'https://pages.aliyundrive.com',
			'x-ua': xumt,
			'user-agent': ADriveInfo.headers['user-agent'],
			'referer': 'https://pages.aliyundrive.com/'
		},
		body: $.toStr({})
	}
	$.log('签到开始')
	$.post(url_fetch_sign, function (error, response, data) {
		if (error) {
			$.log('错误：' + error)
			$.msg($.name, '❌签到失败', '无法签到，请手动签到')
			$.done()
		} else if (!data) {
			$.log('没有获取到数据')
		} else {
			let body = $.toObj(data)
			let signInCount = Number(body.result.signInCount)
			let isReward = body.result.isReward
			let stitle = '🎉' + body.result.title + ' 签到成功'
			let signInLogs = body.result.signInLogs
			$.log('签到天数: ' + signInCount)
			let reward = ''
			signInLogs.forEach(function (i) {
				if (Number(i.day) === signInCount) {
					if (i.isReward) {
						reward = ' 第' + signInCount + '天奖励，' + i.reward.name + i.reward.description
						$.log('签到奖励：' + reward)
					} else {
						reward = i.poster?.reason + '\n' + i.poster?.name
						if (reward === 'undefined\nundefined') {
							reward = ''
							$.log('签到完成')
							GetReword(authorization, signInCount)
						}
					}
				}
			})
			if (isReward && reward) {
				$.msg($.name, stitle, reward)
			}
			if (!isReward && reward) {
				stitle = '⚠️今天已经签到过了'
				$.msg($.name, stitle, reward)
			}
			$.done()
		}
	})
}

function GetReword(authorization, signInCount) {
	$.log('开始自动领取奖励')
	const date = new Date()
	let timeStamp = Date.parse(date)
	let messageTitle, message
	let xumt = 'defaultFY1_fyjs_not_loaded@@https://pages.aliyundrive.com/mobile-page/web/dailycheck.html@@' + timeStamp
	let url_fetch_reword = {
		url: 'https://member.aliyundrive.com/v1/activity/sign_in_reward?_rx-s=mobile',
		headers: {
			'Content-Type': 'application/json',
			'accept': 'application/json, text/plain, */*',
			Authorization: authorization,
			'x-canary': ADriveInfo.headers['x-canary'],
			'x-umt': xumt,
			'origin': 'https://pages.aliyundrive.com',
			'x-ua': xumt,
			'user-agent': ADriveInfo.headers['user-agent'],
			'referer': 'https://pages.aliyundrive.com/'
		},
		body: $.toStr({
			"signInDay": signInCount
		})
	}
	$.post(url_fetch_reword, function (error, response, data) {
		if (error || !data) {
			$.log('错误：' + error)
			messageTitle = '❌自动领取奖励失败'
			message = '自动领取奖励失败，请手动领取'
		} else {
			let body = $.toObj(data)
			if (!body.success) {
				$.log('❌自动领取奖励失败')
				messageTitle = '❌自动领取奖励失败'
				message = '自动领取奖励失败，请手动领取'
			} else {
				const rewordName = body.result.name
				const rewordDescription = body.result.description
				messageTitle = '签到成功！已自动领取奖励！'
				message = '获得 ' + rewordDescription
				$.log('自动领取奖励成功，获得 ' + rewordName + rewordDescription)
			}
		}
		$.msg($.name, '签到成功！已自动领取奖励！', message)
		$.done()
	})
}

/***************** Env *****************/
// prettier-ignore
// https://github.com/chavyleung/scripts/blob/master/Env.min.js

function Env(e,t){class s{constructor(e){this.env=e}send(e,t="GET"){e="string"==typeof e?{url:e}:e;let s=this.get;return"POST"===t&&(s=this.post),new Promise((t,a)=>{s.call(this,e,(e,s,r)=>{e?a(e):t(s)})})}get(e){return this.send.call(this.env,e)}post(e){return this.send.call(this.env,e,"POST")}}return new class{constructor(e,t){this.name=e,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,t),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(e,t=null){try{return JSON.parse(e)}catch{return t}}toStr(e,t=null){try{return JSON.stringify(e)}catch{return t}}getjson(e,t){let s=t;const a=this.getdata(e);if(a)try{s=JSON.parse(this.getdata(e))}catch{}return s}setjson(e,t){try{return this.setdata(JSON.stringify(e),t)}catch{return!1}}lodash_get(e,t,s){const a=t.replace(/\[(\d+)\]/g,".$1").split(".");let r=e;for(const e of a)if(r=Object(r)[e],void 0===r)return s;return r}lodash_set(e,t,s){return Object(e)!==e?e:(Array.isArray(t)||(t=t.toString().match(/[^.[\]]+/g)||[]),t.slice(0,-1).reduce((e,s,a)=>Object(e[s])===e[s]?e[s]:e[s]=Math.abs(t[a+1])>>0==+t[a+1]?[]:{},e)[t[t.length-1]]=s,e)}getdata(e){let t=this.getval(e);if(/^@/.test(e)){const[,s,a]=/^@(.*?)\.(.*?)$/.exec(e),r=s?this.getval(s):"";if(r)try{const e=JSON.parse(r);t=e?this.lodash_get(e,a,""):t}catch(e){t=""}}return t}setdata(e,t){let s=!1;if(/^@/.test(t)){const[,a,r]=/^@(.*?)\.(.*?)$/.exec(t),n=this.getval(a),o=a?"null"===n?null:n||"{}":"{}";try{const t=JSON.parse(o);this.lodash_set(t,r,e),s=this.setval(JSON.stringify(t),a)}catch(t){const n={};this.lodash_set(n,r,e),s=this.setval(JSON.stringify(n),a)}}else s=this.setval(e,t);return s}getval(e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(e);case"Quantumult X":return $prefs.valueForKey(e);default:return this.data&&this.data[e]||null}}setval(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(e,t);case"Quantumult X":return $prefs.setValueForKey(e,t);default:return this.data&&this.data[t]||null}}get(e,t=(()=>{})){switch(e.headers&&(delete e.headers["Content-Type"],delete e.headers["Content-Length"],delete e.headers["content-type"],delete e.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(e,(e,s,a)=>{!e&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then(e=>{const{statusCode:s,statusCode:a,headers:r,body:n,bodyBytes:o}=e;t(null,{status:s,statusCode:a,headers:r,body:n,bodyBytes:o},n,o)},e=>t(e&&e.error||"UndefinedError"))}}post(e,t=(()=>{})){const s=e.method?e.method.toLocaleLowerCase():"post";switch(e.body&&e.headers&&!e.headers["Content-Type"]&&!e.headers["content-type"]&&(e.headers["content-type"]="application/x-www-form-urlencoded"),e.headers&&(delete e.headers["Content-Length"],delete e.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](e,(e,s,a)=>{!e&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,a)});break;case"Quantumult X":e.method=s,this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then(e=>{const{statusCode:s,statusCode:a,headers:r,body:n,bodyBytes:o}=e;t(null,{status:s,statusCode:a,headers:r,body:n,bodyBytes:o},n,o)},e=>t(e&&e.error||"UndefinedError"))}}time(e,t=null){const s=t?new Date(t):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(e)&&(e=e.replace(RegExp.$1,(s.getFullYear()+"").slice(4-RegExp.$1.length)));for(let t in a)new RegExp("("+t+")").test(e)&&(e=e.replace(RegExp.$1,1==RegExp.$1.length?a[t]:("00"+a[t]).slice((""+a[t]).length)));return e}queryStr(e){let t=[];for(let s in e)e.hasOwnProperty(s)&&t.push(`${s}=${encodeURIComponent(e[s])}`);let s=t.join("&");return s}queryObj(e){let t={},s=e.split("&");for(let e of s){let s=e.split("="),a=s[0],r=decodeURIComponent(s[1]||"");a&&(t[a]=r)}return t}msg(t=e,s="",a="",r){const n=e=>{switch(typeof e){case void 0:return e;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:e};case"Loon":case"Shadowrocket":return e;case"Quantumult X":return{"open-url":e}}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let t=e.url||e.openUrl||e["open-url"];return{url:t}}case"Loon":{let t=e.openUrl||e.url||e["open-url"],s=e.mediaUrl||e["media-url"];return{openUrl:t,mediaUrl:s}}case"Quantumult X":{let t=e["open-url"]||e.url||e.openUrl,s=e["media-url"]||e.mediaUrl,a=e["update-pasteboard"]||e.updatePasteboard;return{"open-url":t,"media-url":s,"update-pasteboard":a}}}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(t,s,a,n(r));break;case"Quantumult X":$notify(t,s,a,n(r))}}log(...e){e.length>0&&(this.logs=[...this.logs,...e]),console.log(e.join(this.logSeparator))}logErr(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,e,t)}}wait(e){return new Promise(t=>setTimeout(t,e))}done(e={}){const t=(new Date).getTime(),s=(t-this.startTime)/1e3;switch(this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(e)}}}(e,t)}
