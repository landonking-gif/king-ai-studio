import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const logDir = path.join(ROOT_DIR, 'data/logs/simulations');

if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir);
    console.log(`Deleting ${files.length} files from ${logDir}...`);
    for (const file of files) {
        fs.unlinkSync(path.join(logDir, file));
    }
    console.log('Done.');
} else {
    console.log('Log directory does not exist.');
}
