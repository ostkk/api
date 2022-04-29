const Koa = require('koa')
const userRouter = require('./router/user.route')
const cors = require('koa2-cors');

const app = new Koa()

const KoaBody = require('koa-body')
app.use(KoaBody({
    multipart: true,
}))
// const bodyParser = require('body-parser');
// app.use(bodyParser.json());

app.use(cors());
app.use(userRouter.routes())
app.listen(3000, () => {
    console.log(`server is running on http://localhost:3000`)
})