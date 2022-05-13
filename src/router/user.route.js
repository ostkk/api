const Router = require('koa-router')

const router = new Router({ prefix: '/api' })
const db = require('../db');
const history = require('../history');
const city = require('../city');

const jwt = require("jsonwebtoken")
const SECRET = 'UYGIUYGIADUYSGDIYSGFOUYGFOIU'
const crypto = require('crypto');

router.post('/login', async (ctx, next) => {
    let { number, password } = ctx.request.body;
    password = crypto.createHash('md5').update(password).digest('hex');
    let token = '';
    await db.findAll({
        where: {
            number,
            password
        }
    }).then(async (users) => {
        if (users[0]) {
            token = jwt.sign({
                number,
            }, SECRET, {
                expiresIn: '1 days'
            })
            if (number == 'admin') {
                token = 'admin-' + token
            }
            else if (number[0] == '2') {
                token = 'student-' + token
            }
            else {
                token = 'editor-' + token
            }
            ctx.body = {
                code: 200,
                data: {
                    token
                }
            }
        }
        else {
            ctx.body = {
                code: 201,
                message: '账号或密码错误'
            }
        }
    })
})

router.get('/getInfo', async (ctx, next) => {
    await jwt.verify(ctx.header.token, SECRET, async (err, decode) => {
        if (err) {
            ctx.body = {
                code: 50008,
                message: '请重新登录'
            }
        } else {
            await db.findAll({
                // attributes: ['name', 'number', 'status'],
                where: {
                    number: decode.number
                }
            }).then(user => {
                ctx.body = {
                    code: 200,
                    data: {
                        name: user[0]
                    }
                }
            })
        }
    })
})

router.post('/logout', async (ctx, next) => {
    ctx.body = {
        code: 200,
        data: 'success'
    }
})

const fs = require('fs');
const xlsx = require('xlsx');
const { devNull } = require('os');
router.post('/uploadStudentList', async (ctx, next) => {
    const file = ctx.request.files.file;
    if (file.name.split('.').pop() != 'xlsx') {
        ctx.body = {
            code: 201,
            message: '请上传xlsx格式的文件',
        }
        return;
    }
    const reader = fs.createReadStream(file.path);
    const filePath = '1.xlsx';
    const upStream = fs.createWriteStream(filePath);
    const getRes = await getFile(reader, upStream);
    let datas = []
    if (!getRes) {
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet);
            datas.push(data)
        }
        for (let data of datas[0]) {
            let { name, number } = data;
            number = number.toString();
            if (number[0] != '2') {
                ctx.body = {
                    code: 201,
                    message: '文件内容错误'
                }
                return;
            }
            let password = '123456';
            password = crypto.createHash('md5').update(password).digest('hex')
            await db.create({
                name, number, password, status: 'in',
            }).then(res => {
            }, rej => {
                ctx.body = {
                    code: 201,
                    message: '请勿上传重复信息'
                }
            })
        }
        ctx.body = {
            code: 200,
            message: '上传成功'
        }
    }
    else {
        ctx.body = {
            code: 201,
            message: '上传文件错误'
        }
    }
})
function getFile(reader, upStream) {
    return new Promise(function (result) {
        let stream = reader.pipe(upStream);
        stream.on('finish', function (err) {
            result(err);
        });
    });
}

router.post('/uploadStudent', async (ctx, next) => {
    let { name, number } = ctx.request.body;
    let password = '123456';
    password = crypto.createHash('md5').update(password).digest('hex');
    await db.create({
        name, number, password, status: 'in',
    }).then(res => {
        ctx.body = {
            code: 200,
            message: '添加成功'
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '用户已存在，请勿重复添加'
        }
    })
})

router.post('/searchStudent', async (ctx, next) => {
    let number = ctx.request.body.number;
    await db.findAll({
        where: {
            number
        }
    }).then(users => {
        if (users[0]) {
            let { status, password, name } = users[0];
            ctx.body = {
                code: 200,
                data: {
                    status, password, name, number
                }
            }
        } else {
            ctx.body = {
                code: 201,
                message: '未查找到该学生信息'
            }
        }

    })
})

router.post('/updateStudentData', async (ctx, next) => {
    let { prenumber, number, status, name, resetPassword, password } = ctx.request.body;
    if (resetPassword == "1") { //重置密码为123456
        password = crypto.createHash('md5').update("123456").digest('hex');
    }
    await db.update({ number, status, name, password }, { where: { number: prenumber } }).then(users => {
        ctx.body = {
            code: 200,
            message: '更新成功',
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '更新失败'
        }
    })
})

router.post('/applyOut', async (ctx, next) => {
    let { number, date, area } = ctx.request.body;
    date = date.split('-')
    if (date[1].length == 1) {
        date[1] = '0' + date[1];
    }
    if (date[2].length == 1) {
        date[2] = '0' + date[2];
    }
    date = date.join('-')
    let f = 0;
    await history.findAll({
        where: {
            number
        }
    }).then(user => {
        user.forEach(e => {
            if (e.date == date && e.outOrBack == 'out' && !e.passed) {
                ctx.body = {
                    code: 201,
                    message: '请勿重复提交申请'
                }
                f = 1;
                return
            }
        })
    })
    if (f == 1) {
        return;
    }
    let passed = false;
    await city.findAll({
        where: {
            target: area
        }
    }).then(res => {
        if (res.length) {
            passed = true
        }
    }, rej => { })
    await db.findAll({
        where: {
            number
        }
    }).then(async (user) => {
        if (user[0]) {
            if (user[0].status == 'in') {
                await history.create({
                    number, date, target: area, passed, outOrBack: 'out'
                }).then(res => {
                    ctx.body = {
                        code: 200,
                        message: '提交成功'
                    }
                }), rej => {
                    ctx.body = {
                        code: 201,
                        message: '提交失败'
                    }
                }
            }
            else {
                ctx.body = {
                    code: 201,
                    message: '当前不在校内'
                }
            }
        }
        else {
            ctx.body = {
                code: 201,
                message: '提交失败'
            }
        }
    })
})

router.post('/applyBack', async (ctx, next) => {
    let { number, date, area } = ctx.request.body;
    date = date.split('-')
    if (date[1].length == 1) {
        date[1] = '0' + date[1];
    }
    if (date[2].length == 1) {
        date[2] = '0' + date[2];
    }
    date = date.join('-')
    let f = 0;
    await history.findAll({
        where: {
            number
        }
    }).then(user => {
        user.forEach(e => {
            if (e.date == date && e.outOrBack == 'back' && !e.passed) {
                ctx.body = {
                    code: 201,
                    message: '请勿重复提交申请'
                }
                f = 1;
                return
            }
        })
    })
    if (f == 1) {
        return;
    }
    let passed = false;
    await city.findAll({
        where: {
            target: area
        }
    }).then(res => {
        if (res.length) {
            passed = true
        }
    }, rej => { })
    await db.findAll({
        where: {
            number
        }
    }).then(async (user) => {
        if (user[0]) {
            if (user[0].status == 'out') {
                await history.create({
                    number, date, target: area, passed, outOrBack: 'back'
                }).then(res => {
                    ctx.body = {
                        code: 200,
                        message: '提交成功'
                    }
                }), rej => {
                    ctx.body = {
                        code: 201,
                        message: '提交失败'
                    }
                }
            }
            else {
                ctx.body = {
                    code: 201,
                    message: '当前在校内'
                }
            }
        }
        else {
            ctx.body = {
                code: 201,
                message: '提交失败'
            }
        }
    })
})

router.get('/applyCode', async (ctx, next) => {
    let number = ctx.query.number;
    let date = new Date();
    date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    date = date.split('-');
    if (date[1].length == 1) {
        date[1] = '0' + date[1];
    }
    if (date[2].length == 1) {
        date[2] = '0' + date[2];
    }
    date = date.join('-')
    await history.findAll({
        where: {
            number
        }
    }).then(async user => {
        let f = 0;
        for (let i = 0; i < user.length; i++) {
            if (user[i].date == date && user[i].passed == false) {
                ctx.body = {
                    code: 201,
                    message: '当前不在通行时间内'
                }
                return;
            }
        }
        for (let i = 0; i < user.length; i++) {
            if (user[i].date == date && user[i].passed == true) {
                let s = user[i].outOrBack == 'back' ? 'in' : 'out';
                await db.update({ status: s }, { where: { number } }).then(res => {
                    ctx.body = {
                        code: 200,
                        message: 'passed'
                    }
                    f = 1;
                })
            }
        }
        if (f == 0) {
            ctx.body = {
                code: 201,
                message: '当前不在通行时间内'
            }
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '当前不在通行时间内'
        }
    })
})

router.get('/applyList', async (ctx, next) => {
    let passed = ctx.query.passed == 'true' ? true : false;
    await history.findAll({
        where: {
            passed
        }
    }).then(async user => {//获取学号
        for (let i = 0; i < user.length; i++) {
            await db.findAll({
                where: {
                    number: user[i].number
                }
            }).then(us => {
                user[i].dataValues.name = us[0].name;
            })
        }
        ctx.body = {
            code: 200,
            data: {
                user
            }
        }
    })
})

router.get('/getNewApplyNumber', async (ctx, next) => {
    await history.findAll({
        where: {
            passed: false
        }
    }).then(user => {
        ctx.body = {
            code: 200,
            data: {
                number: user.length
            }
        }
    })
})

router.get('/passOrRefuse', async (ctx, next) => {
    let { s, id } = ctx.query;
    if (s == 1) { //passed
        await history.update({ passed: true }, { where: { id } }).then(res => {
            ctx.body = {
                code: 200,
                data: {
                    message: '已通过'
                }
            }
        }, rej => {
            ctx.body = {
                code: 201,
                data: {
                    message: '未通过'
                }
            }
        })
    }
    else {
        await history.destroy({ where: { id } }).then(res => {
            ctx.body = {
                code: 200,
                data: {
                    message: '已删除该申请'
                }
            }
        }, rej => {
            ctx.body = {
                code: 201,
                data: {
                    message: '删除失败'
                }
            }
        })
    }
})

router.post('/addCity', async (ctx, next) => {
    await city.create({ target: ctx.request.body.area, auto: false }).then(res => {
        if (res) {
            ctx.body = {
                code: 200,
                message: '添加成功',
            }
        }
        else {
            ctx.body = {
                code: 201,
                message: '请勿重复添加',
            }
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '请勿重复添加',
        }
    })
})

router.get('/getCity', async (ctx, next) => {
    await city.findAll().then(citys => {
        ctx.body = {
            code: 200,
            data: citys
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '获取自动审批城市列表失败'
        }
    })
})

router.delete('/deleteCity', async (ctx, next) => {
    await city.destroy({
        where: {
            target: JSON.parse(ctx.request.query.data).target
        }
    }).then(res => {
        ctx.body = {
            code: 200,
            message: '删除成功'
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '删除失败'
        }
    })
})

router.post('/switchAuto', async (ctx, next) => {
    if (ctx.request.body.auto == true) {
        await history.update({ passed: true }, {
            where: {
                target: ctx.request.body.target
            }
        }).then(res => { }, rej => { });
    }
    await city.update({ auto: ctx.request.body.auto }, {
        where: {
            target: ctx.request.body.target
        }
    }).then(res => {
        ctx.body = {
            code: 200,
            message: '设置成功'
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '设置失败'
        }
    })
})

router.post('/changePassword', async (ctx, next) => {
    let { number, password } = ctx.request.body;
    password = crypto.createHash('md5').update(password).digest('hex');
    await db.update({ password }, {
        where: {
            number
        }
    }).then(res => {
        ctx.body = {
            code: 200,
            message: '修改成功'
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '修改失败'
        }
    })
})

router.delete('/deleteStu', async (ctx, next) => {
    await db.destroy({
        where: {
            number: JSON.parse(ctx.request.query.data).number
        }
    }).then(res => {
        ctx.body = {
            code: 200,
            message: '删除成功'
        }
    }, rej => {
        ctx.body = {
            code: 201,
            message: '删除失败'
        }
    })
})
module.exports = router