const https = require('https');
const fs = require('fs');

const url = 'https://pzcecjuxiorqcmbtiipq.supabase.co/functions/v1/sitemap'\;
const outputPath = './public/sitemap.xml';

https.get(url, (res) => {
  const writeStream = fs.createWriteStream(outputPath);
  res.pipe(writeStream);
  writeStream.on('finish', () => {
    writeStream.close();
    console.log('Sitemap downloaded successfully to ' + outputPath);
  });
}).on('error', (err) => {
  console.error('Error downloading sitemap:', err.message);
});
