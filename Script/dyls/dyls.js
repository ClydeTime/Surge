const url = new URL($request.url);
const PATH = url?.pathname;
let body = JSON.parse($response.body);
switch (PATH) {
	case "/api/v1/movie/index_recommend": //首页导航栏
		body.data = body.data.map(data => {
			if (data.layout === "index_recommend_carousel") {
				data.list = data.list.filter(list => list.type === 1)
				return data;
			}else if (data.layout === "advert_self") {
				return undefined;
			}
			return data;
		});
		body.data = body.data.filter(fix => fix !== undefined);
}

$done({ body: JSON.stringify(body) });


//https://github.com/NanoCat-Me/URL
function URL(a){return new class{constructor(a,b=void 0){return a=this.parse(a,b),this}parse(a,b=void 0){const c=/(?:(?<protocol>\w+:)\/\/(?:(?<username>[^\s:"]+)(?::(?<password>[^\s:"]+))?@)?(?<host>[^\s@/]+))?(?<pathname>\/?[^\s@?]+)?(?<search>\?[^\s?]+)?/,d=/(?<hostname>.+):(?<port>\d+)$/;if(a=a.match(c)?.groups||{},b&&(b=b?.match(c)?.groups||{},!b.protocol||!b.hostname))throw new Error(`🚨 ${name}, ${b} is not a valid URL`);if((a.protocol||b?.protocol)&&(this.protocol=a.protocol||b.protocol),(a.username||b?.username)&&(this.username=a.username||b.username),(a.password||b?.password)&&(this.password=a.password||b.password),(a.host||b?.host)&&(this.host=a.host||b.host,Object.freeze(this.host),this.hostname=this.host.match(d)?.groups.hostname??this.host,this.port=this.host.match(d)?.groups.port??""),!(a.pathname||b?.pathname))this.pathname="";else if(this.pathname=a.pathname||b?.pathname,this.pathname.startsWith("/")||(this.pathname="/"+this.pathname),this.paths=this.pathname.split("/").filter(Boolean),Object.freeze(this.paths),this.paths){const a=this.paths[this.paths.length-1];if(a?.includes(".")){const b=a.split(".");this.format=b[b.length-1],Object.freeze(this.format)}}if((a.search||b?.search)&&(this.search=a.search||b.search,Object.freeze(this.search),this.search)){const a=this.search.slice(1).split("&").map(a=>a.split("="));this.searchParams=new Map(a)}return this.harf=this.toString(),Object.freeze(this.harf),this}toString(){let a="";return this.protocol&&(a+=this.protocol+"//"),this.username&&(a+=this.username+(this.password?":"+this.password:"")+"@"),this.hostname&&(a+=this.hostname),this.port&&(a+=":"+this.port),this.pathname&&(a+=this.pathname),this.searchParams&&(a+="?"+Array.from(this.searchParams).map(a=>a.join("=")).join("&")),a}toJSON(){return JSON.stringify({...this})}}(a)}