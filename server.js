const express = require('express'); 
const app = express(); 
app.use(express.urlencoded({ extended: true })); // form 형식의 데이터를 받기 위함
app.use(express.json());  // json 형식의 데이터를 받기 위함

require('dotenv').config();  // .env 파일을 읽어서 process.env 객체에 넣어줌

app.set('view engine', 'ejs'); // ejs 사용을 위한 설정
app.use('/public', express.static('public')); // public 폴더를 static으로 사용
app.use('/assets', express.static('assets')); // assets 폴더를 static으로 사용

const MongoClient = require('mongodb').MongoClient;

let DB;
MongoClient.connect(process.env.DB_URL, {useUnifiedTopology: true}, (error, client) => {
    if (error) return console.log(error);
    DB = client.db('sbow');
    app.DB = DB;

    app.listen(process.env.PORT, () => {
        console.log('listening on 8080')
    });
});
// mongoDB Atlas > Cluster0 > sbow DB 연결

// put, delete method 사용을 위한 라이브러리
const methodOverride = require('method-override'); 
app.use(methodOverride('_method')); 

// 로그인 관련 라이브러리
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');

// 세션 설정
app.use(session({
    secret: 'secretCode', 
    resave: true, 
    cookie: { maxAge: 60 * 60 * 1000 },
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// 로그인 설정
passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, async (inputID, inputPW, done) => {
    try {
        const idToLowerCase = inputID.toLowerCase();
        const user = await DB.collection('USER').findOne({ id: idToLowerCase })
        if (!user) {
            return done(null, false, { message: 'Incorrect username or password.' });
        }

        // 비밀번호 검증
        const pwMatch = await bcrypt.compare(inputPW, user.pw);
        if (!pwMatch) {
            return done(null, false, { message: 'Invalid ID or password' });
        }
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));
// 로그인 성공시 세션에 저장
passport.serializeUser((user, done) => {
    done(null, user.id)
});
// 로그인 성공시 세션에 저장된 정보를 가져옴
passport.deserializeUser((ID, done) => {
    DB.collection('USER').findOne({ id : ID }, (error, result) => {
        done(null, result)
    })
});

// 세션 체크
function sessionCheck(req, res, next){
    if (req.user){
        next();
    } else {
        res.render('signInUp.ejs');
    }
}


const signInUpRouter = require('./routes/signInUp.js');
const mainRouter = require('./routes/main.js');
const uploadRouter = require('./routes/upload.js');
const writeRouter = require('./routes/write.js');
const logoutRouter = require('./routes/logout.js');
const searchRouter = require('./routes/search.js');
const detailRouter = require('./routes/detail.js');
const upDownRouter = require('./routes/upDown.js');
const deleteRouter = require('./routes/delete.js');
const personalRouter = require('./routes/personal.js');

app.use('/', signInUpRouter);
app.use('/', sessionCheck, mainRouter);
app.use('/', sessionCheck, uploadRouter);
app.use('/', sessionCheck, writeRouter);
app.use('/', sessionCheck, logoutRouter);
app.use('/', sessionCheck, searchRouter);
app.use('/', sessionCheck, detailRouter);
app.use('/', sessionCheck, upDownRouter);
app.use('/', sessionCheck, deleteRouter);
app.use('/', sessionCheck, personalRouter);