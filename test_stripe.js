const https = require('https');

const req = https.request({
  hostname: 'api.stripe.com',
  path: '/v1/checkout/sessions',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.write('mode=payment&success_url=http://a.com&cancel_url=http://b.com&line_items[0][price_data][currency]=aud&line_items[0][price_data][product_data][name]=Test&line_items[0][price_data][unit_amount]=1000&line_items[0][quantity]=1&optional_items[0][price_data][currency]=aud&optional_items[0][price_data][product_data][name]=Upsell&optional_items[0][price_data][unit_amount]=500&optional_items[0][quantity]=1');
req.end();
