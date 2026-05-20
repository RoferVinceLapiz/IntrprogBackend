const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    dialectOptions: {
        ssl: false
    },
    logging: false
});

const db = {};
db.sequelize = sequelize;
db.Account = require('../accounts/account.model')(sequelize);
db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);

db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
db.RefreshToken.belongsTo(db.Account);

sequelize.sync({ alter: true })
    .then(() => console.log('Database synced'))
    .catch(err => console.error('DB sync error:', err));

module.exports = db;