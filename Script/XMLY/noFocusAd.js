let obj = JSON.parse($response.body)
obj.header[0].item.list[0].data =
obj.header[0].item.list[0].data.filter(x=>!x.isAd)
$done({body:JSON.stringify(obj)})
