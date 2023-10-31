const $ = new Env('建行生活');
let AppId = '1472477795', giftMap = { "1": "打车", "2": "外卖", "3": "骑行" }, message = '', giftType = '2';
let autoLoginInfo = $.getdata('JHSH_LOGIN_INFO') || '';  // 刷新 session 所需的数据
let AppVersion = $.getdata('JHSH_VERSION') || '2.1.5.002';  // 最新版本号，获取失败时使用
let bodyStr =$.getdata('JHSH_BODY') || '';  // 签到所需的 body

!(async () => {
  if (typeof $request != "undefined") {
  $.log("- 正在获取cookie, 请稍后")
  GetCookie();
  $.done();
} else {
  if (!autoLoginInfo || !bodyStr) {
    $.msg($.name, '', '❌ 请先获取建行生活Cookie。');
    return;
  } else {
		await getLatestVersion();  // 获取版本信息
    $.info = $.toObj(bodyStr);
		$.info2 = $.toObj(autoLoginInfo);
    $.giftList = [];
    $.giftList2 = [];
    $.getGiftMsg = "";
    $.isGetGift = false;
		$.DeviceId = $.info2['DeviceId'];
		$.MBCUserAgent = $.info2['MBCUserAgent'];
		$.ALBody = $.info2['Body'];
    $.log(`===== 账号[${hideSensitiveData($.info?.USR_TEL, 3, 4)}]开始签到 =====\n`);
    if (!$.info?.MID || !$.DeviceId || !$.MBCUserAgent || !$.ALBody) {
      message += `🎉 账号 [${$.info?.USR_TEL ? hideSensitiveData($.info?.USR_TEL, 3, 4) : '信息获取失败'}] 缺少参数，请重新获取Cookie。\n`;
    }
		await autoLogin();  // 刷新 session
    await main(); // 签到主函数
    if ($.giftList.length > 0) {
      for (let j = 0; j < $.giftList.length; j++) {
        if ($.isGetGift) break;
        let item = $.giftList[j]
        $.couponId = item?.couponId;
        $.nodeDay = item?.nodeDay;
        $.couponType = item?.couponType;
        $.dccpBscInfSn = item?.dccpBscInfSn;
        $.continue = false;
        $.log(`尝试领取[${giftMap[giftType]}]券`);
        for (let k = 1; k <= 3; k++) {
          if (!$.continue) {
            if (k >= 2) $.log(`领取失败，重试一次`);
            await $.wait(1000 * 5);
            await getGift(); // 领取奖励
            if ($.isGetGift) break;
          }
        }
      };
      if (!$.isGetGift) {
        $.getGiftMsg = `请打开app查看优惠券到账情况。\n`;
      }
      message += "，" + $.getGiftMsg;
    }
    await $.wait(1000 * 3);
  }

  if (message) {
    message = message.replace(/\n+$/, '');
    $.msg($.name, '', message);
  }
}
})()
  .catch((e) => $.logErr(e))
  .finally(() => $.done())


// 获取签到数据
function GetCookie() {
  if ($request && $request.url.indexOf("A3341A038") > -1) {
    $.body = $.toObj($request.body);
    if (bodyStr.indexOf($.body?.MEB_ID) == -1) {
			$.body['MID'] = $request.headers['MID'] || $request.headers['Mid'] || $request.headers['mid'];
			$.log(`开始新增用户数据 ${$.body}`);
      $.setdata($.toStr($.body), 'JHSH_BODY');
    } else {
      $.log('数据已存在，不再写入。');
    }
		$.msg($.name, ``, `🎉 建行生活签到数据获取成功。`);
  } else if (/autoLogin/.test($request.url)) {
    $.DeviceId = $request.headers['DeviceId'] || $request.headers['Deviceid'] || $request.headers['deviceid'];
    $.MBCUserAgent = $request.headers['MBC-User-Agent'] || $request.headers['Mbc-user-agent'] || $request.headers['mbc-user-agent'];

    if ($.DeviceId && $.MBCUserAgent && $request.body) {
      autoLoginInfo = {
        "DeviceId": $.DeviceId,
        "MBCUserAgent": $.MBCUserAgent,
        "Body": $request.body
      }
      $.setdata($.toStr(autoLoginInfo), 'JHSH_LOGIN_INFO');
      $.log($.toStr(autoLoginInfo) + "写入成功");
    }
  }
}

// 刷新 session
async function autoLogin() {
  let opt = {
    url: `https://yunbusiness.ccb.com/clp_service/txCtrl?txcode=autoLogin`,
    headers: {
      'AppVersion': AppVersion,
      'Content-Type': `application/json`,
      'DeviceId': $.DeviceId,
      'Accept': `application/json`,
      'MBC-User-Agent': $.MBCUserAgent,
    },
    body: $.ALBody
  }
  return new Promise(resolve => {
    $.post(opt, async (error, response, data) => {
      try {
        let result = $.toObj(data) || response.body;
        // 如果数据未加密，则 session 未过期
        if (result?.errCode) {
          // {"newErrMsg":"未能处理您的请求。如有疑问，请咨询在线客服或致电95533","data":"","reqFlowNo":"","errCode":"0","errMsg":"session未失效,勿重复登录"}
          // $.token = $.getdata('JHSH_TOKEN');
          $.log(`${result?.errMsg}`);
        } else {
          // $.token = response.headers[`set-cookie`] || response.headers[`Set-cookie`] || response.headers[`Set-Cookie`];
          // !$.isNode() ? $.setdata($.token, 'JHSH_TOKEN') : '';  // 数据持久化
          $.log(`✅ 刷新 session 成功!`);
        }
      } catch (error) {
        $.log(error);
      } finally {
        resolve()
      }
    });
  })
}

// 签到主函数
function main() {
  let opt = {
    url: `https://yunbusiness.ccb.com/clp_coupon/txCtrl?txcode=A3341A115`,
    headers: {
      "MID": $.info?.MID,
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/CloudMercWebView/UnionPay/1.0 CCBLoongPay",
      "Accept": "application/json,text/javascript,*/*",
      "content-type": "application/json"
    },
    body: `{"ACT_ID":"${$.info.ACT_ID}","REGION_CODE":"${$.info.REGION_CODE}","chnlType":"${$.info.chnlType}","regionCode":"${$.info.regionCode}"}`
  }
  return new Promise(resolve => {
    $.post(opt, async (err, resp, data) => {
      try {
        err && $.log(err);
        if (data) {
          data = $.toObj(data);
          let text = '';
          if (data.errCode == 0) {
            text = `🎉 账号 [${$.info?.USR_TEL ?hideSensitiveData($.info?.USR_TEL, 3, 4) : '信息获取失败'}] 签到成功`;
            $.log(text);
            message += text;
            if (data?.data?.IS_AWARD == 1) {
              $.GIFT_BAG = data?.data?.GIFT_BAG;
              $.GIFT_BAG.forEach(item => {
                let body = { "couponId": item.couponId, "nodeDay": item.nodeDay, "couponType": item.couponType, "dccpBscInfSn": item.dccpBscInfSn };
                if (new RegExp(`${giftMap[giftType]}`).test(item?.couponName)) {
                  if (/信用卡/.test(item?.couponName)) {
                    $.giftList.unshift(body);
                  } else {
                    $.giftList.push(body);
                  }
                } else {
                  $.giftList2.push(body);
                }
              })
              $.giftList = [...$.giftList, ...$.giftList2];
            } else if (data?.data?.NEST_AWARD_DAY >= 1) {
              text = `继续签到${data.data.NEST_AWARD_DAY}天可领取${giftMap[giftType]}券`;
              message += `，${text}\n`;
              $.log(text);
            } else {
              $.log(`暂无可领取的奖励`);
              message += "\n";
            }
          } else {
            $.log($.toStr(data));
            text = `❌ 账号 [${$.info?.USR_TEL ? hideSensitiveData($.info?.USR_TEL, 3, 4) : '信息获取失败'}] 签到失败，${data.errMsg}\n`;
            $.log(text);
            message += text;
          }
        } else {
          $.log("服务器返回了空数据");
        }
      } catch (error) {
        $.log(error);
      } finally {
        resolve();
      }
    })
  })
}


// 领取奖励
async function getGift() {
  let opt = {
    url: `https://yunbusiness.ccb.com/clp_coupon/txCtrl?txcode=A3341C082`,
    headers: {
      "MID": $.info?.MID,
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/CloudMercWebView/UnionPay/1.0 CCBLoongPay",
      "Accept": "application/json,text/javascript,*/*"
    },
    body: `{"mebId":"${$.info.MEB_ID}","actId":"${$.info.ACT_ID}","nodeDay":${$.nodeDay},"couponType":${$.couponType},"nodeCouponId":"${$.couponId}","dccpBscInfSn":"${$.dccpBscInfSn}","chnlType":"${$.info.chnlType}","regionCode":"${$.info.regionCode}"}`
  }
  return new Promise(resolve => {
    $.post(opt, async (err, resp, data) => {
      try {
        err && $.log(err);
        if (data) {
          data = $.toObj(data);
          if (data.errCode == 0) {
            $.isGetGift = true;
            $.getGiftMsg = `获得签到奖励：${data?.data?.title}（${data?.data?.subTitle}）\n`;
            $.log($.getGiftMsg);
          } else {
            $.continue = true;
            $.log($.toStr(data));
          }
        } else {
          $.log("服务器返回了空数据");
        }
      } catch (error) {
        $.log(error);
      } finally {
        resolve();
      }
    })
  })
}

// 获取最新版本
async function getLatestVersion() {
  let opt = {
    url: `https://itunes.apple.com/cn/lookup?id=${AppId}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  }
  return new Promise(resolve => {
    $.get(opt, async (err, resp, data) => {
      try {
        err && $.log(err);
        if (data) {
          try {
            let result = JSON.parse(data);
            const { trackName, bundleId, version, currentVersionReleaseDate, } = result.results[0];
            AppVersion = version;
            $.setdata(AppVersion, 'JHSH_VERSION');  // 数据持久化
            $.log(`版本信息: ${trackName} ${version}\nBundleId: ${bundleId} \n更新时间: ${currentVersionReleaseDate}`);
          } catch (e) {
            $.log(e);
          };
        } else {
          $.log(`版本信息获取失败\n`);
        }
      } catch (error) {
        $.log(error);
      } finally {
        resolve();
      }
    })
  })
}

// 数据脱敏
function hideSensitiveData(string, head_length = 2, foot_length = 2) {
  let star = '';
  for (var i = 0; i < string.length - head_length - foot_length; i++) {
    star += '*';
  }
  return string.substring(0, head_length) + star + string.substring(string.length - foot_length);
}


// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}lodash_get(t,e,s){const a=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of a)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,a)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[a+1])>>0==+e[a+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,a]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,a,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,a,r]=/^@(.*?)\.(.*?)$/.exec(e),n=this.getval(a),o=a?"null"===n?null:n||"{}":"{}";try{const e=JSON.parse(o);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),a)}catch(e){const n={};this.lodash_set(n,r,t),s=this.setval(JSON.stringify(n),a)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);default:return this.data&&this.data[e]||null}}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:n,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:n,bodyBytes:o},n,o)},t=>e(t&&t.error||"UndefinedError"))}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:n,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:n,bodyBytes:o},n,o)},t=>e(t&&t.error||"UndefinedError"))}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const n=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t}}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,n(r));break;case"Quantumult X":$notify(e,s,a,n(r))}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e=""){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,e,t)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t)}}}(t,e)}