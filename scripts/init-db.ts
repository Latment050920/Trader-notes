import { ensureDbFile } from '../lib/storage/jsondb.server';

ensureDbFile();
console.log('数据库初始化完成: data/orders.json');
