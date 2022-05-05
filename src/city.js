const Sequelize = require('sequelize');
const city = {};
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


city.sequelize = sequelize;

module.exports = city.sequelize.define(
    'city',
    {
        target: {
            type: Sequelize.STRING,
            primaryKey: true,
        },
        auto: {
            type: Sequelize.BOOLEAN,
        },
    }, {
    timestamps: false,
}
)

