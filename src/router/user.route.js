const Router = require('koa-router')

const router = new Router({ prefix: '/api' })
const db = require('../db');
const history = require('../history');

const jwt = require("jsonwebtoken")
const SECRET = 'UYGIUYGIADUYSGDIYSGFOUYGFOIU'

router.post('/login', async (ctx, next) => {
    let { number, password } = ctx.request.body;
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
                attributes: ['name', 'number', 'status'],
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
        // console.log(datas);
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
            await db.create({
                name, number, password: '123456', status: 'in',
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
    console.log(ctx.request.body);
    let { name, number } = ctx.request.body;
    await db.create({
        name, number, password: '123456', status: 'in',
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
    let { prenumber, number, status, name, password } = ctx.request.body;
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

module.exports = router
