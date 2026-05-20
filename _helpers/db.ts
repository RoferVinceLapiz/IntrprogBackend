import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

const db: any = {};

db.sequelize = sequelize;

db.Account = accountModel(sequelize);
db.RefreshToken = refreshTokenModel(sequelize);

db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
db.RefreshToken.belongsTo(db.Account);

sequelize
  .sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch((err: Error) => console.error('DB sync error:', err));

export default db;