let body = JSON.parse($response.body);

body.replace(/(\{"isAd.*?\})/g,x=>{
   return x.match('isAd":true') ? '' : x ;
})
$done({ body: JSON.stringify(body) });