const Sequelize = require('sequelize');
const history = {};
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


history.sequelize = sequelize;

module.exports = history.sequelize.define(
    'histories',
    {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        number: {
            type: Sequelize.STRING,
        },
        target: {
            type: Sequelize.STRING,
        },
        outOrBack: {
            type: Sequelize.STRING,
        },
        passed: {
            type: Sequelize.BOOLEAN,
        },
        date: {
            type: Sequelize.DATE
        }
    }, {
    timestamps: false,
}
)

