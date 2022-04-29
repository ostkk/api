const Sequelize = require('sequelize');
const db = {};
const sequelize = new Sequelize("stu", 'root', 'root', {
    host: 'localhost',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
})


db.sequelize = sequelize;

module.exports = db.sequelize.define(
    'users',
    {
        name: {
            type: Sequelize.STRING,
            //  primaryKey: true,
        },
        password: {
            type: Sequelize.STRING,
        },
        number: {
            type: Sequelize.STRING,
            primaryKey: true,
        },
        status:{
            type: Sequelize.STRING,
        }
    }, {
    timestamps: false,
}
)

