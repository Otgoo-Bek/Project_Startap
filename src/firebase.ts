import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (!admin.apps.length) {
  // На Render файл лежит в /etc/secrets/
  const secretPath = '/etc/secrets/serviceAccount.json';
  const localPath = path.join(__dirname, '../../serviceAccount.json');
  
  const filePath = fs.existsSync(secretPath) ? secretPath : localPath;
  const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export default admin;
