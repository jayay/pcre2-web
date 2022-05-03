import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {default as json} from '../src/package.template.json' assert {type: "json"};

if (!process.env.PACKAGE_VERSION) {
  throw new Error('env variable PACKAGE_VERSION is not defined');
}

const json_mut = {...json};
const regex_remove_leading_v = /^v(.*)+/;
json_mut.version = process.env.PACKAGE_VERSION.match(regex_remove_leading_v)[1];

json_mut.files = fs.readdirSync(path.join(__dirname, '../pkg'))
    .filter(file => file !== '.gitkeep' && file !== 'package.json' && !file.includes('.spec.'))

fs.writeFileSync(path.join(__dirname, '../pkg/package.json'), JSON.stringify(json_mut, null, 2), {});