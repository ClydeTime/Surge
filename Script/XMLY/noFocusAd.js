let body = JSON.parse($response.body);

var length = body.header[0].item.list[0].data.length;
let arr = [];
for(let i = 0; i < length; i++) {
	if(body.header[0].item.list[0].data[i].isAd == false) {
		arr.push(body.header[0].item.list[0].data[i]);
	}
}
body.header[0].item.list[0].data = arr;

$done({ body: JSON.stringify(body) });
