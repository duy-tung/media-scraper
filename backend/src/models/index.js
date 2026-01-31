import { Sequelize } from 'sequelize';
import Media from './Media.js';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Initialize models
const models = {
    Media: Media(sequelize),
};

export { sequelize, models };
