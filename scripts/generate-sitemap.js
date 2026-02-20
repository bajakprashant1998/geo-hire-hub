import https from 'https';
import fs from 'fs';
import path from 'path';

const url = 'https://pzcecjuxiorqcmbtiipq.supabase.co/functions/v1/sitemap';
const outputPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download sitemap. Status Code: ${res.statusCode}`);
        process.exit(1);
    }

    const writeStream = fs.createWriteStream(outputPath);
    res.pipe(writeStream);

    writeStream.on('finish', () => {
        writeStream.close();
        console.log('✅ Sitemap downloaded successfully to ' + outputPath);
    });
}).on('error', (err) => {
    console.error('❌ Error downloading sitemap:', err.message);
    process.exit(1);
});
